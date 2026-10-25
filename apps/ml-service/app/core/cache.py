"""
app/core/cache.py
-----------------
Tiny async cache with one job: stop paying (quota + ~1s latency) to embed the same question twice.

  REDIS_URL set   -> RedisCache  (survives Render restarts/sleep, shared by all instances)
  REDIS_URL empty -> MemoryCache (per-process LRU+TTL; lost on every cold start)

Fail-open by design: if Redis is down or slow the cache just misses. A cache must never be
the reason a chat request fails. Only non-personal, derived data is cached (query embeddings
of the English search text) -- never chat history, user data or answers.
"""

import json
import logging
import time
from collections import OrderedDict
from functools import lru_cache
from typing import Any, Protocol

from app.core.config import Settings, get_settings

log = logging.getLogger("cache")


class Cache(Protocol):
    async def get(self, key: str) -> Any | None: ...
    async def set(self, key: str, value: Any, ttl_s: int) -> None: ...


class MemoryCache:
    def __init__(self, max_items: int = 2000):
        self._d: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self.max_items = max_items

    async def get(self, key: str) -> Any | None:
        item = self._d.get(key)
        if item is None:
            return None
        expires, value = item
        if expires < time.monotonic():
            self._d.pop(key, None)
            return None
        self._d.move_to_end(key)
        return value

    async def set(self, key: str, value: Any, ttl_s: int) -> None:
        self._d[key] = (time.monotonic() + ttl_s, value)
        self._d.move_to_end(key)
        while len(self._d) > self.max_items:
            self._d.popitem(last=False)


class RedisCache:
    def __init__(self, url: str, prefix: str = "rutuchakra:"):
        import redis.asyncio as redis  # imported here so the dependency is only needed when used

        self._r = redis.from_url(url, decode_responses=True, socket_timeout=2, socket_connect_timeout=2)
        self._prefix = prefix
        self._warned = False

    def _warn(self, e: Exception) -> None:
        if not self._warned:  # once, not on every request
            log.warning("redis unavailable (%s); continuing without cache", type(e).__name__)
            self._warned = True

    async def get(self, key: str) -> Any | None:
        try:
            raw = await self._r.get(self._prefix + key)
            return None if raw is None else json.loads(raw)
        except Exception as e:  # noqa: BLE001 - fail open
            self._warn(e)
            return None

    async def set(self, key: str, value: Any, ttl_s: int) -> None:
        try:
            await self._r.set(self._prefix + key, json.dumps(value), ex=ttl_s)
        except Exception as e:  # noqa: BLE001 - fail open
            self._warn(e)


def build_cache(settings: Settings) -> Cache:
    if settings.redis_url:
        log.info("cache backend: redis")
        return RedisCache(settings.redis_url)
    log.info("cache backend: in-process memory")
    return MemoryCache()


@lru_cache
def get_cache() -> Cache:
    """One shared cache per process."""
    return build_cache(get_settings())