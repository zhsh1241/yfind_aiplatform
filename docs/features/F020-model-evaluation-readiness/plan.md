---
feature: F020-model-evaluation-readiness
title: 模型评估结果与发布门禁
plan_status: approved
approved_at: "2026-06-05"
owner: codex
created_at: 2026-06-04
updated_at: 2026-06-05
---

# Plan: 模型评估结果与发布门禁

## 1. 背景与目标

用户要求“开始 F020”。结合 F019 `model-registry-foundation` 的已批准计划与契约，本 feature 选择作为模型域下一步：把 F019 中临时存在的 `ModelVersion.evaluationStatus` / `evaluationRecordId` / `evaluationProof` seam，升级为可追踪、可展示、可审计、可阻断发布的模型评估事实源。

业务来源：

- `docs/business/bizdocs/02-02-业务流程-模型开发与训练.md`：`MODEL-002` 模型评估流程，覆盖选择待评估模型、独立验证数据集、指标配置、执行评估、查看多维报告与通过/继续调优决策。
- `docs/business/bizdocs/03-02-系统功能-模型开发.md`：`FUNC-MODEL-011`～`FUNC-MODEL-015`，覆盖评估指标配置、模型评估执行、多维度评估报告、模型版本对比、评测数据集下载控制。
- `docs/business/domain/02-领域对象-模型域.md`：`Model`、`ModelVersion`、训练/工程化聚合与评估指标关联。
- `docs/business/rules/02-模型开发规则.md`：`MDL-006` 模型必须通过评估后方可发布到模型注册中心；关联 `MDL-009` 模型版本状态机。
- `docs/business/api/01-API接口规范.md`：统一 `/api/v1` API 风格、响应 envelope、错误码与鉴权约定。

原型来源：

- `docs/prototype/SMP工业AI平台-原型v2.html` page key: `eval`。
- `docs/prototype/SMP工业AI平台-原型v2-compiled.html`。
- `docs/prototype/screen-eval.png`、`docs/prototype/light-eval.png`。
- 与模型版本上下文关联：`docs/prototype/screen-hub.png`。

