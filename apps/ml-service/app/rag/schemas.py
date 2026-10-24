from pydantic import BaseModel


class ChatHistoryItem(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatHistoryItem] = []
    userContext: str | None = None
    language: str = "en"


class Citation(BaseModel):
    title: str
    docType: str = ""
    year: int | None = None
    page: int | None = None
    pageEnd: int | None = None


class ChatResponse(BaseModel):
    answer: str
    groundedInKB: bool
    sourcesUsed: list[str]
    category: str
    citations: list[Citation] = []  # additive: older clients simply ignore it