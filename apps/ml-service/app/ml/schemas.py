from pydantic import BaseModel


class Symptoms(BaseModel):
    weightGain: bool
    facialHair: bool
    skinDark: bool
    hairLoss: bool
    acne: bool


class PredictRequest(BaseModel):
    age: float
    weight: float
    height: float
    cycleLen: int
    symptoms: Symptoms
    fastFood: bool
    exercise: bool


class TopFactor(BaseModel):
    factor: str
    impact: str
    weight: float


class PredictResponse(BaseModel):
    probability: float
    risk_level: str
    advice: str
    top_factors: list[TopFactor]
    ai_advice: str
