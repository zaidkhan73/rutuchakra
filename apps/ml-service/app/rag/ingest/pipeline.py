"""
app/rag/ingest/pipeline.py
--------------------------
Glue: PDF file -> pages -> clean pages -> chunks(+ids), and the
database sync step. Kept separate from run.py (the CLI) so it can be tested
and reused (e.g. a future admin "re-index" endpoint).
"""

import logging
from pathlib import Path

from langchain_core.documents import Document
from langchain_postgres import PGVectorStore

from app.core.config import Settings
from app.rag.ingest.cleaner import CleanReport, clean_pages
from app.rag.ingest.loader import load_pdf_pages
from app.rag.ingest.manifest import SourceConfig
from app.rag.ingest.splitter import split_pages

log = logging.getLogger("ingest")

ADD_BATCH = 64  # chunks per DB write; progress is saved after every batch


def build_source_chunks(path: Path, cfg: SourceConfig, s: Settings) -> tuple[list[Document], list[str], CleanReport]:
    pages = load_pdf_pages(path, cfg)
    clean, report = clean_pages(pages, cfg)
    chunks, ids = split_pages(clean, s)
    # same text twice on the same page would give the same id -> keep the first
    seen: set[str] = set()
    uniq_chunks, uniq_ids = [], []
    for c, i in zip(chunks, ids):
        if i not in seen:
            seen.add(i)
            uniq_chunks.append(c)
            uniq_ids.append(i)
    return uniq_chunks, uniq_ids, report


def sync_source(store: PGVectorStore, source: str, chunks: list[Document], ids: list[str]) -> dict:
    """
    Make the DB match this PDF exactly:
      - chunks already stored (same id)  -> untouched, no embedding call
      - chunks new/changed               -> embedded and inserted
      - stored chunks no longer produced -> deleted
    """
    existing = set(store.get(where={"source": source}, limit=1_000_000)["ids"])
    new_ids = set(ids)

    stale = list(existing - new_ids)
    if stale:
        store.delete(ids=stale)

    todo = [(c, i) for c, i in zip(chunks, ids) if i not in existing]
    for start in range(0, len(todo), ADD_BATCH):
        batch = todo[start:start + ADD_BATCH]
        store.add_documents([c for c, _ in batch], ids=[i for _, i in batch])
        log.info("%s: stored %d/%d new chunks", source, min(start + ADD_BATCH, len(todo)), len(todo))

    return {"added": len(todo), "unchanged": len(new_ids & existing), "deleted": len(stale)}