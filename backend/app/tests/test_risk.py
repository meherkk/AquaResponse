def test_risk_cells_returns_geojson(client):
    resp = client.get("/risk-cells")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert "features" in data


def test_risk_cells_with_valid_scenario(client):
    resp = client.get("/risk-cells?scenario=risk_normal")
    assert resp.status_code == 200
    data = resp.json()
    assert data["active_scenario"] == "risk_normal"


def test_risk_cells_invalid_scenario(client):
    resp = client.get("/risk-cells?scenario=invalid_thing")
    assert resp.status_code == 422
