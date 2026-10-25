"""app/rag/graph/state.py -- the dict that flows through the chat graph."""

from typing import TypedDict

from app.rag.retrieval.schemas import RetrievalResult


class ChatState(TypedDict, total=False):
    # ---- input ----
    message: str
    history: list[dict]
    user_context: str | None
    language: str
    # ---- filled by nodes ----
    category: str                      # small_talk | pcod_related | out_of_scope | blocked:<reason> | safety:<kind>
    english_query: str
    kb_skipped: bool                   # True = question is about the user's own data; no KB lookup
    keywords: list[str]
    retrieval: RetrievalResult | None
    grounded: bool
    answer: str
    prompt: str                        # the prompt that produced `answer` (reused if an output rail forces a retry)
    # ---- output ----
    result: dict