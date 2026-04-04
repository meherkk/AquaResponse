from pydantic import BaseModel


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
    lat: float
    lon: float
    n: int = 3


class RouteResponse(BaseModel):
    routes: list = []
    message: str = "Routing engine not yet implemented"
