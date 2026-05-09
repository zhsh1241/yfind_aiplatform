# Feature Contract: 数据准备流水线

## Contract Metadata
- Feature: F008-dataset-preparation-pipeline
- Version: v1
- Status: frozen
- Owner: contract-architect
- Created: 2026-05-08
- Updated: 2026-05-08
- Trace: TASK-dataset-preparation-pipeline

## 1. Requirement Summary

F008 在现有 `dataset` domain 内提供训练前数据准备流水线能力，把多来源数据收集、清洗、标注、划分、预处理、增强、格式转换与加载纳入平台内置流程，最终产出可交给训练域消费的标准训练数据集快照与加载配置。

## 2. Scope

### In Scope
- 数据准备任务创建、列表和详情。
- 7 阶段流水线状态、质量门禁、阻断原因、人工修正与重跑记录。
- 来源登记、规则快照、输出快照、审计摘要。
- 复用 `dataset:read` / `dataset:manage` 权限。

### Out of Scope
- 训练任务提交和资源调度。
- 真实企业内部系统凭据、开放网络爬取、生产连接器。
- 模型注册、治理、推理部署。

## 3. API Contract

### 3.1 List preparation jobs
- Method: GET
- Path: `/api/datasets/preparation-jobs`
- Permission: `dataset:read`
- Description: 返回数据准备任务摘要列表，按创建时间倒序或服务默认顺序展示。

#### Query Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| datasetKey | string | no | 按数据集 key 过滤 |
| status | string | no | 按任务状态过滤：`DRAFT`、`RUNNING`、`BLOCKED`、`READY_FOR_TRAINING` |

#### Response Schema
```json
{
  "items": [
    {
      "jobId": "prep-motor-thermal-v3",
      "datasetKey": "motor-thermal",
      "datasetName": "电机温升异常图像集",
      "status": "BLOCKED",
      "currentStage": "LABELING",
      "progressPercent": 38,
      "blocked": true,
      "blockedReason": "标注一致性低于阈值",
      "qualityScore": 72,
      "rerunCount": 1,
      "outputSnapshotKey": "motor-thermal-train-snapshot-v4",
      "featureTrace": "TASK-dataset-preparation-pipeline"
    }
  ],
  "featureTrace": "TASK-dataset-preparation-pipeline"
}
```

### 3.2 Get preparation job detail
- Method: GET
- Path: `/api/datasets/preparation-jobs/{jobId}`
- Permission: `dataset:read`

#### Response Schema
```json
{
  "jobId": "prep-motor-thermal-v3",
  "datasetKey": "motor-thermal",
  "datasetName": "电机温升异常图像集",
  "owner": "算法组",
  "status": "BLOCKED",
  "currentStage": "LABELING",
  "progressPercent": 38,
  "sourceConfig": {
    "sourceType": "PUBLIC_DATASET",
    "sourceName": "motor-quality-open",
    "uri": "TODO_CONFIRM_SOURCE_URI",
    "complianceNote": "受控来源登记，不含真实凭据"
  },
  "ruleSnapshot": {
    "cleaningPolicy": "DEDUP_AND_MISSING_VALUE_BLOCK",
    "splitRatio": "70/15/15",
    "preprocessPolicy": "IMAGE_RESIZE_224_NORMALIZE",
    "augmentationPolicy": "ROTATE_AND_CROP_LIGHT",
    "targetFormat": "PAI_DLC_IMAGE_FOLDER"
  },
  "qualityGate": {
    "minQualityScore": 85,
    "minLabelAgreement": 0.9,
    "maxDuplicateRate": 0.02
  },
  "stages": [
    {
      "stageKey": "COLLECTION",
      "stageName": "数据收集",
      "status": "SUCCEEDED",
      "qualityScore": 96,
      "gatePassed": true,
      "message": "来源登记与样本清单完成",
      "startedAt": "2026-05-08T08:00:00Z",
      "finishedAt": "2026-05-08T08:05:00Z"
    }
  ],
  "outputSnapshot": {
    "snapshotKey": "motor-thermal-train-snapshot-v4",
    "trainVersionKey": "motor-thermal-v4-prepared",
    "loaderType": "PAI_DLC_DATA_LOADER",
    "manifestUri": "TODO_CONFIRM_OBJECT_STORAGE_URI",
    "trainSplitCount": 8988,
    "validationSplitCount": 1926,
    "testSplitCount": 1926,
    "readyForTraining": false
  },
  "rerunRecords": [
    {
      "rerunId": "rerun-001",
      "stageKey": "LABELING",
      "operator": "local.admin",
      "reason": "补充人工复核后重跑标注一致性检查",
      "createdAt": "2026-05-08T09:10:00Z"
    }
  ],
  "auditTrail": [
    {
      "eventType": "QUALITY_GATE_BLOCKED",
      "actor": "system",
      "summary": "LABELING gate failed: agreement 0.82 < 0.9",
      "createdAt": "2026-05-08T09:00:00Z"
    }
  ],
  "featureTrace": "TASK-dataset-preparation-pipeline"
}
```

