import json
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Response

from app import startup

router = APIRouter(tags=["risk"])

VALID_SCENARIOS = {
    "risk_normal",
    "risk_moderate_offshore",
    "risk_strong_santa_ana",
    "risk_extreme_santa_ana",
    "risk_post_rain",
}


@router.get("/risk-cells")
def get_risk_cells(
    scenario: str | None = Query(default=None, description="Active risk scenario"),
):
    if scenario is not None and scenario not in VALID_SCENARIOS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid scenario. Must be one of: {sorted(VALID_SCENARIOS)}",
        )

    data = startup.risk_data or {"type": "FeatureCollection", "features": []}

    if scenario:
        data = {**data, "active_scenario": scenario}

    return Response(content=json.dumps(data), media_type="application/json")
