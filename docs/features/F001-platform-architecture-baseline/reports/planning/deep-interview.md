> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-platform-architecture-baseline.md`
> Interview transcript: `.omx/interviews/platform-architecture-baseline-20260429.md`

# Deep Interview Spec: F001-platform-architecture-baseline

## Intent

Establish the initial executable engineering baseline for the YFI Industrial AI Small Model Platform.

## Desired Outcome

The repository contains formal F001 feature planning artifacts, backend/ai-adapter/frontend/deploy skeletons, a component version matrix, and an `ai-scaffold.config.json` wired to real project roots.

## In Scope

- Feature documents under `docs/features/F001-platform-architecture-baseline`.
- Spring Boot backend skeleton in `backend/`.
- FastAPI AI/MLOps adapter skeleton in `ai-adapter/`.
- React + TypeScript frontend skeleton in `frontend/`.
- Helm/Kubernetes deploy skeleton in `deploy/`.
- Component version matrix under `docs/architecture/`.
- Scaffold adapter path and command alignment.

## Out of Scope / Non-goals

- Business modules beyond health/shell placeholders.
- Real enterprise SSO.
- Real PostgreSQL/Redis/object storage/Kubernetes connection.
- CI provider-specific workflow.
- Dataset/labeling/training/model/inference/edge implementation.
- Real Label Studio/MLflow/Kubeflow/KServe SDK calls.

## Decision Boundaries

- Use planned default technology choices from `project.md` and `docs/architecture/02-technical-roadmap.md`.
- Keep unconfirmed external values as placeholders.
- Do not introduce business-domain schema before corresponding feature plans exist.

## Exception Scenarios

- Dependency resolution failure: preserve files and report blocked verification.
- Existing generated files: update conservatively without deleting unrelated content.
- Missing environment: use templates and `TODO_CONFIRM_*` placeholders.
