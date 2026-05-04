# Task: Platform Architecture Baseline

## Metadata

- Feature: F001-platform-architecture-baseline
- ID: TASK-platform-architecture-baseline
- Status: completed
- Prerequisite: `plan.md` is approved (`plan_status: approved`) for normal feature implementation; this baseline task is explicitly requested by the project owner to bootstrap the repository.
- Owner: codex
- Created: 2026-04-29
- Updated: 2026-04-29

## 1. Requirement Summary

### User Story

As a project engineer or AI coding agent, I want a runnable Spring Boot backend, FastAPI AI adapter, frontend, deploy, and scaffold baseline so that later feature work can be implemented against stable repository roots and commands.

### Business Value

- Turns the planning-only repository into an executable project workspace.
- Establishes consistent commands for future AI agents and engineers.
- Prevents future features from inventing their own structure.

## 2. Scope

### In Scope

- [x] Create F001 feature documents.
- [x] Create `backend/` Spring Boot skeleton.
- [x] Create `ai-adapter/` FastAPI AI/MLOps adapter skeleton.
- [x] Create `frontend/` React TypeScript skeleton.
- [x] Create `deploy/` Helm/Kubernetes skeleton.
- [x] Create component version matrix.
- [x] Verify scaffold, backend, and frontend commands.

### Out of Scope

- Real SSO/IAM integration.
- Real database/object storage/Kubernetes connection.
- Business domain modules after health/shell placeholders.
- CI provider-specific pipeline.

## 3. Technical Analysis

### Backend

- Entity: none for F001.
- Service: health/smoke only.
- API: `GET /api/health`.
- Build: Maven, Java 21, Spring Boot 3.

### AI Adapter

- Entity: none for F001.
- Service: internal health/capability smoke only.
- API: `GET /internal/health`, `GET /internal/capabilities`.
- Build: uv, Python 3.12, FastAPI.
- Ownership: internal adapter for Label Studio, MLflow, Kubeflow/Argo, KServe, object storage, and Python model utilities in later features.

### Frontend

- Pages: platform shell home page.
- Components: app shell, status cards.
- Stores: none for F001.
- Build: npm scripts for lint, test, build, e2e placeholder.

### Database

- Tables: none for F001.
- Migrations: none for F001.
- Feature SQL: `docs/features/F001-platform-architecture-baseline/sql/`

### Reuse Plan

- Existing backend seams to reuse: Spring Boot main platform in `backend/`.
- Existing AI adapter seams to reuse: FastAPI internal service in `ai-adapter/`.
- Existing frontend seams to reuse: none yet; use React/Vite conventions.
- Existing SQL / permissions / test fixtures to reuse: none yet.
- New seams allowed only if existing seams cannot be reused, because: `backend/`, `ai-adapter/`, `frontend/`, and `deploy/` are the first implementation roots.

## 4. Acceptance Criteria

- [x] **AC-01**: F001 `plan.md`, `TASK.md`, `contract.md`, `test-plan.md`, and planning reports exist.
- [x] **AC-02**: Backend exposes `GET /api/health` and `mvn -f backend/pom.xml test` passes.
- [x] **AC-03**: AI adapter exposes `GET /internal/health`, reports placeholder capabilities, and Python compileall/unittest checks pass.
- [x] **AC-04**: Frontend renders the platform shell and `Push-Location frontend; npm run lint; Pop-Location`, `test:ci`, and `build` pass.
- [x] **AC-05**: Deploy skeleton includes Helm chart, values template, and environment notes for frontend/backend/ai-adapter without real secrets.
- [x] **AC-06**: `docs/architecture/component-version-matrix.md` records selected defaults and pending confirmations.
- [x] **AC-07**: `node tools/ai-scaffold/dist/cli.js doctor` reports backend `backend`, service `ai-adapter`, and frontend `frontend`.

### 4.1 Definition of Done

- [x] `contract.md` created for baseline surfaces.
- [x] `test-plan.md` references all `AC-xx`.
- [x] Backend test contains feature trace `TASK-platform-architecture-baseline`.
- [x] AI adapter test contains feature trace `TASK-platform-architecture-baseline`.
- [x] Frontend test contains feature trace `TASK-platform-architecture-baseline`.
- [x] No secrets or fake production values are committed.
- [x] Scaffold self-tests pass.
- [x] Backend and frontend smoke checks pass or blockers are documented.

## 5. Dependencies

### Blocked By

- Maven and npm package download availability for full verification.

### Blocks

- `F002-identity-org-permission`
- `F003-dataset-asset-mvp`
- All future implementation features.

## 6. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Enterprise standard framework differs from initial skeleton | Medium | Medium | Keep skeleton minimal and document chosen defaults |
| Dependency download unavailable | Medium | Medium | Preserve source and record exact failed command |
| External environment values are unknown | High | Low | Keep `TODO_CONFIRM_*` placeholders only in config/templates |

## 7. Progress Tracking

### Phases

| Phase | Status | Owner | Notes |
| --- | --- | --- | --- |
| 需求分析 | completed | codex | Architecture docs and planning artifacts prepared |
| 契约冻结 | completed | codex | Baseline contract describes health/shell/deploy surfaces |
| 测试计划 | completed | codex | Smoke verification completed |
| 后端开发 | completed | codex | Skeleton and health test completed |
| AI适配层开发 | completed | codex | FastAPI adapter and smoke tests completed |
| 前端开发 | completed | codex | Shell, lint, test, build completed |
| 联调检查 | completed | codex | Scaffold/backend/ai-adapter/frontend commands passed |
| 代码审查 | pending | - | Manual review |
| QA验收 | pending | - | Smoke checks |

### Deliverables

| Deliverable | Status | Location |
| --- | --- | --- |
| 契约文档 | completed | `docs/features/F001-platform-architecture-baseline/contract.md` |
| 测试计划 | completed | `docs/features/F001-platform-architecture-baseline/test-plan.md` |
| SQL脚本 | not_required | `docs/features/F001-platform-architecture-baseline/sql/` |
| 流程报告 | completed | `docs/features/F001-platform-architecture-baseline/reports/planning/` |
| 后端代码 | completed | `backend/` |
| AI适配层代码 | completed | `ai-adapter/` |
| 前端代码 | completed | `frontend/` |
| 部署骨架 | completed | `deploy/` |

## 8. Verification Report

- Report: docs/features/F001-platform-architecture-baseline/reports/verification.md 
- Backend verification requires Java 21; this run used JAVA_HOME=C:\Java\jdk-21.0.6.
- AI adapter verification uses Python 3.12 in `ai-adapter/`; `pyproject.toml` records the FastAPI dependency baseline for reproducible installs.
- plan.md remains draft pending human approval, but the owner-requested repository bootstrap is complete.

## 9. Notes

### Decisions

- Use Java 21 + Spring Boot 3 for the main enterprise platform backend.
- Use Python 3.12 + FastAPI for the internal AI/MLOps adapter to avoid scattering Python-first SDK integrations in the Java service.
- Use React + TypeScript because this is the approved management console route.
- Use Helm/Kubernetes templates because deployment target is private Kubernetes.

### Questions

- Confirm CI provider.
- Confirm enterprise SSO/IAM.
- Confirm Kubernetes, registry, storage, and GPU/NPU details.

## Change Log

| Date | Version | Changes | Author |
| --- | --- | --- | --- |
| 2026-04-29 | v1 | Initial baseline task | codex |




