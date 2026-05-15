# Feature Contract: 技术栈基线确认

## Contract Metadata
- Version: v1
- Status: implemented
- Owner: contract-architect
- Created: 2026-05-15
- Feature: F002-technology-stack-baseline

## 1. Requirement Summary
- 用户目标：将 SMP 重建所需所有关键技术栈确定为唯一基线。
- 业务价值：为后续生产级 feature 提供一致的语言、框架、中间件、部署和质量门禁边界。
- 业务资料：`docs/business/arch/01-部署架构.md`, `docs/business/api/01-API接口规范.md`, `docs/business/open-questions.md`
- 原型页面：`docs/prototype/SMP工业AI平台-原型v2.html` 全量页面信息架构

## 2. Artifact Contract

本功能不新增业务 API；契约对象是技术栈基线产物。

### Required Artifacts

| Artifact | Contract |
|---|---|
| `docs/architecture/01-technology-stack-baseline.md` | 必须列出后端、前端、AI adapter、数据/中间件、MLOps、部署运维、安全、测试工具链；必须说明不采用/暂缓选项与未确认环境参数。 |
| `ai-scaffold.config.json` | 必须包含 `technologyStack.baselineDoc` 和各层级摘要；不得启用仍为空的 backend/frontend。 |
| `project.md` / `README.md` / `AGENTS.md` | 必须引用技术栈基线并保留“产品实现仍待重建”的边界。 |
| `.agents/agents/*` / `.codex/agents/*` | 不得继续使用过时默认栈口径。 |

## 3. Baseline Decisions

| Layer | Decision |
|---|---|
| Backend | Java 21 LTS + Spring Boot 4.0.x + Spring Data JPA/Hibernate + Flyway |
| API/Security | OpenAPI 3.1 + Spring Security + YF LDAP + RBAC/必要 ABAC |
| Frontend | React 19 + TypeScript 6.x + Vite 8 + Ant Design 6 + TanStack Query 5 + Zustand 5 |
| AI Adapter | Python 3.12 + FastAPI 0.136.x + Pydantic 2.13.x + Uvicorn + uv |
| Data | PostgreSQL 18 + Valkey 8.1 + Kafka 4.0 + MinIO + OpenSearch 3.x |
| MLOps | Label Studio + MLflow 3.x + Argo Workflows 4.x + KServe 0.16+ |
| Platform | Docker/OCI + Kubernetes 1.35.x + Helm 4 + Argo CD 3.x |
| Observability | OpenTelemetry + Prometheus + Grafana + Loki |

## 4. Compatibility

- Backward compatibility: 不要求兼容已删除旧实现；后续新实现必须兼容本基线。
- Versioning: 基线变更需更新 `docs/architecture/01-technology-stack-baseline.md`，并在 feature plan 或 ADR 记录原因。
- External parameters: 仍以 `TODO_CONFIRM_*` 追踪，不在本契约中伪造。
