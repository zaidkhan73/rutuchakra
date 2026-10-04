import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.core.middleware import RequestContextMiddleware
from app.core.security import require_internal_key
from app.llm.factory import configured_providers
from app.routes.chat import router as chat_router
from app.routes.predict import router as predict_router

settings = get_settings()
setup_logging(settings.log_level)
log = logging.getLogger("startup")


@asynccontextmanager
async def lifespan(_: FastAPI):
    log.info("env=%s providers=%s internal_auth=%s",
             settings.app_env, configured_providers(settings), settings.internal_api_key is not None)
    if settings.internal_api_key is None:
        log.warning("INTERNAL_API_KEY not set -- routes are UNPROTECTED (allowed in development only)")
    yield


app = FastAPI(title="RutuChakra ML Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Internal-Key", "X-Request-Id"],
)
app.add_middleware(RequestContextMiddleware)

# Everything except health checks requires the internal key.
protected = [Depends(require_internal_key)]
app.include_router(predict_router, dependencies=protected)
app.include_router(chat_router, dependencies=protected)


@app.get("/")
def root():
    return {"status": "ok", "service": "rutuchakra-ml-service"}


@app.get("/health")
def health():
    """Liveness: process is up. Used by Render / UptimeRobot."""
    return {"healthy": True}


@app.get("/ready")
def ready():
    """Readiness: at least one LLM provider is configured."""
    providers = configured_providers(settings)
    return {"ready": bool(providers), "providers": providers}