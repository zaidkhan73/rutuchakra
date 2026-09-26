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
    "en": {
        "empty_input": "Looks like that message came through empty -- could you try again?",
        "input_too_long": "That's a bit long for me to work with -- could you shorten it?",
        "jailbreak_pattern": "I can't follow instructions like that, but I'm happy to help with PCOD/PCOS questions.",
        "toxic_content": "Let's keep this a respectful space -- happy to help with PCOD/PCOS questions whenever you're ready.",
        "default": "I can't help with that message.",
    },
    "hi": {
        "empty_input": "लगता है वह मैसेज खाली आया — क्या आप दोबारा कोशिश कर सकती हैं?",
        "input_too_long": "यह मेरे लिए थोड़ा लंबा है — क्या आप इसे छोटा कर सकती हैं?",
        "jailbreak_pattern": "मैं ऐसे निर्देशों का पालन नहीं कर सकता, लेकिन PCOD/PCOS से जुड़े सवालों में आपकी मदद करके खुशी होगी।",
        "toxic_content": "चलिए इसे एक सम्मानजनक जगह बनाए रखें — जब भी आप तैयार हों, PCOD/PCOS से जुड़े सवालों में मदद करने में खुशी होगी।",
        "default": "मैं इस मैसेज में मदद नहीं कर सकता।",
    },
    "mr": {
        "empty_input": "वाटतंय की तो मेसेज रिकामा आला — तुम्ही पुन्हा प्रयत्न करू शकता का?",
        "input_too_long": "हे माझ्यासाठी थोडे मोठे आहे — तुम्ही ते थोडे लहान करू शकता का?",
        "jailbreak_pattern": "मी अशा सूचनांचे पालन करू शकत नाही, पण PCOD/PCOS शी संबंधित प्रश्नांमध्ये मदत करण्यात मला आनंद आहे.",
        "toxic_content": "चला ही एक आदरयुक्त जागा ठेवूया — तुम्ही तयार असाल तेव्हा, PCOD/PCOS शी संबंधित प्रश्नांमध्ये मदत करण्यात आनंद आहे.",
        "default": "मी या मेसेजमध्ये मदत करू शकत नाही.",
    },
}

_SMALL_TALK_FALLBACK = {
    "en": "Hey! How can I help today?",
    "hi": "नमस्ते! आज मैं आपकी कैसे मदद कर सकता हूं?",
    "mr": "नमस्कार! आज मी तुम्हाला कशी मदत करू शकतो?",
}

_OUT_OF_SCOPE_FALLBACK = {
    "en": "I can only help with PCOD/PCOS and this app's features -- happy to help with those!",
    "hi": "मैं केवल PCOD/PCOS और इस ऐप की सुविधाओं में मदद कर सकता हूं — उनमें मदद करने में खुशी होगी!",
    "mr": "मी फक्त PCOD/PCOS आणि या ॲपच्या वैशिष्ट्यांमध्ये मदत करू शकतो — त्यामध्ये मदत करण्यात आनंद आहे!",
}

_GROUNDED_FAILED_FALLBACK = {
    "en": "I wasn't able to put together a good answer for that -- could you try rephrasing?",
    "hi": "मैं इसके लिए एक अच्छा जवाब नहीं बना पाया — क्या आप इसे दूसरे तरीके से पूछ सकती हैं?",
    "mr": "मला यासाठी चांगले उत्तर तयार करता आले नाही — तुम्ही ते वेगळ्या पद्धतीने विचारू शकता का?",
}


def _fallback(table: dict, language: str, key: str | None = None) -> str:
    lang_table = table.get(language, table["en"])
    if key is not None:
        return lang_table.get(key, table["en"].get(key, table["en"]["default"]))
    return lang_table


def run_chat(message: str, history: list[dict], user_context: str | None = None, language: str = "en") -> dict:
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
            "answer": _fallback(_BLOCKED_REPLIES, language, block_reason),
            "groundedInKB": False,
            "sourcesUsed": [],
            "category": f"blocked:{block_reason}",
        }

    category = classify(message)

    if category == "small_talk":
        answer = generate_small_talk_reply(message, history, language)
        if not validate_output(answer):
            log_guardrail_event("output_validation_failed")
            answer = _fallback(_SMALL_TALK_FALLBACK, language)
        return {"answer": answer, "groundedInKB": False, "sourcesUsed": [], "category": category}

    if category == "out_of_scope":
        answer = generate_out_of_scope_reply(message, language)
        if not validate_output(answer):
            log_guardrail_event("output_validation_failed")
            answer = _fallback(_OUT_OF_SCOPE_FALLBACK, language)
        return {"answer": answer, "groundedInKB": False, "sourcesUsed": [], "category": category}

    # pcod_related
    chunks = retrieve(message)
    answer = generate_grounded_reply(message, chunks, history, user_context, language)

    if not validate_output(answer):
        log_guardrail_event("output_validation_failed")
        answer = _fallback(_GROUNDED_FAILED_FALLBACK, language)
    else:
        answer = inject_disclaimer(answer, category, language)

    return {
        "answer": answer,
        "groundedInKB": len(chunks) > 0,
        "sourcesUsed": [c["title"] for c in chunks],
        "category": category,
    }