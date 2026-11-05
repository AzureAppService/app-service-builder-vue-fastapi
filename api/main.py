import os
import platform
from datetime import UTC, datetime
from importlib.metadata import version

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

APP_NAME = "app-service-builder-vue-fastapi-api"
APP_VERSION = "1.0.0"

app = FastAPI(
    title="App Service Builder: Vue + FastAPI sample",
    version=APP_VERSION,
    docs_url=None,
    redoc_url=None,
)


def deployment_info() -> dict[str, str]:
    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "framework": f"FastAPI {version('fastapi')}",
        "runtime": platform.python_version(),
        "deploymentMarker": os.getenv("DEPLOYMENT_MARKER", "local"),
        "runtimeMarker": os.getenv("RUNTIME_MARKER", "local"),
    }


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "app": APP_NAME,
        "deploymentMarker": os.getenv("DEPLOYMENT_MARKER", "local"),
    }


@app.get("/api/status")
async def status() -> dict[str, str]:
    return {
        "status": "available",
        "message": "The Vue frontend reached FastAPI on the same origin.",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@app.get("/api/version")
async def api_version() -> dict[str, str]:
    return deployment_info()


@app.get("/api/request")
async def request_metadata(request: Request) -> dict[str, object]:
    return {
        "method": request.method,
        "path": request.url.path,
        "headers": {
            "host": request.headers.get("host"),
            "userAgent": request.headers.get("user-agent"),
            "forwardedProto": request.headers.get("x-forwarded-proto"),
        },
    }


@app.post("/api/echo")
async def echo(request: Request) -> dict[str, object]:
    return {"received": await request.json()}


@app.exception_handler(404)
async def not_found(_request: Request, _exception: Exception):
    return JSONResponse(
        status_code=404,
        content={
            "error": "not_found",
            "message": "The requested API route does not exist.",
        },
    )


def configured_port() -> int:
    raw_port = os.getenv("PORT", "8080")

    try:
        port = int(raw_port)
    except ValueError as error:
        raise ValueError(
            f'PORT must be an integer between 1 and 65535; received "{raw_port}".'
        ) from error

    if not 1 <= port <= 65535:
        raise ValueError(
            f'PORT must be an integer between 1 and 65535; received "{raw_port}".'
        )

    return port


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=configured_port())
