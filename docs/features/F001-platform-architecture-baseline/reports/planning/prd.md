> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-platform-architecture-baseline.md`

# PRD: F001-platform-architecture-baseline

## Problem

The repository currently has architecture documents and AI scaffold surfaces but no executable Spring Boot backend, FastAPI AI adapter, frontend, or deployment baseline. Future features need stable roots, commands, and conventions before implementation can be safe and repeatable.

## Goals

- Create the first formal feature directory for platform baseline work.
- Initialize backend, ai-adapter, frontend, and deploy skeletons.
- Record component version decisions and open infrastructure confirmations.
- Ensure scaffold commands understand real backend, service, and frontend paths.

## Users

- AI coding agents executing feature work.
- Engineers joining the project.
- Architects reviewing technology choices.
- DevOps engineers preparing private Kubernetes deployment.

## Functional Requirements

- Backend skeleton exposes a health endpoint and testable build.
- AI adapter skeleton exposes internal health/capability endpoints and testable Python commands.
- Frontend skeleton renders a platform shell and has lint/test/build scripts.
- Deploy skeleton documents Helm/Kubernetes placeholders for frontend/backend/ai-adapter.
- Feature documents capture plan, contract, test plan, risks, and acceptance criteria.
- `ai-scaffold.config.json` points to `backend/`, `ai-adapter/`, and `frontend/`.

## Non-goals

- Implement user login, permissions, datasets, labeling, training, model registry, inference, or edge deployment.
- Connect to real external infrastructure.
- Finalize production CI/CD.

## Success Criteria

- `docs/features/F001-platform-architecture-baseline/plan.md` exists with `plan_status: draft`.
- `backend/`, `ai-adapter/`, `frontend/`, and `deploy/` exist.
- Backend, AI adapter, and frontend smoke checks can run locally after dependencies are installed.
- Scaffold doctor reports backend as `backend`, service as `ai-adapter`, and frontend as `frontend`.
- Open infrastructure items remain explicit and searchable.
