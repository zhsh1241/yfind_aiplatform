# Feature Contract: 视觉预处理算子与预处理数据集闭环

## Contract Metadata
- Version: v1
- Status: frozen
- Owner: contract-architect
- Created: 2026-05-26
- Frozen: 2026-05-26
- Feature: F017-visual-preprocess-operators-pipeline
- Source plan: `docs/features/F017-visual-preprocess-operators-pipeline/plan.md`

## 1. Requirement Summary

F017 在 F011 Pipeline 编辑器 / 算子广场与 F012 标注集成之间冻结一条“视觉预处理闭环”契约：用户可在 `opmarket` 浏览图片/视频预处理算子，在 `pipeline` 中基于图片或视频数据集运行预处理任务，系统把成功运行结果沉淀为 `PREPROCESSED` 数据集与版本，提供结果预览、人工确认、人工激活，并在数据集激活后允许其作为 F012 标注任务的来源数据集。

### Business references
- `docs/business/bizdocs/03-01-系统功能-数据管理.md`：`FUNC-DATA-013`、`FUNC-DATA-015`、`FUNC-DATA-016`、`FUNC-DATA-041`、`FUNC-DATA-060`、`FUNC-DATA-064`、`FUNC-DATA-086`、`FUNC-DATA-087`。
- `docs/business/bizdocs/02-01-业务流程-数据管理.md`：`DATA-005` 预处理数据集管理流程。
- `docs/business/rules/01-数据管理规则.md`：`DAT-005`、`DAT-007`、`DAT-009`、`DAT-012`。
- `docs/business/domain/01-领域对象-数据域.md`：`DataPipeline`、`Dataset`、`DatasetVersion`、`DataLineage`、`AnnotationTask`。
- `docs/business/问题记录.md`：已确认标注任务可引用已激活预处理数据集。
- `docs/prototype/SMP工业AI平台-原型v2.html`：`pipeline`、`opmarket`、`ds`、`lineage`、`ann`。

### Frozen default decisions
1. 图片质量提高一期仅提供传统增强，不引入 AI 超分、生成式修复或外部模型依赖。
2. 预览水印与产物水印分离：预览水印用于界面预览防泄漏，产物水印是独立算子参数；两者不得混用。
3. 视频抽帧默认输出图片型 `PREPROCESSED` 数据集，不输出视频型结果集作为默认主路径。
4. Pipeline 运行成功后只生成“待确认”的预处理结果；必须人工确认后，才允许激活。

### Compatibility requirements
- 不破坏 F011 已冻结的 Pipeline / Operator Marketplace 路径与 `ApiResponse<T>` envelope。
- 不破坏 F012 标注任务创建、来源数据集校验与 `ACTIVE` 数据集筛选口径。
- `PREPROCESSED` 结果必须继续复用 F009/F010 既有 `dataset`、`dataset_version`、`dataset_file`、`data_lineage` 资产模型，不新增平行结果资产模型。

## 2. API Contract

> 说明：本契约以“扩展 F011/F012 既有 API + 补充 F017 必需动作 API”为冻结口径；所有响应继续包裹在统一 `ApiResponse<T>` 中。

### 2.1 视觉预处理算子目录

#### `GET /api/v1/operators`
- Description: 查询算子广场；当 `categoryGroup=VISUAL_PREPROCESS` 时返回视觉预处理算子目录。
- Auth: Bearer token。
- Permission: `data:operator:read`。
- Query: `keyword?`, `categoryGroup?`, `dataType?`, `stage?`, `status?`, `supportsPreview?`, `page?`, `pageSize?`。
- Frozen behavior:
  - `categoryGroup=VISUAL_PREPROCESS` 时仅返回视觉预处理算子。
  - 图片质量提高算子固定暴露 `enhancementMode=TRADITIONAL_ONLY`。
  - 视频抽帧算子默认声明 `defaultOutputDatasetDataType=IMAGE`。
- Response: `VisualOperatorListResponse`。

#### `GET /api/v1/operators/{operatorId}`
- Description: 查询单个视觉预处理算子详情、参数 schema、默认值、前后效果样例与标注链路风险提示。
- Permission: `data:operator:read`。
- Response: `VisualOperatorDetailResponse`。

### 2.2 Pipeline 视觉预处理模板与运行

#### `POST /api/v1/pipelines`
- Description: 创建视觉预处理 Pipeline 草稿或基于模板初始化草稿。
- Permission: `data:pipeline:write`。
- Audit: `PIPELINE_PREPROCESS_CREATED`。
- Request: `VisualPipelineCreateRequest`。
- Response: `VisualPipelineDetailResponse`。

