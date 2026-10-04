"""
Run from apps/ml-service with venv active:  python -m scripts.llm_smoke
Pings every configured provider individually, then the full fallback chain.
"""
import time

from app.core.config import get_settings
from app.llm.factory import _make_model, build_llm, chain_spec


def main():
    s = get_settings()
    for role in ("generate", "fast"):
        print(f"\n== role: {role}")
        for provider, model in chain_spec(role, s):
            m = _make_model(provider, model, 0.0, s)
            if m is None:
                print(f"  - {provider}:{model}  SKIPPED (no key)")
                continue
            t = time.perf_counter()
            try:
                out = m.invoke("Reply with exactly one word: pong").content
                print(f"  - {provider}:{model}  OK  {time.perf_counter()-t:.1f}s  -> {str(out)[:40]!r}")
            except Exception as e:
                print(f"  - {provider}:{model}  FAIL  {type(e).__name__}: {str(e)[:120]}")
        print("  chain:", repr(build_llm(role).invoke("Say hi in 3 words").content)[:80])


if __name__ == "__main__":
    main()