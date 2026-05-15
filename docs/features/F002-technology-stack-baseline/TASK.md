# Task: 技术栈基线确认

## Metadata
- Feature: F002-technology-stack-baseline
- ID: TASK-technology-stack-baseline
- Status: implemented
- Owner: codex
- Created: 2026-05-15
- Updated: 2026-05-15
- 前置：同目录 `plan.md` 已标记 approved，用于本次技术栈基线改造追溯。

## 1. 需求摘要

### User Story

作为后续参与 SMP 重建的 AI/人工工程师，我想要项目所有关键技术栈都有唯一、明确、可引用的基线，以便后续 backend/frontend/deploy/MLOps feature 不再重复争论或沿用旧实现口径。

### Business Value

- 降低重建阶段的技术分歧和返工。
- 让脚手架、agent brief、根文档与架构文档对同一技术栈达成一致。
- 为后续生产级 feature 的契约、测试、联调和部署提供默认实现边界。

### Source References

- Business docs: `docs/business/arch/01-部署架构.md`, `docs/business/api/01-API接口规范.md`, `docs/business/bizdocs/06-非功能性需求.md`, `docs/business/open-questions.md`
- Prototype: `docs/prototype/SMP工业AI平台-原型v2.html`, `docs/prototype/SMP工业AI平台-原型v2-compiled.html`, `docs/business/原型页面完成度清单.md`

## 2. 范围

### In Scope

- [x] AC-01: `docs/architecture/01-technology-stack-baseline.md` 明确所有关键层级技术栈与版本范围。
- [x] AC-02: 根文档 `README.md`、`project.md`、`AGENTS.md` 引用并摘要同一技术栈基线。
- [x] AC-03: `ai-scaffold.config.json` 暴露 `technologyStack`，`scaffold-status`/`doctor` 能读取展示。
- [x] AC-04: `.agents/agents/*` 与 `.codex/agents/*` 不再保留过时默认栈口径。
- [x] AC-05: 脚手架测试、当前 gate、ai-adapter 验证与 work-item link 检查通过。

### Out of Scope

- 不恢复 backend/frontend/deploy 代码。
- 不新增业务 API、SQL migration、Kubernetes manifests。
- 不确认外部系统实际连接参数。

## 3. 技术分析

### Backend

- Module/API: 未来 `backend/` 使用 Java 21 + Spring Boot 4.0.x + OpenAPI 3.1；当前目录仍禁用。
- Domain objects: 后续来自 `docs/business/domain/`。
- Business rules: 后续来自 `docs/business/rules/`，必须进入服务校验和测试。

### Frontend

- Prototype page key: 继续以原型 25 个页面 key 为 IA 基线。
- Pages/components: 未来 `frontend/` 使用 React 19 + TypeScript 6.x + Vite 8 + Ant Design 6。
- States/interactions: TanStack Query 5 管理服务端状态，Zustand 5 管理轻量客户端状态。

### AI Adapter / Integration

- Adapter endpoint: 当前保留 `ai-adapter/` Python 3.12 + FastAPI。
- External system placeholders: `TODO_CONFIRM_LABEL_STUDIO_URL`, `TODO_CONFIRM_MLFLOW_URL`, `TODO_CONFIRM_ARGO_WORKFLOWS_URL`, `TODO_CONFIRM_KSERVE_URL`, `TODO_CONFIRM_OBJECT_STORAGE_ENDPOINT`。

### Database

- Tables: 本任务无新增表。
- Migrations: 本任务无新增 migration；基线确定未来使用 Flyway + PostgreSQL 18。

## Reuse Plan

- Existing reference seams to reuse: `docs/business/`, `docs/prototype/`, `docs/architecture/00-project-understanding.md`
- Existing service/scaffold seams to reuse: `ai-adapter/pyproject.toml`, `tools/ai-scaffold/`, `ai-scaffold.config.json`, `.agents/agents/`, `.codex/agents/`
- New seams allowed only if existing seams cannot be reused, because: `docs/architecture/01-technology-stack-baseline.md` 与 `technologyStack` 字段是当前缺失的技术栈单一事实面。

## 5. Acceptance Criteria

- [x] AC-01: 技术栈基线文档覆盖后端、前端、AI adapter、数据层、MLOps、部署、安全、测试与质量工具。
- [x] AC-02: 根文档不再写“推荐技术路线待确认”，而是引用已确定基线。
- [x] AC-03: `node tools/ai-scaffold/dist/cli.js scaffold-status` 输出 Technology stack 段。
- [x] AC-04: `rg` 检查无 Spring Boot 3.1/React 18/Ant Design 5/MyBatis Plus 默认口径残留。
- [x] AC-05: 质量门禁和 AI adapter 验证通过。

## 6. Definition of Done

- [x] plan.md 已批准。
- [x] contract.md 已冻结或实现态。
- [x] test-plan.md 引用全部 AC-xx。
- [x] 复用审查已完成。
- [x] 权限、审计和 MUST 规则有验证证据或说明本任务无业务运行时代码。
- [x] 质量门禁通过或记录等价 CI 证据。

## 7. 风险与问题

- 技术栈已确定，但外部环境连接参数仍待确认。
- 当前 feature 为架构/脚手架基线，不代表 backend/frontend 已可运行。
