"""
app/rag/graph/build.py
----------------------
Wires the nodes into a LangGraph StateGraph.

    START -> guard_input --blocked/self-harm--> safety_reply ---------------------------+
                  |                                                                  |
                  +--ok--> plan --risk != none--> safety_reply ----------------------+
                             |--small_talk--> small_talk --------+                    |
                             |--out_of_scope--> out_of_scope ----+--> output_rails ---+--> finalize -> END
                             +--pcod_related--> retrieve -> generate (or generate directly if own-data)
"""

from functools import lru_cache

from langchain_core.runnables import RunnableLambda
from langgraph.graph import END, START, StateGraph

from app.core.config import Settings, get_settings
from app.llm.factory import build_llm
from app.rag.graph.nodes import ChatNodes, parse_plan
from app.rag.graph.state import ChatState


def _stopped(state: ChatState) -> bool:
    return state.get("category", "").startswith(("blocked", "safety"))


def _after_guard(state: ChatState) -> str:
    return "safety_reply" if _stopped(state) else "plan"


def _after_plan(state: ChatState) -> str:
    if _stopped(state):
        return "safety_reply"
    if state["category"] == "pcod_related" and state.get("kb_skipped"):
        return "generate"  # own-data question: skip retrieval
    return state["category"]  # small_talk | out_of_scope | pcod_related


def build_chat_graph(*, planner=None, generator=None, retriever=None, settings: Settings | None = None):
    s = settings or get_settings()
    if retriever is None:
        from app.rag.retrieval import get_retriever
        retriever = get_retriever()
    nodes = ChatNodes(
        planner=planner or build_llm("fast", temperature=0.0,
                                     transform=lambda m: m | RunnableLambda(parse_plan), settings=s),
        generator=generator or build_llm("generate", temperature=0.3, settings=s),
        retriever=retriever,
        settings=s,
    )

    g = StateGraph(ChatState)
    g.add_node("guard_input", nodes.guard_input)
    g.add_node("plan", nodes.plan)
    g.add_node("small_talk", nodes.small_talk)
    g.add_node("out_of_scope", nodes.out_of_scope)
    g.add_node("retrieve", nodes.retrieve)
    g.add_node("generate", nodes.generate)
    g.add_node("safety_reply", nodes.safety_reply)
    g.add_node("output_rails", nodes.output_rails)
    g.add_node("finalize", nodes.finalize)

    g.add_edge(START, "guard_input")
    g.add_conditional_edges("guard_input", _after_guard, {"plan": "plan", "safety_reply": "safety_reply"})
    g.add_conditional_edges("plan", _after_plan, {
        "small_talk": "small_talk", "out_of_scope": "out_of_scope", "pcod_related": "retrieve",
        "generate": "generate", "safety_reply": "safety_reply"})
    g.add_edge("retrieve", "generate")
    for n in ("small_talk", "out_of_scope", "generate"):
        g.add_edge(n, "output_rails")
    g.add_edge("output_rails", "finalize")
    g.add_edge("safety_reply", "finalize")
    g.add_edge("finalize", END)
    return g.compile()


@lru_cache
def get_chat_graph():
    """One compiled graph (and one DB pool / LLM chain) per process."""
    return build_chat_graph()