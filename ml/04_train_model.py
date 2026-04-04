"""Step 4: Train XGBoost classifier on extracted features and labels."""

import hashlib
import sys

import joblib
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from config import ARTIFACTS_DIR

FEATURES_PATH = ARTIFACTS_DIR / "features.parquet"
LABELS_PATH = ARTIFACTS_DIR / "labels.parquet"
MODEL_PATH = ARTIFACTS_DIR / "model.joblib"

FEATURE_COLS = [
    "haz_class_encoded",
    "dist_to_nearest_hydrant_km",
    "hydrant_density_5km",
    "dist_to_nearest_lake_km",
    "historical_fire_count",
    "total_acres_nearby",
    "centroid_lat",
    "centroid_lon",
]


def main():
    if not FEATURES_PATH.exists():
        print(f"ERROR: {FEATURES_PATH} not found. Run 02_extract_features.py first.")
        sys.exit(1)
    if not LABELS_PATH.exists():
        print(f"ERROR: {LABELS_PATH} not found. Run 03_label_cells.py first.")
        sys.exit(1)

    features = pd.read_parquet(FEATURES_PATH)
    labels = pd.read_parquet(LABELS_PATH)

    df = features.merge(labels, on="h3_index", how="inner")
    print(f"Merged dataset: {len(df)} rows")
    print(f"Class balance: {df['burned'].value_counts().to_dict()}")

    # Fill missing values
    df["haz_class_encoded"] = df["haz_class_encoded"].fillna(0)
    for col in FEATURE_COLS:
        if col != "haz_class_encoded" and df[col].isna().any():
            df[col] = df[col].fillna(df[col].median())

    X = df[FEATURE_COLS]
    y = df["burned"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")

    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(X_train, y_train)

    y_prob = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_prob)
    print(f"\nTest AUC: {auc:.4f}")

    print("\nFeature importances:")
    for col, imp in sorted(
        zip(FEATURE_COLS, model.feature_importances_), key=lambda x: -x[1]
    ):
        print(f"  {col}: {imp:.4f}")

    joblib.dump(model, MODEL_PATH)
    print(f"\nModel saved to {MODEL_PATH}")

    sha256 = hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()
    hash_path = ARTIFACTS_DIR / "model.sha256"
    hash_path.write_text(sha256)
    print(f"SHA-256 hash saved to {hash_path}")


if __name__ == "__main__":
    main()
