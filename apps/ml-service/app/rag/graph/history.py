"""
app/rag/graph/history.py
------------------------
Chat history stays in Postgres (Node's ChatMessage table is the system of record, per user, and is
deleted with the account). The ML service is stateless: Node sends the recent messages, and this
module decides how much of them may enter a prompt.

Why a budget: Node sends the last N messages untouched. A few long past answers would otherwise
dominate every prompt (slower, costlier, and a bigger surface for injected text). Deterministic
trimming only -- no LLM summarising, so no risk of a summary inventing medical facts.
"""


def trim_history(history: list[dict], *, max_turns: int, max_chars: int = 3000, per_message_chars: int = 500) -> list[dict]:
    msgs = []
    for h in history or []:
        content = str(h.get("content") or "").strip()
        if content:
            msgs.append({"role": "assistant" if h.get("role") == "assistant" else "user", "content": content})
    msgs = msgs[-max_turns:] if max_turns > 0 else []

    kept: list[dict] = []
    budget = max_chars
    for m in reversed(msgs):                       # newest first: recent context matters most
        text = m["content"]
        if len(text) > per_message_chars:
            text = text[:per_message_chars].rstrip() + " ..."
        if len(text) > budget:
            break
        kept.append({"role": m["role"], "content": text})
        budget -= len(text)
    kept.reverse()
    while kept and kept[0]["role"] != "user":      # don't open mid-exchange with an orphan reply
        kept.pop(0)
    return kept