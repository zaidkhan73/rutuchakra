"""app/rag/rails/text.py -- text normalisation shared by the input and output rails."""

import re
import unicodedata

_DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")


def normalize(text: str) -> str:
    """
    For MATCHING only (never shown to users): NFKC folds full-width / stylised letters
    ("ｉｇｎｏｒｅ" -> "ignore"), then invisible format characters (zero-width space/joiner,
    soft hyphen, BOM) are dropped so "ig<ZWSP>nore" can't dodge a pattern.
    """
    t = unicodedata.normalize("NFKC", text or "")
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Cf")
    return re.sub(r"\s+", " ", t).strip()


def ascii_digits(text: str) -> str:
    """Marathi/Hindi digits -> 0-9, so '१२०' and '120' compare equal."""
    return text.translate(_DEVANAGARI_DIGITS)