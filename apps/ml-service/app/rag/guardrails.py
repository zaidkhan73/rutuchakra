"""
app/rag/guardrails.py
-----------------------
Self-contained safety layer -- deliberately NOT the NeMo Guardrails library.
NeMo requires a C++ build toolchain (the `annoy` dependency) which is a real
pain on Windows, and its current release/versioning looked unstable when
checked. This module implements the same *functional* checklist from the
architecture spec's guardrails section, in plain Python:

  - input validation (length/empty)
  - jailbreak / prompt-injection pattern detection
  - basic toxicity keyword filter
  - topic-scope enforcement (delegated to planner.classify)
  - grounding / hallucination mitigation (delegated to retriever's similarity threshold)
  - medical-safety disclaimer injection
  - output validation (non-empty, doesn't leak the prompt template)
  - audit logging of guardrail *events*, never full flagged message content
"""

import re
import logging

logger = logging.getLogger("guardrails")
logging.basicConfig(level=logging.INFO)

MAX_MESSAGE_LENGTH = 1000

# Common jailbreak / prompt-injection phrasings. Not exhaustive -- this is a
# pattern filter, not a security boundary against a determined attacker, but
# it catches the overwhelming majority of casual jailbreak attempts.
# NOTE: English-only pattern list -- a Hindi/Marathi-phrased jailbreak attempt
# would not be caught by this layer. Same "not a security boundary" caveat as
# documented above; not addressed as part of this multilingual pass.
_JAILBREAK_PATTERNS = [
    r"ignore (all |any |the )?(previous|prior|above) instructions",
    r"disregard (all |any |the )?(previous|prior|above) instructions",
    r"you are now",
    r"act as (if )?you (are|were)",
    r"pretend (you are|to be)",
    r"system prompt",
    r"reveal your (instructions|prompt|rules)",
    r"jailbreak",
    r"developer mode",
    r"do anything now",
    r"\bDAN\b",
]
_JAILBREAK_RE = re.compile("|".join(_JAILBREAK_PATTERNS), re.IGNORECASE)

# Deliberately short and conservative -- a real toxicity classifier would
# catch far more, but this is a same-language, zero-dependency backstop for
# the most blatant cases. Not a substitute for a proper moderation model.
_TOXIC_WORDS = {"idiot", "stupid", "kill yourself", "hate you"}

_DIAGNOSIS_DISCLAIMER = {
    "en": ("\n\n(This is general information, not a diagnosis -- please check with a "
           "gynaecologist for anything specific to you.)"),
    "hi": ("\n\n(यह सामान्य जानकारी है, कोई निदान नहीं — अपने लिए विशेष किसी भी मामले के लिए "
           "कृपया स्त्री रोग विशेषज्ञ से जांच कराएं।)"),
    "mr": ("\n\n(ही सर्वसाधारण माहिती आहे, निदान नाही — तुमच्यासाठी विशिष्ट कोणत्याही गोष्टीसाठी "
           "कृपया स्त्रीरोगतज्ज्ञांकडून तपासणी करून घ्या.)"),
}


def check_input(message: str) -> tuple[bool, str | None]:
    """Returns (is_allowed, block_reason). block_reason is None if allowed."""
    if not message or not message.strip():
        return False, "empty_input"

    if len(message) > MAX_MESSAGE_LENGTH:
        return False, "input_too_long"

    if _JAILBREAK_RE.search(message):
        log_guardrail_event("jailbreak_pattern_blocked")
        return False, "jailbreak_pattern"

    lowered = message.lower()
    if any(word in lowered for word in _TOXIC_WORDS):
        log_guardrail_event("toxicity_blocked")
        return False, "toxic_content"

    return True, None


def inject_disclaimer(answer: str, category: str, language: str = "en") -> str:
    """Appends a medical-safety disclaimer to any grounded PCOD-related answer."""
    if category == "pcod_related":
        return answer + _DIAGNOSIS_DISCLAIMER.get(language, _DIAGNOSIS_DISCLAIMER["en"])
    return answer


def validate_output(answer: str) -> bool:
    """Basic sanity check on the generated response before it reaches the user."""
    if not answer or not answer.strip():
        return False
    if "you are ruth" in answer.lower() or "tone rules:" in answer.lower():
        # Would indicate the model echoed the system prompt instead of answering.
        return False
    return True


def log_guardrail_event(event_type: str) -> None:
    """Audit trail for the paper's 'system robustness' section -- logs that a
    rail fired and which one, never the actual flagged message content."""
    logger.info(f"guardrail_event category={event_type}")