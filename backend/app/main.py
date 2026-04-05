import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import startup
from app.config import settings
from app.routers import incidents, risk, route as route_router, water


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run blocking file I/O in a thread so the event loop stays free (Python 3.14+)
    startup.risk_data = await asyncio.to_thread(startup.load_risk_data)
    startup.water_sources = await asyncio.to_thread(startup.load_water_sources)
    startup.incidents_data = await asyncio.to_thread(startup.load_incidents)
    # Road graph (osmnx download) is skipped at startup — routing falls back to
    # straight-line distances which is fast and sufficient for the app.
    startup.road_graph = None
    yield


app = FastAPI(title="AquaResponse API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.cors_origins == "*" else settings.cors_origins.split(","),
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
