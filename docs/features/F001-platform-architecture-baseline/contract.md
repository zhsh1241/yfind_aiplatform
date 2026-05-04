# Feature Contract: Platform Architecture Baseline

## Metadata

- Feature: F001-platform-architecture-baseline
- Version: v1
- Status: draft
- Owner: contract-architect
- Created: 2026-04-29
- Updated: 2026-04-29

## Requirement Summary

- User goal: provide runnable Spring Boot backend, FastAPI AI adapter, frontend, and deploy roots for subsequent platform features.
- Business value: reduce ambiguity and make later AI-driven development traceable and verifiable.

## Scope

### In Scope

- Backend health API.
- AI adapter internal health and capability API.
- Frontend platform shell.
- Helm/Kubernetes skeleton for frontend/backend/ai-adapter.
- Component version matrix.
- Scaffold adapter alignment.

### Out of Scope

- Business APIs.
- Real authentication.
- Real database, object storage, Kubernetes, MLflow, KServe, or Label Studio integration.

## Reuse & Compatibility

- Reuse upstream service / DTO / component / permission / SQL contracts: none exist yet for business code.
- New contract surface added only because existing contracts cannot be reused: backend, ai-adapter, and frontend roots are new baseline surfaces.
- Compatibility / migration notes: future features must extend these roots rather than creating parallel roots.

## API Contract

### Endpoint

- Method: `GET`
- Path: `/api/health`
- Description: backend baseline health endpoint for local smoke verification.

### Request

No request body.

### Response

```json
{
  "status": "UP",
  "service": "yfind-aiplatform-backend",
  "feature": "TASK-platform-architecture-baseline"
}
```

### Errors

| Code | Scenario | Message |
| --- | --- | --- |
| 500 | Application startup or health check failure | Internal error |

## Frontend Contract

- Route: `/`
- Page: platform shell home.
- Required visible content:
  - project name
  - MVP flow summary
  - backend/ai-adapter/frontend/deploy baseline status cards
  - explicit note that external environment values remain pending confirmation

## AI Adapter Contract

### Health Endpoint

- Method: `GET`
- Path: `/internal/health`
- Description: internal FastAPI adapter health endpoint for local smoke verification.

Expected response:

```json
{
  "status": "UP",
  "service": "yfind-aiplatform-ai-adapter",
  "feature": "TASK-platform-architecture-baseline",
  "role": "ai-mlops-adapter"
}
```

### Capability Endpoint

- Method: `GET`
- Path: `/internal/capabilities`
- Description: reports AI/MLOps integration endpoints as pending placeholders until confirmed.

The endpoint must not contain real secrets. Placeholder endpoints must use `TODO_CONFIRM_*`.

## Deployment Contract

- Helm chart root: `deploy/helm/yfind-aiplatform`
- Values file must include frontend, backend, and ai-adapter sections and use placeholders for external values.
- Templates must not contain real credentials, cluster names, domains, or registry paths.

## Notes

- Freeze this contract before broad implementation starts.
