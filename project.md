# Project Guide: yfind_aiplatform

This repository hosts the YFI Industrial AI Small Model Platform. The project is planned as a 6-month MVP for a private Kubernetes environment, using mature AI/MLOps components for platform capabilities and custom application code for business workflow, governance, permissions, and audit.

## Product Scope

The MVP must prove one complete industrial AI platform flow:

```text
Organization/login -> dataset upload -> labeling/review -> training -> model registry/evaluation -> inference deployment -> edge delivery -> monitoring/audit
```

Authoritative planning documents:

- `docs/architecture/01-functional-breakdown.md`
- `docs/architecture/02-technical-roadmap.md`
- `docs/architecture/03-project-plan.md`
- `docs/architecture/04-ai-execution-plan.md`

Implementation must follow these documents unless a later feature plan explicitly supersedes them.

## Technology Route

### Application Stack

- Main backend: Java 21 + Spring Boot 3 for enterprise platform APIs, permissions, business state, and audit.
- AI adapter: Python 3.12 + FastAPI for internal AI/MLOps SDK integrations.
- Frontend: React + TypeScript + Ant Design Pro.
- API contract: REST + OpenAPI.
- Auth: enterprise SSO or Keycloak through Spring Security.
- Main database: PostgreSQL.
- Cache/state: Redis.
- Search/log search: OpenSearch or Elasticsearch.
- Object storage: MinIO or enterprise S3-compatible storage.

### AI/MLOps Stack

- Labeling: Label Studio integration for MVP.
- Training/workflow: Kubeflow Pipelines/Trainer or Argo Workflows.
- Experiment tracking and model registry: MLflow.
- Inference: KServe.
- Deployment: Kubernetes + Helm + Argo CD.
- Monitoring: Prometheus + Grafana.
- Logging: Loki or ELK.
- Tracing: OpenTelemetry.
- Edge delivery: lightweight custom edge-agent.

### Engineering Shape

- Start as a modular monolith in `backend/`, split by domains: identity, dataset, labeling, training, model, inference, edge, resource, audit.
- Keep AI workloads asynchronous; Spring Boot owns platform state and calls `ai-adapter/` for Python-first AI/MLOps integration work.
- Keep `ai-adapter/` internal-only; it adapts Label Studio, MLflow, Kubeflow/Argo, KServe, object storage, and model utilities behind stable internal APIs.
- Store large files in object storage; database stores metadata, object keys, hashes, status, permissions, and audit references.
- Every dataset, model, image, inference service, edge deployment, and high-risk operation must have owner, version/status, permission, and audit records.

## Repository Layout

- `backend/`: Spring Boot main platform backend service.
- `ai-adapter/`: FastAPI internal AI/MLOps adapter service.
- `frontend/`: React management console.
- `deploy/`: Helm, Kubernetes manifests, environment templates, GitOps notes.
- `docs/architecture/`: architecture, roadmap, project plan, AI execution plan.
- `docs/features/`: feature plans, tasks, contracts, test plans, SQL, reports.
- `docs/bugfix/`: tracked bugfix artifacts.
- `tools/ai-scaffold/`: scaffold CLI and quality gates.
- `.agents/` and `.codex/`: AI role briefs, skills, and workflow surfaces.

The directories `backend/`, `ai-adapter/`, `frontend/`, and `deploy/` are initialized by `F001-platform-architecture-baseline` and must be extended by later features rather than duplicated.

## AI Scaffold Configuration

Project adapter: `ai-scaffold.config.json`.

Configured roots:

- Backend path: `backend`
- AI adapter path: `ai-adapter`
- Frontend path: `frontend`
- Deployment path: `deploy`
- Architecture docs: `docs/architecture`
- Feature docs: `docs/features`
- Bugfix docs: `docs/bugfix`

Configured backend commands, executed from `backend/`:

- Compile: `mvn compile -q`
- Test: `mvn test -q`
- Verify: `mvn verify`
- Verify without integration: `mvn verify -DskipITs=true`