#### `PUT /api/v1/pipelines/{pipelineId}`
- Description: 更新视觉预处理 Pipeline 草稿 DAG、算子参数、输出设置。
- Permission: `data:pipeline:write`。
- Audit: `PIPELINE_PREPROCESS_UPDATED` / `PIPELINE_PREPROCESS_VALIDATION_FAILED`。
- Request: `VisualPipelineSaveRequest`。
- Response: `VisualPipelineDetailResponse`。

#### `POST /api/v1/pipelines/{pipelineId}/validate`
- Description: 校验视觉预处理 Pipeline 的 DAG、输入输出类型、参数完整性和默认规则。
- Permission: `data:pipeline:write`。
- Audit: 失败时 `PIPELINE_PREPROCESS_VALIDATION_FAILED`。
- Response: `VisualPipelineValidationResponse`。

#### `POST /api/v1/pipelines/{pipelineId}/runs`
- Description: 发起一次视觉预处理运行，生成待确认的预处理结果数据集草稿版本。
- Permission: `data:pipeline:run`。
- Audit: `PIPELINE_PREPROCESS_RUN_STARTED`，后续跟 `PIPELINE_PREPROCESS_RUN_SUCCEEDED` 或 `PIPELINE_PREPROCESS_RUN_FAILED`。
- Request: `VisualPipelineRunRequest`。
- Response: `VisualPipelineRunDetailResponse`。

#### `GET /api/v1/pipeline-runs/{runId}`
- Description: 查询视觉预处理运行详情、样例预览摘要、失败摘要与生成数据集信息。
- Permission: `data:pipeline:read`。
- Response: `VisualPipelineRunDetailResponse`。

### 2.3 结果预览 / 确认 / 激活

#### `GET /api/v1/preprocessed-datasets/{datasetId}/preview`
- Description: 查询预处理结果预览，包括样例前后对比、抽帧摘要、水印信息、失败/跳过原因。
- Permission: `data:dataset:read`。
- Response: `PreprocessedDatasetPreviewResponse`。

#### `POST /api/v1/preprocessed-datasets/{datasetId}/confirm`
- Description: 对预处理结果执行人工确认；确认后方可激活。
- Permission: `data:dataset:publish`。
- Audit: `PREPROCESSED_DATASET_CONFIRMED`。
- Request:
```json
{
  "decision": "CONFIRM",
  "comment": "抽帧质量和缩放结果满足标注要求"
}
```
- Response: `PreprocessedDatasetActivationResponse`。

#### `POST /api/v1/preprocessed-datasets/{datasetId}/activate`
- Description: 激活已确认的 `PREPROCESSED` 数据集版本。
- Permission: `data:dataset:publish`。
- Audit: `PREPROCESSED_DATASET_ACTIVATED` / `PREPROCESSED_DATASET_ACTIVATION_REJECTED`。
- Request:
```json
{
  "targetVersionId": "DVER-PREP-001",
  "activationNote": "人工确认通过，允许进入标注来源列表"
}
```
- Response: `PreprocessedDatasetActivationResponse`。

### 2.4 标注任务来源衔接

#### `GET /api/v1/annotation/source-datasets`
- Description: 查询可用于标注任务创建的来源数据集列表；包含原始数据集与预处理数据集。
- Permission: `data:annotation:write`。
- Query: `keyword?`, `sourceType?`, `scene?`, `page?`, `pageSize?`。
- Frozen behavior:
  - `PREPROCESSED` 数据集仅当 `status=ACTIVE`、`annotationEligible=true` 且当前用户有权访问时返回。
  - 若结果集带不可逆产物水印，必须被过滤或标记 `annotationEligible=false`。
- Response: `AnnotationSourceDatasetListResponse`。

#### `POST /api/v1/annotation/tasks`
- Description: 复用 F012 创建标注任务；当 `sourceDatasetType=PREPROCESSED` 时执行额外校验。
- Permission: `data:annotation:write`。
- Additional rule: 若来源为预处理数据集，则必须校验其 `activationStatus=ACTIVE`、`confirmed=true`、`annotationEligible=true`。
- Response: 复用 `AnnotationTaskDetailResponse`。

## 3. DTO Schema

