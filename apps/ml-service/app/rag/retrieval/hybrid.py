"""
app/rag/retrieval/hybrid.py
---------------------------
Hybrid retrieval over rag.kb_chunks in ONE SQL round-trip:

  1. vector leg  : cosine nearest neighbours of the query embedding
  2. keyword leg : Postgres full-text search on content_tsv (OR of the query terms)
  3. fusion      : Reciprocal Rank Fusion  score = sum(1 / (k + rank)) over both legs
  4. python side : similarity floor + per-source cap -> top_k

Why our own SQL instead of PGVectorStore.similarity_search(hybrid=...)?
  - the library's hybrid mode returns only the fused score, so a cosine similarity
    threshold (needed for "KB has no answer") is impossible
  - it uses plainto_tsquery, which ANDs every word; a natural-language question
    then matches almost nothing on the keyword side
  - it stores fts_query on the shared config object after the first call, so later
    queries can silently reuse the first query's keywords
Ingestion still uses PGVectorStore; only the read path is custom.
"""
import hashlib
import json
import logging
import re
from functools import lru_cache

from sqlalchemy import bindparam, text

from app.core.cache import Cache, get_cache
from app.core.config import Settings, get_settings
from app.llm.embeddings import get_embeddings
from app.rag.retrieval.schemas import RetrievalResult, RetrievedChunk
from app.rag.vectorstore import build_engine

log = logging.getLogger("retrieval")

_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

# Terms that carry no search value in a question.
_STOP = {
    "the", "and", "for", "are", "was", "were", "with", "that", "this", "what", "which", "how",
    "does", "can", "should", "about", "have", "has", "into", "from", "your", "you", "any",
    "tell", "give", "please", "help", "why", "when", "who", "may", "will", "also", "than", "then",
}

# The KB mixes naming: guideline says PMOS/PCOS, Indian sources say PCOD. Expand both ways,
# otherwise a "PCOD" question finds nothing on the keyword side of the 2026 guideline.
_SYNONYMS = {
    "pcod": ["pcos", "pmos", "polycystic"],
    "pcos": ["pcod", "pmos", "polycystic"],
    "pmos": ["pcos", "pcod", "polycystic"],
}

_MAX_TERMS = 14


def build_tsquery(query: str, extra_keywords: list[str] | None = None) -> str:
    """'What is PCOD diet?' -> 'pcod | pcos | pmos | polycystic | diet' (safe: [a-z0-9] tokens only)."""
    raw = re.findall(r"[a-z0-9]+", f"{query} {' '.join(extra_keywords or [])}".lower())
    terms: list[str] = []
    for tok in raw:
        if len(tok) < 3 or tok in _STOP:
            continue
        for t in [tok, *_SYNONYMS.get(tok, [])]:
            if t not in terms:
                terms.append(t)
    return " | ".join(terms[:_MAX_TERMS])


def apply_source_cap(rows: list[dict], top_k: int, max_per_source: int) -> list[dict]:
    """Keep rank order, but allow at most `max_per_source` chunks from one PDF."""
    out: list[dict] = []
    counts: dict[str, int] = {}
    for r in rows:
        n = counts.get(r["source"], 0)
        if n >= max_per_source:
            continue
        counts[r["source"]] = n + 1
        out.append(r)
        if len(out) == top_k:
            break
    return out


def _vec_literal(vec: list[float]) -> str:
    return "[" + ",".join(f"{x:.7f}" for x in vec) + "]"


def _extra(raw) -> dict:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return {}


