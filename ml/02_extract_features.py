"""Step 2: Extract spatial features for each H3 cell."""

import sys
from math import radians

import geopandas as gpd
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree
from shapely.geometry import Point

from config import ARTIFACTS_DIR, DATA_DIR, LA_OC_BBOX

GRID_PATH = ARTIFACTS_DIR / "grid.geojson"
OUT_PATH = ARTIFACTS_DIR / "features.parquet"

# EPSG:3857 (Web Mercator) for meter-based distances
CRS_METERS = "EPSG:3857"
CRS_WGS84 = "EPSG:4326"


def load_grid():
    if not GRID_PATH.exists():
        print(f"ERROR: {GRID_PATH} not found. Run 01_build_h3_grid.py first.")
        sys.exit(1)
    gdf = gpd.read_file(GRID_PATH)
    gdf = gdf.set_crs(CRS_WGS84, allow_override=True)
    return gdf


def load_fire_hazard():
    shp = DATA_DIR / "fire_hazard" / "fhsz_sra.shp"
    if not shp.exists():
        print(f"ERROR: {shp} not found.")
        sys.exit(1)
    gdf = gpd.read_file(shp)
    if gdf.crs is None:
        gdf = gdf.set_crs(CRS_WGS84)
    else:
        gdf = gdf.to_crs(CRS_WGS84)
    return gdf


def load_hydrants():
    path = DATA_DIR / "ca_hydrants_osm.geojson"
    if not path.exists():
        print(f"ERROR: {path} not found.")
        sys.exit(1)
    gdf = gpd.read_file(path)
    # Lat/lon are in properties, not geometry coordinates
    gdf["geometry"] = gdf.apply(lambda r: Point(float(r["lon"]), float(r["lat"])), axis=1)
    gdf = gdf.set_crs(CRS_WGS84, allow_override=True)
    # Filter to LA/OC bbox for performance
    gdf = gdf.cx[
        LA_OC_BBOX["min_lon"]:LA_OC_BBOX["max_lon"],
        LA_OC_BBOX["min_lat"]:LA_OC_BBOX["max_lat"],
    ]
    print(f"Hydrants in bbox: {len(gdf)}")
    return gdf


def load_lakes():
    shp = DATA_DIR / "lakes" / "California_Lakes.shp"
    if not shp.exists():
        print(f"ERROR: {shp} not found.")
        sys.exit(1)
    gdf = gpd.read_file(shp)
    if gdf.crs is None:
        gdf = gdf.set_crs(CRS_WGS84)
    else:
        gdf = gdf.to_crs(CRS_WGS84)
    return gdf


def load_incidents():
    path = DATA_DIR / "California_Fire_Incidents.csv"
    if not path.exists():
        print(f"ERROR: {path} not found.")
        sys.exit(1)
    df = pd.read_csv(path)
    # Filter to LA/OC
    df = df[df["Counties"].str.contains("Los Angeles|Orange", case=False, na=False)].copy()
    df = df.dropna(subset=["Latitude", "Longitude"])
    print(f"LA/OC fire incidents: {len(df)}")
    return df


def extract_haz_class(grid, hazard):
    """Spatial join: assign fire hazard severity to each cell centroid."""
    haz_map = {"Moderate": 1, "High": 2, "Very High": 3}

    centroids = grid[["h3_index"]].copy()
    centroids["geometry"] = grid.apply(
        lambda r: Point(r["centroid_lon"], r["centroid_lat"]), axis=1
    )
    centroids = gpd.GeoDataFrame(centroids, crs=CRS_WGS84)

    joined = gpd.sjoin(centroids, hazard[["geometry", "HAZ_CLASS"]], how="left", predicate="within")
    # Drop duplicate joins (cell in overlapping zones) — keep highest hazard
    joined["haz_encoded"] = joined["HAZ_CLASS"].map(haz_map).fillna(0).astype(int)
    joined = joined.sort_values("haz_encoded", ascending=False).drop_duplicates(
        subset="h3_index", keep="first"
    )
    return joined.set_index("h3_index")["haz_encoded"]


def compute_hydrant_features(grid, hydrants):
    """Compute distance to nearest hydrant and hydrant density within 5km."""
    # Project to meters
    grid_proj = grid.copy()
    grid_proj["geometry"] = grid_proj.apply(
        lambda r: Point(r["centroid_lon"], r["centroid_lat"]), axis=1
    )
    grid_proj = gpd.GeoDataFrame(grid_proj, crs=CRS_WGS84).to_crs(CRS_METERS)

    hydrants_proj = hydrants.to_crs(CRS_METERS)

    grid_coords = np.array([(g.x, g.y) for g in grid_proj.geometry])
    hydrant_coords = np.array([(g.x, g.y) for g in hydrants_proj.geometry])

    if len(hydrant_coords) == 0:
        return pd.Series(np.nan, index=grid["h3_index"]), pd.Series(0, index=grid["h3_index"])

    tree = cKDTree(hydrant_coords)

    # Nearest hydrant distance
    dists, _ = tree.query(grid_coords, k=1)
    dist_km = dists / 1000.0

    # Count within 5km
    counts = tree.query_ball_point(grid_coords, r=5000.0)
    density = np.array([len(c) for c in counts])

    return (
        pd.Series(dist_km, index=grid["h3_index"].values),
        pd.Series(density, index=grid["h3_index"].values),
    )


