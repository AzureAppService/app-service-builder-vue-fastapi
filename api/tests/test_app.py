from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_reports_health_and_api_status():
    health = client.get("/api/health")
    status = client.get("/api/status")

    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    assert health.json()["app"] == "app-service-builder-vue-fastapi-api"
    assert status.status_code == 200
    assert status.json()["status"] == "available"


def test_reports_deployment_identity():
    app_version = client.get("/api/version").json()

    assert app_version["app"] == "app-service-builder-vue-fastapi-api"
    assert app_version["framework"].startswith("FastAPI ")
    assert app_version["runtime"]


def test_echoes_json_without_requiring_cross_origin_access():
    response = client.post("/api/echo", json={"message": "hello"})

    assert response.status_code == 200
    assert response.json() == {"received": {"message": "hello"}}


def test_returns_selected_request_metadata_without_credentials():
    response = client.get(
        "/api/request",
        headers={
            "user-agent": "sample-test",
            "x-forwarded-proto": "https",
            "authorization": "Bearer sample-test",
            "cookie": "sample=test",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "method": "GET",
        "path": "/api/request",
        "headers": {
            "host": "testserver",
            "userAgent": "sample-test",
            "forwardedProto": "https",
        },
    }


def test_reports_public_runtime_markers(monkeypatch):
    monkeypatch.setenv("DEPLOYMENT_MARKER", "deployment-test")
    monkeypatch.setenv("RUNTIME_MARKER", "runtime-test")

    assert client.get("/api/health").json()["deploymentMarker"] == "deployment-test"
    app_version = client.get("/api/version").json()
    assert app_version["deploymentMarker"] == "deployment-test"
    assert app_version["runtimeMarker"] == "runtime-test"


def test_returns_api_misses_as_json():
    response = client.get("/api/missing")

    assert response.status_code == 404
    assert response.json() == {
        "error": "not_found",
        "message": "The requested API route does not exist.",
    }
