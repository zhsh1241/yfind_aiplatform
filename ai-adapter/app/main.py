from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.training import router as training_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="YFI AI Platform Adapter",
        version="0.1.0",
        description="Internal FastAPI adapter for AI/MLOps integrations.",
    )
    app.include_router(health_router, prefix="/internal", tags=["platform"])
    app.include_router(training_router, prefix="/internal", tags=["training"])
    return app


app = create_app()
