"""
app/rag/rails/input_rails.py
----------------------------
Deterministic first line of defence, run BEFORE any LLM sees the message:
  empty / too long -> self-harm backstop -> prompt-injection patterns (en/hi/mr/Hinglish) -> abuse

The planner LLM does a second, language-agnostic safety read (Plan.risk). These regexes are
the cheap backstop that still works when every LLM provider is down, and they run first for
self-harm so a person in distress is never routed into the normal answer path.
"""

import re
from dataclasses import dataclass

from app.rag.rails.text import normalize

MAX_MESSAGE_LENGTH = 1000


@dataclass(frozen=True)
class Verdict:
    allowed: bool
    reason: str | None = None   # empty_input | input_too_long | self_harm | jailbreak_pattern | toxic_content


_JAILBREAK = [
    # English
    r"ignore (all |any |the )?(previous|prior|above|earlier) (instructions|rules|prompts?)",
    r"disregard (all |any |the )?(previous|prior|above|earlier) (instructions|rules|prompts?)",
    r"forget (all |any |the )?(previous|prior|above|earlier|your) (instructions|rules)",
    r"you are now\b",
    r"act as (if )?you (are|were)",
    r"pretend (you are|to be)",
    r"(system|developer) prompt",
    r"reveal your (instructions|prompt|rules)",
    r"jailbreak",
    r"developer mode",
    r"do anything now",
    r"\bDAN\b",
    # Hindi
    r"(पिछले|पहले\s*के|सभी|सारे|ऊपर\s*के)\s*(निर्देश|आदेश|नियम)\S*\s*(को\s*)?(भूल|नज़रअंदाज़|नजरअंदाज|अनदेखा|इग्नोर)",
    r"(निर्देश|आदेश|नियम)\S*\s*(को\s*)?(भूल\s*जाओ|इग्नोर|नज़रअंदाज़|नजरअंदाज)",
    r"सिस्टम\s*(प्रॉम्प्ट|प्रोम्प्ट|पॉम्प्ट)",
    r"अपने\s*(निर्देश|नियम)\S*\s*(बताओ|बताइए|दिखाओ)",
    # Marathi
    r"(आधीच्या|मागच्या|सर्व|वरच्या)\s*(सूचना|आदेश|नियम)\S*\s*(विसर|दुर्लक्ष|इग्नोर)",
    r"(सूचना|आदेश|नियम)\S*\s*(विसरा|विसर|दुर्लक्ष\s*करा|इग्नोर\s*करा)",
    r"सिस्टम\s*प्रॉम्प्ट",
    # Hinglish (Roman script)
    r"(pichle|purane|saare|sabhi|pehle ke)\s+(instructions?|nirdesh|rules?)\s+(ko\s+)?(ignore|bhool|bhul|ignore karo)",
    r"(instructions?|rules?)\s+(ko\s+)?(ignore|bhool|bhul)\s*(karo|kar do|jao)?",
    r"system\s*prompt\s*(batao|dikhao|bata do|dikha do)",
    r"tum ab\s+\w+\s+ho",
]
_JAILBREAK_RE = re.compile("|".join(_JAILBREAK), re.IGNORECASE)

_SELF_HARM = [
    r"\bsuicid\w*", r"\bkill(ing)? myself\b", r"\bend(ing)? my (own )?life\b", r"\bwant(ed)? to die\b",
    r"\bhurt(ing)? myself\b", r"\bself[- ]?harm\b", r"\bdon'?t want to live\b",
    r"आत्महत्या", r"आत्म-हत्या", r"मरना\s*चाहती", r"मर\s*जाना\s*चाहती", r"जीना\s*नहीं\s*चाहती",
    r"जान\s*दे\s*(दूं|दूँ|देना)", r"जीवन\s*(खत्म|समाप्त)\s*कर",
    r"मला\s*मरायचं", r"मरावंसं\s*वाटतं", r"जीव\s*द्यायचा", r"जगायचं\s*नाही", r"आयुष्य\s*संपव",
    r"\bmarna chahti\b", r"\bjaan de\s*(du|dungi)\b",
]
_SELF_HARM_RE = re.compile("|".join(_SELF_HARM), re.IGNORECASE)

# Deliberately short and English-only: the planner's `risk` field covers abuse in other languages.
_TOXIC_RE = re.compile(r"\b(idiot|stupid|hate you)\b|kill yourself", re.IGNORECASE)


def check_input(message: str) -> Verdict:
    if not message or not message.strip():
        return Verdict(False, "empty_input")
    if len(message) > MAX_MESSAGE_LENGTH:
        return Verdict(False, "input_too_long")

    text = normalize(message)
    if _SELF_HARM_RE.search(text):
        return Verdict(False, "self_harm")
    if _JAILBREAK_RE.search(text):
        return Verdict(False, "jailbreak_pattern")
    if _TOXIC_RE.search(text):
        return Verdict(False, "toxic_content")
    return Verdict(True)