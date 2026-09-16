"""
app/rag/generator.py
----------------------
Builds the final prompt for each planner outcome and calls Gemini. Tone
matches the same "caring elder sister" voice already established in the
prediction result's advice generation (app/ml/inference.py), so the chatbot
and the result page don't feel like two different products.
"""

import os
import sys

from google import genai

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from app.config import config

_client = genai.Client(api_key=config.GEMINI_API_KEY)

_TONE_RULES = """Tone rules:
- Talk like a caring elder sister or a friendly lady doctor, not a textbook.
- Use simple, everyday words. No medical jargon, no Latin terms.
- "PCOD" is fine to say -- many Indian women know that term better than "PCOS".
- Use Indian food and lifestyle references where relevant (roti, dal, sabzi, walking, yoga).
- Keep it warm but not preachy. No bullet symbols, no asterisks, no markdown.
- Keep responses conversational length -- a few sentences, not an essay, unless the question genuinely needs more."""


def _format_history(history: list[dict]) -> str:
    if not history:
        return "(no earlier messages)"
    lines = [f"{'User' if h['role'] == 'user' else 'You'}: {h['content']}" for h in history[-6:]]
    return "\n".join(lines)


def generate_small_talk_reply(message: str, history: list[dict]) -> str:
    prompt = f"""You are RutuChakra's assistant, a warm and friendly companion for Indian women learning about PCOD/PCOS.

{_TONE_RULES}

Recent conversation:
{_format_history(history)}

The user just said: "{message}"

Reply naturally and briefly -- this is just small talk, not an informational question."""

    response = _client.models.generate_content(model=config.GENERATION_MODEL, contents=prompt)
    return response.text.strip()


def generate_out_of_scope_reply(message: str) -> str:
    prompt = f"""You are RutuChakra's assistant. You only help with PCOD/PCOS, menstrual health, and this app's own features.

{_TONE_RULES}

The user asked something outside that scope: "{message}"

Gently let them know this isn't something you can help with, and redirect them toward what you can help with (PCOD/PCOS questions, understanding their result, cycle or habit tracking). Keep it short and kind, not robotic."""

    response = _client.models.generate_content(model=config.GENERATION_MODEL, contents=prompt)
    return response.text.strip()


def generate_grounded_reply(message: str, chunks: list[dict], history: list[dict], user_context: str | None) -> str:
    if not chunks:
        # Retrieval found nothing relevant enough -- be honest about the gap
        # rather than letting the model improvise an ungrounded answer.
        context_block = "(no relevant information found in the knowledge base for this specific question)"
    else:
        context_block = "\n\n".join(f"[{c['title']}]\n{c['content']}" for c in chunks)

    user_context_block = f"\nWhat we know about this user from their own tracked data: {user_context}\n" if user_context else ""

    prompt = f"""You are RutuChakra's assistant, a warm and friendly companion for Indian women learning about PCOD/PCOS.

{_TONE_RULES}

Ground your answer in the reference information below. If the reference information doesn't actually answer the question, say so honestly and suggest they ask a doctor, rather than making something up.

Reference information:
{context_block}
{user_context_block}
Recent conversation:
{_format_history(history)}

The user asked: "{message}"

Answer their question now, grounded in the reference information above."""

    response = _client.models.generate_content(model=config.GENERATION_MODEL, contents=prompt)
    return response.text.strip()