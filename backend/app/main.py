import os
from pathlib import Path

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import FileResponse

from app.modules.auth.router import router as auth_router
from app.modules.events.router import router as events_router
from app.modules.events.router_activities import router as activities_router
from app.modules.insights.router import router as insights_router

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

app = FastAPI(title="Timelapse", version="0.1.0")

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

origins = [
    "http://localhost:5174",
    os.environ.get("FRONTEND_URL", ""),
]
origins = [o for o in origins if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(activities_router, prefix="/api")
app.include_router(insights_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.exception_handler(StarletteHTTPException)
    async def spa_handler(request, exc):
        if exc.status_code == 404 and not request.url.path.startswith("/api"):
            return FileResponse(str(frontend_dist / "index.html"))
        raise exc

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(frontend_dist / "index.html"))
