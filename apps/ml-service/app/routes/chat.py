import asyncio
import logging

from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.rag.graph import messages
from app.rag.schemas import ChatRequest, ChatResponse

router = APIRouter()
log = logging.getLogger("chat_route")


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    s = get_settings()
    history = [h.model_dump() for h in payload.history]
    try:
        from app.rag.graph import get_chat_graph
        out = await asyncio.wait_for(
            get_chat_graph().ainvoke({
                "message": payload.message,
                "history": history,
                "user_context": payload.userContext,
                "language": payload.language,
            }),
            timeout=s.chat_timeout_s,
        )
        return out["result"]
    except asyncio.TimeoutError:
        # Providers hung or are rate-limited. Answer inside Node's 65 s window with a normal reply
        # instead of letting Node time out (and retry) -- the user can simply ask again.
        log.error("chat request exceeded %.0fs; returning fallback", s.chat_timeout_s)
        return {"answer": messages.pick(messages.GROUNDED_FAILED_FALLBACK, payload.language), "groundedInKB": False,
                "sourcesUsed": [], "category": "error:timeout", "citations": []}
    except Exception:
        log.exception("chat pipeline error")
        # Node forwards `detail` to the browser, so keep internals out of it.
        raise HTTPException(status_code=500, detail="The chat service had a problem. Please try again.")