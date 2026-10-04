"""
app/core/logging.py
-------------------
Stdlib logging with a per-request id attached to every line, so one chat
request can be traced across planner -> retriever -> LLM fallbacks.
Never log message content or health data -- only ids, timings, event names.
"""

import logging
import sys
from contextvars import ContextVar

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class _RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def setup_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(_RequestIdFilter())
    handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s"
    ))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level.upper())
    # httpx logs full URLs (can include query params); keep it quiet.
    logging.getLogger("httpx").setLevel(logging.WARNING)