from fastapi import APIRouter
from pydantic import BaseModel, Field

FEATURE_TRACE = "TASK-smp-rebuild-scaffold-baseline"

router = APIRouter()


class TrainingSubmitRequest(BaseModel):
    job_key: str = Field(min_length=1)
    dataset_key: str = Field(min_length=1)
    dataset_version_key: str = Field(min_length=1)
    template_key: str = Field(min_length=1)
    accelerator: str = Field(default="CPU")


class TrainingSubmitResponse(BaseModel):
    submission_id: str
    status: str
    queue: str
    artifact_root: str
    feature: str


@router.get("/training/templates")
def training_templates() -> list[dict[str, str]]:
    return [
        {"template_key": "small-cnn-vision", "framework": "PyTorch", "status": "adapter-placeholder"},
        {"template_key": "audio-anomaly-lite", "framework": "PyTorch", "status": "adapter-placeholder"},
        {"template_key": "tabular-quality-baseline", "framework": "scikit-learn", "status": "adapter-placeholder"},
    ]


@router.post("/training/submit", response_model=TrainingSubmitResponse)
def submit_training(request: TrainingSubmitRequest) -> TrainingSubmitResponse:
    return TrainingSubmitResponse(
        submission_id=f"adapter-placeholder-{request.job_key}",
        status="accepted",
        queue="TODO_CONFIRM_WORKFLOW_ENGINE_QUEUE",
        artifact_root=f"TODO_CONFIRM_MODEL_ARTIFACT_URI/{request.job_key}",
        feature=FEATURE_TRACE,
    )
