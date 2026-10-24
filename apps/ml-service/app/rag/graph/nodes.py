"""
app/rag/graph/nodes.py
----------------------
Every step of the chat graph. Dependencies (LLMs, retriever, settings) are injected,
so tests can run the whole graph with fakes and no network.

  guard_input -> plan -> [small_talk | out_of_scope | retrieve -> generate] -> finalize
"""
import json
import logging
import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.core.config import Settings
from app.rag.graph import messages
from app.rag.graph import prompts as P
from app.rag.graph.state import ChatState
from app.rag.guardrails import check_input, inject_disclaimer, log_guardrail_event, validate_output
from app.rag.retrieval.schemas import RetrievedChunk

log = logging.getLogger("chat_graph")


class Plan(BaseModel):
    category: Literal["small_talk", "pcod_related", "out_of_scope"]
    english_query: str = Field(default="", description="standalone English search query (pcod_related only)")
    keywords: list[str] = Field(default_factory=list, description="up to 5 English search terms")

    @field_validator("category", mode="before")
    @classmethod
    def _norm_category(cls, v):
        return str(v).strip().lower()

    @field_validator("english_query", mode="before")
    @classmethod
    def _norm_query(cls, v):
        return "" if v is None else str(v)

    @field_validator("keywords", mode="before")
    @classmethod
    def _norm_keywords(cls, v):
        if v is None:
            return []
        if isinstance(v, str):  # some models return "a, b, c"
            return [k for k in re.split(r"[,;|]", v) if k.strip()]
        return v


def _text(msg) -> str:
    """AIMessage -> plain string (Gemini can return content blocks)."""
    return str(getattr(msg, "text", msg) or "").strip()


_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)

def parse_plan(msg) -> Plan:
    """
    LLM reply -> Plan. Plain JSON in text instead of tool-calling: Groq's gpt-oss models
    sometimes emit an invalid tool call and Groq answers 400. Used inside the LLM chain
    (build.py), so a parse failure also falls through to the next provider.
    """
    if isinstance(msg, Plan):
        return msg
    match = _JSON_RE.search(_text(msg))
    if not match:
        raise ValueError("planner reply contained no JSON object")
    return Plan.model_validate(json.loads(match.group(0)))


