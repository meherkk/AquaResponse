#!/bin/bash
set -e
cd "$(dirname "$0")"
echo "=== Step 0: Download rasters (DEM + land cover) ==="
python 00_download_rasters.py
echo "=== Step 1: Build H3 grid ==="
python 01_build_h3_grid.py
echo "=== Step 2: Extract features ==="
python 02_extract_features.py
echo "=== Step 3: Label cells ==="
python 03_label_cells.py
echo "=== Step 4: Train model ==="
python 04_train_model.py
echo "=== Step 5: Generate risk scores ==="
python 05_generate_scores.py
echo "=== Pipeline complete. Artifacts in ml/artifacts/ ==="
