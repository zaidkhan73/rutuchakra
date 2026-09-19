"""
app/rag/pipeline.py
---------------------
Ties guardrails -> planner -> retriever -> generator together into one call.
This is the single entry point the FastAPI route uses.
"""

from app.rag.guardrails import check_input, inject_disclaimer, validate_output, log_guardrail_event
from app.rag.planner import classify
from app.rag.retriever import retrieve
from app.rag.generator import generate_small_talk_reply, generate_out_of_scope_reply, generate_grounded_reply

_BLOCKED_REPLIES = {
    "empty_input": "Looks like that message came through empty -- could you try again?",
    "input_too_long": "That's a bit long for me to work with -- could you shorten it?",
    "jailbreak_pattern": "I can't follow instructions like that, but I'm happy to help with PCOD/PCOS questions.",
    "toxic_content": "Let's keep this a respectful space -- happy to help with PCOD/PCOS questions whenever you're ready.",
}


def run_chat(message: str, history: list[dict], user_context: str | None = None) -> dict:
    """
    Returns:
        answer        str   the reply to show the user
        groundedInKB  bool  whether this answer was grounded in retrieved KB chunks
        sourcesUsed   list  titles of KB chunks used (empty if not grounded)
        category      str   the planner's classification, for logging/debugging
    """
    allowed, block_reason = check_input(message)
    if not allowed:
        return {
            "answer": _BLOCKED_REPLIES.get(block_reason, "I can't help with that message."),
            "groundedInKB": False,
            "sourcesUsed": [],
            "category": f"blocked:{block_reason}",
        }

    category = classify(message)

    if category == "small_talk":
        answer = generate_small_talk_reply(message, history)
        if not validate_output(answer):
            log_guardrail_event("output_validation_failed")
            answer = "Hey! How can I help today?"
        return {"answer": answer, "groundedInKB": False, "sourcesUsed": [], "category": category}

    if category == "out_of_scope":
        answer = generate_out_of_scope_reply(message)
        if not validate_output(answer):
            log_guardrail_event("output_validation_failed")
            answer = "I can only help with PCOD/PCOS and this app's features -- happy to help with those!"
        return {"answer": answer, "groundedInKB": False, "sourcesUsed": [], "category": category}

    # pcod_related
    chunks = retrieve(message)
    answer = generate_grounded_reply(message, chunks, history, user_context)

    if not validate_output(answer):
        log_guardrail_event("output_validation_failed")
        answer = "I wasn't able to put together a good answer for that -- could you try rephrasing?"
    else:
        answer = inject_disclaimer(answer, category)

    return {
        "answer": answer,
        "groundedInKB": len(chunks) > 0,
        "sourcesUsed": [c["title"] for c in chunks],
        "category": category,
    }