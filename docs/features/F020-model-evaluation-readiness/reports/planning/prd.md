> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-model-evaluation-readiness.md`

# RALPLAN PRD: 模型评估结果与发布门禁

## Metadata
- Feature: `F020-model-evaluation-readiness`
- Slug: `model-evaluation-readiness`
- Source spec: `.omx/specs/deep-interview-model-evaluation-readiness.md`
- Created: 20260604T144313Z
- Consensus status: APPROVE
- Planning mode: RALPLAN-DR short

## Principles

1. **评估事实源优先**：F020 首先服务 MDL-006 发布门禁，而不是只复刻评估页面。
2. **复用模型版本事实源**：必须引用 F019 `ModelVersion`，不得重复建模模型/版本生命周期。
3. **真实数据优先于 mock**：前端 `eval` 页面必须由后端评估 API 驱动；未知执行器只能作为 seam。
4. **门禁可测试**：未评估、失败、通过三类发布路径必须可自动验证。
5. **权限与审计内建**：评估报告、评测数据集和发布阻断都必须纳入 RBAC/审计。

## Decision Drivers

| Driver | Priority | Rationale |
|---|---:|---|
| F019 发布 Production 依赖评估通过 | P0 | 没有 F020，模型注册中心只能依赖临时外部证明。 |
| 真实执行器外部依赖未锁定 | P0 | 不得猜测 MLflow/Argo/KServe/AI adapter 执行细节。 |
| 原型 `eval` 页面已存在 | P1 | 前端必须对齐 `screen-eval.png`/`light-eval.png` 的信息架构。 |
| 评测集权限敏感 | P1 | 评估报告可能泄露跨 BU 数据集和指标。 |

## Viable Options

### Option A — 评估事实源 + 结果导入 + 门禁联动（推荐）

- 范围：新增评估任务/结果/报告事实源，支持外部结果导入，联动 F019 Production 门禁。
- 优点：外部依赖少，能立即解决 MDL-006；后续可接真实执行器。
- 缺点：一期不宣称完成真实模型推理执行。
- 适用性：当前仓库最合适。

### Option B — 直接实现端到端评估执行器

- 范围：评估任务创建后调度推理执行、计算指标、写报告。
- 优点：覆盖 FUNC-MODEL-012 更完整。
- 缺点：需要模型运行时、数据加载、资源调度、框架适配，依赖尚未成熟。
- 决策：本期拒绝，作为后续 executor seam。

### Option C — 只做前端评估页面

- 范围：替换原型页面，展示静态或 mock 指标。
- 优点：快。
- 缺点：不能满足 MDL-006，且违反“不长期 mock”的重建规则。
- 决策：拒绝。

## Recommended Decision

采用 **Option A**：F020 建立模型评估结果事实源与发布门禁联动，真实评估执行器作为 seam 预留。该方案可在现有 F019 模型注册中心、数据集、权限、审计和前端管理台基础上交付可验证的业务闭环。

## Problem Statement

当前 F019 已建立模型/模型版本注册中心，并在 Production 发布前检查 `evaluationStatus` 或临时外部评估证明。但平台缺少独立的评估记录、指标配置、报告与版本对比事实源，导致模型质量准入不可追溯、不可展示、不可系统化审计。F020 需要补齐此断点。

## Goals

1. 支持模型版本评估任务创建/登记，记录验证数据集、指标配置和通过阈值。
2. 支持评估结果导入/登记，并自动判定 `PASSED` / `FAILED`。
3. 支持多维评估报告查询：指标摘要、PR 曲线数据、混淆矩阵数据、错误案例摘要 seam。
4. 支持同一模型多个版本的指标对比。
5. 将 F020 `PASSED` 评估记录接入 F019 `Transition(PRODUCTION)` 门禁。
6. 支持评测数据集下载控制、权限校验与审计。
7. 前端 `eval` 页面接入真实 API，展示任务列表、报告详情和版本对比。

## Non-goals

- 不实现真实 MLflow、Argo、KServe、AI adapter 评估执行。
- 不实现训练任务、开发环境、工程化优化或推理部署。
- 不重复定义模型、模型版本、数据集、文件对象、组织用户或审计表。
- 不实现完整样本级错误案例存储；仅保留摘要和 artifact seam。

## Domain Model Draft

### EvaluationRun

| Field | Type | Notes |
|---|---|---|
| evaluationRunId | string | `EVAL-*` |
| modelId | string | 引用 F019 `Model` |
| modelVersionId | string | 引用 F019 `ModelVersion` |
| datasetId | string | 验证/评测数据集 |
| datasetVersionId | string | 强制记录版本，保障可复现 |
| taskType | enum | 与模型任务类型一致或兼容 |
| status | enum | `DRAFT` / `READY` / `RUNNING` / `PASSED` / `FAILED` / `CANCELLED` |
| metricConfig | object | 指标及阈值配置 |
| passCriteria | object | 通过标准快照 |
| resultSummary | object | 核心指标摘要 |
| executorType | enum | `IMPORTED` / `AI_ADAPTER` / `MLFLOW` / `ARGO` seam |
| createdBy | string | 创建人 |
| tenantId / ownerOrgId | string | 权限隔离 |
| startedAt / completedAt | datetime | 可选 |

### EvaluationMetric

- `metricId`
- `evaluationRunId`
- `metricName`
- `metricValue`
- `thresholdOperator`
- `thresholdValue`
- `passed`
- `category`（可选，用于分类/类别维度）

### EvaluationReportArtifact

- `artifactId`
- `evaluationRunId`
- `artifactType`: `PR_CURVE` / `CONFUSION_MATRIX` / `ERROR_CASE_SUMMARY` / `RAW_REPORT`
- `payloadJson` 或 `fileObjectId`
- `downloadAllowed`

## Status Machine

```text
DRAFT -> READY -> RUNNING -> PASSED
                    │         
                    └-------> FAILED
