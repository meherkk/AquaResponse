from fastapi import APIRouter, Query

from app import startup
from app.models.responses import Incident

router = APIRouter(tags=["incidents"])


@router.get("/fire-incidents", response_model=list[Incident])
def get_fire_incidents(
    county: str | None = Query(default=None, description="Filter by county name"),
):
    data = startup.incidents_data or []

    if county:
        data = [d for d in data if county.lower() in d["counties"].lower()]

    return data