### 3.1 VisualOperatorListResponse
```json
{
  "items": [
    {
      "operatorId": "OP-IMG-ENHANCE",
      "name": "图片质量提高",
      "categoryGroup": "VISUAL_PREPROCESS",
      "category": "IMAGE_PROCESSING",
      "subCategory": "QUALITY_ENHANCEMENT",
      "dataType": "IMAGE",
      "status": "PUBLISHED",
      "supportsPreview": true,
      "enhancementMode": "TRADITIONAL_ONLY",
      "defaultOutputDatasetDataType": "IMAGE",
      "annotationRiskLevel": "LOW"
    },
    {
      "operatorId": "OP-VIDEO-FRAME-EXTRACT",
      "name": "视频抽帧",
      "categoryGroup": "VISUAL_PREPROCESS",
      "category": "VIDEO_PROCESSING",
      "subCategory": "FRAME_EXTRACTION",
      "dataType": "AUDIO_VIDEO",
      "status": "PUBLISHED",
      "supportsPreview": true,
      "defaultOutputDatasetDataType": "IMAGE",
      "annotationRiskLevel": "LOW"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 2
}
```

### 3.2 VisualOperatorDetailResponse
```json
{
  "operatorId": "OP-IMG-WATERMARK",
  "name": "图片加水印",
  "categoryGroup": "VISUAL_PREPROCESS",
  "category": "IMAGE_PROCESSING",
  "subCategory": "WATERMARK",
  "dataType": "IMAGE",
  "status": "PUBLISHED",
  "parameterSchema": {
    "type": "object",
    "properties": {
      "previewWatermarkEnabled": { "type": "boolean", "default": true },
      "artifactWatermarkEnabled": { "type": "boolean", "default": false },
      "watermarkText": { "type": "string" },
      "position": { "type": "string", "enum": ["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT", "CENTER"] },
      "opacity": { "type": "number", "minimum": 0.1, "maximum": 1.0 }
    },
    "required": ["previewWatermarkEnabled", "artifactWatermarkEnabled"]
  },
  "frozenDefaults": {
    "previewWatermarkEnabled": true,
    "artifactWatermarkEnabled": false,
    "annotationEligibleWhenArtifactWatermarked": false
  },
  "beforeExample": "原始图片示例",
  "afterExample": "叠加水印示例",
  "annotationRiskNotice": "带不可逆产物水印的结果默认不可进入标注链路"
}
```

### 3.3 VisualPipelineCreateRequest
```json
{
  "name": "焊缝视频抽帧预处理",
  "templateCode": "VIDEO_FRAME_TO_IMAGE_PREPROCESS",
  "sourceDatasetId": "DATASET-WELD-VIDEO-001",
  "sourceVersionId": "DVER-WELD-VIDEO-001",
  "description": "抽帧并统一图片尺寸",
  "tenantId": "TENANT-CABIN"
}
```

### 3.4 VisualPipelineSaveRequest
```json
{
  "name": "焊缝视频抽帧预处理",
  "description": "抽帧并统一图片尺寸",
  "sourceDatasetId": "DATASET-WELD-VIDEO-001",
  "sourceVersionId": "DVER-WELD-VIDEO-001",
  "nodes": [
    {
      "nodeId": "extract",
      "operatorId": "OP-VIDEO-FRAME-EXTRACT",
      "label": "固定间隔抽帧",
      "config": {
        "mode": "FIXED_INTERVAL",
        "intervalSeconds": 2,
        "outputImageFormat": "JPG"
      }
    },
    {
      "nodeId": "resize",
      "operatorId": "OP-IMG-RESIZE",
      "label": "图片缩放",
      "config": {
        "width": 1280,
        "height": 720,
        "keepAspectRatio": true
      }
    }
  ],
  "edges": [
    { "edgeId": "EDGE-1", "sourceNodeId": "extract", "targetNodeId": "resize", "edgeType": "DATA" }
  ],
  "resultDatasetConfig": {
    "datasetName": "焊缝视频抽帧预处理结果",
    "datasetType": "PREPROCESSED",
    "datasetDataType": "IMAGE",
    "autoActivate": false
  }
}
```

