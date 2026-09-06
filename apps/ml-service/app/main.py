from fastapi import FastAPI

app = FastAPI(title="RutuChakra ML/RAG Service")


@app.get("/")
def root():
    return {"status": "ok", "service": "rutuchakra-ml-service"}


@app.get("/health")
def health():
    return {"healthy": True}