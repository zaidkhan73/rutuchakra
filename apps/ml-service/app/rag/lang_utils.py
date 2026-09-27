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
    instruction it reads far more reliably than one buried mid-prompt.

    IMPORTANT: this must return a real instruction for EVERY language,
    English included. The prompt always carries the last few ChatMessage
    rows as "Recent conversation" context regardless of the current UI
    language, so if a user switches from Hindi back to English, Gemini
    still sees Hindi text right above the new message. An empty string for
    "en" gives the model nothing to override that history with, so it just
    continues in whatever language the history was in. Every branch below
    explicitly tells the model to override the conversation history's
    language with the current one.
    """
    if language not in LANGUAGE_NAMES:
        language = "en"

    override_note = (
        " This overrides whatever language earlier messages in this conversation were in -- "
        "always follow this instruction, not the history's language."
    )

    if language == "en":
        return (
            "\n\nIMPORTANT -- language: Write your entire reply in English only, even if earlier "
            "messages in this conversation were in Hindi or Marathi. Do not switch to Hindi, "
            "Marathi, or Hinglish." + override_note
        )

    lang_name = LANGUAGE_NAMES[language]
    return (
        f"\n\nIMPORTANT -- language: Write your entire reply in {lang_name}, in {lang_name} script only. "
        f"Do not switch to English and do not write Hinglish (Romanized {lang_name}, or English words mixed "
        f"into {lang_name} sentences). The only exceptions are the terms \"PCOD\" and \"PCOS\" themselves, "
        f"which may stay in English. Every other word -- including common everyday words -- must be in "
        f"{lang_name}, not English." + override_note
    )