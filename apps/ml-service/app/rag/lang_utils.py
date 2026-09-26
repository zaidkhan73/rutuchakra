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
    """Prompt instruction telling Gemini which language to answer in, or an
    empty string for English (the model's natural default)."""
    if language == "en" or language not in LANGUAGE_NAMES:
        return ""
    lang_name = LANGUAGE_NAMES[language]
    return (
        f"Write your ENTIRE response in {lang_name}. Keep \"PCOD\"/\"PCOS\" and any "
        f"clinical term with no simple equivalent in English; everything else must be "
        f"in {lang_name}.\n\n"
    )