import csv
import json
import math
from pathlib import Path

from app.config import settings

# Module-level globals — populated during app lifespan startup
risk_data: dict | None = None
water_sources: list[dict] | None = None
incidents_data: list[dict] | None = None

# LA/OC bounding box
_BBOX_LON_MIN, _BBOX_LON_MAX = -119.0, -117.4
_BBOX_LAT_MIN, _BBOX_LAT_MAX = 33.3, 34.9


def _in_bbox(lat: float, lon: float) -> bool:
    return _BBOX_LAT_MIN <= lat <= _BBOX_LAT_MAX and _BBOX_LON_MIN <= lon <= _BBOX_LON_MAX


def _mock_risk_feature_collection() -> dict:
    """Generate a small mock FeatureCollection for dev mode."""
    features = []
    for i in range(5):
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "h3_index": f"89283082803ffff_{i}",
                    "risk_normal": round(0.1 + i * 0.15, 2),
                    "risk_extreme_heat": round(0.2 + i * 0.12, 2),
                    "risk_santa_ana": round(0.3 + i * 0.10, 2),
                    "risk_drought": round(0.15 + i * 0.14, 2),
                    "risk_post_rain": round(0.05 + i * 0.08, 2),
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [-118.25 + i * 0.01, 34.05],
                            [-118.24 + i * 0.01, 34.05],
                            [-118.24 + i * 0.01, 34.06],
                            [-118.25 + i * 0.01, 34.06],
                            [-118.25 + i * 0.01, 34.05],
                        ]
                    ],
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


def load_risk_data() -> dict:
    path = Path(settings.risk_scores_path)
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return _mock_risk_feature_collection()


def load_water_sources() -> list[dict]:
    sources: list[dict] = []
    idx = 0

    # --- Hydrants ---
    hydrants_path = Path(settings.hydrants_path)
    if hydrants_path.exists():
        with open(hydrants_path) as f:
            data = json.load(f)
        for feat in data.get("features", []):
            props = feat.get("properties", {})
            lat = props.get("lat")
            lon = props.get("lon")
            if lat is not None and lon is not None and _in_bbox(lat, lon):
                sources.append(
                    {
                        "id": f"hydrant_{idx}",
                        "type": "hydrant",
                        "name": props.get("name") or f"Hydrant {idx}",
                        "lat": lat,
                        "lon": lon,
                    }
                )
                idx += 1

    # --- Lakes ---
    lakes_path = Path(settings.lakes_path)
    if lakes_path.exists():
        try:
            import geopandas as gpd

            gdf = gpd.read_file(lakes_path)
            # Reproject to WGS84 if needed
            if gdf.crs and not gdf.crs.is_geographic:
                gdf = gdf.to_crs(epsg=4326)
            for _, row in gdf.iterrows():
                centroid = row.geometry.centroid
                lat, lon = centroid.y, centroid.x
                if _in_bbox(lat, lon):
                    name = row.get("NAME") or row.get("GNIS_Name") or f"Lake {idx}"
                    sources.append(
                        {
                            "id": f"lake_{idx}",
                            "type": "lake",
                            "name": name,
                            "lat": round(lat, 6),
                            "lon": round(lon, 6),
                        }
                    )
                    idx += 1
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("Failed to load lakes shapefile: %s", exc)

    return sources


def load_incidents() -> list[dict]:
    path = Path(settings.incidents_path)
    if not path.exists():
        return []

    results: list[dict] = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            counties = row.get("Counties", "")
            if "Los Angeles" not in counties and "Orange" not in counties:
                continue
            try:
                lat = float(row["Latitude"])
                lon = float(row["Longitude"])
            except (ValueError, KeyError):
                continue
            if math.isnan(lat) or math.isnan(lon):
                continue
            results.append(
                {
                    "name": row.get("Name", ""),
                    "lat": lat,
                    "lon": lon,
                    "acres_burned": float(row.get("AcresBurned") or 0),
                    "started": row.get("Started", ""),
                    "counties": counties,
                    "structures_destroyed": int(float(row.get("StructuresDestroyed") or 0)),
                }
            )
    return results
