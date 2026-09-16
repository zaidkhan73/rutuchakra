"""
app/rag/retriever.py
---------------------
Given a user query, embeds it with the same model used for the KB, then runs
a cosine-similarity search against the KBChunk table (pgvector) on Neon.
Returns the top-k most relevant chunks.
"""

import os
import sys

import psycopg2
from pgvector.psycopg2 import register_vector
from pgvector import Vector
from google import genai

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from app.config import config

_client = genai.Client(api_key=config.GEMINI_API_KEY)


def _embed_query(query: str) -> list[float]:
    response = _client.models.embed_content(
        model=config.EMBEDDING_MODEL,
        contents=[query],
        config={"output_dimensionality": config.EMBEDDING_DIM},
    )
    return response.embeddings[0].values


def retrieve(query: str, top_k: int = 4, min_similarity: float = 0.55) -> list[dict]:
    """
    Returns a list of {title, content, similarity} dicts, most relevant first.
    Chunks below min_similarity are dropped — a low best-match score is a
    signal the KB genuinely doesn't cover this query well, which the caller
    uses to decide whether to answer at all (see pipeline.py).
    """
    query_embedding = Vector(_embed_query(query))

    conn = psycopg2.connect(config.DATABASE_URL)
    register_vector(conn)
    cur = conn.cursor()

    # pgvector's <=> operator is cosine DISTANCE (0 = identical, 2 = opposite),
    # so similarity = 1 - distance.
    cur.execute(
        'SELECT title, content, 1 - (embedding <=> %s) AS similarity '
        'FROM "KBChunk" '
        'ORDER BY embedding <=> %s '
        'LIMIT %s;',
        (query_embedding, query_embedding, top_k),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {"title": title, "content": content, "similarity": float(sim)}
        for title, content, sim in rows
        if sim >= min_similarity
    ]