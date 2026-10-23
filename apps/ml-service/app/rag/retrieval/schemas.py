"""
app/rag/retrieval/schemas.py
----------------------------
What the retriever hands to the rest of the RAG graph (R4+). Plain data only,
no DB or LLM code here.
"""

from pydantic import BaseModel


class RetrievedChunk(BaseModel):
    id: str
    text: str
    source: str
    doc_title: str
    doc_type: str
    year: int | None = None
    page: int | None = None
    page_end: int | None = None
    chunk_index: int | None = None

    similarity: float            # cosine similarity to the query (0..1, higher = closer)
    rrf: float                   # fused rank score (only useful for ordering)
    dense_rank: int | None = None   # rank in the vector leg (None = not in its top pool)
    sparse_rank: int | None = None  # rank in the keyword leg (None = no keyword match)

    @property
    def citation(self) -> str:
        """Human-readable reference used in answers, e.g. 'Guideline Title (2026), pp. 45-46'."""
        title = self.doc_title or self.source
        if self.year:
            title = f"{title} ({self.year})"
        if self.page is None:
            return title
        if self.page_end and self.page_end != self.page:
            return f"{title}, pp. {self.page}-{self.page_end}"
        return f"{title}, p. {self.page}"


class RetrievalResult(BaseModel):
    query: str
    tsquery: str                       # keyword query actually sent to Postgres (for debugging)
    chunks: list[RetrievedChunk]       # final, filtered, ready for the LLM
    n_candidates: int                  # rows returned by fusion before filtering
    n_dropped_low_similarity: int
    top_similarity: float | None       # best similarity among candidates (even if dropped)

    @property
    def has_evidence(self) -> bool:
        """False -> the KB has nothing relevant; the chat graph should say so instead of guessing."""
        return bool(self.chunks)