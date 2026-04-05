"""Step 5: Generate risk scores for all H3 cells under multiple wind/weather scenarios."""

import hashlib
import json
import sys

import joblib
import pandas as pd

from config import ARTIFACTS_DIR, SCENARIO_MULTIPLIERS

FEATURES_PATH = ARTIFACTS_DIR / "features.parquet"
GRID_PATH = ARTIFACTS_DIR / "grid.geojson"
MODEL_PATH = ARTIFACTS_DIR / "model.joblib"
OUT_PATH = ARTIFACTS_DIR / "risk_scores.geojson"

FEATURE_COLS = [
    "haz_class_encoded",
    "slope_deg",
    "aspect_sin",
    "aspect_cos",
    "land_cover_class",
    "dist_to_nearest_hydrant_km",
    "hydrant_density_5km",
    "dist_to_nearest_lake_km",
    "historical_fire_count",
    "total_acres_nearby",
    "centroid_lat",
    "centroid_lon",
]


def main():
    for path, step in [
        (FEATURES_PATH, "02_extract_features.py"),
        (GRID_PATH, "01_build_h3_grid.py"),
        (MODEL_PATH, "04_train_model.py"),
    ]:
        if not path.exists():
            print(f"ERROR: {path} not found. Run {step} first.")
            sys.exit(1)

    hash_path = ARTIFACTS_DIR / "model.sha256"
    if not hash_path.exists():
        print(f"ERROR: {hash_path} not found. Cannot verify model integrity.")
        sys.exit(1)
    expected_hash = hash_path.read_text().strip()
    actual_hash = hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()
    if actual_hash != expected_hash:
        print(f"ERROR: Model integrity check failed. Expected SHA-256 {expected_hash}, got {actual_hash}.")
        sys.exit(1)
    print("Model integrity verified (SHA-256 match).")

    model = joblib.load(MODEL_PATH)
    features = pd.read_parquet(FEATURES_PATH)
    print(f"Loaded features for {len(features)} cells")

    # Fill NaN same as training
    features["haz_class_encoded"] = features["haz_class_encoded"].fillna(0)
    for col in FEATURE_COLS:
        if col != "haz_class_encoded" and features[col].isna().any():
            features[col] = features[col].fillna(features[col].median())

    X = features[FEATURE_COLS]
    base_probs = model.predict_proba(X)[:, 1]
    print(f"Base probability range: [{base_probs.min():.4f}, {base_probs.max():.4f}]")

    # Load grid for geometries
    with open(GRID_PATH) as f:
        grid_geojson = json.load(f)

    # Build index from h3_index -> feature row
    h3_to_idx = {row["h3_index"]: i for i, row in features.iterrows()}

    out_features = []
    for feat in grid_geojson["features"]:
        h3_index = feat["properties"]["h3_index"]
        idx = h3_to_idx.get(h3_index)
        if idx is None:
            continue

        row = features.iloc[idx]
        base_p = float(base_probs[idx])

        props = {"h3_index": h3_index}

        # Scenario scores
        for scenario, mult in SCENARIO_MULTIPLIERS.items():
            props[scenario] = round(min(1.0, base_p * mult), 6)

        # Include all feature values (centroid_lat/lon already in FEATURE_COLS)
        for col in FEATURE_COLS:
            val = row[col]
            props[col] = round(float(val), 6) if pd.notna(val) else None

        out_features.append({
            "type": "Feature",
            "geometry": feat["geometry"],
            "properties": props,
        })

    out_geojson = {"type": "FeatureCollection", "features": out_features}

    with open(OUT_PATH, "w") as f:
        json.dump(out_geojson, f)

    print(f"Saved risk scores for {len(out_features)} cells to {OUT_PATH}")


if __name__ == "__main__":
    main()
