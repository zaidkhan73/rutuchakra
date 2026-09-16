from pydantic import BaseModel


class ChatHistoryItem(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatHistoryItem] = []
    userContext: str | None = None


class ChatResponse(BaseModel):
    answer: str
    groundedInKB: bool
    sourcesUsed: list[str]
    category: str