### 3.5 VisualPipelineDetailResponse
```json
{
  "pipelineId": "PIPE-VIS-001",
  "name": "焊缝视频抽帧预处理",
  "templateCode": "VIDEO_FRAME_TO_IMAGE_PREPROCESS",
  "status": "DRAFT",
  "sourceDatasetId": "DATASET-WELD-VIDEO-001",
  "sourceVersionId": "DVER-WELD-VIDEO-001",
  "sourceDatasetDataType": "AUDIO_VIDEO",
  "resultDatasetConfig": {
    "datasetType": "PREPROCESSED",
    "datasetDataType": "IMAGE",
    "autoActivate": false,
    "confirmRequired": true
  },
  "nodes": [
    {
      "nodeId": "extract",
      "operatorId": "OP-VIDEO-FRAME-EXTRACT",
      "label": "固定间隔抽帧"
    }
  ],
  "edges": [
    {
      "edgeId": "EDGE-1",
      "sourceNodeId": "extract",
      "targetNodeId": "resize",
      "edgeType": "DATA"
    }
  ],
  "frozenDecisions": {
    "enhancementMode": "TRADITIONAL_ONLY",
    "previewWatermarkSeparated": true,
    "videoFrameOutputDatasetDataType": "IMAGE",
    "manualConfirmationRequired": true
  }
}
```

### 3.6 VisualPipelineValidationResponse
```json
{
  "valid": true,
  "diagnosticCode": "OK",
  "diagnosticMessage": "VISUAL_PREPROCESS_PIPELINE_VALID",
  "errors": [],
  "warnings": [
    "视频抽帧默认输出图片型 PREPROCESSED 数据集",
    "图片质量提高一期仅支持传统增强"
  ]
}
```

### 3.7 VisualPipelineRunRequest
```json
{
  "triggerMode": "MANUAL",
  "sampleLimit": 200,
  "resultDatasetName": "焊缝视频抽帧预处理结果",
  "resultDatasetDescription": "由 Pipeline 运行生成，待人工确认",
  "confirmRequired": true
}
```

### 3.8 VisualPipelineRunDetailResponse
```json
{
  "runId": "PRUN-VIS-001",
  "pipelineId": "PIPE-VIS-001",
  "versionId": "PVER-VIS-001",
  "status": "SUCCEEDED",
  "triggerMode": "MANUAL",
  "sourceDatasetId": "DATASET-WELD-VIDEO-001",
  "sourceVersionId": "DVER-WELD-VIDEO-001",
  "resultDatasetId": "DATASET-PREP-001",
  "resultVersionId": "DVER-PREP-001",
  "resultDatasetType": "PREPROCESSED",
  "resultDatasetDataType": "IMAGE",
  "activationStatus": "PENDING_CONFIRMATION",
  "confirmed": false,
  "annotationEligible": true,
  "summary": {
    "totalInputCount": 120,
    "successCount": 110,
    "skippedCount": 6,
    "failedCount": 4,
    "previewPairCount": 10,
    "frameExtractedCount": 356
  },
  "previewManifest": [
    {
      "sampleKey": "video001#frame0001",
      "beforeUrl": "/preview/before/video001#frame0001",
      "afterUrl": "/preview/after/video001#frame0001",
      "previewWatermarkApplied": true,
      "artifactWatermarkApplied": false
    }
  ],
  "failureSamples": [
    {
      "sampleKey": "video009",
      "reasonCode": "VIDEO_DECODE_FAILED",
      "reasonMessage": "源视频解码失败"
    }
  ],
  "lineage": {
    "sourceDatasetId": "DATASET-WELD-VIDEO-001",
    "pipelineId": "PIPE-VIS-001",
    "operatorChain": ["OP-VIDEO-FRAME-EXTRACT", "OP-IMG-RESIZE"]
  },
  "startedAt": "2026-05-26T09:00:00Z",
  "endedAt": "2026-05-26T09:03:00Z"
}
```

### 3.9 PreprocessedDatasetPreviewResponse
```json
{
  "datasetId": "DATASET-PREP-001",
  "versionId": "DVER-PREP-001",
  "datasetName": "焊缝视频抽帧预处理结果",
  "datasetType": "PREPROCESSED",
  "datasetDataType": "IMAGE",
  "activationStatus": "PENDING_CONFIRMATION",
  "confirmed": false,
  "annotationEligible": true,
  "previewSummary": {
    "totalCount": 356,
    "previewPairCount": 10,
    "failedCount": 4,
    "skippedCount": 6
  },
  "watermarkPolicy": {
    "previewWatermarkEnabled": true,
    "artifactWatermarkEnabled": false,
    "artifactWatermarkBlocksAnnotation": true
  },
  "samplePairs": [
    {
      "sampleKey": "frame-0001.jpg",
      "beforeUrl": "/preview/before/frame-0001.jpg",
      "afterUrl": "/preview/after/frame-0001.jpg",
      "differenceHint": "清晰度提升 + 尺寸统一"
    }
  ],
  "failureSummary": [
    {
      "reasonCode": "VIDEO_DECODE_FAILED",
      "count": 4,
      "reasonMessage": "视频解码失败"
    }
  ]
}
```

