# yfind_aiplatform Agent Guide

本仓库当前是 **SMP 工业 AI 小模型平台重建基线**。旧 backend/frontend/deploy 实现已清空；后续实现必须以 `docs/business/` 与 `docs/prototype/` 为事实来源重新规划。

## Operating Contract

- 所有正式文档、计划、报告、README、feature/bugfix 产出物、评审说明和面向人审的交付内容默认使用中文；只有代码标识符、API 字段、命令、配置键、第三方专有名词或用户明确要求时才使用英文。
- Use `.codex/` as the Codex-facing workflow surface.
- Use `.agents/agents/` and `.agents/skills/` as the canonical role and skill sources.
- `docs/business/` 是业务规格、领域模型、规则、术语和开放问题的权威 reference root。
- `docs/prototype/` 是交互原型、页面清单、截图和视觉验收的权威 reference root。
- Use `docs/features/F{nnn}-{slug}/` for formal feature plans, tasks, contracts, test plans, SQL, and reports; 当前目录已清空，正式开发前必须按模板重建。
- Use `docs/bugfix/{bug-id}-{slug}/` for tracked bugfix artifacts; 当前目录已清空，首次 bugfix 前需重建模板。
- Use `tools/ai-scaffold` as the pass/fail authority for scaffold checks.
- Keep project-specific paths, commands, accounts, and service names in `ai-scaffold.config.json`.
- Do not copy runtime state such as `.omx/`, `.codex/tasks/tmp/`, `.codex/worktrees/*`, `node_modules/`, `.vite/`, `__pycache__/`, or `dist/` into the repo.
- Do not infer backend, frontend, database, E2E, or CI technology choices from the scaffold template.
- Do not treat deleted legacy backend/frontend files as reusable product implementation; current reusable product inputs are `docs/business/`, `docs/prototype/`, AI scaffold surfaces, and the still-present `ai-adapter/` baseline.

## Current Project Facts

- Product: YFI / 延锋 SMP 工业 AI 小模型平台。
- Business domains: DATA、MODEL、INFERENCE、RESOURCE、PLATFORM。
- Prototype: `docs/prototype/SMP工业AI平台-原型v2.html` (JSX source) and `SMP工业AI平台-原型v2-compiled.html` (compiled demo).
- Technology baseline: `docs/architecture/01-technology-stack-baseline.md` is the locked stack baseline; summary is mirrored in `ai-scaffold.config.json` `technologyStack`.
- Backend stack: Java 21 LTS + Spring Boot 4.0.x + Spring Data JPA/Hibernate + Flyway + OpenAPI 3.1 + Spring Security/YF LDAP.
- Frontend stack: React 19 + TypeScript 6.x + Vite 8 + Ant Design 6 + TanStack Query 5 + Zustand 5.
- AI/MLOps stack: Python 3.12 + FastAPI/Pydantic; PostgreSQL 18, Valkey 8.1, Kafka 4.0, MinIO, OpenSearch, MLflow, Argo Workflows, KServe, Label Studio.
- Platform stack: Docker/OCI, Kubernetes 1.35.x baseline, Helm 4, Argo CD 3.x, OpenTelemetry/Prometheus/Grafana/Loki.
- AI adapter: `ai-adapter/` remains enabled and should pass `python -m compileall app tests` plus `python -m unittest discover -s tests -v`.
- Backend/frontend/deploy: old implementations are removed and disabled in `ai-scaffold.config.json`; rebuild through formal feature workflow.

## Default Workflow

1. Understand scope from `docs/business/` and `docs/prototype/` before proposing implementation.
2. Plan with `.codex/workflows/plan-feature.md` and archive planning evidence into `docs/features/F{nnn}-{slug}/reports/planning/`.
3. Build with `.codex/workflows/build-feature.md` after `plan.md` is approved.
4. Review and QA with `.codex/workflows/run-review.md` and `.codex/workflows/run-qa.md`.
5. Verify with `node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration` for the current baseline, or the target repo's equivalent full CI after backend/frontend are rebuilt and enabled.

## AI Scaffold Status

Current `ai-scaffold.config.json` intentionally sets:

- `referenceRoots`: `docs/business/`, `docs/prototype/`.
- `codeLikeRoots`: `ai-adapter/`, `docs/db/`.
- `backend.enabled`: `false`.
- `frontends[web].enabled`: `false`.
- `services[ai-adapter].enabled`: `true`.
- `technologyStack`: mirrors `docs/architecture/01-technology-stack-baseline.md`.

Run:

```powershell
node tools/ai-scaffold/dist/cli.js scaffold-status
node tools/ai-scaffold/dist/cli.js doctor
npm --prefix tools/ai-scaffold test
node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration
```

## Rebuild Rules

- Feature plans must cite concrete business docs and prototype pages/screens they implement.
- Contracts must map to domain objects, API style, permissions, audit events, errors, and MUST rules from `docs/business/rules/`.
- Test plans must cover happy path, permission failures, state-machine errors, audit behavior, and relevant NFR/rule checks.
- Frontend rebuild must preserve the prototype's information architecture unless an approved plan supersedes it.
- Unknown external facts remain documented as `TODO_CONFIRM_*` or open questions; never replace them with guesses.
