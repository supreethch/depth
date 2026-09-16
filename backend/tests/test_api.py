from fastapi.testclient import TestClient
from depth.app import app

client = TestClient(app)


def test_demo_purchase_round_trip():
    book = client.get("/api/book?source=demo").json()
    assert book["source"] == "demo"
    assert book["fetched_at"] is None
    response = client.post("/api/simulate", json={"budget": "10000", "snapshot_id": book["id"]})
    assert response.status_code == 200
    assert response.json()["snapshot"]["id"] == book["id"]
    assert response.json()["levels_used"] > 1


def test_expired_snapshot_and_invalid_input():
    assert (
        client.post("/api/simulate", json={"budget": "100", "snapshot_id": "missing"}).status_code
        == 409
    )
    assert (
        client.post("/api/simulate", json={"budget": "NaN", "snapshot_id": "demo-v1"}).status_code
        == 422
    )
    assert (
        client.post("/api/simulate", json={"budget": 100, "snapshot_id": "demo-v1"}).status_code
        == 422
    )
    assert client.get("/api/book?source=fake").status_code == 422
