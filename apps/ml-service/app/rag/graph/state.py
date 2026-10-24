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
    category: str                      # small_talk | pcod_related | out_of_scope | blocked:<reason>
    english_query: str
    kb_skipped: bool                   # True = question is about the user's own data; no KB lookup
    keywords: list[str]
    retrieval: RetrievalResult | None
    grounded: bool
    answer: str
    # ---- output ----
    result: dict