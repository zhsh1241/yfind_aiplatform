from fastapi import FastAPI

from app.api.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="YFI AI Platform Adapter",
        version="0.1.0",
        description="Internal FastAPI adapter for AI/MLOps integrations.",
    )
    app.include_router(health_router, prefix="/internal", tags=["platform"])
    return app


app = create_app()
