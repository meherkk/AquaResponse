import geopandas as gpd
import urllib.request
import json

BASE_URL = (
    "https://services.gis.ca.gov/arcgis/rest/services/Environment/"
    "Fire_Severity_Zones/MapServer/0/query"
)
PAGE_SIZE = 1000


def fetch_page(offset: int) -> dict:
    params = (
        f"?where=1%3D1"
        f"&outFields=*"
        f"&resultOffset={offset}"
        f"&resultRecordCount={PAGE_SIZE}"
        f"&f=geojson"
    )
    with urllib.request.urlopen(BASE_URL + params) as r:
        return json.loads(r.read())


def fetch_all() -> gpd.GeoDataFrame:
    all_features = []
    offset = 0

    while True:
        page = fetch_page(offset)
        features = page.get("features", [])
        if not features:
            break
        all_features.extend(features)
        print(f"  fetched {len(all_features)} features so far…")
        if len(features) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    geojson = {"type": "FeatureCollection", "features": all_features}
    return gpd.GeoDataFrame.from_features(geojson["features"], crs="EPSG:4326")


if __name__ == "__main__":
    print("Downloading SRA fire hazard severity zones…")
    gdf = fetch_all()
    print(f"\nTotal features: {len(gdf)}")
    print("HAZ_CLASS breakdown:")
    print(gdf["HAZ_CLASS"].value_counts().to_string())

    gdf.to_file("fhsz_sra.shp")
    print("\nSaved to fhsz_sra.shp")
