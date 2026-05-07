# TASK：训练任务 MVP

## 元数据

- Feature：F005-training-job-mvp
- 任务 ID：TASK-training-job-mvp
- 状态：completed
- 前置条件：`plan.md` 已批准（`plan_status: approved`）
- Owner：codex
- 创建日期：2026-05-05
- 更新日期：2026-05-05

## 1. 需求摘要

作为算法工程师或平台管理员，我希望在平台中选择已准备好的数据集版本和小模型算法模板，发起训练任务，并查看任务状态、资源调度、日志、指标和 artifact 输出位置，以便将数据资产推进到模型产出和后续推理服务。

## 2. 范围

### In Scope

- [x] 训练任务列表、详情、创建、取消和模板查询 API。
- [x] 复用 F004 数据集详情服务校验训练数据集键。
- [x] 训练任务状态、资源请求、队列状态和 adapter 提交 ID。
- [x] CPU / GPU / NPU / epoch 等资源与训练参数展示。
- [x] 训练日志、指标快照和 artifact 占位记录。
- [x] `ai-adapter/` 训练模板与训练提交占位接口。
- [x] 前端训练中心看板、指标详情和启动训练步骤流。

### Out of Scope

- Notebook / VS Code 在线开发环境。
- 真实 GPU/NPU 集群调度。
- 真实对象存储、MLflow、Kubeflow 或 Argo 生产接入。
- 高级超参搜索、自动模型选择和长周期训练实验管理。

## 3. 技术分析

### Backend

- Package：`backend/src/main/java/com/yfind/aiplatform/training/`。
- Service：`TrainingJobService` 管理内存训练任务、模板、指标、日志和 artifact 占位数据。
- API：`GET /api/training-jobs`、`GET /api/training-jobs/{jobKey}`、`POST /api/training-jobs`、`POST /api/training-jobs/{jobKey}/cancel`、`GET /api/training-jobs/templates`。
- Tests：`TrainingJobControllerTest` 覆盖 AC-01 到 AC-07。

### ai-adapter

- Router：`ai-adapter/app/api/training.py`。
- API：`GET /internal/training/templates`、`POST /internal/training/submit`。
- Tests：`ai-adapter/tests/test_health.py` 增加 F005 模板和提交占位测试。

### Frontend

- Pages：`frontend/src/pages/TrainingPage.tsx`。
- Modal：`frontend/src/modals/TrainingModal.tsx`。
- Styles：`frontend/src/styles.css`。
- Tests：`frontend/src/App.test.tsx` 和 `frontend/e2e/training-job.spec.ts`。

### Reuse Plan

复用审查已完成：本轮复用 `backend/` 既有 Spring Boot 单体骨架、MockMvc 测试方式、F004 `DatasetService` 数据集校验入口、`frontend/` React + Ant Design 原型页面结构、`App.test.tsx` 回归测试入口、Playwright `frontend/e2e/*.spec.ts` 组织方式，以及 `ai-adapter/` FastAPI router 注册模式。新增 seam 仅限训练任务、训练模板、训练日志、训练指标和 artifact 占位这些仓库中尚不存在的领域对象。

## 4. 验收项

- [x] **AC-01**：后端提供训练任务列表、详情、创建、取消和模板 API，要求本地开发 token 与训练权限，并返回 `TASK-training-job-mvp` trace。
- [x] **AC-02**：训练任务详情展示数据集版本、模板、资源请求、状态、队列状态和 adapter 提交 ID。
- [x] **AC-03**：训练任务详情展示日志、指标和 artifact 占位输出，包含 `TODO_CONFIRM_MODEL_ARTIFACT_URI`。
- [x] **AC-04**：`ai-adapter` 提供训练模板和训练提交占位接口，返回 adapter 提交 ID 与 artifact 根路径。
- [x] **AC-05**：前端训练中心展示任务看板、资源调度、算法模板、指标趋势和 artifact 提示。
- [x] **AC-06**：前端支持启动训练步骤流，并支持点击训练指标查看详情。
- [x] **AC-07**：`contract.md`、`test-plan.md`、SQL notes、验证报告和 feature gate 文档齐备。

### 4.1 Definition of Done

- [x] `contract.md` 状态为 `implemented`。
- [x] `test-plan.md` 覆盖 `AC-01..AC-07`。
- [x] 自动化测试包含 `TASK-training-job-mvp` 和 `AC-xx` 追踪。
- [x] SQL notes 已放入 `docs/features/F005-training-job-mvp/sql/`。
- [x] 复用审查已完成，`Reuse Plan` 已列出具体复用 seam。
- [x] 后端、ai-adapter、前端单测和构建已通过。
- [x] Playwright 场景已新增并纳入 gate。
- [x] 未使用 `git commit --no-verify` / `git push --no-verify`。
- [x] 真实生产接入限制已在风险中说明。

## 5. Dependencies

- Blocked By：F004 数据资产 MVP、`ai-adapter/` FastAPI 骨架。
- Blocks：F006 模型仓库 MVP、F007 推理服务 MVP。

## 6. 风险

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| 真实训练编排未接入 | High | High | 明确本轮为 adapter 占位，保留 `TODO_CONFIRM_WORKFLOW_ENGINE_QUEUE` |
| artifact 根路径未确认 | High | High | 使用 `TODO_CONFIRM_MODEL_ARTIFACT_URI` 标记并写入 SQL notes |
| 权限仍是本地开发 token 模式 | Medium | Medium | 已增加 `Authorization: Bearer LOCAL_DEV_TOKEN`、`X-Platform-Permissions` 权限校验和 401/403 测试；生产仍需替换为 F002 统一认证 |
| 状态持久化仍为内存 | Medium | Medium | SQL notes 给出后续表结构建议 |

## Change Log

| Date | Version | Changes | Author |
| --- | --- | --- | --- |
| 2026-05-05 | v1 | 完成 F005 训练任务 MVP 实现与中文文档修复 | codex |