> å½åæºå¨é»è®¤ `mvn` å¯è½ä»ä½¿ç¨ Java 8ï¼è¿è¡ `backend/` å½ä»¤åè¯·åå¨ PowerShell ä¼è¯åæ¢ï¼
>
> ```powershell
> $env:JAVA_HOME='C:\java\jdk-21.0.6'
> $env:Path="C:\java\jdk-21.0.6\bin;" + [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
> java -version
> mvn -version
> ```
>
> ç¡®è®¤ä¸¤èé½æ¾ç¤º `21.0.6` ååè¿è¡ compile / test / verify / gateã

Configured AI adapter commands, executed from `ai-adapter/`:

- Static syntax check: `python -m compileall app tests`
- Compile: `python -m compileall app tests`
- Test: `python -m unittest discover -s tests -v`
- Verify: `python -m unittest discover -s tests -v`

Configured frontend commands, executed from `frontend/`:

- Lint: `npm run lint`
- Test: `npm run test:ci`
- Build: `npm run build`
- E2E: `npm run e2e`

External environment values are intentionally left as `TODO_CONFIRM_*` in `ai-scaffold.config.json` until confirmed:

- PostgreSQL test database, user, password, and container name.
- E2E username, password, and tenant code.
- Enterprise SSO/IAM URLs, client IDs, secrets, and claims mapping.
- Label Studio, MLflow, workflow engine, KServe, and object storage endpoints.
- Kubernetes cluster, namespace, ingress, storage class, registry, and GPU/NPU details.

Do not replace those values with guesses.

## AI Scaffold Commands

Install and verify the scaffold CLI:

```powershell
npm --prefix tools/ai-scaffold ci
npm --prefix tools/ai-scaffold run build
node tools/ai-scaffold/dist/cli.js doctor
node tools/ai-scaffold/dist/cli.js sync-codex
npm --prefix tools/ai-scaffold test
```

Create a feature package:

```powershell
node tools/ai-scaffold/dist/cli.js init-feature --slug <slug> --title "<title>"
```

Render an agent prompt:

```powershell
node tools/ai-scaffold/dist/cli.js render-agent-prompt --role backend-tdd-engineer --feature-dir docs/features/F001-example --task "Describe task" --summary
```

Check work-item traceability:

```powershell
git diff --name-only | node tools/ai-scaffold/dist/cli.js check-work-item-link --stdin
```

## Execution Order

Use `docs/architecture/04-ai-execution-plan.md` as the control plan.

Initial feature order:

1. `F001-platform-architecture-baseline`
2. `F002-identity-org-permission`
3. `F003-dataset-asset-mvp`
4. `F004-labeling-workflow-mvp`
5. `F005-training-job-mvp`
6. `F006-model-registry-evaluation`
7. `F007-inference-service-mvp`
8. `F008-edge-server-deployment`
9. `F009-resource-monitoring-audit`
10. `F010-mvp-uat-release`

Every feature must include:

- `plan.md`
- `TASK.md`
- `contract.md`
- `test-plan.md`
- evidence under `reports/`
- SQL or migration notes when applicable

## Quality Gates

Before closing a feature:

- Feature plan and task docs are updated.
- API contracts and schema changes are recorded.
- Permission and audit behavior is covered.
- Backend compile/test/verify pass once the backend exists.
- AI adapter static syntax check and tests pass once the adapter exists.
- Frontend lint/test/build pass once the frontend exists.
- Scaffold self-tests pass.
- Work-item link check passes.
- Unknown external facts remain documented as `TODO_CONFIRM_*` or in the feature risk section.

## Current Known Gaps

- `plan.md` for `F001-platform-architecture-baseline` remains `plan_status: draft` pending human review, while the owner-requested repository bootstrap has been implemented and smoke-verified.
- PostgreSQL local Docker environment is confirmed for development (`yfind-aiplatform-postgres`, `yfind_aiplatform`, `yfind_aiplatform_test`); Redis, object storage, SSO, Kubernetes, model registry, inference, and edge environments are not confirmed.
- CI provider is not confirmed.
- Real test accounts and E2E tenant values are not confirmed.
- The default system `java` and `mvn` on this machine currently resolve to Java 8; backend verification must first switch the session to `C:\java\jdk-21.0.6`.

These gaps are expected before domain features. Do not replace `TODO_CONFIRM_*` placeholders with guesses.
