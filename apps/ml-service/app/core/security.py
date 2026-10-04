"""
app/core/security.py
--------------------
Service-to-service auth. The Node backend sends `X-Internal-Key`; every
ml-service route except /health and /ready requires it. Without this, anyone
who finds the public Render URL can burn the free LLM quota.
"""

import hmac

from fastapi import Header, HTTPException, status

from app.core.config import get_settings


async def require_internal_key(x_internal_key: str | None = Header(default=None)) -> None:
    expected = get_settings().internal_api_key
    if expected is None:
        # Only reachable in development (production refuses to start without a key).
        return
    supplied = (x_internal_key or "").encode()
    if not hmac.compare_digest(supplied, expected.get_secret_value().encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")