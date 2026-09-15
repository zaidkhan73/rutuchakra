"""
app/config.py
--------------
Single place that reads and validates all environment variables. Import
`config` from here everywhere else instead of scattering os.getenv() calls —
makes missing-env-var failures obvious at startup rather than as a confusing
error deep inside a request handler (a common Render free-tier deploy issue).
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    DATABASE_URL = os.getenv("DATABASE_URL")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")  # optional — fallback LLM, wired in a later piece

    EMBEDDING_MODEL = "gemini-embedding-001"
    EMBEDDING_DIM = 768
    GENERATION_MODEL = "gemini-2.5-flash"

    @classmethod
    def validate(cls):
        missing = [name for name in ["DATABASE_URL", "GEMINI_API_KEY"] if not getattr(cls, name)]
        if missing:
            raise RuntimeError(
                f"Missing required environment variable(s): {', '.join(missing)}. "
                f"Check your .env file."
            )


config = Config