class HybridRetriever:
    def __init__(self, settings: Settings | None = None, cache: Cache | None = None):
        self.s = settings or get_settings()
        self.cache = cache or get_cache()
        for ident in (self.s.kb_schema, self.s.kb_table):
            if not _IDENT.match(ident):
                raise ValueError(f"Unsafe SQL identifier in config: {ident!r}")
        self.table = f'"{self.s.kb_schema}"."{self.s.kb_table}"'
        self.embeddings = get_embeddings(self.s, interactive=True)
        self.engine = build_engine(self.s)

    # ---- SQL ---------------------------------------------------------------
    def _statement(self, doc_types: list[str] | None, min_year: int | None):
        flt = ""
        if doc_types:
            flt += " AND doc_type IN :doc_types"
        if min_year is not None:
            flt += " AND year >= :min_year"
        sql = f"""
        WITH dense AS (
            SELECT langchain_id AS id,
                   ROW_NUMBER() OVER (ORDER BY embedding <=> CAST(:qvec AS vector)) AS rnk
            FROM {self.table}
            WHERE TRUE {flt}
            ORDER BY embedding <=> CAST(:qvec AS vector)
            LIMIT :pool
        ),
        sparse AS (
            SELECT langchain_id AS id,
                   ROW_NUMBER() OVER (ORDER BY ts_rank_cd(content_tsv, q) DESC) AS rnk
            FROM {self.table}, to_tsquery('pg_catalog.english', :tsq) AS q
            WHERE content_tsv @@ q {flt}
            ORDER BY ts_rank_cd(content_tsv, q) DESC
            LIMIT :pool
        ),
        fused AS (
            SELECT COALESCE(d.id, s.id) AS id,
                   COALESCE(1.0 / (:rrf_k + d.rnk), 0) + COALESCE(1.0 / (:rrf_k + s.rnk), 0) AS rrf,
                   d.rnk AS dense_rank, s.rnk AS sparse_rank
            FROM dense d FULL OUTER JOIN sparse s ON d.id = s.id
        )
        SELECT t.langchain_id AS id, t.content, t.source, t.doc_title, t.doc_type,
               t.year, t.page, t.chunk_index, t.langchain_metadata AS extra,
               1 - (t.embedding <=> CAST(:qvec AS vector)) AS similarity,
               f.rrf, f.dense_rank, f.sparse_rank
        FROM fused f JOIN {self.table} t ON t.langchain_id = f.id
        ORDER BY f.rrf DESC
        LIMIT :cand
        """
        stmt = text(sql)
        if doc_types:
            stmt = stmt.bindparams(bindparam("doc_types", expanding=True))
        return stmt

    async def _run(self, stmt, params: dict) -> list[dict]:
        # PGEngine's pool is bound to the library's own background event loop, so the
        # query must run there (awaiting it directly from FastAPI's loop raises
        # "attached to a different loop").
        async def _go():
            async with self.engine._pool.connect() as conn:
                return [dict(r) for r in (await conn.execute(stmt, params)).mappings().all()]
        return await self.engine._run_as_async(_go())

    async def _embed(self, query: str) -> list[float]:
        """Query embedding with a cache. Key includes model+dim: vectors from different models must never mix."""
        norm = " ".join(query.split())
        digest = hashlib.sha256(f"{self.s.embedding_model}|{self.s.embedding_dim}|{norm}".encode()).hexdigest()
        key = f"emb:{digest}"
        hit = await self.cache.get(key)
        if hit:
            return hit
        vec = await self.embeddings.aembed_query(norm)
        await self.cache.set(key, vec, self.s.cache_embed_ttl_s)
        return vec

    # ---- public API --------------------------------------------------------
    async def retrieve(
        self,
        query: str,
        *,
        top_k: int | None = None,
        doc_types: list[str] | None = None,
        min_year: int | None = None,
        keywords: list[str] | None = None,
        min_similarity: float | None = None,
    ) -> RetrievalResult:
        """
        query     : English text (the R4 planner translates Hindi/Marathi first)
        doc_types : e.g. ["guideline", "review"]  (values: guideline, article, review, guide, traditional_medicine)
        min_year  : only chunks from documents of that year or later (docs with no year are excluded)
        keywords  : extra search terms from the planner for the keyword leg
        """
        s = self.s
        top_k = top_k or s.rag_top_k
        floor = s.rag_min_similarity if min_similarity is None else min_similarity
        tsq = build_tsquery(query, keywords)

        qvec = _vec_literal(await self._embed(query))
        params: dict = {
            "qvec": qvec, "tsq": tsq, "pool": s.rag_candidate_pool,
            "rrf_k": s.rag_rrf_k, "cand": top_k * 4,
        }
        if doc_types:
            params["doc_types"] = list(doc_types)
        if min_year is not None:
            params["min_year"] = int(min_year)

        rows = await self._run(self._statement(doc_types, min_year), params)

        candidates = [
            {**r, "similarity": float(r["similarity"]), "rrf": float(r["rrf"])} for r in rows
        ]
        top_sim = max((r["similarity"] for r in candidates), default=None)
        relevant = [r for r in candidates if r["similarity"] >= floor]
        picked = apply_source_cap(relevant, top_k, s.rag_max_per_source)

        chunks = [
            RetrievedChunk(
                id=str(r["id"]), text=r["content"], source=r["source"],
                doc_title=r["doc_title"] or "", doc_type=r["doc_type"] or "",
                year=r["year"], page=r["page"], page_end=_extra(r["extra"]).get("page_end"),
                chunk_index=r["chunk_index"], similarity=r["similarity"], rrf=r["rrf"],
                dense_rank=r["dense_rank"], sparse_rank=r["sparse_rank"],
            )
            for r in picked
        ]
        log.info("retrieve q=%r tsq=%r cand=%d kept=%d top_sim=%s", query[:60], tsq,
                 len(candidates), len(chunks), f"{top_sim:.3f}" if top_sim is not None else None)
        return RetrievalResult(
            query=query, tsquery=tsq, chunks=chunks, n_candidates=len(candidates),
            n_dropped_low_similarity=len(candidates) - len(relevant), top_similarity=top_sim,
        )


@lru_cache
def get_retriever() -> HybridRetriever:
    """One shared retriever (one engine/pool) per process."""
    return HybridRetriever()