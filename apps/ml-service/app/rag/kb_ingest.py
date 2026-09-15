"""
app/rag/kb_ingest.py
---------------------
One-time script: loads the curated KB articles, chunks them, embeds each
chunk with Gemini's text-embedding-004, and stores them in the KBChunk table
(pgvector column) on Neon.

Run from apps/ml-service/, with the venv active:
    python -m app.rag.kb_ingest

Safe to re-run — it clears existing KBChunk rows first, so it's idempotent.
"""

import json
import os
import sys

import psycopg2
from pgvector.psycopg2 import register_vector
from google import genai

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from app.config import config

_ARTICLES_PATH = os.path.join(os.path.dirname(__file__), "data", "kb_articles.json")

_CHUNK_TARGET_WORDS = 140  # rough target chunk size; articles here are short enough that most become 1-2 chunks


def chunk_text(text: str, target_words: int = _CHUNK_TARGET_WORDS) -> list[str]:
    """Simple sentence-aware chunker: greedily groups sentences up to ~target_words per chunk."""
    sentences = [s.strip() for s in text.replace("\n", " ").split(". ") if s.strip()]
    chunks, current, word_count = [], [], 0

    for sentence in sentences:
        sentence = sentence if sentence.endswith(".") else sentence + "."
        words = len(sentence.split())
        if word_count + words > target_words and current:
            chunks.append(" ".join(current))
            current, word_count = [], 0
        current.append(sentence)
        word_count += words

    if current:
        chunks.append(" ".join(current))
    return chunks


def embed_text(client: genai.Client, text: str) -> list[float]:
    response = client.models.embed_content(
        model=config.EMBEDDING_MODEL,
        contents=[text],
        config={"output_dimensionality": config.EMBEDDING_DIM},
    )
    return response.embeddings[0].values


def main():
    config.validate()

    with open(_ARTICLES_PATH, "r", encoding="utf-8") as f:
        articles = json.load(f)

    client = genai.Client(api_key=config.GEMINI_API_KEY)

    conn = psycopg2.connect(config.DATABASE_URL)
    register_vector(conn)
    cur = conn.cursor()

    # Idempotent re-runs: clear old chunks before inserting fresh ones.
    cur.execute('DELETE FROM "KBChunk";')

    total_chunks = 0
    for article in articles:
        chunks = chunk_text(article["text"])
        for chunk in chunks:
            embedding = embed_text(client, chunk)
            cur.execute(
                'INSERT INTO "KBChunk" (id, title, content, embedding, "createdAt") '
                'VALUES (gen_random_uuid()::text, %s, %s, %s, now());',
                (article["title"], chunk, embedding),
            )
            total_chunks += 1
            print(f"Embedded chunk from '{article['title']}' ({len(chunk.split())} words)")

    conn.commit()
    cur.close()
    conn.close()
    print(f"\nDone. Inserted {total_chunks} chunks from {len(articles)} articles.")


if __name__ == "__main__":
    main()