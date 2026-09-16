from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.predict import router as predict_router
from app.routes.chat import router as chat_router

app = FastAPI(title="RutuChakra ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(chat_router)


@app.get("/")
def root():
    return {"status": "ok", "service": "rutuchakra-ml-service"}


@app.get("/health")
def health():
    return {"healthy": True}