### 3.3 Create preparation job
- Method: POST
- Path: `/api/datasets/preparation-jobs`
- Permission: `dataset:manage`
- Description: 为现有数据集创建数据准备任务；首期可自动生成 7 阶段初始状态与规则快照。

#### Request Schema
```json
{
  "datasetKey": "motor-thermal",
  "sourceType": "PUBLIC_DATASET",
  "sourceName": "motor-quality-open",
  "sourceUri": "TODO_CONFIRM_SOURCE_URI",
  "splitRatio": "70/15/15",
  "targetFormat": "PAI_DLC_IMAGE_FOLDER",
  "minQualityScore": 85,
  "minLabelAgreement": 0.9,
  "maxDuplicateRate": 0.02,
  "operator": "local.admin"
}
```

#### Request Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| datasetKey | string | yes | 已存在数据集 key |
| sourceType | enum string | yes | `PUBLIC_DATASET`、`INTERNAL_SYSTEM`、`CONTROLLED_WEB_SOURCE` |
| sourceName | string | yes | 来源名称 |
| sourceUri | string | no | 来源 URI；未知外部事实使用 `TODO_CONFIRM_*` |
| splitRatio | string | yes | 训练/验证/测试比例，如 `70/15/15` |
| targetFormat | string | yes | 目标训练格式 |
| minQualityScore | integer | yes | 质量分最低门槛，0-100 |
| minLabelAgreement | number | yes | 标注一致性最低门槛，0-1 |
| maxDuplicateRate | number | yes | 最大重复率，0-1 |
| operator | string | no | 操作者，默认 `local.admin` |

#### Response Schema
```json
{
  "jobId": "prep-motor-thermal-20260508093000",
  "datasetKey": "motor-thermal",
  "status": "RUNNING",
  "currentStage": "COLLECTION",
  "blocked": false,
  "nextAction": "RUN_STAGE",
  "featureTrace": "TASK-dataset-preparation-pipeline"
}
```

### 3.4 Run next stage
- Method: POST
- Path: `/api/datasets/preparation-jobs/{jobId}/run-next-stage`
- Permission: `dataset:manage`
- Description: 推进当前未完成阶段。若门禁失败，任务状态变为 `BLOCKED`，后续阶段不得执行。

#### Request Schema
```json
{
  "operator": "local.admin",
  "qualityScoreOverride": 92,
  "labelAgreementOverride": 0.94,
  "duplicateRateOverride": 0.01
}
```

#### Response Schema
```json
{
  "jobId": "prep-motor-thermal-v3",
  "status": "RUNNING",
  "currentStage": "CLEANING",
  "blocked": false,
  "blockedReason": "",
  "stageResult": {
    "stageKey": "COLLECTION",
    "status": "SUCCEEDED",
    "qualityScore": 96,
    "gatePassed": true,
    "message": "数据收集完成"
  },
  "featureTrace": "TASK-dataset-preparation-pipeline"
}
```

### 3.5 Rerun blocked stage after manual fix
- Method: POST
- Path: `/api/datasets/preparation-jobs/{jobId}/rerun-blocked-stage`
- Permission: `dataset:manage`
- Description: 人工修正后重跑被阻断阶段，记录重跑与审计摘要。

#### Request Schema
```json
{
  "operator": "local.admin",
  "reason": "补充人工复核样本并修正标签",
  "qualityScoreOverride": 91,
  "labelAgreementOverride": 0.95,
  "duplicateRateOverride": 0.01
}
```

#### Response Schema
```json
{
  "jobId": "prep-motor-thermal-v3",
  "status": "RUNNING",
  "currentStage": "SPLIT",
  "blocked": false,
  "rerunCount": 2,
  "stageResult": {
    "stageKey": "LABELING",
    "status": "SUCCEEDED",
    "qualityScore": 91,
    "gatePassed": true,
    "message": "人工修正后重跑通过"
  },
  "featureTrace": "TASK-dataset-preparation-pipeline"
}
```

