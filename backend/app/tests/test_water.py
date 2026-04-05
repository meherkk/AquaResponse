def test_water_sources_returns_list(client):
    resp = client.get("/water-sources")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
