from __future__ import annotations

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import engine, Base
from app.core.security import RoleEnum

from app.api.auth_routes import router as auth_router
from app.api.employee_routes import router as employee_router
from app.api.attendance_routes import router as attendance_router
from app.api.analytics_routes import router as analytics_router
from app.api.infrastructure_routes import router as infra_router

logger = logging.getLogger(__name__)


def configure_logging():
    level = logging.DEBUG if settings.DEBUG else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized")
    except Exception as e:
        logger.warning(f"DB init (expected if no Postgres yet in SQLite/empty env): {e}")
    try:
        from app.seed_data import ensure_demo_data
        ensure_demo_data()
        logger.info("Demo data bootstrapping complete")
    except Exception as e:
        logger.warning(f"Demo seeding skipped: {e}")
    yield
    logger.info("Shutting down VisionAttend AI API")


app = FastAPI(
    title=settings.APP_NAME,
    description="VisionAttend AI — Enterprise Computer Vision Attendance & Face Validation Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "env": settings.APP_ENV,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
    }


@app.get("/api/v1/system/info", tags=["System"])
def system_info():
    return {
        "name": settings.APP_NAME,
        "tagline": "Intelligent Workforce Identity, Attendance & Security Platform",
        "version": "1.0.0",
        "roles": [r.value for r in RoleEnum],
        "thresholds": {
            "face_recognition": settings.FACE_RECOGNITION_THRESHOLD,
            "liveness": settings.LIVENESS_THRESHOLD,
            "face_quality": settings.FACE_QUALITY_THRESHOLD,
            "min_box_size": settings.MIN_BOX_SIZE,
        },
        "edge_ai_architecture": {
            "description": "Face detection, quality check, alignment, embedding extraction, and liveness scoring can run locally on edge devices (PC/CCTV workstation). Only verified attendance metadata + hashed embeddings are sent to the central server. Queued offline events sync on reconnection to avoid duplicates.",
            "edge_processes": [
                "Camera capture",
                "Face detection (local ONNX)",
                "Face alignment & quality check",
                "Embedding extraction (local ONNX)",
                "Liveness / anti-spoofing",
                "Local identity cache match",
                "Offline queue for when server is unreachable",
            ],
            "central_only": [
                "Audit log immutability",
                "Cross-site analytics",
                "Global security correlation",
                "Reporting & exports",
                "Role + permission management",
            ],
        },
    }


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please contact administrator."},
    )


api_prefix = "/api/v1"
app.include_router(auth_router, prefix=api_prefix)
app.include_router(employee_router, prefix=api_prefix)
app.include_router(attendance_router, prefix=api_prefix)
app.include_router(analytics_router, prefix=api_prefix)
app.include_router(infra_router, prefix=api_prefix)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
