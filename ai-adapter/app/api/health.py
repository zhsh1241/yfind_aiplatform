from fastapi import APIRouter

from app.core.config import Settings, get_settings
from app.schemas.health import CapabilityStatus, HealthResponse

FEATURE_TRACE = "TASK-platform-architecture-baseline"

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="UP",
        service=settings.service_name,
        feature=FEATURE_TRACE,
        role="ai-mlops-adapter",
    )


@router.get("/capabilities", response_model=list[CapabilityStatus])
def capabilities() -> list[CapabilityStatus]:
    settings = get_settings()
    return [
        capability("label-studio", settings.label_studio_url),
        capability("mlflow", settings.mlflow_url),
        capability("workflow-engine", settings.workflow_engine_url),
        capability("kserve", settings.kserve_url),
        capability("object-storage", settings.object_storage_endpoint),
    ]


def capability(name: str, endpoint: str) -> CapabilityStatus:
    return CapabilityStatus(
        name=name,
        status="pending-confirmation" if endpoint.startswith("TODO_CONFIRM_") else "configured",
        endpoint=endpoint,
    )