def compute_lake_distance(grid, lakes):
    """Distance from each cell centroid to nearest lake centroid."""
    grid_proj = grid.copy()
    grid_proj["geometry"] = grid_proj.apply(
        lambda r: Point(r["centroid_lon"], r["centroid_lat"]), axis=1
    )
    grid_proj = gpd.GeoDataFrame(grid_proj, crs=CRS_WGS84).to_crs(CRS_METERS)

    lakes_proj = lakes.to_crs(CRS_METERS)
    lake_centroids = np.array([(g.centroid.x, g.centroid.y) for g in lakes_proj.geometry])

    grid_coords = np.array([(g.x, g.y) for g in grid_proj.geometry])

    if len(lake_centroids) == 0:
        return pd.Series(np.nan, index=grid["h3_index"].values)

    tree = cKDTree(lake_centroids)
    dists, _ = tree.query(grid_coords, k=1)
    return pd.Series(dists / 1000.0, index=grid["h3_index"].values)


def compute_incident_features(grid, incidents):
    """Historical fire count and total acres within 15km of each cell."""
    grid_proj = grid.copy()
    grid_proj["geometry"] = grid_proj.apply(
        lambda r: Point(r["centroid_lon"], r["centroid_lat"]), axis=1
    )
    grid_proj = gpd.GeoDataFrame(grid_proj, crs=CRS_WGS84).to_crs(CRS_METERS)

    inc_gdf = gpd.GeoDataFrame(
        incidents,
        geometry=[Point(lon, lat) for lon, lat in zip(incidents["Longitude"], incidents["Latitude"])],
        crs=CRS_WGS84,
    ).to_crs(CRS_METERS)

    grid_coords = np.array([(g.x, g.y) for g in grid_proj.geometry])
    inc_coords = np.array([(g.x, g.y) for g in inc_gdf.geometry])
    acres = incidents["AcresBurned"].fillna(0).values

    if len(inc_coords) == 0:
        return (
            pd.Series(0, index=grid["h3_index"].values),
            pd.Series(0.0, index=grid["h3_index"].values),
        )

    tree = cKDTree(inc_coords)
    nearby = tree.query_ball_point(grid_coords, r=15000.0)

    fire_counts = np.array([len(n) for n in nearby])
    total_acres = np.array([acres[n].sum() if len(n) > 0 else 0.0 for n in nearby])

    return (
        pd.Series(fire_counts, index=grid["h3_index"].values),
        pd.Series(total_acres, index=grid["h3_index"].values),
    )


def main():
    print("Loading grid...")
    grid = load_grid()
    n = len(grid)
    print(f"Grid cells: {n}")

    print("Loading fire hazard zones...")
    hazard = load_fire_hazard()

    print("Extracting haz_class_encoded...")
    haz_series = extract_haz_class(grid, hazard)

    print("Loading hydrants...")
    hydrants = load_hydrants()

    print("Computing hydrant features...")
    dist_hydrant, density_hydrant = compute_hydrant_features(grid, hydrants)

    print("Loading lakes...")
    lakes = load_lakes()

    print("Computing lake distance...")
    dist_lake = compute_lake_distance(grid, lakes)

    print("Loading incidents...")
    incidents = load_incidents()

    print("Computing incident features...")
    fire_counts, total_acres = compute_incident_features(grid, incidents)

    # Assemble feature DataFrame
    features = pd.DataFrame({
        "h3_index": grid["h3_index"].values,
        "centroid_lat": grid["centroid_lat"].values,
        "centroid_lon": grid["centroid_lon"].values,
        "haz_class_encoded": haz_series.reindex(grid["h3_index"].values).values,
        "dist_to_nearest_hydrant_km": dist_hydrant.values,
        "hydrant_density_5km": density_hydrant.values,
        "dist_to_nearest_lake_km": dist_lake.values,
        "historical_fire_count": fire_counts.values,
        "total_acres_nearby": total_acres.values,
    })

    features.to_parquet(OUT_PATH, index=False)
    print(f"Saved features for {len(features)} cells to {OUT_PATH}")
    print(features.describe())


if __name__ == "__main__":
    main()
