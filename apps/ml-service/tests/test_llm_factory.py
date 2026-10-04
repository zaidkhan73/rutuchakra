import pytest
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableWithFallbacks

from app.core.config import Settings
from app.llm.factory import LLMUnavailableError, build_llm, chain_spec


def _settings(**kw):
    return Settings(_env_file=None, **kw)


def test_no_keys_raises():
    with pytest.raises(LLMUnavailableError):
        build_llm("generate", settings=_settings())


def test_only_gemini_key_has_no_fallbacks():
    llm = build_llm("generate", settings=_settings(gemini_api_key="g"))
    assert not isinstance(llm, RunnableWithFallbacks)


def test_all_keys_build_fallback_chain():
    s = _settings(gemini_api_key="g", groq_api_key="q", openrouter_api_key="o")
    llm = build_llm("generate", settings=s)
    assert isinstance(llm, RunnableWithFallbacks)
    assert len(llm.fallbacks) == 3  # groq main, groq alt, openrouter


def test_fast_role_starts_with_groq():
    s = _settings(gemini_api_key="g", groq_api_key="q")
    assert chain_spec("fast", s)[0][0] == "groq"


def test_transform_applied_to_each_model():
    s = _settings(gemini_api_key="g", groq_api_key="q")
    seen = []
    build_llm("generate", settings=s, transform=lambda m: (seen.append(type(m).__name__) or m))
    assert len(seen) == 3  # gemini + 2 groq


def test_fallback_actually_switches_on_failure():
    class Boom(GenericFakeChatModel):
        def _generate(self, *a, **k):
            raise RuntimeError("429 quota exhausted")

    bad = Boom(messages=iter([]))
    good = GenericFakeChatModel(messages=iter([AIMessage(content="from fallback")]))
    chain = bad.with_fallbacks([good])
    assert chain.invoke("hi").content == "from fallback"