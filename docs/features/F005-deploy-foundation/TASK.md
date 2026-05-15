# Task: 部署工程底座

## Metadata
- Feature: F005-deploy-foundation
- ID: TASK-deploy-foundation
- Status: implemented
- Owner: codex
- Created: 2026-05-15
- Updated: 2026-05-16
- 前置：同目录 `plan.md` 已标记 approved，用于本次部署底座恢复追溯。

## 1. 需求摘要

### User Story

作为后续参与 SMP 重建的工程师和运维人员，我想要一个最小部署工程骨架，以便 backend/frontend 可以被容器化、本地联调、Helm 草案部署，并纳入 AI scaffold 质量门禁。

### Business Value

- 让工程骨架不只停留在源码目录，而具备基本运行/部署入口。
- 为后续 F006+ 业务功能提供统一环境变量、镜像和 smoke 约定。
- 通过 `TODO_CONFIRM_*` 显式保留外部参数缺口，避免臆造生产环境。

### Source References

- Business docs: `docs/business/arch/01-部署架构.md`, `docs/business/bizdocs/06-非功能性需求.md`, `docs/business/open-questions.md`
- Prototype: 无专属页面；服务于全局前端访问入口
- Feature breakdown: `docs/features/FEATURE_BREAKDOWN.md` F005-C01～F005-C05

## 2. 范围

### In Scope

- [x] AC-01: 后端、前端具备 Dockerfile，前端具备 nginx 静态服务配置。
- [x] AC-02: `deploy/local/docker-compose.yml` 串起 PostgreSQL、Valkey、MinIO、backend、frontend 本地联调入口。
- [x] AC-03: `deploy/helm/smp-platform` 提供 Chart、values、backend/frontend deployment 和 ingress 草案。
- [x] AC-04: `deploy/scripts/smoke.ps1` 能检查后端 health 和前端首页。
- [x] AC-05: `ai-scaffold.config.json` 启用 backend/frontend 并将 deploy 纳入 codeLikeRoots。

### Out of Scope

- 不提供可直接用于生产的 secrets、证书、镜像仓库和集群参数。
- 不部署 Kafka、OpenSearch、MLflow、Argo Workflows、KServe、Label Studio。
- 不实现真实 CI/CD 或 Argo CD Application。

## 3. 技术分析

### Backend

- Module/API: 复用 F003 `backend/Dockerfile` 与 `/actuator/health`。
- Domain objects: 不涉及。
- Business rules: 不涉及。

### Frontend

- Prototype page key: 复用 F004 前端 shell；部署入口暴露前端首页。
- Pages/components: `frontend/Dockerfile`, `frontend/nginx.conf`。
- States/interactions: 不涉及。

### AI Adapter / Integration

- Adapter endpoint: 当前 Compose 未纳入 ai-adapter，后续 MLOps feature 再统一编排。
- External system placeholders: `TODO_CONFIRM_REGISTRY`, `TODO_CONFIRM_K8S_NAMESPACE`, `TODO_CONFIRM_INGRESS_HOST`, `TODO_CONFIRM_POSTGRES_*`, `TODO_CONFIRM_LDAP_URL`。

### Database

- Tables: 不新增。
- Migrations: 通过 backend 启动时执行 Flyway。

## Reuse Plan

- Existing reference seams to reuse: `docs/business/arch/01-部署架构.md`, `docs/business/bizdocs/06-非功能性需求.md`, `docs/architecture/01-technology-stack-baseline.md`。
- Existing service/scaffold seams to reuse: F003 `backend/`, F004 `frontend/`, `tools/ai-scaffold/`, `ai-scaffold.config.json`。
- Existing deployment seams to reuse: Docker/OCI、Kubernetes、Helm 基线来自 `docs/architecture/01-technology-stack-baseline.md`。
- New seams allowed only if existing seams cannot be reused, because: deploy 目录已清空，必须新建 Compose、Helm、smoke 作为后续部署演进起点。

## 5. Acceptance Criteria

- [x] AC-01: `backend/Dockerfile`、`frontend/Dockerfile`、`frontend/nginx.conf` 存在。
- [x] AC-02: Compose 文件包含 postgres、valkey、minio、backend、frontend 服务。
- [x] AC-03: Helm values 保留 `TODO_CONFIRM_*`，backend/frontend deployment 模板存在。
- [x] AC-04: smoke 脚本检查 `/actuator/health` 和前端 URL。
- [x] AC-05: AI scaffold gate 能识别 backend/frontend enabled，work-item link 将 deploy 视为 code-like root。

## 6. Definition of Done

- [x] plan.md 已批准。
- [x] contract.md 已实现态。
- [x] test-plan.md 引用全部 AC-xx。
- [x] 复用审查已完成。
- [x] 权限、审计和 MUST 规则有验证证据或明确不适用。
- [x] 质量门禁通过或记录等价 CI 证据。

## 7. 风险与问题

- Helm chart 未在真实 Kubernetes 集群验证。
- 生产 secrets 和外部系统参数仍待确认。