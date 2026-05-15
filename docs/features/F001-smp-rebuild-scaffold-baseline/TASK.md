# Task: SMP 重建脚手架基线

## Metadata

- Feature: F001-smp-rebuild-scaffold-baseline
- ID: TASK-smp-rebuild-scaffold-baseline
- Status: implemented
- Owner: codex
- Created: 2026-05-15
- Updated: 2026-05-15
- 前置：同目录 `plan.md` 已标记 approved，用于本次脚手架基线改造追溯。

## 1. 需求摘要

### User Story

作为后续参与 SMP 重建的 AI/人工工程师，我想要仓库脚手架准确表达当前业务资料、原型资料和可运行服务状态，以便后续功能不会误用已清空的旧实现，并能通过合适的质量门禁。

### Business Value

- 降低后续规划和实现的事实偏差。
- 保留 `docs/business/` 与 `docs/prototype/` 的权威地位。
- 使 AI scaffold 在 backend/frontend 清空期间仍可验证可用部分。

### Source References

- Business docs: `docs/business/bizdocs/00-业务清单索引.md`, `docs/business/domain/00-领域模型索引.md`, `docs/business/rules/00-规则类型索引.md`
- Prototype: `docs/prototype/SMP工业AI平台-原型v2.html`, `docs/prototype/SMP工业AI平台-原型v2-compiled.html`

## 2. 范围

### In Scope

- [x] AC-01: 根文档说明当前 SMP 重建基线、五大业务域和原型页面范围。
- [x] AC-02: AI scaffold 配置支持 reference roots 和 disabled backend/frontend，并保留 ai-adapter 验证。
- [x] AC-03: AI scaffold gate/doctor/hook/work-item 检查能适配当前清空后的仓库状态。
- [x] AC-04: 正式 feature/bugfix/architecture 文档目录和模板已恢复，后续可继续按流程创建功能包。
- [x] AC-05: `ai-adapter/` 旧训练 trace 更新为重建基线占位语义，测试同步更新。

### Out of Scope

- 不实现新的业务 API。
- 不创建真实 backend/frontend/deploy 产品代码。
- 不确认外部系统账号、地址、密钥或 CI 供应商。

## 3. 技术分析

### Backend

- Module/API: `backend/` 当前无跟踪实现，`ai-scaffold.config.json` 中 `backend.enabled=false`。
- Domain objects: 后续来自 `docs/business/domain/`。
- Business rules: 后续来自 `docs/business/rules/`。

### Frontend

- Prototype page key: `dash`, `ds`, `ann`, `datasrc`, `annreview`, `lineage`, `pipeline`, `opmarket`, `portal`, `devenv`, `train`, `exp`, `eval`, `hub`, `infer`, `batch`, `sched`, `edge`, `report`, `resource`, `usermgmt`, `org`, `perm`, `alert`, `sys`。
- Pages/components: 当前未重建，`frontend.enabled=false`。
- States/interactions: 以后以 `docs/prototype/SMP工业AI平台-原型v2.html` 为参考。

### AI Adapter / Integration

- Adapter endpoint: `GET /internal/health`, `GET /internal/capabilities`, placeholder training endpoints。
- External system placeholders: `TODO_CONFIRM_LABEL_STUDIO_URL`, `TODO_CONFIRM_MLFLOW_URL`, `TODO_CONFIRM_WORKFLOW_ENGINE_URL`, `TODO_CONFIRM_KSERVE_URL`, `TODO_CONFIRM_OBJECT_STORAGE_ENDPOINT`。

### Database

- Tables: 无。
- Migrations: 无。

## Reuse Plan

- Existing reference seams to reuse: docs/business/, docs/prototype/
- Existing service/scaffold seams to reuse: ai-adapter/, tools/ai-scaffold/, .agents/, .codex/
- New seams allowed only if existing seams cannot be reused, because: `referenceRoots`、`enabled`、`scaffold-status` 是当前脚手架缺失的基线表达能力。

## 5. Acceptance Criteria

- [x] AC-01: 根 `README.md`、`project.md`、`AGENTS.md` 明确当前项目定位、权威资料、禁用目录和后续流程。
- [x] AC-02: `ai-scaffold.config.json` 将 `docs/business/` 与 `docs/prototype/` 配为 `referenceRoots`，并禁用 backend/frontend、启用 ai-adapter。
- [x] AC-03: `tools/ai-scaffold` 支持 `enabled`、`referenceRoots`、`scaffold-status`，并通过脚手架测试。
- [x] AC-04: `docs/features/`、`docs/bugfix/`、`docs/architecture/` 已恢复最小索引/模板，且本功能包提供工作项关联。
- [x] AC-05: 当前 gate 跳过 disabled backend/frontend，执行 ai-adapter compile/test 并通过。

## 6. Definition of Done

- [x] plan.md 已批准。
- [x] contract.md 已冻结或实现态。
- [x] test-plan.md 引用全部 AC-xx。
- [x] 复用审查已完成。
- [x] 质量门禁通过或记录等价 CI 证据。

## 7. 风险与问题

- 当前 feature 是脚手架/文档基线，不代表产品功能可运行。
- backend/frontend 重建后必须更新配置并重新启用对应门禁。
