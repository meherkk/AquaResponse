import math

from fastapi import APIRouter, Query

from app import startup
from app.models.responses import WaterSource

router = APIRouter(tags=["water"])


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.get("/water-sources", response_model=list[WaterSource])
def get_water_sources(
    type: str | None = Query(default=None, description="Filter by type: hydrant or lake"),
    lat: float | None = Query(default=None, ge=-90, le=90, description="Latitude for spatial filter"),
    lon: float | None = Query(default=None, ge=-180, le=180, description="Longitude for spatial filter"),
    radius_km: float | None = Query(default=None, gt=0, le=500, description="Radius in km for spatial filter"),
):
    sources = startup.water_sources or []

    if type:
        sources = [s for s in sources if s["type"] == type]

    if lat is not None and lon is not None and radius_km is not None:
        sources = [s for s in sources if _haversine_km(lat, lon, s["lat"], s["lon"]) <= radius_km]

    return sources
