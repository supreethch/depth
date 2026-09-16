"""Public, read-only market API and hypothetical simulation endpoint."""

import os
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

from depth.engine import parse_budget, simulate
from depth.market import DEMO, MarketCache, MarketUnavailable, SnapshotExpired

app = FastAPI(title="Depth", version="1.0.0")
cache = MarketCache()
origins = [
    x.strip()
    for x in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if x.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def headers(request, call_next):
    try:
        content_length = int(request.headers.get("content-length", "0"))
    except ValueError:
        content_length = 4097
    if content_length > 4096:
        from fastapi.responses import JSONResponse

        return JSONResponse({"detail": "Request too large"}, status_code=413)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0", "commit": os.getenv("RENDER_GIT_COMMIT", "local")}


@app.get("/api/book")
def book(source: Literal["live", "demo"] = "live"):
    if source == "demo":
        return DEMO.json(0)
    try:
        snapshot, degraded = cache.get()
        return snapshot.json(cache.clock(), degraded)
    except MarketUnavailable as exc:
        raise HTTPException(503, str(exc), headers={"Retry-After": "10"}) from exc


class Purchase(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    budget: str = Field(max_length=20)
    fee_bps: int = Field(default=0, ge=0, le=500)
    snapshot_id: str = Field(min_length=1, max_length=40)


@app.post("/api/simulate")
def purchase(body: Purchase):
    try:
        budget = parse_budget(body.budget)
        snapshot = cache.by_id(body.snapshot_id)
        result = simulate(snapshot.asks, budget, body.fee_bps)
        return {**result, "snapshot": snapshot.json(cache.clock())}
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except SnapshotExpired as exc:
        raise HTTPException(409, str(exc)) from exc


web = Path(os.getenv("STATIC_DIR", "frontend/dist")).resolve()
if web.exists():
    app.mount("/assets", StaticFiles(directory=web / "assets"), name="assets")

    @app.get("/")
    def index():
        return FileResponse(web / "index.html")

    @app.get("/favicon.svg")
    def favicon():
        return FileResponse(web / "favicon.svg")
