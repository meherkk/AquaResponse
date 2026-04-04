def test_fire_incidents_returns_list(client):
    resp = client.get("/fire-incidents")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
