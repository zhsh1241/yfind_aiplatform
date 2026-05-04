# yfind_aiplatform AI Adapter

FastAPI AI/MLOps adapter baseline for `F001-platform-architecture-baseline`.

## Responsibility

`ai-adapter/` is an internal service. Spring Boot remains the main platform
backend and source of truth for permissions, business state, and audit records.
This adapter encapsulates Python-first AI/MLOps integrations such as Label
Studio, MLflow, Kubeflow/Argo, KServe, object storage SDKs, and model utilities.

## Commands

```powershell
Push-Location ai-adapter
python -m compileall app tests
python -m unittest discover -s tests -v
Pop-Location
```

## Baseline API

- `GET /internal/health`
- `GET /internal/capabilities`

Business integration endpoints start in later features. Do not add real
external credentials or production URLs here; use `TODO_CONFIRM_*` placeholders
until the target environment is confirmed.


