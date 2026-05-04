---
feature: F001-platform-architecture-baseline
title: Platform Architecture Baseline
plan_status: approved
approved_at: "2026-04-30"
owner: codex
created_at: 2026-04-29
updated_at: 2026-04-30
---

# Plan: Platform Architecture Baseline

## Intent

- Why: establish the executable project baseline required before domain features can be implemented safely.
- Why now: the repository has architecture and scaffold documents, but no backend, ai-adapter, frontend, deploy skeleton, or component version matrix.

## Planning Evidence

- Deep interview: `reports/planning/deep-interview.md`
- PRD: `reports/planning/prd.md`
- Test spec: `reports/planning/test-spec.md`

## Context

- The platform will be built as a private Kubernetes-oriented industrial AI platform.
- `project.md` defines Spring Boot main backend, FastAPI AI adapter, React frontend, Kubernetes/Helm deploy skeleton, and AI/MLOps integration direction.
- `docs/architecture/04-ai-execution-plan.md` defines WP-001 as the first executable work package.

## Scope

### In Scope

- Create the formal F001 feature document set.
- Initialize `backend/` as a minimal Java 21 + Spring Boot 3 Maven project.
- Initialize `ai-adapter/` as a minimal Python 3.12 + FastAPI internal AI/MLOps adapter project.
- Initialize `frontend/` as a minimal React + TypeScript project with lint, test, and build scripts.
- Initialize `deploy/` with Helm/Kubernetes environment templates and explicit placeholders.
- Add `docs/architecture/component-version-matrix.md`.
- Keep `ai-scaffold.config.json` aligned with `backend/` and `frontend/` commands.

### Out of Scope / Non-goals

- Real enterprise SSO integration.
- Dataset, labeling, training, model registry, inference, edge, resource, or audit business modules.
- Real PostgreSQL, Redis, object storage, MLflow, KServe, Label Studio, or Kubernetes connectivity.
- CI provider-specific workflow files.
- Production secrets, domains, registry addresses, namespaces, or cluster credentials.

## Decision Boundaries

- Codex may decide without confirmation:
- Minimal package and folder structure for backend and frontend.
- Minimal package and folder structure for `ai-adapter/`.
- Minimal health endpoint and platform shell contents.
  - Helm chart skeleton and environment template names.
  - Documentation wording that stays consistent with architecture docs.
- Must escalate for confirmation:
  - Enterprise SSO/IAM URLs, client IDs, claims, and secrets.
  - PostgreSQL, Redis, object storage, Kubernetes, registry, ingress, TLS, GPU/NPU, and E2E accounts.
  - CI provider and production deployment topology.

## Exception Scenarios

### Handled In This Feature

- Missing external environments are represented by `TODO_CONFIRM_*` placeholders.
- Dependency download or build failure is recorded in `TASK.md` verification notes.
- Existing future files under `backend/`, `frontend/`, or `deploy/` must be preserved.

### Explicitly Deferred / Not Handled In This Feature

- Actual authentication and authorization behavior.
- Business data schemas.
- Runtime integration with MLOps components.
- Real Label Studio, MLflow, Kubeflow/Argo, KServe, or object storage SDK calls.
- Production deployment and GitOps automation.

## Reuse Strategy

### Must Reuse

- Existing scaffold workflow and templates under `.codex/`, `.agents/`, `docs/features/`, and `tools/ai-scaffold/`.
- Existing architecture decisions from `docs/architecture/*.md`.
- Existing `ai-scaffold.config.json` path convention.
- Standard Maven, uv, npm, Spring Boot, FastAPI, React, Helm, and Kubernetes conventions.

### Duplication Rejected

- Do not create a second feature tracking system outside `docs/features/`.
- Do not create parallel scaffold tooling outside `tools/ai-scaffold/`.
- Do not invent a custom build system when Maven and npm already match the route.
- Do not hardcode environment values that belong in deploy values or secrets.

### Approved New Seams

- Add `backend/`, `frontend/`, and `deploy/` because no business-engineering roots exist yet.
- Add `ai-adapter/` because the approved architecture separates enterprise platform state from Python-first AI/MLOps SDK adaptation.
- Add a component version matrix because the architecture route needs a single durable place to record selected and pending versions.

## Delivery Plan

1. Create F001 `plan.md`, `TASK.md`, `contract.md`, and `test-plan.md`.
2. Initialize backend skeleton with health endpoint and smoke test.
3. Initialize FastAPI ai-adapter skeleton with internal health/capability endpoints and smoke tests.
4. Initialize frontend skeleton with shell UI, lint/test/build scripts, and smoke test.
5. Initialize deploy skeleton with Helm chart, values template, and environment README for frontend/backend/ai-adapter.
6. Add component version matrix.
7. Run scaffold, backend, ai-adapter, and frontend verification.

## Risks

- Maven/npm dependency downloads may fail in restricted networks.
- The configured commands will fail until the corresponding skeletons exist.
- Future enterprise standards may require replacing the initial frontend scaffold or Maven parent configuration.
- F001 intentionally leaves real infrastructure values unconfigured.

## Acceptance Criteria Draft

- AC-01: F001 planning evidence and feature documents exist.
- AC-02: Backend skeleton compiles and health test passes.
- AC-03: AI adapter skeleton compiles and health/capability tests pass.
- AC-04: Frontend skeleton lints, tests, and builds.
- AC-05: Deploy skeleton contains Helm/Kubernetes placeholders without secrets.
- AC-06: Component version matrix records selected defaults and pending confirmations.
- AC-07: Scaffold doctor resolves backend path `backend`, service path `ai-adapter`, and frontend path `frontend`.

## Approval Notes

- Reviewer:
- Decision:


