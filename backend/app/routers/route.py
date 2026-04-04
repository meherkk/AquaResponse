from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.responses import RouteRequest

router = APIRouter(tags=["routing"])


@router.post("/route", status_code=501)
def compute_route(req: RouteRequest):
    return JSONResponse(
        status_code=501,
        content={"detail": "Routing engine not yet implemented"},
    )
