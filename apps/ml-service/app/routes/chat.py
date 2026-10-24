import logging

from fastapi import APIRouter, HTTPException
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.rag.schemas import ChatRequest, ChatResponse

router = APIRouter()
log = logging.getLogger("chat_route")


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    s = get_settings()
    history = [h.model_dump() for h in payload.history]
    try:
        if s.chat_engine == "legacy":
            # Imported lazily: the legacy modules create Gemini clients at import time.
            from app.rag.pipeline import run_chat
            return await run_in_threadpool(
                run_chat, payload.message, history, payload.userContext, payload.language)

        from app.rag.graph import get_chat_graph
        out = await get_chat_graph().ainvoke({
            "message": payload.message,
            "history": history,
            "user_context": payload.userContext,
            "language": payload.language,
        })
        return out["result"]
    except Exception:
        log.exception("chat pipeline error")
        # Node forwards `detail` to the browser, so keep internals out of it.
        raise HTTPException(status_code=500, detail="The chat service had a problem. Please try again.")