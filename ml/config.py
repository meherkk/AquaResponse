from pathlib import Path

H3_RESOLUTION = 8

LA_OC_BBOX = {
    "min_lon": -119.0,
    "min_lat": 33.3,
    "max_lon": -117.4,
    "max_lat": 34.9,
}

DATA_DIR = Path(__file__).parent.parent / "data"
ARTIFACTS_DIR = Path(__file__).parent / "artifacts"

SCENARIO_MULTIPLIERS = {
    "risk_normal": 1.0,
    "risk_moderate_offshore": 1.15,
    "risk_strong_santa_ana": 1.45,
    "risk_extreme_santa_ana": 1.75,
    "risk_post_rain": 0.55,
}
