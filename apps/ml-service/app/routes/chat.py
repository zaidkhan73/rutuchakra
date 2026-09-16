from fastapi import APIRouter, HTTPException

from app.rag.pipeline import run_chat
from app.rag.schemas import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    try:
        result = run_chat(
            message=payload.message,
            history=[h.model_dump() for h in payload.history],
            user_context=payload.userContext,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat pipeline error: {e}")