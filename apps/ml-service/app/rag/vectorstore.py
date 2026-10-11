"""
app/rag/vectorstore.py
----------------------
Connects LangChain's PGVectorStore to the Neon Postgres database.

Table lives in its OWN schema (default `rag.kb_chunks`), not `public`.
Reason: Prisma owns the `public` schema; unknown tables there make
`prisma migrate dev` report drift. A separate schema keeps the two apart.

Columns: id, content, embedding(vector), plus real columns for the metadata we
filter/cite on (source, doc_title, doc_type, year, page, chunk_index), a JSON
column for any extra metadata, and a full-text-search column (content_tsv)
that R3 uses for hybrid (keyword + vector) search.
"""

import logging
import uuid

import psycopg
from langchain_core.embeddings import Embeddings
from langchain_postgres import Column, PGEngine, PGVectorStore
from langchain_postgres.v2.hybrid_search_config import HybridSearchConfig
from psycopg import sql
from sqlalchemy.engine import URL, make_url

from app.core.config import Settings, get_settings

log = logging.getLogger("vectorstore")

METADATA_COLUMNS = [
    Column("source", "TEXT"),
    Column("doc_title", "TEXT"),
    Column("doc_type", "TEXT"),
    Column("year", "INTEGER"),
    Column("page", "INTEGER"),
    Column("chunk_index", "INTEGER"),
]


def to_async_url(raw: str) -> URL:
    """
    Neon gives `postgresql://...?sslmode=require&channel_binding=require`.
    The async driver (asyncpg) does not understand those libpq options, so we
    translate: sslmode -> ssl, and drop channel_binding.
    """
    url = make_url(raw).set(drivername="postgresql+asyncpg")
    query = dict(url.query)
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)
    if sslmode and sslmode != "disable":
        query["ssl"] = sslmode
    return url.set(query=query)


def _hybrid_config() -> HybridSearchConfig:
    return HybridSearchConfig(tsv_column="content_tsv", tsv_lang="pg_catalog.english")


def prepare_database(s: Settings) -> bool:
    """Ensure pgvector extension + schema exist. Returns True if the KB table already exists."""
    with psycopg.connect(s.database_url, autocommit=True) as conn:
        conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        conn.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(sql.Identifier(s.kb_schema)))
        row = conn.execute(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = %s AND table_name = %s",
            (s.kb_schema, s.kb_table),
        ).fetchone()
    return row is not None


def build_engine(s: Settings) -> PGEngine:
    return PGEngine.from_connection_string(
        to_async_url(s.database_url),
        pool_pre_ping=True,
        # Neon's pooled endpoint (pgbouncer) breaks asyncpg's prepared-statement cache:
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4()}__",
        },
    )


def init_table(engine: PGEngine, s: Settings, overwrite: bool = False) -> None:
    engine.init_vectorstore_table(
        table_name=s.kb_table,
        vector_size=s.embedding_dim,
        schema_name=s.kb_schema,
        metadata_columns=METADATA_COLUMNS,
        overwrite_existing=overwrite,
        hybrid_search_config=_hybrid_config(),
    )


def open_store(engine: PGEngine, embeddings: Embeddings, s: Settings) -> PGVectorStore:
    return PGVectorStore.create_sync(
        engine=engine,
        embedding_service=embeddings,
        table_name=s.kb_table,
        schema_name=s.kb_schema,
        metadata_columns=[c.name for c in METADATA_COLUMNS],
        hybrid_search_config=_hybrid_config(),
    )