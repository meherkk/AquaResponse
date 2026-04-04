"""Step 3: Label H3 cells as burned/not-burned based on historical fire incidents."""

import sys
from math import pi, sqrt

import geopandas as gpd
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree
from shapely.geometry import Point

from config import ARTIFACTS_DIR, DATA_DIR

GRID_PATH = ARTIFACTS_DIR / "grid.geojson"
OUT_PATH = ARTIFACTS_DIR / "labels.parquet"

CRS_METERS = "EPSG:3857"
CRS_WGS84 = "EPSG:4326"

MIN_BUFFER_M = 500.0


def main():
    if not GRID_PATH.exists():
        print(f"ERROR: {GRID_PATH} not found. Run 01_build_h3_grid.py first.")
        sys.exit(1)

    # Load grid
    grid = gpd.read_file(GRID_PATH).set_crs(CRS_WGS84, allow_override=True)
    print(f"Grid cells: {len(grid)}")

    # Load and filter incidents to LA/OC
    incidents = pd.read_csv(DATA_DIR / "California_Fire_Incidents.csv")
    incidents = incidents[
        incidents["Counties"].str.contains("Los Angeles|Orange", case=False, na=False)
    ].copy()
    incidents = incidents.dropna(subset=["Latitude", "Longitude", "AcresBurned"])
    print(f"LA/OC incidents with location + acres: {len(incidents)}")

    # Compute buffer radius for each incident: radius = sqrt(acres * 4047 / pi), min 500m
    incidents["radius_m"] = incidents["AcresBurned"].apply(
        lambda a: max(MIN_BUFFER_M, sqrt(abs(a) * 4047.0 / pi))
    )

    # Project everything to meters
    grid_centroids = gpd.GeoDataFrame(
        grid[["h3_index"]],
        geometry=[
            Point(lon, lat) for lon, lat in zip(grid["centroid_lon"], grid["centroid_lat"])
        ],
        crs=CRS_WGS84,
    ).to_crs(CRS_METERS)

    inc_gdf = gpd.GeoDataFrame(
        incidents,
        geometry=[
            Point(lon, lat)
            for lon, lat in zip(incidents["Longitude"], incidents["Latitude"])
        ],
        crs=CRS_WGS84,
    ).to_crs(CRS_METERS)

    grid_coords = np.array([(g.x, g.y) for g in grid_centroids.geometry])
    inc_coords = np.array([(g.x, g.y) for g in inc_gdf.geometry])
    radii = inc_gdf["radius_m"].values

    # For each cell, check if it falls within any incident buffer
    burned = np.zeros(len(grid_coords), dtype=int)

    if len(inc_coords) > 0:
        inc_tree = cKDTree(inc_coords)
        max_radius = radii.max()
        # Query all incidents within max possible radius
        nearby = inc_tree.query_ball_point(grid_coords, r=max_radius)
        for i, neighbors in enumerate(nearby):
            for j in neighbors:
                dx = grid_coords[i][0] - inc_coords[j][0]
                dy = grid_coords[i][1] - inc_coords[j][1]
                dist = sqrt(dx * dx + dy * dy)
                if dist <= radii[j]:
                    burned[i] = 1
                    break

    labels = pd.DataFrame({"h3_index": grid["h3_index"].values, "burned": burned})
    labels.to_parquet(OUT_PATH, index=False)

    n_pos = burned.sum()
    n_neg = len(burned) - n_pos
    print(f"Labeled {len(labels)} cells: {n_pos} burned ({100*n_pos/len(labels):.1f}%), "
          f"{n_neg} not burned ({100*n_neg/len(labels):.1f}%)")
    print(f"Saved to {OUT_PATH}")


if __name__ == "__main__":
    main()
