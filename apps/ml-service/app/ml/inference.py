"""
app/ml/inference.py
--------------------
Loads the trained artifacts once at import time, then exposes predict_pcos()
for the FastAPI route to call. Feature engineering here MUST mirror train.py
exactly, or the model sees a different distribution than it was trained on
(this was the root cause of the bugs found during review).
"""

import os
import joblib

from dotenv import load_dotenv
load_dotenv()

try:
    from google import genai as _genai
    _GEMINI_AVAILABLE = True
except ImportError:
    _GEMINI_AVAILABLE = False

_BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_MODEL_DIR = os.path.join(_BASE, "models")

_model = joblib.load(os.path.join(_MODEL_DIR, "pcos_model.pkl"))
_explainer_model = joblib.load(os.path.join(_MODEL_DIR, "explainer_model.pkl"))
_columns = joblib.load(os.path.join(_MODEL_DIR, "columns.pkl"))
_norm_params = joblib.load(os.path.join(_MODEL_DIR, "norm_params.pkl"))

import shap
_shap_explainer = shap.TreeExplainer(_explainer_model)

_GEMINI_KEY = os.getenv("GEMINI_API_KEY")
_gemini_client = None
if _GEMINI_AVAILABLE and _GEMINI_KEY:
    try:
        _gemini_client = _genai.Client(api_key=_GEMINI_KEY)
    except Exception:
        _gemini_client = None

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


def _build_prompt(data: dict, prob: float, risk_level: str) -> str:
    age = int(float(data["age"]))
    weight, height = float(data["weight"]), float(data["height"])
    bmi = weight / ((height / 100) ** 2)
    cycle = int(data["cycleLen"])
    sym = data["symptoms"]

    bmi_label = ("weight is lower than normal" if bmi < 18.5 else
                 "weight is normal" if bmi < 25 else
                 "weight is slightly high" if bmi < 30 else
                 "weight is on the higher side")
    cycle_cat = ("periods have stopped or are very rare" if cycle <= 15 else
                 "periods come too frequently or are short" if cycle < 21 else
                 "periods are regular" if cycle <= 35 else
                 "periods are delayed or irregular")

    sym_labels = {
        "weightGain": "sudden or unexplained weight gain",
        "facialHair": "unwanted hair on face, chin, or body",
        "skinDark": "dark patches on neck, underarms, or skin folds",
        "hairLoss": "hair fall or thinning of hair",
        "acne": "pimples or acne that keep coming back",
    }
    sym_text = ", ".join(sym_labels[k] for k, v in sym.items() if v and k in sym_labels) or "no major symptoms"

    return f"""[INTERNAL CONTEXT — for your understanding only, do not include this in your response]
You are analysing a PCOS self-assessment from an Indian woman.
Clinical details:
- Age: {age} years
- BMI: {bmi:.1f} kg/m² ({bmi_label})
- Menstrual cycle: {cycle} days ({cycle_cat})
- Reported symptoms: {sym_text}
- Fast food consumption 3+ times/week: {"Yes" if data.get("fastFood") else "No"}
- Regular exercise 3+ times/week: {"Yes" if data.get("exercise") else "No"}
- ML model PCOS probability score: {prob * 100:.0f}% — classified as {risk_level} risk
[END INTERNAL CONTEXT]

OUTPUT INSTRUCTIONS:
You are like a caring elder sister or a friendly lady doctor talking to an Indian woman
who may not know medical terms. Keep language simple enough for both small-town and
big-city readers.

Tone rules:
- Talk directly and warmly, not like a report.
- Use simple everyday words. No medical jargon or Latin terms.
- "PCOD" is fine — many Indian women know that term better than "PCOS".
- Use Indian food examples (roti, dal, sabzi, ghee, maida, namkeen, cold drinks) and
  lifestyle references (morning walks, yoga, home-cooked food).
- Low risk: reassuring, not dismissive. Moderate: honest but calm. High: clear and firm
  about seeing a doctor, but not alarming.

Format — use EXACTLY these three headings, nothing else:

Your Summary
(2-3 sentences, plain language, no percentages.)

What You Can Do
(3-4 specific, actionable tips tied to her actual symptoms/lifestyle.)

When to See a Doctor
(1-2 sentences. Mention "gynaecologist" or "ladies doctor". Never say "don't worry" if risk is High.)

Keep the total response under 280 words. No bullet symbols, no asterisks, no markdown."""


def _get_gemini_advice(prompt: str) -> str:
    if not _gemini_client:
        return ("AI advice is currently unavailable — GEMINI_API_KEY is not configured. "
                "Please consult a healthcare professional for personalised guidance.")
    try:
        response = _gemini_client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        return response.text.strip()
    except Exception as exc:
        return f"Unable to generate AI advice at this time: {exc}"


def predict_pcos(raw_data: dict) -> dict:
    _validate(raw_data)
    features_df, feature_row = _build_features(raw_data)

    pcos_prob = float(_model.predict_proba(features_df)[0][1])
    risk_level, advice = _classify_risk(pcos_prob)
    top_factors = _top_factors(feature_row)
    ai_advice = _get_gemini_advice(_build_prompt(raw_data, pcos_prob, risk_level))

    return {
        "probability": round(pcos_prob, 4),
        "risk_level": risk_level,
        "advice": advice,
        "top_factors": top_factors,
        "ai_advice": ai_advice,
    }
