"""
app/rag/rails/output_rails.py
-----------------------------
Deterministic checks on a drafted answer, no extra LLM call:

  empty            nothing came back                                         (hard)
  prompt_leak      the answer echoes our instructions                        (hard)
  diagnosis_claim  "you have PCOD/PCOS" -- an app cannot diagnose            (hard)
  ungrounded_dose  a drug amount (mg, ml, tablets...) that is in neither the
                   retrieved sources nor the user's own message/data         (hard)
  ungrounded_number any other number+unit (minutes, %, days, kg...) not in the
                   sources                                                   (soft: logged; hard if strict)

Why numbers: in testing the model turned "30 minutes a day" into "about 120 minutes a week"
and added "say 500 mg" to a metformin answer -- neither appeared in the sources.
"""

import re
from dataclasses import dataclass

from app.rag.rails.text import ascii_digits, normalize


@dataclass(frozen=True)
class Violation:
    code: str
    detail: str
    hard: bool


_LEAK_MARKERS = ("tone rules", "rules for facts", "reference information", "system prompt",
                 "you are rutuchakra", "recent conversation:", "correction: your previous draft")

_DIAGNOSIS = re.compile(
    r"\byou\s+(?:definitely\s+|certainly\s+|clearly\s+|do\s+)?(?:have|are suffering from|are diagnosed with)\s+(?:pcod|pcos|pmos|polycystic)"
    r"|आपको\s*(?:PCOD|PCOS|पीसीओडी|पीसीओएस)\s*है"
    r"|तुम्हाला\s*(?:PCOD|PCOS|पीसीओडी|पीसीओएस)\s*आहे",
    re.IGNORECASE,
)

_DOSE_UNITS = (r"mg|mcg|µg|μg|gm|grams?|g|ml|iu|units?|tablets?|pills?|capsules?"
               r"|मिग्रा|मि\.?ग्रॅ|मिलीग्राम|ग्रॅम|ग्राम|गोळी|गोली|गोलियां")
_OTHER_UNITS = (r"kg|kcal|calories?|%|percent|minutes?|mins?|hours?|hrs?|days?|weeks?|months?"
                r"|मिनिट|मिनट|तास|घंटे|दिवस|दिन|आठवड|हफ्त|सप्ताह|महिन")
_NUM_UNIT = re.compile(rf"(?<![\w.])(\d+(?:\.\d+)?)\s*-?\s*({_DOSE_UNITS}|{_OTHER_UNITS})(?![A-Za-z])", re.IGNORECASE)
_DOSE_ONLY = re.compile(rf"(?:{_DOSE_UNITS})", re.IGNORECASE)
_NUMBER = re.compile(r"\d+(?:\.\d+)?")


def _canon(n: str) -> str:
    return f"{float(n):g}"


def check_output(answer: str, *, evidence: str, category: str, strict_numbers: bool = False) -> list[Violation]:
    """`evidence` = everything the answer may legitimately quote: source chunks + user data + user message."""
    text = normalize(answer)
    if not text:
        return [Violation("empty", "", True)]

    found: list[Violation] = []
    low = text.lower()
    for marker in _LEAK_MARKERS:
        if marker in low:
            found.append(Violation("prompt_leak", marker, True))
            break
    if category != "pcod_related":
        return found

    if _DIAGNOSIS.search(text):
        found.append(Violation("diagnosis_claim", "states the user has PCOD/PCOS", True))

    known = {_canon(n) for n in _NUMBER.findall(ascii_digits(normalize(evidence)))}
    seen: set[str] = set()
    for m in _NUM_UNIT.finditer(ascii_digits(text)):
        num, unit = m.group(1), m.group(2)
        key = f"{_canon(num)} {unit.lower()}"
        if _canon(num) in known or key in seen:
            continue
        seen.add(key)
        if _DOSE_ONLY.fullmatch(unit):
            found.append(Violation("ungrounded_dose", f"{num} {unit}", True))
        else:
            found.append(Violation("ungrounded_number", f"{num} {unit}", strict_numbers))
    return found