class ChatNodes:
    def __init__(self, *, planner, generator, retriever, settings: Settings):
        self.planner = planner        # Runnable: prompt str -> Plan
        self.generator = generator    # Runnable: prompt str -> AIMessage
        self.retriever = retriever    # needs: async retrieve(query, keywords=...) -> RetrievalResult
        self.s = settings

    # ---- 1. guardrails (regex layer; replaced by the R5 rails) ----------------
    async def guard_input(self, state: ChatState) -> dict:
        allowed, reason = check_input(state["message"])
        if allowed:
            return {}
        lang = state.get("language", "en")
        return {
            "category": f"blocked:{reason}",
            "answer": messages.pick(messages.BLOCKED_REPLIES, lang, reason),
            "grounded": False,
        }

    # ---- 2. plan: route + translate + rewrite follow-ups ----------------------
    async def plan(self, state: ChatState) -> dict:
        history = P.format_history(state.get("history", []), 4)
        prompt = P.PLAN_PROMPT.format(history=history, message=state["message"],
                                      has_user_data="yes" if state.get("user_context") else "no")
        try:
            raw = await self.planner.ainvoke(prompt)
            plan = Plan.model_validate(raw) if isinstance(raw, dict) else parse_plan(raw)
        except Exception as e:  # noqa: BLE001 - any planner failure must degrade, not crash
            # Fail safe toward retrieval: grounding an unclear question beats answering it blind.
            log.warning("planner failed (%s); defaulting to pcod_related", type(e).__name__)
            plan = Plan(category="pcod_related")
        english_query = plan.english_query.strip()
        kb_skipped = False
        if not english_query:
            if plan.category == "pcod_related" and state.get("user_context"):
                kb_skipped = True            # "explain my result": answer from the user's own data
            else:
                english_query = state["message"]
        return {"category": plan.category, "english_query": english_query, "kb_skipped": kb_skipped,
                "keywords": [k.strip() for k in plan.keywords if k.strip()][:5]}

    # ---- 3a/3b. no-retrieval branches -----------------------------------------
    async def small_talk(self, state: ChatState) -> dict:
        history = P.format_history(state.get("history", []), self.s.chat_history_turns)
        prompt = P.small_talk_prompt(state["message"], history, state.get("language", "en"))
        return {"answer": await self._generate(prompt), "grounded": False}

    async def out_of_scope(self, state: ChatState) -> dict:
        prompt = P.out_of_scope_prompt(state["message"], state.get("language", "en"))
        return {"answer": await self._generate(prompt), "grounded": False}

    # ---- 3c. retrieval + grounded generation ----------------------------------
    async def retrieve(self, state: ChatState) -> dict:
        try:
            res = await self.retriever.retrieve(state["english_query"], keywords=state.get("keywords"))
        except Exception as e:  # noqa: BLE001 - DB / embedding outage: answer without KB
            log.error("retrieval failed (%s: %s)", type(e).__name__, str(e)[:120])
            return {"retrieval": None, "grounded": False}
        # Query-level gate: chunk floor alone leaves too thin a margin for medical-adjacent
        # off-topic questions, so the BEST chunk must clear a higher bar to count as grounded.
        grounded = res.has_evidence and (res.top_similarity or 0.0) >= self.s.rag_answer_gate
        return {"retrieval": res, "grounded": grounded}

    async def generate(self, state: ChatState) -> dict:
        res = state.get("retrieval")
        chunks: list[RetrievedChunk] = res.chunks if (res and state.get("grounded")) else []
        if state.get("kb_skipped"):
            context = P.OWN_DATA_BLOCK
        else:
            context = P.format_context(chunks) if chunks else P.NO_EVIDENCE_BLOCK
        history = P.format_history(state.get("history", []), self.s.chat_history_turns)
        prompt = P.grounded_prompt(state["message"], context, state.get("user_context"),
                                   history, state.get("language", "en"))
        return {"answer": await self._generate(prompt)}

    async def _generate(self, prompt: str) -> str:
        try:
            return _text(await self.generator.ainvoke(prompt))
        except Exception as e:  # noqa: BLE001 - every provider in the chain failed
            log.error("generation failed on all providers (%s)", type(e).__name__)
            return ""  # finalize() swaps in a localized fallback

    # ---- 4. finalize: validate, disclaimer, build the API response ------------
    async def finalize(self, state: ChatState) -> dict:
        lang = state.get("language", "en")
        category = state["category"]
        answer = state.get("answer", "")
        grounded = bool(state.get("grounded"))
        res = state.get("retrieval")

        if not category.startswith("blocked"):
            if not validate_output(answer):
                log_guardrail_event("output_validation_failed")
                table = {"small_talk": messages.SMALL_TALK_FALLBACK,
                         "out_of_scope": messages.OUT_OF_SCOPE_FALLBACK}.get(
                             category, messages.GROUNDED_FAILED_FALLBACK)
                answer, grounded = messages.pick(table, lang), False
            else:
                answer = inject_disclaimer(answer, category, lang)

        chunks = res.chunks if (res and grounded) else []
        titles = list(dict.fromkeys(c.doc_title or c.source for c in chunks))
        seen, citations = set(), []
        for c in chunks:
            key = (c.source, c.page)
            if key in seen:
                continue
            seen.add(key)
            citations.append({"title": c.doc_title or c.source, "docType": c.doc_type,
                              "year": c.year, "page": c.page, "pageEnd": c.page_end})
        return {"result": {"answer": answer, "groundedInKB": grounded and bool(chunks),
                           "sourcesUsed": titles, "category": category, "citations": citations}}