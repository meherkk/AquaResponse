from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import startup
from app.routers import incidents, risk, route as route_router, water


@asynccontextmanager
async def lifespan(app: FastAPI):
    startup.risk_data = startup.load_risk_data()
    startup.water_sources = startup.load_water_sources()
    startup.incidents_data = startup.load_incidents()
    startup.road_graph = startup.load_road_graph()
    yield


app = FastAPI(title="AquaResponse API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(risk.router)
app.include_router(water.router)
app.include_router(incidents.router)
app.include_router(route_router.router)


@app.get("/")
def health():
    return {"status": "ok", "service": "AquaResponse API"}
