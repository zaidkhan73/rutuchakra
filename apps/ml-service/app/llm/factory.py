"""
app/llm/factory.py
------------------
Builds chat models with an automatic provider fallback chain:

    generate : Gemini -> Groq (gpt-oss-120b) -> Groq (qwen3.6-27b) -> OpenRouter free
    fast     : Groq (gpt-oss-20b) -> Groq (gpt-oss-120b) -> Gemini
               (cheap/quick jobs: routing, grading, query rewrite, translation)

Only providers whose API key is present are included, so the app still runs
with just a Gemini key. When a call fails (429 quota, 5xx, timeout) the next
model in the chain is tried automatically.

IMPORTANT: a RunnableWithFallbacks has no `.with_structured_output()` /
`.bind_tools()`. To get a structured-output (or tool-calling) fallback chain,
pass `transform=` so it is applied to EACH model before the fallbacks are
wired:

    router = build_llm("fast", transform=lambda m: m.with_structured_output(RouteDecision))
"""

import logging
from typing import Callable, Literal

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.runnables import Runnable

from app.core.config import Settings, get_settings

log = logging.getLogger("llm")

Role = Literal["generate", "fast"]


class LLMUnavailableError(RuntimeError):
    """No provider has an API key configured."""


def _make_model(provider: str, model: str, temperature: float, s: Settings) -> BaseChatModel | None:
    common = {"temperature": temperature, "max_retries": s.llm_max_retries, "timeout": s.llm_timeout_s}

    if provider == "gemini" and s.gemini_api_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=model, google_api_key=s.gemini_api_key.get_secret_value(), **common)

    if provider == "groq" and s.groq_api_key:
        from langchain_groq import ChatGroq
        return ChatGroq(model=model, api_key=s.groq_api_key.get_secret_value(), **common)

    if provider == "openrouter" and s.openrouter_api_key:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model, api_key=s.openrouter_api_key.get_secret_value(),
                          base_url=s.openrouter_base_url, **common)

    return None


def chain_spec(role: Role, s: Settings) -> list[tuple[str, str]]:
    if role == "generate":
        return [
            ("gemini", s.gemini_model),
            ("groq", s.groq_model_main),
            ("groq", s.groq_model_alt),
            ("openrouter", s.openrouter_model),
        ]
    return [
        ("groq", s.groq_model_fast),
        ("groq", s.groq_model_fast_alt),
        ("gemini", s.gemini_model),
    ]


def build_llm(
    role: Role = "generate",
    temperature: float = 0.3,
    transform: Callable[[BaseChatModel], Runnable] | None = None,
    settings: Settings | None = None,
) -> Runnable:
    s = settings or get_settings()
    models: list[Runnable] = []
    names: list[str] = []
    for provider, model in chain_spec(role, s):
        m = _make_model(provider, model, temperature, s)
        if m is None:
            continue
        models.append(transform(m) if transform else m)
        names.append(f"{provider}:{model}")

    if not models:
        raise LLMUnavailableError(
            "No LLM provider configured. Set at least one of GEMINI_API_KEY / GROQ_API_KEY / OPENROUTER_API_KEY."
        )

    log.info("llm chain role=%s -> %s", role, " -> ".join(names))
    primary, *fallbacks = models
    return primary.with_fallbacks(fallbacks) if fallbacks else primary


def configured_providers(s: Settings | None = None) -> list[str]:
    s = s or get_settings()
    return [name for name, key in [("gemini", s.gemini_api_key), ("groq", s.groq_api_key),
                                   ("openrouter", s.openrouter_api_key)] if key]