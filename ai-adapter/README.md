# yfind_aiplatform AI Adapter

FastAPI AI/MLOps adapter baseline for the SMP rebuild.

## Responsibility

`ai-adapter/` is an internal service. The future main platform backend remains the source of truth for permissions, business state, and audit records. This adapter encapsulates Python-first AI/MLOps integrations such as Label Studio, MLflow, Argo Workflows, KServe, object storage SDKs, and model utilities; Kubeflow Pipelines remains optional until a feature plan approves it.

Current endpoints are provisional until a new `docs/features/Fxxx-*` package freezes the corresponding contract.

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
- `GET /internal/training/templates` (placeholder)
- `POST /internal/training/submit` (placeholder)

Do not add real external credentials or production URLs here; use `TODO_CONFIRM_*` placeholders until the target environment is confirmed.
