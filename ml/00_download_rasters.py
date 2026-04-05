"""Step 0: Download SRTM DEM tiles and ESA WorldCover land cover raster.

Sources (no auth required):
  - SRTM 1-arcsec (~30m) HGT tiles from AWS elevation-tiles-prod
  - ESA WorldCover 2021 v200 10m GeoTIFF from ESA S3

Outputs:
  data/dem/la_oc_dem.tif     — merged GeoTIFF covering LA/OC bbox
  data/landcover/ESA_WorldCover_10m_2021_v200_N33W120_Map.tif
"""

import gzip
import shutil
import sys
import urllib.request
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.merge import merge
from rasterio.transform import from_bounds

from config import DATA_DIR

DEM_DIR = DATA_DIR / "dem"
LC_DIR = DATA_DIR / "landcover"

# SRTM tiles covering bbox [-119.0, 33.3, -117.4, 34.9]
# lat floors: 33, 34 | lon floors: 118, 119 (west)
SRTM_TILES = [
    ("N33", "W119"), ("N33", "W118"),
    ("N34", "W119"), ("N34", "W118"),
]
SRTM_BASE = "https://s3.amazonaws.com/elevation-tiles-prod/skadi/{lat}/{lat}{lon}.hgt.gz"

ESA_TILE = "ESA_WorldCover_10m_2021_v200_N33W120_Map.tif"
ESA_URL = f"https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/{ESA_TILE}"


def _download(url: str, dest: Path) -> None:
    if dest.exists():
        print(f"  already exists: {dest.name}")
        return
    print(f"  downloading {dest.name} ...", end=" ", flush=True)
    with urllib.request.urlopen(url) as resp, open(dest, "wb") as f:
        shutil.copyfileobj(resp, f)
    mb = dest.stat().st_size / 1024 / 1024
    print(f"{mb:.1f} MB")


def build_dem_mosaic() -> Path:
    DEM_DIR.mkdir(parents=True, exist_ok=True)
    mosaic_path = DEM_DIR / "la_oc_dem.tif"

    if mosaic_path.exists():
        print(f"DEM mosaic already exists: {mosaic_path}")
        return mosaic_path

    tile_tifs = []
    for lat_str, lon_str in SRTM_TILES:
        gz_path = DEM_DIR / f"{lat_str}{lon_str}.hgt.gz"
        hgt_path = DEM_DIR / f"{lat_str}{lon_str}.hgt"
        tif_path = DEM_DIR / f"{lat_str}{lon_str}.tif"

        _download(SRTM_BASE.format(lat=lat_str, lon=lon_str), gz_path)

        if not hgt_path.exists():
            print(f"  decompressing {gz_path.name} ...")
            with gzip.open(gz_path, "rb") as fin, open(hgt_path, "wb") as fout:
                shutil.copyfileobj(fin, fout)

        if not tif_path.exists():
            lat_num = int(lat_str[1:])
            lon_num = -int(lon_str[1:])

            # HGT tiles can be 1201×1201 (1 arc-sec) or 3601×3601 (1/3 arc-sec)
            raw = np.frombuffer(hgt_path.read_bytes(), dtype=">i2")
            n_pixels = raw.shape[0]
            side = int(round(n_pixels ** 0.5))
            elev = raw.reshape(side, side).astype(np.float32)
            elev[elev == -32768] = np.nan

            # Geotransform: tile spans exactly 1°×1°
            # from_bounds(west, south, east, north, width, height)
            transform = from_bounds(
                lon_num, lat_num,
                lon_num + 1.0, lat_num + 1.0,
                side, side,
            )

            with rasterio.open(
                tif_path, "w",
                driver="GTiff",
                height=side, width=side,
                count=1, dtype="float32",
                crs=CRS.from_epsg(4326),
                transform=transform,
                nodata=np.nan,
            ) as dst:
                dst.write(elev, 1)
            print(f"  wrote {tif_path.name} ({side}×{side})")

        tile_tifs.append(tif_path)

    print("Merging DEM tiles...")
    datasets = [rasterio.open(p) for p in tile_tifs]
    mosaic, out_transform = merge(datasets)
    meta = datasets[0].meta.copy()
    meta.update({"height": mosaic.shape[1], "width": mosaic.shape[2], "transform": out_transform})
    with rasterio.open(mosaic_path, "w", **meta) as dst:
        dst.write(mosaic)
    for ds in datasets:
        ds.close()

    print(f"DEM mosaic saved: {mosaic_path} ({mosaic_path.stat().st_size // 1024 // 1024} MB)")
    return mosaic_path


def download_landcover() -> Path:
    LC_DIR.mkdir(parents=True, exist_ok=True)
    dest = LC_DIR / ESA_TILE
    _download(ESA_URL, dest)
    return dest


if __name__ == "__main__":
    print("=== Step 0: Download rasters ===")
    try:
        dem = build_dem_mosaic()
        lc = download_landcover()
        print(f"\nDone.\n  DEM : {dem}\n  LC  : {lc}")
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