### 3.10 PreprocessedDatasetActivationResponse
```json
{
  "datasetId": "DATASET-PREP-001",
  "versionId": "DVER-PREP-001",
  "datasetStatus": "ACTIVE",
  "activationStatus": "ACTIVE",
  "confirmed": true,
  "annotationEligible": true,
  "confirmedBy": "USR-DATA-ADMIN",
  "confirmedAt": "2026-05-26T09:10:00Z",
  "activatedBy": "USR-DATA-ADMIN",
  "activatedAt": "2026-05-26T09:12:00Z",
  "diagnosticCode": "OK",
  "diagnosticMessage": "PREPROCESSED_DATASET_ACTIVATED"
}
```

### 3.11 AnnotationSourceDatasetListResponse
```json
{
  "items": [
    {
      "datasetId": "DATASET-PREP-001",
      "datasetName": "焊缝视频抽帧预处理结果",
      "datasetType": "PREPROCESSED",
      "datasetDataType": "IMAGE",
      "status": "ACTIVE",
      "annotationEligible": true,
      "sourceDatasetId": "DATASET-WELD-VIDEO-001",
      "lineageType": "PIPELINE_PREPROCESS",
      "previewAvailable": true
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

### 3.12 AnnotationTaskCreateRequest（PREPROCESSED 来源示例）
```json
{
  "name": "焊缝抽帧结果标注任务",
  "sourceDatasetId": "DATASET-PREP-001",
  "sourceDatasetType": "PREPROCESSED",
  "sourceVersionId": "DVER-PREP-001",
  "templateId": "LT-WELD-BBOX",
  "scene": "IMAGE_TAGGING",
  "reviewEnabled": true,
  "assigneeIds": ["USR-ANNOTATOR"],
  "reviewerIds": ["USR-REVIEWER"]
}
```

## 4. Errors

| HTTP | Business Code | Scenario | Rule |
|---|---:|---|---|
| 400 | 40001 | JSON 结构、枚举值、参数区间不合法 | 统一参数错误 |
| 401 | 40100 | 未认证或 token 失效 | 复用平台认证 |
| 403 | 40300 | 缺少 pipeline/operator/dataset publish/annotation 权限 | 权限控制 |
| 404 | 40400 | 资源不存在或跨 BU 读不可见 | `DAT-012` |
| 409 | 40900 | 未确认即激活、已激活版本重复修改、状态流转冲突 | `DAT-005` + F017 状态机 |
| 409 | 40901 | 带不可逆产物水印的结果试图进入标注链路 | 冻结默认决策 |
| 422 | 42200 | 缺少 `sourceDatasetId`、处理参数快照、血缘记录 | `DAT-007` |
| 422 | 42201 | 来源数据集非 ACTIVE、结果数据集非 ACTIVE 却用于标注 | `DAT-009` |
| 422 | 42202 | 图片质量提高请求 AI 超分/生成式修复能力 | 冻结默认决策 |
| 422 | 42203 | 视频抽帧请求默认输出非图片型结果但未显式扩展审批 | 冻结默认决策 |

## 5. Domain / State / Rules

### 5.1 State transitions

Visual preprocess pipeline:
- `DRAFT -> VALIDATED -> ACTIVE -> ARCHIVED`
- `ACTIVE -> DRAFT` 仅允许通过新建草稿版本，不得原地改写已生效版本。

Preprocessed dataset version activation status:
- `PENDING_CONFIRMATION -> CONFIRMED -> ACTIVE`
- `PENDING_CONFIRMATION -> REJECTED`
- `CONFIRMED -> ACTIVE`
- `ACTIVE -> ARCHIVED`

Pipeline run:
- `QUEUED -> RUNNING -> SUCCEEDED`
- `QUEUED -> RUNNING -> FAILED`

### 5.2 MUST rules mapping

- MUST-VPP-001 / `DAT-005`: 已激活的 `PREPROCESSED` 数据集版本不得修改；若需调整预处理算子、参数、文件内容或预览产物，必须重新运行生成新版本。
- MUST-VPP-002 / `DAT-007`: 预处理结果发布/激活前必须存在 `sourceDatasetId`、`sourceVersionId`、算子链、处理参数快照和 `data_lineage`；任一缺失都必须拒绝激活。
- MUST-VPP-003 / `DAT-009`: 标注任务只能引用 `ACTIVE` 的原始或预处理数据集；未激活、待确认、已拒绝、已归档的预处理结果不得进入标注来源列表。
- MUST-VPP-004 / `DAT-012`: 算子目录、Pipeline、结果预览、确认、激活、标注来源查询均必须遵守 BU 数据隔离；跨 BU 未授权访问返回 404 或 403，不得泄露资源存在性。
- MUST-VPP-005: 图片质量提高算子的 `enhancementMode` 固定为 `TRADITIONAL_ONLY`；若请求 AI 超分、生成式补全或未知增强模式，必须拒绝。
- MUST-VPP-006: 预览水印与产物水印必须分离存储和回传；`previewWatermarkEnabled` 不得推导为 `artifactWatermarkEnabled=true`。
- MUST-VPP-007: 视频抽帧运行成功时默认输出图片型 `PREPROCESSED` 数据集；若实现侧存在其他输出形态，只能作为非默认扩展，不得覆盖本契约默认口径。
- MUST-VPP-008: 人工确认是激活前置步骤；任何自动激活、运行成功即激活或跳过确认的路径都必须拒绝。
- MUST-VPP-009: 若 `artifactWatermarkEnabled=true` 且水印不可逆，则结果数据集必须标记 `annotationEligible=false`，不得进入 F012 标注来源选择。

## 6. Permissions and audit events

### Permissions
- `menu:pipeline`
- `menu:opmarket`
- `menu:ds`
- `menu:ann`
- `data:operator:read`
- `data:pipeline:read`
- `data:pipeline:write`
- `data:pipeline:run`
- `data:dataset:read`
- `data:dataset:publish`
- `data:annotation:write`

### Audit events
- `PIPELINE_PREPROCESS_CREATED`
- `PIPELINE_PREPROCESS_UPDATED`
- `PIPELINE_PREPROCESS_VALIDATION_FAILED`
- `PIPELINE_PREPROCESS_RUN_STARTED`
- `PIPELINE_PREPROCESS_RUN_SUCCEEDED`
- `PIPELINE_PREPROCESS_RUN_FAILED`
- `PREPROCESSED_DATASET_CREATED`
- `PREPROCESSED_DATASET_CONFIRMED`
- `PREPROCESSED_DATASET_ACTIVATED`
- `PREPROCESSED_DATASET_ACTIVATION_REJECTED`
- `PREPROCESSED_DATASET_ANNOTATION_BLOCKED`
- `ANNOTATION_TASK_SOURCE_SELECTED`
- `DATASET_CROSS_TENANT_DENIED`

## 7. Handoff notes

### To backend
- 复用 F011 Pipeline / Operator DTO 与运行记录模型，优先以扩展字段承载视觉预处理特性，不新建平行运行中心。
- `PREPROCESSED` 结果必须复用 F009/F010 的 `dataset` / `dataset_version` / `dataset_file` / `data_lineage`。
- 激活接口必须显式校验 `confirmed=true`、血缘完整、版本未激活过、当前用户具备发布权限。
- 标注来源列表必须复用 F012 的 ACTIVE 过滤逻辑，并增加 `annotationEligible` / 水印阻断判断。

### To frontend
- `opmarket` 需展示图片处理 / 视频处理两大类及本契约固定默认说明。
- `pipeline` 结果页必须展示前后对比、处理数、失败数、跳过数、抽帧统计、确认按钮、激活按钮与水印说明。
- `ann` 任务创建页需区分原始数据集 / 预处理数据集来源，并在不可选时展示原因。

### To QA / review
- 必测路径：图片传统增强、视频抽帧、预览水印显示、产物水印阻断、确认后激活、未激活不可标注、激活后可标注、跨 BU 拒绝。
- 若实现暴露任何“运行成功即激活”或“带不可逆产物水印仍可用于标注”的路径，按契约不通过。

## 8. Compatibility

- Backward compatibility: F009/F010/F011/F012 既有 endpoint、DTO 字段和 E2E 语义不得删除或改名。
- Versioning: 本期继续使用 `/api/v1`；新增字段必须向后兼容，前端允许忽略未知字段。
- Security: 不新增外部模型事实依赖；任何未确认执行器能力必须以 `TODO_CONFIRM_*` 表示，不得伪造生产能力。
- Data compatibility: 结果数据集类型固定为 `PREPROCESSED`；视频抽帧默认结果数据类型固定为 `IMAGE`。
