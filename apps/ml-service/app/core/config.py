"""
app/core/config.py
------------------
Single source of truth for configuration. Reads environment variables (and
apps/ml-service/.env in development), validates them at startup, and exposes
one cached `Settings` object.

Legacy uppercase attributes (DATABASE_URL, GEMINI_API_KEY, ...) are kept as
read-only properties so the existing planner/retriever/generator/kb_ingest
modules keep working unchanged until they are replaced in later phases.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- app ---
    app_env: Literal["development", "production"] = "development"
    log_level: str = "INFO"
    # Comma-separated. Node -> ml-service is server-to-server, so production
    # normally needs no browser origins at all.
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # --- service-to-service auth (Node backend -> ml-service) ---
    internal_api_key: SecretStr | None = None

    # --- data stores ---
    database_url: str | None = None
    redis_url: str | None = None

    # --- provider keys (each optional; the LLM factory uses what is present) ---
    gemini_api_key: SecretStr | None = None
    groq_api_key: SecretStr | None = None
    openrouter_api_key: SecretStr | None = None
    hf_token: SecretStr | None = None

    # --- model ids (change via env, no code change needed when a provider renames) ---
    gemini_model: str = "gemini-2.5-flash"
    groq_model_main: str = "openai/gpt-oss-120b"
    groq_model_alt: str = "qwen/qwen3.6-27b"
    groq_model_fast: str = "openai/gpt-oss-20b"
    groq_model_fast_alt: str = "openai/gpt-oss-120b"
    openrouter_model: str = "openrouter/free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # --- embeddings (existing KB is gemini-embedding-001 @ 768 dims) ---
    embedding_model: str = "gemini-embedding-001"
    embedding_dim: int = 768

    # --- LLM call behaviour ---
    llm_timeout_s: float = 30.0
    llm_max_retries: int = 1  # keep low: we prefer failing over to the next provider

    @model_validator(mode="after")
    def _production_requires_internal_key(self):
        if self.app_env == "production" and self.internal_api_key is None:
            raise ValueError("INTERNAL_API_KEY must be set when APP_ENV=production")
        return self

    # --- helpers ---
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @staticmethod
    def _plain(secret: SecretStr | None) -> str | None:
        return secret.get_secret_value() if secret else None

    # --- legacy names used by existing modules ---
    @property
    def DATABASE_URL(self): return self.database_url
    @property
    def GEMINI_API_KEY(self): return self._plain(self.gemini_api_key)
    @property
    def GROQ_API_KEY(self): return self._plain(self.groq_api_key)
    @property
    def EMBEDDING_MODEL(self): return self.embedding_model
    @property
    def EMBEDDING_DIM(self): return self.embedding_dim
    @property
    def GENERATION_MODEL(self): return self.gemini_model

    def validate(self):  # legacy: kb_ingest.py calls config.validate()
        missing = [n for n, v in [("DATABASE_URL", self.database_url),
                                  ("GEMINI_API_KEY", self.gemini_api_key)] if not v]
        if missing:
            raise RuntimeError(f"Missing required environment variable(s): {', '.join(missing)}. Check your .env file.")


@lru_cache
def get_settings() -> Settings:
    return Settings()