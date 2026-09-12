"""
app/ml/train.py
----------------
Builds features from the raw Kaggle dataset, splits BEFORE any class
balancing (avoids the leakage found in the original pipeline), trains a
class-weight-balanced RandomForest, calibrates its probabilities, and
saves all artifacts needed by inference.py.

Run from apps/ml-service/:
    python -m app.ml.train
"""

import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, roc_auc_score, brier_score_loss, classification_report

_BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_DATA_PATH = os.path.join(_BASE, "data", "PCOS_data_without_infertility.xlsx")
_MODEL_DIR = os.path.join(_BASE, "models")

# Raw Kaggle column -> our feature name.
# NOTE: 'Cycle length(days)' is deliberately excluded — verified against the
# original dataset that this column is a coded 0-12 value, NOT literal days,
# and has no reliable real-world mapping. See docs/02_ml_model_and_explainability.md.
_COLUMN_MAP = {
    " Age (yrs)": "age",
    "Weight (Kg)": "weight_kg",
    "Height(Cm) ": "height_cm",
    "BMI": "bmi",
    "Weight gain(Y/N)": "weight_gain",
    "hair growth(Y/N)": "facial_hair_growth",
    "Skin darkening (Y/N)": "skin_darkening",
    "Hair loss(Y/N)": "hair_loss",
    "Pimples(Y/N)": "pimples",
    "Fast food (Y/N)": "fast_food",
    "Reg.Exercise(Y/N)": "regular_exercise",
    "Cycle(R/I)": "_cycle_ri_raw",
    "PCOS (Y/N)": "pcos_label",
}

_CONTINUOUS_COLS = ["age", "weight_kg", "height_cm", "bmi"]


def build_features() -> pd.DataFrame:
    raw = pd.read_excel(_DATA_PATH, sheet_name="Full_new")
    df = raw[list(_COLUMN_MAP.keys())].rename(columns=_COLUMN_MAP).copy()

    # Confirmed against pcos_cleaned.xlsx: 2 = regular -> 0, 4/5 = irregular -> 1
    df["cycle_regularity"] = (df["_cycle_ri_raw"] != 2).astype(int)
    df = df.drop(columns=["_cycle_ri_raw"])

    # Confirmed against pcos_cleaned.xlsx: flag=1 exactly when age > 40
    df["age_outside_typical_range"] = (df["age"] > 40).astype(int)

    return df.dropna()


def main():
    os.makedirs(_MODEL_DIR, exist_ok=True)
    df = build_features()
    y = df["pcos_label"]
    X_raw = df.drop(columns=["pcos_label"])

    # Split BEFORE normalization and BEFORE any balancing — this is what
    # the original pipeline got wrong, causing inflated test metrics.
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X_raw, y, test_size=0.2, random_state=42, stratify=y
    )

    # Fit normalization bounds on the TRAIN split only, then apply to both.
    norm_params = {c: (X_train_raw[c].min(), X_train_raw[c].max()) for c in _CONTINUOUS_COLS}

    def normalize(X):
        X = X.copy()
        for c, (lo, hi) in norm_params.items():
            X[c] = (X[c].clip(lo, hi) - lo) / (hi - lo)
        return X

    X_train = normalize(X_train_raw)
    X_test = normalize(X_test_raw)
    feature_cols = X_train.columns.tolist()

    # class_weight='balanced' handles the imbalance natively — no synthetic
    # oversampling, so there's no risk of train/test leakage from it.
    base_rf = RandomForestClassifier(
        n_estimators=200, max_depth=8, class_weight="balanced", random_state=42
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(base_rf, X_train, y_train, cv=cv, scoring="roc_auc")
    print(f"5-fold CV ROC-AUC (train only): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Calibrated model: what /predict actually uses for the probability shown to users.
    calibrated_model = CalibratedClassifierCV(base_rf, method="sigmoid", cv=5)
    calibrated_model.fit(X_train, y_train)

    # Separate plain (uncalibrated) RF for SHAP — CalibratedClassifierCV wraps
    # multiple cloned estimators internally, which TreeExplainer can't read directly.
    explainer_model = RandomForestClassifier(
        n_estimators=200, max_depth=8, class_weight="balanced", random_state=42
    )
    explainer_model.fit(X_train, y_train)

    proba = calibrated_model.predict_proba(X_test)[:, 1]
    preds = (proba >= 0.5).astype(int)

    print("\n=== Held-out test set (never touched by balancing) ===")
    print("Accuracy:", accuracy_score(y_test, preds))
    print("ROC-AUC:", roc_auc_score(y_test, proba))
    print("Brier score:", brier_score_loss(y_test, proba))
    print(classification_report(y_test, preds))

    joblib.dump(calibrated_model, os.path.join(_MODEL_DIR, "pcos_model.pkl"))
    joblib.dump(explainer_model, os.path.join(_MODEL_DIR, "explainer_model.pkl"))
    joblib.dump(feature_cols, os.path.join(_MODEL_DIR, "columns.pkl"))
    joblib.dump(norm_params, os.path.join(_MODEL_DIR, "norm_params.pkl"))
    print(f"\nArtifacts saved to {_MODEL_DIR}")


if __name__ == "__main__":
    main()
