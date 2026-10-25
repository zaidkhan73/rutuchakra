import logging

from fastapi import APIRouter, HTTPException

from app.ml.inference import predict_pcos
from app.ml.schemas import PredictRequest, PredictResponse

router = APIRouter()
log = logging.getLogger("predict_route")


@router.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    try:
        return predict_pcos(payload.model_dump())
    except ValueError as e:
        # input validation messages ("Missing required field: ...") are written for the caller
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        log.exception("prediction failed")
        # Node forwards `detail` to the browser, so no exception text here.
        raise HTTPException(status_code=500, detail="The prediction service had a problem. Please try again.")