规划证据归档：

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`

## Intent

F020 的意图不是单纯补一个“模型评估”页面，而是让模型版本发布 Production 前具备可信的评估记录事实源：模型版本只有存在符合阈值且状态为 `PASSED` 的评估记录时，才允许进入生产可用状态。

目标结果：

1. 建立模型评估任务、指标、报告与结果导入的正式规划边界。
2. 支持模型版本评估结果登记/导入，形成 `PASSED` / `FAILED` 判定。
3. 将 F019 模型版本 `Production` 发布门禁改为查询 F020 的 `PASSED` 评估记录，而不是依赖临时说明。
4. 前端 `eval` 页面展示真实评估任务、报告详情和版本对比。
5. 固化评估报告、评测数据集下载、跨 BU 可见性和审计规则。
6. 为后续真实评估执行器、MLflow/Argo/AI adapter 集成保留清晰 seam。

## 2. 范围

### In Scope

- 模型版本评估任务创建/登记：选择 `modelVersionId`、验证数据集版本、任务类型、指标配置与通过阈值。
- 评估任务状态机：`DRAFT -> READY -> RUNNING -> PASSED/FAILED/CANCELLED`；一期允许通过结果导入从 `READY` 进入终态。
- 评估结果导入/登记：保存指标快照、阈值判定、报告摘要、执行器类型和结果来源。
- 多维评估报告：整体指标、分类/检测/分割/NLP/时序指标摘要、PR 曲线数据、混淆矩阵数据、错误案例摘要 seam。
- 模型版本对比：对比同一模型多个版本的核心指标，并标记最佳值或差异。
- 评测数据集下载控制：记录下载权限策略、artifact 下载 seam 与审计。
- F019 发布门禁联动：`Transition(PRODUCTION)` 查询 F020 `PASSED` 评估记录；无记录或失败则阻断。
- 权限与审计：评估创建、结果导入、报告查看、artifact 下载、版本对比、发布阻断和门禁通过。
- 前端 `eval` 页面接入真实 API，替换原型说明性 mock；支持列表、详情、导入结果、报告、对比、空状态和错误状态。

### Out of Scope / Non-goals

- 不实现真实模型推理评估执行器；F020 一期支持结果导入/登记和 executor seam。
- 不接入真实 MLflow、Argo Workflows、KServe、AI adapter 执行链路。
- 不实现训练任务、开发环境、训练日志、TensorBoard 或资源调度。
- 不实现模型工程化量化、剪枝、蒸馏、格式转换或工程化后精度自动验证。
- 不实现推理服务部署、边端下发、A/B 流量治理或服务回滚。
- 不重新定义模型、模型版本、文件对象、数据集、组织用户、权限或审计事实表。
- 不用纯前端 mock 或静态报告冒充可发布门禁事实源。
- 不长期保留 F019 外部评估证明作为绕过通道；外部证明应在 F020 中表达为 `executorType=IMPORTED` 的评估记录。

## 3. Decision Boundaries

- **评估执行口径**：一期规划 `EvaluationExecutor` seam，不实现真实推理执行；验收不得宣称已完成端到端模型评估执行。
- **发布门禁口径**：F019 `Production` 发布必须查询 F020 `PASSED` 记录；管理员外部证明应转为 imported evaluation run，而不是绕过门禁。
- **指标模板口径**：分类、检测、分割、NLP、时序指标可规划为配置化模板；默认阈值保留 `TODO_CONFIRM_EVALUATION_THRESHOLD_POLICY`。
- **验证数据集独立性**：F020 要求记录 `datasetVersionId` 并阻断明确相同训练集；复杂数据泄露判定保留 `TODO_CONFIRM_EVALUATION_DATA_LEAKAGE_POLICY`。
- **下载策略口径**：评测数据集/报告 artifact 下载必须有权限与审计；使用 MinIO 预签名 URL 还是后端中转保留 `TODO_CONFIRM_EVALUATION_DATASET_DOWNLOAD_POLICY`。
- **版本对比口径**：只允许对用户有权查看的模型版本进行对比；跨 BU 不可泄露不可见版本存在性。

## 4. 技术方案要点

### Backend

- 新增模型评估应用服务，围绕 `EvaluationRun`、`EvaluationMetric`、`EvaluationReportArtifact` 实现：
  - 评估任务创建 / 查询 / 取消。
  - 结果导入 / 自动通过判定。
  - 报告详情查询。
  - 多版本评估指标对比。
  - 评测数据集与报告 artifact 下载权限 seam。
  - F019 Production 发布门禁查询 seam。
  - 审计事件写入。
- API 草案：
  - `GET /api/v1/model-evaluations`
  - `POST /api/v1/model-evaluations`
  - `GET /api/v1/model-evaluations/{evaluationRunId}`
  - `POST /api/v1/model-evaluations/{evaluationRunId}/results:import`
  - `POST /api/v1/model-evaluations/{evaluationRunId}/cancel`
  - `GET /api/v1/models/{modelId}/versions/{versionId}/evaluations`
  - `GET /api/v1/models/{modelId}/versions:compare-evaluations?versionIds=...`
  - `GET /api/v1/model-evaluations/{evaluationRunId}/artifacts/{artifactId}/download-url`
- F019 seam：更新或扩展模型版本状态流转服务，在 `targetStatus=PRODUCTION` 时调用评估门禁服务。
- 错误码草案：
  - `MODEL_EVALUATION_REQUIRED`
  - `MODEL_EVALUATION_FAILED`
  - `MODEL_EVALUATION_RESULT_INVALID`
  - `MODEL_EVALUATION_TERMINAL`
  - `MODEL_EVALUATION_DATASET_INVALID`
  - `MODEL_EVALUATION_DATASET_PERMISSION_DENIED`
  - `MODEL_EVALUATION_METRIC_CONFIG_INVALID`
  - `MODEL_EVALUATION_PERMISSION_DENIED`
  - `MODEL_EVALUATION_ARTIFACT_UNAVAILABLE`

### Frontend

- 复用原型 `eval` 信息架构，不新增无关一级菜单。
- 评估列表：模型、版本、数据集、状态、核心指标、通过/失败、最近更新时间、操作。
- 新建/登记评估：选择模型版本、验证数据集版本、任务类型、指标模板、阈值配置。
- 结果导入：导入指标 JSON / 表单录入核心指标；展示阈值判定预览。
- 报告详情：指标卡片、PR 曲线数据可视化、混淆矩阵、错误案例摘要、artifact 列表。
- 版本对比：模型版本多选、指标对比表、最佳值高亮、失败/无记录提示。
- 发布门禁提示：从模型中心或评估页面展示“未通过评估不可发布”的业务化错误。
- 移除原型说明性质元素，页面只展示真实业务数据、空状态和错误状态。

### Data / SQL

规划新增或扩展表：

- `model_evaluation_run`
- `model_evaluation_metric`
- `model_evaluation_report_artifact`

必须引用现有或已规划事实源：

- F019 `model_registry_model`
- F019 `model_registry_version`
- 数据集与数据集版本事实源
- `platform_file_object`
- 平台用户 / 组织 / 权限 / 审计事件表

建议约束与索引：

- `model_evaluation_run.evaluation_run_id` 主键。
- `model_evaluation_run.model_version_id` 逻辑引用模型版本。
- `model_evaluation_run.dataset_version_id` 必填。
- `model_evaluation_metric(evaluation_run_id, metric_name, category)` 唯一或按 contract 决定。
- 索引：`model_version_id + status`、`dataset_version_id`、`tenant_id + owner_org_id`、`created_at`。

SQL 必须归档到 `docs/features/F020-model-evaluation-readiness/sql/`。

### Integration Seams

- **F019 模型注册中心 seam**：查询 PASSED 评估记录，阻断/允许 Production 发布。
- **数据集 seam**：验证 dataset/datasetVersion 状态、权限和独立性。
- **文件对象 seam**：报告 artifact 或原始报告可绑定 `platform_file_object`。
- **EvaluationExecutor seam**：真实执行器后续接 AI adapter / MLflow / Argo；F020 一期不猜测实现。
- **审计 seam**：复用平台审计事件表与 traceId。

## Reuse Strategy

### Must Reuse

- 业务资料：`docs/business/bizdocs/02-02-业务流程-模型开发与训练.md`、`docs/business/bizdocs/03-02-系统功能-模型开发.md`、`docs/business/domain/02-领域对象-模型域.md`、`docs/business/rules/02-模型开发规则.md`。
- 原型资料：`docs/prototype/SMP工业AI平台-原型v2.html` page key `eval`、`screen-eval.png`、`light-eval.png`。
- F019 模型注册中心：`Model`、`ModelVersion`、模型版本状态机、权限、下载/文件对象 seam。
- 数据集域：数据集版本、状态、权限与下载策略 seam。
- 平台能力：RBAC、组织/BU、审计事件、统一 API envelope、traceId、错误处理。
- 前端基座：React / Ant Design 管理台 shell、`apiClient`、路由、错误展示、测试基座。
- `tools/ai-scaffold` feature artifact / prereq / gate 工作流。

### Duplication Rejected

- 不复制已删除旧 backend/frontend 实现。
- 不为模型版本重新建平行模型表或状态机。
- 不为评测数据集创建绕过数据集域权限的平行下载机制。
- 不用前端 mock 报告替代后端评估事实源。
- 不把 F019 的 `evaluationProof` 继续扩展成独立绕过通道；应纳入 F020 imported evaluation run。
- 不将真实执行器依赖（MLflow/Argo/KServe/AI adapter）写死为当前事实。

### Approved New Seams

- 新增 `EvaluationRun` / `EvaluationMetric` / `EvaluationReportArtifact` 评估域事实源。
- 新增 `EvaluationGateService` 或等价门禁服务供 F019 Production 流转调用。
- 新增 `EvaluationExecutor` 接口 seam，后续接入真实评估执行器。
- 新增前端评估报告/版本对比组件，但必须复用现有 API client 与页面 shell。

## 6. 权限、规则与审计

### 领域对象

- `Model`
- `ModelVersion`
- `EvaluationRun`
- `EvaluationMetric`
- `EvaluationReportArtifact`
- `Dataset`
- `DatasetVersion`
- `PlatformFileObject`
- `PlatformAuditEvent`

### MUST 规则

- `MDL-006`：模型版本发布到模型注册中心 / Production 前必须存在 `PASSED` 评估记录。
- `MDL-009`：模型版本状态机仍由 F019 控制，F020 只提供发布准入事实源。
- 数据集规则：评测数据集必须可访问、状态可用，并记录不可变版本。
- 权限规则：跨 BU 不得泄露不可见模型版本、评估报告或评测数据集。

### 权限

- 创建评估：模型 owner、模型训练工程师、BU 管理员、超级管理员。
- 导入结果：评估工程师、模型 owner、BU 管理员、超级管理员。
- 查看报告：模型可见且具备 `model:evaluation:read`。
- 版本对比：所有参与对比版本均需可见。
- 下载报告 artifact / 评测数据集：具备 `model:evaluation:download` 与数据集下载权限。
- Production 发布：仍由 F019 模型版本权限控制，但必须通过 F020 评估门禁。

### 审计事件草案

- `MODEL_EVALUATION_CREATED`
- `MODEL_EVALUATION_RESULT_IMPORTED`
- `MODEL_EVALUATION_PASSED`
- `MODEL_EVALUATION_FAILED`
- `MODEL_EVALUATION_CANCELLED`
- `MODEL_EVALUATION_REPORT_VIEWED`
- `MODEL_EVALUATION_ARTIFACT_DOWNLOADED`
- `MODEL_EVALUATION_COMPARE_VIEWED`
- `MODEL_VERSION_PUBLISH_BLOCKED_EVALUATION_REQUIRED`
- `MODEL_VERSION_PUBLISH_GATE_PASSED`

## 7. Exception Scenarios

- 模型或模型版本不存在：返回 404。
- 用户无权访问模型版本：返回 403 或 404（避免跨 BU 泄露）。
- 验证数据集不存在、未激活、已归档或无权限：创建评估拒绝。
- 验证数据集与训练集相同或被明确标记为训练集：创建评估拒绝；复杂血缘检测保留 TODO。
- 指标配置为空、阈值类型错误或不适用于任务类型：创建评估拒绝。
- 导入结果缺少必需指标：结果导入拒绝。
- 指标未达到阈值：评估进入 `FAILED`，Production 发布门禁阻断。
- 已终态评估重复导入结果：拒绝，需创建新评估任务。
- 报告 artifact 不存在或不可下载：返回业务错误并记录审计。
- 多版本对比含不可见版本：拒绝或过滤，按 contract 冻结。
- 未通过评估执行 Production 发布：返回 `MODEL_EVALUATION_REQUIRED`，并记录阻断审计。

## 8. 风险与依赖

- F019 当前模型注册中心实现状态会影响门禁联动方式；contract 阶段需先检查 F019 实际代码/API。
- 真实评估执行器尚未确认，一期必须避免宣称完成真实推理执行。
- 数据集独立性与数据泄露判断可能依赖数据血缘和训练任务事实源；一期仅做明确相同版本阻断和 seam。
- 不同任务类型默认指标与阈值策略未确认，必须保留 TODO，不得猜测业务默认值。
- 报告 artifact 存储策略需与文件对象/MinIO 治理一致，避免新增平行存储。
- 前端图表可先用轻量数据结构和现有组件表达，不新增依赖，除非用户明确批准。

## 9. 开放问题

- `TODO_CONFIRM_EVALUATION_THRESHOLD_POLICY`：不同任务类型的默认指标、阈值和通过规则由谁维护？是否按 BU 可配置？
- `TODO_CONFIRM_EVALUATION_EXECUTOR`：真实评估执行由 AI adapter、MLflow、Argo、KServe 还是独立服务承担？
- `TODO_CONFIRM_EVALUATION_DATA_LEAKAGE_POLICY`：如何判断验证集与训练集存在数据泄露？是否依赖数据血缘？
- `TODO_CONFIRM_EVALUATION_DATASET_DOWNLOAD_POLICY`：评测数据集是否允许下载？使用预签名 URL、后端中转还是仅报告可见？
- `TODO_CONFIRM_EVALUATION_REPORT_RETENTION`：原始报告和错误案例 artifact 保留多久？是否可删除？
- `TODO_CONFIRM_IMPORTED_EVALUATION_APPROVER`：外部评估证明导入需要模型 owner、BU 管理员还是超级管理员批准？

## 10. 验收项草案（后续 TASK.md 固化）

- AC-01：用户可为指定模型版本创建评估任务，记录验证数据集版本、指标配置和通过阈值。
- AC-02：缺少模型版本、无权限模型版本、未激活/无权限数据集或非法阈值时创建失败。
- AC-03：用户可导入评估结果，系统按阈值自动判定 `PASSED` / `FAILED` 并保存指标快照。
- AC-04：导入结果缺少必需指标或终态重复导入时被拒绝。
- AC-05：F019 Production 发布门禁查询 F020 `PASSED` 评估记录；无记录或 `FAILED` 时阻断。
- AC-06：存在 `PASSED` 评估记录时，模型版本可继续执行 Production 状态流转。
- AC-07：报告详情展示核心指标、PR 曲线数据、混淆矩阵数据和错误案例摘要 seam。
- AC-08：用户可对比同一模型多个版本的指标，并高亮/标记最佳值。
- AC-09：评测数据集或报告 artifact 下载遵守权限与审计规则。
- AC-10：跨 BU 无授权用户不可查看评估报告或对比不可见版本。
- AC-11：评估创建、结果导入、通过/失败、报告查看、artifact 下载、发布阻断均记录审计。
- AC-12：前端 `eval` 页面通过真实 API 展示列表、详情、对比、空状态和错误状态，不出现原型说明性 mock 文案。

## 11. 交付方案

1. `/build-feature` Phase 0.5：执行 `check-build-feature-prereqs`，确认本 plan 已人工批准并归档规划证据。
2. Phase 1：基于本 plan 创建/更新 `TASK.md`，固化 AC-xx 与工作拆分。
3. 契约设计：冻结 API、DTO、错误码、权限、审计事件、状态机、SQL 表结构和 F019 门禁 seam。
4. 测试设计：覆盖 happy path、权限失败、状态机错误、审计、`MDL-006` 和前端 E2E。
5. 后端实现：评估任务/结果/报告服务、F019 门禁联动、权限审计、SQL migration。
6. 前端实现：`eval` 页面、创建/导入结果、报告详情、版本对比、业务化错误与空状态。
7. Review + QA：重点审查真实执行器非目标、F019 复用、跨 BU 泄露、数据集下载控制和门禁测试。
8. 门禁：
   - `node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F020-model-evaluation-readiness`
   - `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F020-model-evaluation-readiness --skip-backend-integration`
   - 前端行为变更后追加 `--run-e2e`。

## 12. 审批记录

- Reviewer: 用户
- Decision: 用户于 2026-06-05 明确同意 F020 规划，并要求使用 `/build-feature` 开始开发。
