"""
app/rag/planner.py
--------------------
Cheap, fast classification step run before retrieval. Decides:
  - "small_talk"   -> greetings/thanks/etc., answer directly, no KB lookup needed
  - "pcod_related" -> needs KB grounding, run the retriever
  - "out_of_scope" -> not about PCOD/PCOS/this app at all, politely redirect

This is a routing decision, not a safety boundary — jailbreak/harmful-content
filtering is handled separately by the guardrails layer, not here.
"""

import os
import sys

from google import genai

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from app.config import config

_client = genai.Client(api_key=config.GEMINI_API_KEY)

_PROMPT_TEMPLATE = """Classify the user's message into exactly one category. Reply with ONLY the category word, nothing else.

Categories:
- small_talk: greetings, thanks, goodbyes, or casual chit-chat with no informational question
- pcod_related: anything about PCOD/PCOS, menstrual cycles, hormones, fertility, symptoms, diet/exercise for this condition, or this app's own features (tracking, predictions, results)
- out_of_scope: anything else (unrelated topics, general knowledge questions, other medical conditions unrelated to PCOD/PCOS)

Message: "{message}"

Category:"""


def classify(message: str) -> str:
    try:
        response = _client.models.generate_content(
            model=config.GENERATION_MODEL,
            contents=_PROMPT_TEMPLATE.format(message=message),
        )
        label = response.text.strip().lower()
        if label in ("small_talk", "pcod_related", "out_of_scope"):
            return label
    except Exception:
        pass
    # If the classifier call fails or returns something unexpected, fail
    # safe toward retrieval — grounding an uncertain query in the KB is
    # better than answering an informational question with no grounding at all.
    return "pcod_related"