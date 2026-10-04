"""Backward-compatible shim: old modules do `from app.config import config`."""
from app.core.config import get_settings

config = get_settings()