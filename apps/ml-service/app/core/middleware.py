"""
app/core/middleware.py
----------------------
Pure-ASGI request-context middleware (not BaseHTTPMiddleware) so it keeps
working when we add streaming/SSE responses in R6.
Sets a request id (reuses incoming X-Request-Id if sane), echoes it back in
the response, and logs one access line per request.
"""

import logging
import re
import time
import uuid

from app.core.logging import request_id_var

log = logging.getLogger("access")
_SAFE_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


class RequestContextMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        incoming = dict(scope["headers"]).get(b"x-request-id", b"").decode("latin-1")
        rid = incoming if _SAFE_ID.match(incoming) else uuid.uuid4().hex[:12]
        token = request_id_var.set(rid)
        start = time.perf_counter()
        status = 500

        async def send_wrapper(message):
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", rid.encode()))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            ms = (time.perf_counter() - start) * 1000
            log.info("%s %s -> %s %.0fms", scope["method"], scope["path"], status, ms)
            request_id_var.reset(token)