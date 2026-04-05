import math

from pydantic import BaseModel, Field, field_validator


class WaterSource(BaseModel):
    id: str
    type: str
    name: str
    lat: float
    lon: float


class Incident(BaseModel):
    name: str
    lat: float
    lon: float
    acres_burned: float
    started: str
    counties: str
    structures_destroyed: int


class RouteRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    n: int = Field(default=3, ge=1, le=20)

    @field_validator("lat", "lon", mode="before")
    @classmethod
    def reject_nan_inf(cls, v: float) -> float:
        if not isinstance(v, (int, float)):
            raise ValueError("must be a number")
        if math.isnan(v) or math.isinf(v):
            raise ValueError("NaN and Inf are not allowed")
        return v


class RouteResponse(BaseModel):
    routes: list = []
    message: str = "Routing engine not yet implemented"