READY -> CANCELLED
RUNNING -> CANCELLED
```

一期结果导入可从 `READY` 直接登记为 `PASSED` / `FAILED`；若未来接真实执行器，则使用 `RUNNING`。

## API Draft

- `GET /api/v1/model-evaluations`
- `POST /api/v1/model-evaluations`
- `GET /api/v1/model-evaluations/{evaluationRunId}`
- `POST /api/v1/model-evaluations/{evaluationRunId}/results:import`
- `POST /api/v1/model-evaluations/{evaluationRunId}/cancel`
- `GET /api/v1/models/{modelId}/versions/{versionId}/evaluations`
- `GET /api/v1/models/{modelId}/versions:compare-evaluations?versionIds=...`
- `GET /api/v1/model-evaluations/{evaluationRunId}/artifacts/{artifactId}/download-url`
- F019 seam update: `POST /api/v1/models/{modelId}/versions/{versionId}/transition` 在 `targetStatus=PRODUCTION` 时查询 F020 PASSED 记录。

## Permission Draft

| Action | Permission | Scope |
|---|---|---|
| list/view evaluation | `model:evaluation:read` | 同 BU / 授权 / 平台模型可见 |
| create evaluation | `model:evaluation:write` | 模型 owner、模型训练工程师、BU 管理员 |
| import results | `model:evaluation:result:write` | 评估工程师、模型 owner、BU 管理员 |
| compare versions | `model:evaluation:read` | 所有版本均需可见 |
| download artifacts/dataset | `model:evaluation:download` | 遵守数据集下载策略 |
| production gate bypass | 无默认 bypass | 本期不允许绕过 PASSED 记录；外部证明应转为 imported evaluation run |

## Audit Events

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

## Exception Scenarios

- 模型版本不存在或无权限：404/403。
- 验证数据集不存在、未激活或无权限：422/403。
- 验证数据集疑似训练集：422，保留数据血缘 seam。
- 指标配置缺失或阈值不合法：400/422。
- 导入结果缺少必需指标：422。
- 已终态评估重复导入结果：409。
- 多版本对比中任一版本无权限：403 或隐藏不可见版本。
- 未通过评估发布 Production：422 `MODEL_EVALUATION_REQUIRED`。

## Delivery Phases for /build-feature

1. TASK：固化 AC-xx，覆盖 FUNC-MODEL-011～015 与 MDL-006。
2. Contract：冻结 API、DTO、状态机、权限、错误码、审计、SQL。
3. Test plan：覆盖 happy path、权限失败、状态机错误、审计和发布门禁。
4. Backend：评估域服务、F019 门禁联动、SQL、测试。
5. Frontend：`eval` 页面、报告、对比视图、错误/空状态。
6. QA/gate：scaffold gate；前端变更追加 E2E。

## ADR

- Decision: 建立评估事实源与结果导入门禁，不在 F020 一期实现真实执行器。
- Drivers: F019 依赖评估门禁；外部执行器依赖未定；需要可审计、可测试闭环。
- Alternatives considered: 端到端真实执行器、纯前端页面。
- Why chosen: 最小化外部依赖，同时交付业务关键规则 MDL-006。
- Consequences: 后续需要单独 feature 接入真实执行器；F020 契约必须避免宣称已完成真实推理评估。
- Follow-ups: `TODO_CONFIRM_EVALUATION_THRESHOLD_POLICY`、`TODO_CONFIRM_EVALUATION_EXECUTOR`、`TODO_CONFIRM_EVALUATION_DATA_LEAKAGE_POLICY`。
