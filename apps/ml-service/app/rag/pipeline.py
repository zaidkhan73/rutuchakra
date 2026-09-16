"""
app/rag/pipeline.py
---------------------
Ties planner -> retriever -> generator together into one call. This is the
single entry point the FastAPI route uses.
"""

from app.rag.planner import classify
from app.rag.retriever import retrieve
from app.rag.generator import generate_small_talk_reply, generate_out_of_scope_reply, generate_grounded_reply


def run_chat(message: str, history: list[dict], user_context: str | None = None) -> dict:
    """
    Returns:
        answer        str   the reply to show the user
        groundedInKB  bool  whether this answer was grounded in retrieved KB chunks
        sourcesUsed   list  titles of KB chunks used (empty if not grounded)
        category      str   the planner's classification, for logging/debugging
    """
    category = classify(message)

    if category == "small_talk":
        return {
            "answer": generate_small_talk_reply(message, history),
            "groundedInKB": False,
            "sourcesUsed": [],
            "category": category,
        }

    if category == "out_of_scope":
        return {
            "answer": generate_out_of_scope_reply(message),
            "groundedInKB": False,
            "sourcesUsed": [],
            "category": category,
        }

    # pcod_related
    chunks = retrieve(message)
    answer = generate_grounded_reply(message, chunks, history, user_context)
    return {
        "answer": answer,
        "groundedInKB": len(chunks) > 0,
        "sourcesUsed": [c["title"] for c in chunks],
        "category": category,
    }