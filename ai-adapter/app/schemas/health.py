from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    feature: str
    role: str


class CapabilityStatus(BaseModel):
    name: str
    status: str
    endpoint: str = Field(description="Configured endpoint or TODO_CONFIRM_* placeholder.")
