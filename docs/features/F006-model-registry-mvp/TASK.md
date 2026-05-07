# TASK：模型仓库 MVP

## 元数据

- Feature：F006-model-registry-mvp
- 任务 ID：TASK-model-registry-mvp
- 状态：completed
- 前置条件：`plan.md` 已批准（`plan_status: approved`）
- Owner：codex
- 创建日期：2026-05-05
- 更新日期：2026-05-06

## 1. 需求摘要

作为算法工程师和平台管理员，我希望训练任务产出的模型 artifact 能进入模型仓库，形成模型版本、评测指标、审批状态和可部署标记，以便后续推理服务只部署经过审批的模型版本。

## 2. 范围

### In Scope

- [x] 模型列表、详情、版本注册、审批、驳回、归档 API。
- [x] 模型版本可追踪 F005 训练任务 key 与 artifact URI。
- [x] 模型版本展示评测指标、checksum、状态、approval status 和 deployable 标记。
- [x] 模型读/管理权限 trace：`model:read`、`model:manage`。
- [x] 前端模型仓库页面、版本详情和审批/驳回交互。
- [x] 前端优先调用后端模型仓库 API，后端不可用时回退本地原型数据。
- [x] 后端 MockMvc、前端 Vitest、Playwright E2E。

### Out of Scope

- 真实 MLflow、对象存储或模型文件下载。
- 真实推理服务部署、灰度发布与回滚。
- 自动模型评测流水线。
- 复杂 lineage、多级审批、生产级签名和安全扫描。

## 3. 技术分析

### Backend

- Package：`backend/src/main/java/com/yfind/aiplatform/model/`。
- Service：`ModelRegistryService` 管理 MVP 内存模型与版本记录。
- API：`GET /api/models`、`GET /api/models/{modelKey}`、`POST /api/models/{modelKey}/versions`、approve/reject/archive、`GET /api/models/deployable`。
- Permission：本地开发 token + `X-Platform-Permissions` 权限头，读需要 `model:read`，管理操作需要 `model:manage`。

### Frontend

- Pages：`frontend/src/pages/ModelPage.tsx`。
- API：`frontend/src/api/modelRegistryApi.ts` 统一封装 `/api/models` 读取与 approve/reject 操作。
- Modals：使用页面内弹窗完成审批/驳回。
- Tests：`frontend/src/App.test.tsx` 与 `frontend/e2e/model-registry.spec.ts`。

### Database

- Tables：本轮不做真实数据库迁移。
- Migrations：`docs/features/F006-model-registry-mvp/sql/migration-notes.md` 记录后续表结构建议。

### Reuse Plan

复用审查已完成：本轮复用 F005 `TrainingArtifactSummary` / `TrainingJobDetailResponse` 的 artifact seam 与 `TODO_CONFIRM_MODEL_ARTIFACT_URI` 语义，复用 F002 `PlatformPermission` 中的 `model:read` / `model:manage`，复用 Spring Boot + MockMvc、React + Ant Design、`App.test.tsx` 和 Playwright feature trace 测试方式。新增 seam 仅限模型、模型版本、审批事件和可部署状态这些现有代码中不存在的领域边界。

## 4. 验收项

- [x] **AC-01**：后端提供模型列表、详情、注册、审批、驳回、归档 API，并返回 `TASK-model-registry-mvp` trace。
- [x] **AC-02**：模型版本可追踪到 F005 训练任务 key 和 artifact URI。
- [x] **AC-03**：模型版本详情展示评测指标、checksum、状态、approval status 和 deployable 标记。
- [x] **AC-04**：读操作体现 `model:read`，管理/审批操作体现 `model:manage`。
- [x] **AC-05**：前端模型仓库页面支持查看模型列表、版本详情、审批和驳回交互。
- [x] **AC-06**：Playwright 覆盖从“模型仓库”导航进入、查看版本、完成审批的主流程。
- [x] **AC-07**：`contract.md`、`test-plan.md`、SQL notes、code review、QA、gate 均可追踪到 F006。

### 4.1 Definition of Done

- [x] `contract.md` 标记为 `implemented`。
- [x] `test-plan.md` 引用全部 `AC-xx`。
- [x] 自动化测试包含 `TASK-model-registry-mvp` 和覆盖到的 `AC-xx`。
- [x] SQL notes 已归档到 `docs/features/F006-model-registry-mvp/sql/`。
- [x] 复用审查已完成。
- [x] admin 本地权限包含 `model:manage`。
- [x] Playwright 用例已补充。
- [x] gate 通过。
- [x] 未使用 `git commit --no-verify` / `git push --no-verify`。

## 5. Dependencies

- Blocked By：F005 训练任务 MVP。
- Blocks：F007 推理服务 MVP。

## 6. 风险与缓解

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| artifact 根 URI 未确认 | High | High | 保留 `TODO_CONFIRM_MODEL_ARTIFACT_URI` |
| 评测标准未确认 | Medium | High | 使用 MVP 示例指标并保留 `TODO_CONFIRM_MODEL_EVAL_POLICY` |
| 审批策略未生产化 | Medium | Medium | MVP 仅本地管理员审批，保留 `TODO_CONFIRM_MODEL_APPROVAL_POLICY` |
| 模型状态仍为内存 | Medium | Medium | SQL notes 记录生产表结构 |

## 7. 工作分解状态

| Phase | Status | Owner | Notes |
| --- | --- | --- | --- |
| 需求分析 | completed | codex | TASK 已创建 |
| 契约冻结 | completed | codex | contract implemented |
| 测试计划 | completed | codex | test-plan 完成 |
| 后端开发 | completed | codex | API + MockMvc |
| 前端开发 | completed | codex | ModelPage + tests |
| 联调检查 | completed | codex | reports |
| 代码审查 | completed | codex | PASS |
| QA验收 | completed | codex | PASS |

## Change Log

| Date | Version | Changes | Author |
| --- | --- | --- | --- |
| 2026-05-05 | v1 | 完成 F006 模型仓库 MVP | codex |
| 2026-05-06 | v2 | 补齐前后端真实 API 集成和 CORS 放行 | codex |`r`n| 2026-05-06 | v3 | 补充数据资产、训练中心、组织权限、监控审计页面 API 接入与 fallback 说明 | codex |`r`n| 2026-05-06 | v4 | 补充平台总览、推理服务、标注任务、边缘下发的后端健康状态接入信号 | codex |`r`n| 2026-05-06 | v5 | 补齐平台总览、推理服务、标注任务、边缘下发的业务 API 与前端真实集成 | codex |