"""
app/ml/inference.py
--------------------
Loads the trained artifacts once at import time, then exposes predict_pcos()
for the FastAPI route to call. Feature engineering here MUST mirror train.py
exactly, or the model sees a different distribution than it was trained on
(this was the root cause of the bugs found during review).
"""

import logging
import os
import joblib


from app.ml.advice import generate_advice

log = logging.getLogger("inference")

_BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_MODEL_DIR = os.path.join(_BASE, "models")

_model = joblib.load(os.path.join(_MODEL_DIR, "pcos_model.pkl"))
_explainer_model = joblib.load(os.path.join(_MODEL_DIR, "explainer_model.pkl"))
_columns = joblib.load(os.path.join(_MODEL_DIR, "columns.pkl"))
_norm_params = joblib.load(os.path.join(_MODEL_DIR, "norm_params.pkl"))

import shap
_shap_explainer = shap.TreeExplainer(_explainer_model)



# Standard clinical definition: a menstrual cycle of 21-35 days is regular.
_REGULAR_CYCLE_RANGE = (21, 35)

_FEATURE_LABELS = {
    "age": "Age",
    "weight_kg": "Weight",
    "height_cm": "Height",
    "bmi": "BMI",
    "weight_gain": "Unexplained weight gain",
    "facial_hair_growth": "Excess facial/body hair",
    "skin_darkening": "Skin darkening",
    "hair_loss": "Hair loss / thinning",
    "pimples": "Persistent acne",
    "fast_food": "Frequent fast food",
    "regular_exercise": "Lack of regular exercise",
    "cycle_regularity": "Irregular menstrual cycle",
    "age_outside_typical_range": "Age outside typical PCOS onset range",
}


def _norm(value: float, lo: float, hi: float) -> float:
    return (max(lo, min(hi, float(value))) - lo) / (hi - lo)


def _validate(data: dict) -> None:
    required = ["age", "weight", "height", "cycleLen", "symptoms", "fastFood", "exercise"]
    for key in required:
        if key not in data:
            raise ValueError(f"Missing required field: '{key}'")
    try:
        float(data["age"]); float(data["weight"]); float(data["height"]); int(data["cycleLen"])
    except (TypeError, ValueError):
        raise ValueError("age, weight, height, and cycleLen must be numbers.")
    for key in ["weightGain", "facialHair", "skinDark", "hairLoss", "acne"]:
        if key not in data.get("symptoms", {}):
            raise ValueError(f"Missing symptom key: '{key}'")


def _build_features(data: dict):
    import pandas as pd

    age, weight, height = float(data["age"]), float(data["weight"]), float(data["height"])
    cycle_days = int(data["cycleLen"])
    sym = data["symptoms"]
    bmi = weight / ((height / 100) ** 2)
    b = lambda v: 1 if v else 0

    lo, hi = _norm_params["age"]
    age_n = _norm(age, lo, hi)
    lo, hi = _norm_params["weight_kg"]
    weight_n = _norm(weight, lo, hi)
    lo, hi = _norm_params["height_cm"]
    height_n = _norm(height, lo, hi)
    lo, hi = _norm_params["bmi"]
    bmi_n = _norm(bmi, lo, hi)

    # Regularity is derived server-side from the day count using a standard
    # clinical threshold — the raw day count itself is never fed to the model.
    is_irregular = not (_REGULAR_CYCLE_RANGE[0] <= cycle_days <= _REGULAR_CYCLE_RANGE[1])

    feature_map = {
        "age": age_n,
        "weight_kg": weight_n,
        "height_cm": height_n,
        "bmi": bmi_n,
        "weight_gain": b(sym.get("weightGain")),
        "facial_hair_growth": b(sym.get("facialHair")),
        "skin_darkening": b(sym.get("skinDark")),
        "hair_loss": b(sym.get("hairLoss")),
        "pimples": b(sym.get("acne")),
        "fast_food": b(data.get("fastFood")),
        "regular_exercise": b(data.get("exercise")),
        "cycle_regularity": int(is_irregular),
        "age_outside_typical_range": int(age > 40),
    }
    ordered = {col: feature_map[col] for col in _columns}
    return pd.DataFrame([ordered]), ordered


def _classify_risk(prob: float):
    if prob < 0.35:
        return "Low", ("Your responses suggest a low likelihood of PCOS at this time. "
                        "Maintain a balanced diet, stay physically active, and keep track "
                        "of any new symptoms.")
    elif prob < 0.65:
        return "Moderate", ("Some factors associated with PCOS are present. Start regular "
                             "exercise, reduce processed food, maintain a consistent sleep "
                             "schedule, and consider a gynaecologist check-up.")
    else:
        return "High", ("Multiple strong indicators associated with PCOS were detected. "
                         "Please consult a qualified gynaecologist or endocrinologist for a "
                         "thorough clinical evaluation. Do not self-medicate.")


def _top_factors(feature_row: dict, n: int = 4) -> list:
    """SHAP-based top contributing factors for THIS prediction, human-readable."""
    import pandas as pd
    df = pd.DataFrame([feature_row])[_columns]
    sv = _shap_explainer(df)
    # sv.values shape: (1, n_features, n_classes) — take class 1 (PCOS positive)
    class_idx = 1 if sv.values.ndim == 3 else None
    values = sv.values[0, :, class_idx] if class_idx is not None else sv.values[0]

    contributions = sorted(
        zip(_columns, values), key=lambda x: abs(x[1]), reverse=True
    )[:n]

    return [
        {
            "factor": _FEATURE_LABELS.get(col, col),
            "impact": "increases" if val > 0 else "decreases",
            "weight": round(abs(float(val)), 4),
        }
        for col, val in contributions
    ]










def predict_pcos(raw_data: dict) -> dict:
    _validate(raw_data)
    features_df, feature_row = _build_features(raw_data)

    pcos_prob = float(_model.predict_proba(features_df)[0][1])
    risk_level, advice = _classify_risk(pcos_prob)
    top_factors = _top_factors(feature_row)
    language = raw_data.get("language", "en")
    advice_result = generate_advice(raw_data, pcos_prob, risk_level, language)
    log.info("advice source=%s flags=%s", advice_result.source, ",".join(advice_result.flags) or "-")

    return {
        "probability": round(pcos_prob, 4),
        "risk_level": risk_level,
        "advice": advice,
        "top_factors": top_factors,
        "ai_advice": advice_result.text,
    }