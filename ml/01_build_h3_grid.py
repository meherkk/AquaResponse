"""Step 1: Tessellate the LA/OC bounding box into H3 hexagonal cells."""

import json
import sys

import h3

from config import ARTIFACTS_DIR, H3_RESOLUTION, LA_OC_BBOX


def build_grid():
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    bbox_polygon = {
        "type": "Polygon",
        "coordinates": [[
            [LA_OC_BBOX["min_lon"], LA_OC_BBOX["min_lat"]],
            [LA_OC_BBOX["max_lon"], LA_OC_BBOX["min_lat"]],
            [LA_OC_BBOX["max_lon"], LA_OC_BBOX["max_lat"]],
            [LA_OC_BBOX["min_lon"], LA_OC_BBOX["max_lat"]],
            [LA_OC_BBOX["min_lon"], LA_OC_BBOX["min_lat"]],
        ]],
    }

    hex_set = h3.geo_to_cells(bbox_polygon, H3_RESOLUTION)
    print(f"Generated {len(hex_set)} H3 cells at resolution {H3_RESOLUTION}")

    features = []
    for h3_index in hex_set:
        boundary = h3.cell_to_boundary(h3_index)  # returns [(lat, lon), ...]
        lat, lon = h3.cell_to_latlng(h3_index)

        # Convert to GeoJSON [lon, lat] order
        ring = [[lng, lt] for lt, lng in boundary]
        if ring[0] != ring[-1]:
            ring.append(ring[0])

        centroid = (lat, lon)

        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [ring],
            },
            "properties": {
                "h3_index": h3_index,
                "centroid_lat": centroid[0],
                "centroid_lon": centroid[1],
            },
        }
        features.append(feature)

    geojson = {"type": "FeatureCollection", "features": features}

    out_path = ARTIFACTS_DIR / "grid.geojson"
    with open(out_path, "w") as f:
        json.dump(geojson, f)

    print(f"Saved {len(features)} cells to {out_path}")


if __name__ == "__main__":
    build_grid()
