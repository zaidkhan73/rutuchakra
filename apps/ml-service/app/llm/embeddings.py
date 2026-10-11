"""
app/llm/embeddings.py
---------------------
Embeddings = turning text into a list of numbers so "similar meaning" becomes
"close together". We use Gemini's embedding model (free tier) but wrap it so
that free-tier hiccups don't kill an ingestion run:

  - texts are sent in small batches (not one huge request)
  - a short pause between batches (stays under per-minute limits)
  - automatic retry with exponential backoff on 429 / temporary errors

IMPORTANT: vectors from different embedding models are NOT interchangeable.
The model + dimension chosen here must be the same one used when the KB was
ingested. If you ever change them (EMBEDDING_MODEL / EMBEDDING_DIM), re-run
ingestion with --reset.
"""

import logging
import time

from langchain_core.embeddings import Embeddings
from tenacity import Retrying, stop_after_attempt, wait_exponential

from app.core.config import Settings, get_settings

log = logging.getLogger("embeddings")


class ResilientEmbeddings(Embeddings):
    def __init__(self, inner: Embeddings, batch_size: int = 32, pause_s: float = 0.5,
                 attempts: int = 5, base_wait_s: float = 2.0):
        self.inner = inner
        self.batch_size = batch_size
        self.pause_s = pause_s
        self.attempts = attempts
        self.base_wait_s = base_wait_s

    def _call(self, fn, arg):
        retryer = Retrying(
            stop=stop_after_attempt(self.attempts),
            wait=wait_exponential(multiplier=self.base_wait_s, min=self.base_wait_s, max=30),
            reraise=True,
            before_sleep=lambda rs: log.warning("embedding call failed (%s), retrying", type(rs.outcome.exception()).__name__),
        )
        return retryer(fn, arg)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), self.batch_size):
            out.extend(self._call(self.inner.embed_documents, texts[i:i + self.batch_size]))
            if self.pause_s and i + self.batch_size < len(texts):
                time.sleep(self.pause_s)
        return out

    def embed_query(self, text: str) -> list[float]:
        return self._call(self.inner.embed_query, text)


def get_embeddings(settings: Settings | None = None) -> Embeddings:
    s = settings or get_settings()
    if not s.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is required for embeddings.")
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    inner = GoogleGenerativeAIEmbeddings(
        model=s.embedding_model,
        google_api_key=s.gemini_api_key.get_secret_value(),
        output_dimensionality=s.embedding_dim,
    )
    return ResilientEmbeddings(inner)