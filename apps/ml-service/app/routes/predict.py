from fastapi import APIRouter, HTTPException

from app.ml.inference import predict_pcos
from app.ml.schemas import PredictRequest, PredictResponse

router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    try:
        result = predict_pcos(payload.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")
