from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AI_ADAPTER_", env_file=".env", extra="ignore")

    service_name: str = "yfind-aiplatform-ai-adapter"
    label_studio_url: str = "TODO_CONFIRM_LABEL_STUDIO_URL"
    mlflow_url: str = "TODO_CONFIRM_MLFLOW_URL"
    workflow_engine_url: str = "TODO_CONFIRM_WORKFLOW_ENGINE_URL"
    kserve_url: str = "TODO_CONFIRM_KSERVE_URL"
    object_storage_endpoint: str = "TODO_CONFIRM_OBJECT_STORAGE_ENDPOINT"


@lru_cache
def get_settings() -> Settings:
    return Settings()
