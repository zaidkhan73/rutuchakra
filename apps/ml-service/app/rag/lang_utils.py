"""
app/rag/lang_utils.py
-----------------------
Shared language-name map + prompt-instruction builder for the RAG chatbot.
Mirrors the same convention already used in app/ml/inference.py for the
prediction-advice generation (same language codes, same "write your entire
response in X" instruction style), so the chatbot and the result page's AI
text stay consistent. Deliberately NOT imported from inference.py, so RAG
changes can never risk the already-working prediction pipeline.
"""

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi (Devanagari script)",
    "mr": "Marathi (Devanagari script)",
}


def build_lang_line(language: str) -> str:
    """Final, forceful language instruction -- placed at the very end of the
    prompt (right before the model answers) because Gemini follows the last
    instruction it reads far more reliably than one buried mid-prompt."""
    if language == "en" or language not in LANGUAGE_NAMES:
        return ""
    lang_name = LANGUAGE_NAMES[language]
    return (
        f"\n\nIMPORTANT -- language: Write your entire reply in {lang_name}, in {lang_name} script only. "
        f"Do not switch to English and do not write Hinglish (Romanized {lang_name}, or English words mixed "
        f"into {lang_name} sentences). The only exceptions are the terms \"PCOD\" and \"PCOS\" themselves, "
        f"which may stay in English. Every other word -- including common everyday words -- must be in "
        f"{lang_name}, not English."
    )