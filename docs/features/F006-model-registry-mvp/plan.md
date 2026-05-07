---
feature: F006-model-registry-mvp
title: 模型仓库 MVP
plan_status: approved
approved_at: "2026-05-05"
owner: codex
created_at: 2026-05-05
updated_at: 2026-05-05
---

# 计划：模型仓库 MVP

## 背景与目标

F005 已完成训练任务 MVP，可以展示训练任务、指标、日志和 `TODO_CONFIRM_MODEL_ARTIFACT_URI` artifact 占位；但平台尚无模型版本管理能力。如果直接进入推理服务，部署对象缺少审批、评测、版本状态和训练来源追踪。

F006 的目标是在不接入真实 MLflow / 对象存储的前提下，建立模型仓库 MVP：登记模型版本、查看评测指标、审批/驳回版本，并为 F007 推理服务提供“已批准模型版本”的明确 seam。

## 规划证据

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`
- `.omx/context/model-registry-mvp-20260505T131500Z.md`
- `.omx/specs/deep-interview-model-registry-mvp.md`
- `.omx/plans/prd-model-registry-mvp.md`
- `.omx/plans/test-spec-model-registry-mvp.md`

## 范围

### In Scope

- 模型列表、详情、版本列表和版本详情。
- 从 F005 训练任务 artifact 占位注册模型版本。
- 模型版本状态：`DRAFT`、`REGISTERED`、`EVALUATING`、`APPROVAL_PENDING`、`APPROVED`、`REJECTED`、`ARCHIVED`。
- 训练来源、评测指标、checksum、artifact URI、部署准入状态展示。
- 审批、驳回、归档操作。
- 权限 trace：读操作 `model:read`，管理/审批操作 `model:manage`。
- 前端模型仓库页面、版本详情抽屉、审批/驳回弹窗。
- 后端 MockMvc、前端 Vitest、Playwright E2E 和 scaffold gate。

### Out of Scope / Non-goals

- 真实 MLflow、对象存储或模型二进制文件下载。
- 真实推理服务部署、灰度发布、回滚（留给 F007）。
- 自动模型评测流水线。
- 复杂模型 lineage 图谱、多级审批流、多租户配额。
- 生产级模型签名和供应链安全扫描。

## 技术方案要点

### Backend

后续 `/build-feature` 阶段新增 `backend/src/main/java/com/yfind/aiplatform/model/`，建议包含：

- `ModelRegistryController`
- `ModelRegistryService`
- `ModelSummary`
- `ModelDetailResponse`
- `ModelVersionSummary`
- `ModelVersionRegisterRequest`
- `ModelVersionActionResponse`
- `ModelRegistryApiExceptionHandler`

建议 API 草案：

- `GET /api/models`
- `GET /api/models/{modelKey}`
- `POST /api/models/{modelKey}/versions`
- `POST /api/models/{modelKey}/versions/{versionKey}/approve`
- `POST /api/models/{modelKey}/versions/{versionKey}/reject`
- `POST /api/models/{modelKey}/versions/{versionKey}/archive`
- `GET /api/models/deployable`

MVP 数据可先使用内存 seed，必须包含来自 F005 的训练任务 key 和 artifact URI，例如 `train-bearing-v1`、`TODO_CONFIRM_MODEL_ARTIFACT_URI/train-bearing-v1`。

### Frontend

后续新增 `frontend/src/pages/ModelPage.tsx`，替换当前 `model` 模块的 `GenericModulePage` 占位。页面建议包含：

- 模型列表卡片 / 表格。
- 模型版本时间线。
- 训练来源与 artifact 信息。
- 评测指标区：accuracy、latency、model size、throughput 等 MVP 指标。
- 审批 / 驳回弹窗。
- “可部署”状态标签，为 F007 推理服务入口预留。

### ai-adapter

F006 不强制新增 adapter 接口。若需要模拟 MLflow，可仅在合同中保留 `TODO_CONFIRM_MLFLOW_ENDPOINT`，不在本轮引入真实外部依赖。

### Database / SQL

F006 MVP 不做真实 DB migration，但应在 `sql/migration-notes.md` 中记录后续表建议：

- `model_registry`
- `model_version`
- `model_metric`
- `model_approval_event`

## 复用策略

复用审查已完成：F006 必须复用 F005 训练任务 artifact seam（`TrainingJobDetailResponse`、`TrainingArtifactSummary`、`TODO_CONFIRM_MODEL_ARTIFACT_URI`）、F002 权限词表中的 `model:read` / `model:manage`、现有 Spring Boot + MockMvc 测试基座、React + Ant Design 原型框架、`App.test.tsx` 与 Playwright feature trace 方式。禁止复制一套与 F005 平行的 artifact 表达；模型版本中的训练来源字段必须引用 F005 的训练任务 key 与 artifact URI。只有模型、版本、审批、可部署状态这些现有 seam 不存在的领域边界允许新增。

### Must Reuse

- `backend/src/main/java/com/yfind/aiplatform/training/TrainingArtifactSummary.java`
- `backend/src/main/java/com/yfind/aiplatform/training/TrainingJobDetailResponse.java`
- `backend/src/main/java/com/yfind/aiplatform/permission/PlatformPermission.java` 中的 `MODEL_READ`、`MODEL_MANAGE`
- `frontend/src/App.tsx` 中的 `model` 导航模块
- `frontend/src/App.test.tsx` 与 `frontend/e2e/*.spec.ts` 的追踪测试方式

### Duplication Rejected

- 不复制新的训练 artifact schema；模型版本只消费 F005 artifact seam。
- 不新增真实外部 SDK 或 MLflow 依赖。
- 不在 F006 实现推理部署能力。

## 异常场景

- artifact URI 仍为 `TODO_CONFIRM_MODEL_ARTIFACT_URI`：允许注册，但页面和 API 必须明确标注“生产存储待确认”。
- 评测指标不足：版本可保持 `REGISTERED` 或 `APPROVAL_PENDING`，但不得变为 `APPROVED`。
- 审批驳回：必须保留驳回原因，并阻止 F007 部署消费。
- 模型版本已归档：不得再次审批为可部署。
- 未知模型或版本：返回明确 404 语义。

## 决策边界

### Codex 可自行决定

- 后端 DTO、controller、service、异常类命名。
- MVP 内存 seed 数据结构。
- 前端布局、卡片、抽屉、弹窗和指标展示方式。
- 测试 fixture 与 Playwright 场景组织。

### 必须保留为待确认

- 真实 MLflow / 对象存储接入方式。
- 生产审批策略和审批人来源。
- 模型评测准入阈值。
- 真实模型签名、checksum 和安全扫描策略。

## 验收项草案

- **AC-01**：后端提供模型列表、详情、注册、审批、驳回、归档 API，并返回 `TASK-model-registry-mvp` trace。
- **AC-02**：模型版本可追踪到 F005 训练任务 key 和 artifact URI。
- **AC-03**：模型版本详情展示评测指标、checksum、状态、approval status 和 deployable 标记。
- **AC-04**：读操作体现 `model:read`，管理/审批操作体现 `model:manage`。
- **AC-05**：前端模型仓库页面支持查看模型列表、版本详情、审批和驳回交互。
- **AC-06**：Playwright 覆盖从“模型仓库”导航进入、查看版本、完成审批的主流程。
- **AC-07**：`contract.md`、`test-plan.md`、SQL notes、code review、QA、gate 均可追踪到 F006。

## 风险与依赖

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| artifact 根 URI 未确认 | F007 无法真实部署模型 | 保留 `TODO_CONFIRM_MODEL_ARTIFACT_URI`，F006 只做登记和展示 |
| 评测标准未确认 | 审批准入缺少生产依据 | 保留 `TODO_CONFIRM_MODEL_EVAL_POLICY`，MVP 使用示例指标 |
| 审批策略未生产化 | 多组织审批无法覆盖 | 保留 `TODO_CONFIRM_MODEL_APPROVAL_POLICY`，MVP 仅本地管理员审批 |
| 没有真实模型二进制 | 无法做下载/签名验证 | 明确 out of scope，后续生产化补充 |

## 开放问题

- 模型 artifact 最终存储在 MLflow、对象存储，还是两者组合？
- 模型版本进入 `APPROVED` 的最小评测阈值是什么？
- 审批人来自 F002 角色、组织管理员，还是独立模型委员会？
- F007 推理服务需要消费哪些最小字段：`modelKey`、`versionKey`、`artifactUri`、`runtime`、`signature`？

## 人审说明

当前 `plan_status: approved`，不得开始 F006 业务实现。审查通过后，请人工将 frontmatter 改为：

```yaml
plan_status: approved
approved_at: "2026-05-05"
```

然后运行：

```powershell
node tools/ai-scaffold/dist/cli.js check-plan-approved docs/features/F006-model-registry-mvp
```