## 4. Domain Enumerations

### Job Status
| Value | Description |
|-------|-------------|
| DRAFT | 已创建但尚未执行 |
| RUNNING | 阶段执行中或可继续推进 |
| BLOCKED | 当前阶段门禁失败，必须人工修正后重跑 |
| READY_FOR_TRAINING | 7 阶段完成，标准训练数据集快照可用 |

### Stage Keys
| Value | Name | Gate Focus |
|-------|------|------------|
| COLLECTION | 数据收集 | 来源登记、关键字段、样本清单 |
| CLEANING | 数据清洗 | 缺失值、重复率、格式统一 |
| LABELING | 数据标注 | 标签结构、标注一致性、准确性 |
| SPLIT | 数据划分 | 训练/验证/测试比例与分布 |
| PREPROCESSING | 数据预处理 | 图像/文本处理规则输出 |
| AUGMENTATION | 数据增强 | 增强策略与版本化 |
| FORMAT_LOADING | 格式转换与加载 | 训练格式、manifest、DataLoader 元数据 |

### Stage Status
`PENDING`、`RUNNING`、`SUCCEEDED`、`FAILED`、`SKIPPED`。

## 5. Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| datasetKey | required, existing dataset | 数据集不存在 |
| sourceType | required enum | 来源类型不支持 |
| sourceName | required, 1-100 chars | 来源名称不能为空 |
| splitRatio | pattern `n/n/n`, sum=100 | 划分比例必须为训练/验证/测试且总和为 100 |
| minQualityScore | 0-100 | 质量门槛必须在 0 到 100 之间 |
| minLabelAgreement | 0-1 | 标注一致性门槛必须在 0 到 1 之间 |
| maxDuplicateRate | 0-1 | 重复率门槛必须在 0 到 1 之间 |
| reason | rerun required, 1-200 chars | 重跑原因不能为空 |

## 6. Error Responses

| HTTP | Code | Scenario | Message |
|------|------|----------|---------|
| 400 | validation_error | 请求字段非法 | 参数校验失败 |
| 401 | unauthorized | 缺少或无效 Authorization | 未认证 |
| 403 | forbidden | 缺少 `dataset:read` 或 `dataset:manage` | 无权限执行数据准备操作 |
| 404 | dataset_not_found | datasetKey 不存在 | 未找到数据集 |
| 404 | preparation_job_not_found | jobId 不存在 | 未找到数据准备任务 |
| 409 | preparation_job_blocked | 任务被门禁阻断仍尝试推进 | 当前阶段已阻断，请人工修正后重跑 |
| 409 | preparation_job_completed | 已完成任务重复执行 | 数据准备任务已完成 |
| 422 | gate_failed | 阶段质量门禁不通过 | 阶段质量门禁未通过 |

## 7. Acceptance Criteria Mapping

| AC | Contract Coverage |
|----|-------------------|
| AC-01 | contract metadata frozen、文档齐备 |
| AC-02 | stage enumeration 覆盖 7 阶段 |
| AC-03 | create job request 覆盖来源配置、规则快照、质量门槛、输出目标 |
| AC-04 | run-next-stage gate failed / BLOCKED 语义 |
| AC-05 | rerun-blocked-stage、rerunRecords、auditTrail |
| AC-06 | 前端可消费 list/detail schema，并以 7 个阶段独立处理页呈现阶段输入、功能处理、质量门禁、产出与本页专属操作 |
| AC-07 | outputSnapshot 仅到训练数据集快照 / loader 元数据 |
| AC-08 | permission 声明与 featureTrace |

## 8. Handoff Notes

### To backend-tdd-engineer
- 在 `com.yfind.aiplatform.dataset` 内实现，不新增平行 domain。
- 可新增 `DatasetPreparation*` DTO / record。
- `DatasetController` 继续承载 `/api/datasets` 下接口，并复用 `PlatformAuthorizationService`。
- 测试必须包含 `TASK-dataset-preparation-pipeline` 和 AC 标签。

### To frontend-engineer
- 扩展 `datasetApi.ts` 类型与 fallback。
- 在 `DatasetPage.tsx` 添加数据准备流水线卡片/表格/详情，不引入新依赖。
- Playwright 覆盖 7 阶段文案、阻断原因、重跑入口。

