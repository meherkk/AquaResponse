import logging
import math

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app import startup
from app.models.responses import RouteRequest, RouteResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["routing"])

_EARTH_RADIUS_KM = 6371.0


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return _EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.post("/route")
def compute_route(req: RouteRequest):
    sources = startup.water_sources or []
    n = req.n

    # Compute haversine distance for all sources
    scored = []
    for ws in sources:
        d = _haversine_km(req.lat, req.lon, ws["lat"], ws["lon"])
        scored.append((d, ws))

    scored.sort(key=lambda x: x[0])

    graph = startup.road_graph

    # --- Fallback: no road graph ---
    if graph is None:
        routes = []
        for dist_km, ws in scored[:n]:
            routes.append({
                "id": ws["id"],
                "type": ws["type"],
                "name": ws["name"],
                "lat": ws["lat"],
                "lon": ws["lon"],
                "distance_km": round(dist_km, 2),
                "geometry": [],
            })
        return RouteResponse(
            routes=routes,
            message="Road graph unavailable — distances are straight-line estimates",
        )

    # --- Road-network routing ---
    try:
        import networkx as nx
        import osmnx as ox

        origin_node = ox.nearest_nodes(graph, req.lon, req.lat)

        # Pre-filter: take 50 closest by haversine, route only those
        candidates = scored[:50]

        routed = []
        for _, ws in candidates:
            dest_node = ox.nearest_nodes(graph, ws["lon"], ws["lat"])
            try:
                length_m = nx.shortest_path_length(graph, origin_node, dest_node, weight="length")
            except nx.NetworkXNoPath:
                continue
            routed.append((length_m, ws, dest_node))

        routed.sort(key=lambda x: x[0])
        top = routed[:n]

        routes = []
        for length_m, ws, dest_node in top:
            path = nx.shortest_path(graph, origin_node, dest_node, weight="length")
            geometry = [[graph.nodes[node]["x"], graph.nodes[node]["y"]] for node in path]
            routes.append({
                "id": ws["id"],
                "type": ws["type"],
                "name": ws["name"],
                "lat": ws["lat"],
                "lon": ws["lon"],
                "distance_km": round(length_m / 1000, 2),
                "geometry": geometry,
            })

        return RouteResponse(
            routes=routes,
            message=f"Top {len(routes)} water sources by road distance",
        )
    except Exception:
        logger.exception("Road-network routing failed")
        return JSONResponse(
            status_code=500,
            content={"detail": "Routing computation failed"},
        )
