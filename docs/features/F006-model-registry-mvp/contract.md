# Feature Contract：模型仓库 MVP

## Metadata
- Feature: F006-model-registry-mvp
- Version: v1
- Status: implemented
- Owner: contract-architect
- Created: 2026-05-05
- Updated: 2026-05-05
- Trace Tag: TASK-model-registry-mvp

## Requirement Summary

- User goal: 将 F005 训练 artifact 登记为模型版本，经过评测与审批后供后续推理服务消费。
- Business value: 在训练与推理之间建立可审计、可追踪、可控发布的模型版本边界。

## Scope

### In Scope
- 模型列表、详情、版本注册、审批、驳回、归档。
- 训练来源与 artifact URI 追踪。
- 评测指标、checksum、deployable 标记。
- `model:read` / `model:manage` 权限 trace。

### Out of Scope
- 真实 MLflow / 对象存储接入。
- 真实推理部署。
- 自动评测流水线和复杂审批流。

## API Contract

### GET `/api/models`
- 权限：`model:read`
- 响应：`ModelListResponse`
  - `items`: `ModelSummary[]`
  - `featureTrace`: `TASK-model-registry-mvp`

### GET `/api/models/{modelKey}`
- 权限：`model:read`
- 响应：`ModelDetailResponse`
  - `modelKey`, `name`, `domain`, `owner`, `latestVersionKey`, `deployableVersionKey`, `versions`, `featureTrace`

### POST `/api/models/{modelKey}/versions`
- 权限：`model:manage`
- 请求：`ModelVersionRegisterRequest`
  - `versionName`, `trainingJobKey`, `artifactUri`, `checksum`, `accuracy`, `latencyMs`, `modelSizeMb`
- 响应：`ModelVersionActionResponse`
  - `modelKey`, `versionKey`, `status=REGISTERED`, `approvalStatus=APPROVAL_PENDING`, `deployable=false`, `featureTrace`

### POST `/api/models/{modelKey}/versions/{versionKey}/approve`
- 权限：`model:manage`
- 响应：`status=APPROVED`、`approvalStatus=APPROVED`、`deployable=true`

### POST `/api/models/{modelKey}/versions/{versionKey}/reject`
- 权限：`model:manage`
- 响应：`status=REJECTED`、`approvalStatus=REJECTED`、`deployable=false`

### POST `/api/models/{modelKey}/versions/{versionKey}/archive`
- 权限：`model:manage`
- 响应：`status=ARCHIVED`、`deployable=false`

### GET `/api/models/deployable`
- 权限：`model:read`
- 响应：已批准且可部署的模型版本列表。

## Permission Contract

- 读接口需要 `Authorization: Bearer LOCAL_DEV_TOKEN` 与 `model:read`。
- 管理接口需要 `Authorization: Bearer LOCAL_DEV_TOKEN` 与 `model:manage`。
- 缺少 token 返回 `401 AUTH_UNAUTHORIZED`。
- 缺少权限返回 `403 MODEL_FORBIDDEN`。

## Acceptance Mapping

| AC | Contract Evidence |
| --- | --- |
| AC-01 | 所有 `/api/models` API |
| AC-02 | `trainingJobKey`、`artifactUri` |
| AC-03 | `metrics`、`checksum`、`status`、`approvalStatus`、`deployable` |
| AC-04 | 权限合同与 response permission 字段 |
| AC-05 | 前端模型仓库页面合同 |
| AC-06 | Playwright 主流程 |
| AC-07 | 文档、报告与 gate |

## Open Production Decisions

- `TODO_CONFIRM_MODEL_ARTIFACT_URI`
- `TODO_CONFIRM_MODEL_EVAL_POLICY`
- `TODO_CONFIRM_MODEL_APPROVAL_POLICY`
- `TODO_CONFIRM_MLFLOW_ENDPOINT`