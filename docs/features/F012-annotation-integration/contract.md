# Feature Contract: 标注任务、标注审核与 Label Studio 适配

## Contract Metadata
- Version: v1
- Status: frozen
- Owner: contract-architect
- Created: 2026-05-19
- Frozen: 2026-05-19
- Feature: F012-annotation-integration
- Source plan: `docs/features/F012-annotation-integration/plan.md`

## 1. Requirement Summary

F012 实现 DATA 域标注闭环控制面：前端按原型 `ann`、`annwork`、`annreview` 信息架构提供任务管理、标注工作台和审核；后端提供可持久化、可审计、可校验、可生成标注文件、`ANNOTATED` 数据集和 `ANNOTATION` 血缘的 Annotation API；Label Studio 和 AI 预标注均以 seam 落地，未知生产参数必须以 `TODO_CONFIRM_*` 暴露。

> **2026-05-20 变更说明**：本契约已按最新口径追加待确认调整：标注场景仅支持图片打标/图片分割，任务完成后必须生成并保存标注文件。代码已按用户确认口径同步改造，本契约重新冻结。

### Business references
- `docs/business/bizdocs/02-01-业务流程-数据管理.md`：DATA-003、DATA-006。
- `docs/business/bizdocs/03-01-系统功能-数据管理.md`：FUNC-DATA-020、021、022、023、024、025、026、028、042、095。
- `docs/business/domain/01-领域对象-数据域.md`：`AnnotationTask`、`LabelTemplate`、`Dataset`。
- `docs/business/rules/01-数据管理规则.md`：DAT-003、DAT-004、DAT-009、DAT-010、DAT-011、DAT-012。
- `docs/business/rules/05-平台与权限规则.md`：PLT-001、PLT-005、PLT-009、PLT-011、PLT-014。
- `docs/prototype/SMP工业AI平台-原型v2.html`：`ann`、`annwork`、`annreview`、`dsdetail`、`lineage`。

### Compatibility requirements
- 不破坏 F009 数据集、版本、文件、血缘、访问授权和引用检查 API。
- 不破坏 F010/F011 标准化与 Pipeline API。
- 所有响应继续使用统一 `ApiResponse<T>` envelope。
- 仅新增 `/api/v1/annotation/*` API，不改变已有路径语义。

## 2. API Contract

### 2.1 Overview and tasks

#### `GET /api/v1/annotation/overview`
- Description: 查询当前用户可见标注任务统计、任务列表摘要和模板列表。
- Auth: Bearer token。
- Permission: `data:annotation:read`。
- Response: `AnnotationOverviewResponse`。

#### `GET /api/v1/annotation/tasks`
- Description: 查询标注任务列表。
- Auth: Bearer token。
- Permission: `data:annotation:read`。
- Query: `status?`, `keyword?`, `page?`, `pageSize?`。
- Response: `AnnotationTaskListResponse`。

#### `POST /api/v1/annotation/tasks`
- Description: 创建标注任务、分配标注员并初始化工作项。
- Auth: Bearer token。
- Permission: `data:annotation:write` + 分配时 `data:annotation:assign`。
- Audit: `ANNOTATION_TASK_CREATED`、`ANNOTATION_TASK_ASSIGNED`；失败时 `ANNOTATION_TASK_CREATE_FAILED`。
- Request: `AnnotationTaskCreateRequest`。
- Response: `AnnotationTaskDetailResponse`。

#### `GET /api/v1/annotation/tasks/{taskId}`
- Description: 获取标注任务详情、分配、工作项、审核项、发布记录和外部绑定状态。
- Permission: `data:annotation:read`。
- Response: `AnnotationTaskDetailResponse`。

#### `POST /api/v1/annotation/tasks/{taskId}/assign`
- Description: 为任务追加或替换标注/审核人员。
- Permission: `data:annotation:assign`。
- Audit: `ANNOTATION_TASK_ASSIGNED`。
- Request:
```json
{
  "assigneeIds": ["USR-ANNOTATOR"],
  "reviewerIds": ["USR-REVIEWER"]
}
```
- Response: `AnnotationTaskDetailResponse`。

#### `POST /api/v1/annotation/tasks/{taskId}/start`
- Description: 启动已分配任务。
- Permission: `data:annotation:write`。
- Audit: `ANNOTATION_TASK_STARTED`。
- Response: `AnnotationTaskDetailResponse`。

#### `POST /api/v1/annotation/tasks/{taskId}/pause`
#### `POST /api/v1/annotation/tasks/{taskId}/cancel`
- Description: 暂停或取消任务。
- Permission: `data:annotation:admin`。
- Audit: `ANNOTATION_TASK_PAUSED` / `ANNOTATION_TASK_CANCELLED`。
- Response: `AnnotationTaskDetailResponse`。

### 2.2 Label templates

#### `GET /api/v1/annotation/label-templates`
- Description: 查询标签模板。
- Permission: `data:label-template:read`。
- Query: `status?`, `scene?`。
- Response: `AnnotationLabelTemplateResponse[]`。

#### `POST /api/v1/annotation/label-templates`
- Description: 创建标签模板草稿。
- Permission: `data:label-template:write`。
- Audit: `ANNOTATION_TEMPLATE_CREATED`。
- Request: `AnnotationLabelTemplateRequest`。
- Response: `AnnotationLabelTemplateResponse`。

#### `PUT /api/v1/annotation/label-templates/{templateId}`
- Description: 更新标签模板草稿。
- Permission: `data:label-template:write`。
- Response: `AnnotationLabelTemplateResponse`。

#### `POST /api/v1/annotation/label-templates/{templateId}/publish`
- Description: 发布模板，使其可用于任务创建。
- Permission: `data:label-template:publish`。
- Audit: `ANNOTATION_TEMPLATE_PUBLISHED`。
- Response: `AnnotationLabelTemplateResponse`。

#### `POST /api/v1/annotation/label-templates/{templateId}/archive`
- Description: 归档模板。
- Permission: `data:label-template:publish`。
- Response: `AnnotationLabelTemplateResponse`。

#### `GET /api/v1/annotation/label-templates/{templateId}/label-studio-config`
- Description: 获取 Label Studio label config seam。
- Permission: `data:label-template:read`。
- Response:
```json
{
  "templateId": "LT-WELD-BBOX",
  "configXml": "<View>...</View>",
  "diagnosticCode": "OK",
  "diagnosticMessage": "LABEL_STUDIO_CONFIG_GENERATED"
}
```

### 2.3 Workbench

#### `GET /api/v1/annotation/tasks/{taskId}/work-items`
- Description: 查询当前用户可见工作项；管理员可见全任务。
- Permission: `data:annotation:submit` 或 `data:annotation:read`。
- Response: `AnnotationWorkItemResponse[]`。

#### `POST /api/v1/annotation/work-items/{workItemId}/draft`
- Description: 保存标注草稿。
- Permission: `data:annotation:submit`。
- Request: `{ "annotationJson": "{...}" }`。
- Response: `AnnotationWorkItemResponse`。

#### `POST /api/v1/annotation/work-items/{workItemId}/submit`
- Description: 提交标注结果；启用审核时进入 `REVIEW_PENDING` 并创建审核项，否则工作项直接 `APPROVED`。
- Permission: `data:annotation:submit`。
- Audit: `ANNOTATION_RESULT_SUBMITTED`。
- Request: `{ "annotationJson": "{...}" }`。
- Response: `AnnotationWorkItemResponse`。

### 2.4 Review and publication

#### `GET /api/v1/annotation/review-items`
- Description: 查询待审核/已审核队列。
- Permission: `data:annotation:review`。
- Query: `status?`, `taskId?`。
- Response: `AnnotationReviewItemResponse[]`。

#### `POST /api/v1/annotation/review-items/{reviewItemId}/approve`
- Description: 审核通过。
- Permission: `data:annotation:review`。
- Audit: `ANNOTATION_REVIEW_APPROVED`；DAT-004 失败时 `ANNOTATION_REVIEW_SELF_REJECTED`。
- Response: `AnnotationReviewItemResponse`。

#### `POST /api/v1/annotation/review-items/{reviewItemId}/reject`
- Description: 审核驳回；原因必填。
- Permission: `data:annotation:review`。
- Audit: `ANNOTATION_REVIEW_REJECTED`。
- Request: `{ "reason": "框选偏移，需要修正" }`。
- Response: `AnnotationReviewItemResponse`。

#### `POST /api/v1/annotation/tasks/{taskId}/quality-check`
- Description: 运行标注数据集发布前质量检查。
- Permission: `data:annotation:publish`。
- Response: `AnnotationPublicationResponse`。

#### `POST /api/v1/annotation/tasks/{taskId}/publish-dataset`
- Description: 质量检查通过后生成并保存标注文件，再生成 `ANNOTATED` 数据集、版本、结果文件绑定和血缘。
- Permission: `data:annotation:publish`。
- Audit: `ANNOTATION_DATASET_PUBLISHED`；失败时 `ANNOTATION_QUALITY_CHECK_FAILED`。
- Response: `AnnotationPublicationResponse`。

### 2.5 Label Studio seam

#### `GET /api/v1/annotation/tasks/{taskId}/label-studio/status`
- Description: 查询 Label Studio 外部绑定状态。
- Permission: `data:annotation:read`。
- Response: `AnnotationExternalBindingResponse`。

#### `POST /api/v1/annotation/tasks/{taskId}/label-studio/sync-project`
- Description: 同步 Label Studio 项目 seam；未配置时返回 `UNCONFIGURED`。
- Permission: `data:annotation:admin`。
- Audit: `ANNOTATION_LABEL_STUDIO_SYNC_FAILED` when unconfigured/failed。
- Response: `AnnotationExternalBindingResponse`。

#### `POST /api/v1/annotation/work-items/{workItemId}/label-studio/sync-task`
- Description: 同步单个 Label Studio task seam。
- Permission: `data:annotation:submit`。
- Response: `AnnotationExternalBindingResponse`。

#### `POST /api/v1/annotation/tasks/{taskId}/label-studio/import-results`
- Description: 从 Label Studio 导入结果 seam；本期无真实生产导入，未配置时返回 `UNCONFIGURED`。
- Permission: `data:annotation:admin`。
- Response: `AnnotationExternalBindingResponse`。

## 3. DTO Schema

### 3.1 AnnotationTaskCreateRequest
```json
{
  "name": "Q2焊缝检测图像标注",
  "sourceDatasetId": "DATASET-WELD-DEFECT",
  "sourceVersionId": "DVER-WELD-001",
  "templateId": "LT-WELD-BBOX",
  "scene": "IMAGE_TAGGING",
  "reviewEnabled": true,
  "prelabelEnabled": true,
  "labelStudioEnabled": true,
  "prelabelModelSource": "TODO_CONFIRM_PRELABEL_MODEL_SOURCE",
  "prelabelConfidence": 0.7,
  "assigneeIds": ["USR-ANNOTATOR"],
  "reviewerIds": ["USR-REVIEWER"],
  "deadline": "2026-06-01T00:00:00Z",
  "note": "优先处理批次3"
}
```

### 3.2 AnnotationTaskSummaryResponse
```json
{
  "taskId": "ANN-WELD-Q2",
  "name": "Q2焊缝检测图像标注",
  "scene": "IMAGE_TAGGING",
  "sceneLabel": "图片打标",
  "sourceDatasetId": "DATASET-WELD-DEFECT",
  "sourceDatasetName": "焊缝缺陷检测数据集",
  "templateId": "LT-WELD-BBOX",
  "templateName": "焊缝缺陷 BBox 模板",
  "tenantId": "TENANT-CABIN",
  "status": "IN_PROGRESS",
  "reviewEnabled": true,
  "prelabelEnabled": true,
  "labelStudioEnabled": true,
  "totalCount": 8000,
  "annotatedCount": 6240,
  "reviewedCount": 5800,
  "qualityScore": 92,
  "assignees": [{ "userId": "USR-ANNOTATOR", "displayName": "王磊", "role": "ANNOTATOR" }],
  "deadline": "2026-06-01T00:00:00Z",
  "updatedAt": "2026-05-19T00:00:00Z"
}
```

### 3.3 AnnotationLabelTemplateResponse
```json
{
  "templateId": "LT-WELD-BBOX",
  "name": "焊缝缺陷 BBox 模板",
  "scene": "IMAGE_TAGGING",
  "labelType": "BOUNDING_BOX",
  "labelSchemaJson": "{\"labels\":[\"裂纹\",\"气孔\"]}",
  "labelStudioConfigXml": "<View>...</View>",
  "status": "PUBLISHED",
  "tenantId": "TENANT-CABIN",
  "createdBy": "USR-ADMIN",
  "updatedAt": "2026-05-19T00:00:00Z"
}
```

### 3.4 AnnotationWorkItemResponse
```json
{
  "workItemId": "ANN-WI-001",
  "taskId": "ANN-WELD-Q2",
  "sampleKey": "TENANT-CABIN/weld/batch3/0001.jpg",
  "sampleFileId": "FILE-DATASET-WELD-001",
  "annotatorId": "USR-ANNOTATOR",
  "annotatorName": "王磊",
  "status": "REVIEW_PENDING",
  "predictionJson": "{\"model\":\"TODO_CONFIRM_PRELABEL_MODEL_SOURCE\"}",
  "annotationJson": "{\"boxes\":[...]}",
  "submittedAt": "2026-05-19T00:00:00Z",
  "updatedAt": "2026-05-19T00:00:00Z"
}
```

### 3.5 AnnotationReviewItemResponse
```json
{
  "reviewItemId": "ANN-RV-001",
  "workItemId": "ANN-WI-001",
  "taskId": "ANN-WELD-Q2",
  "taskName": "Q2焊缝检测图像标注",
  "annotatorId": "USR-ANNOTATOR",
  "annotatorName": "王磊",
  "reviewerId": "USR-REVIEWER",
  "reviewerName": "李娟",
  "status": "PENDING",
  "reviewComment": null,
  "reviewedAt": null
}
```

### 3.6 AnnotationPublicationResponse
```json
{
  "publicationId": "ANN-PUB-001",
  "taskId": "ANN-WELD-Q2",
  "qualityStatus": "PASSED",
  "coverageRate": 0.96,
  "formatStatus": "PASSED",
  "diagnosticCode": "OK",
  "diagnosticMessage": "ANNOTATION_QUALITY_CHECK_PASSED",
  "annotationArtifactFileId": "FILE-ANN-WELD-Q2-RESULT",
  "annotationArtifactRole": "ANNOTATION_RESULT",
  "outputDatasetId": "DATASET-ANN-WELD-Q2",
  "outputVersionId": "DVER-ANN-WELD-Q2-001",
  "publishedAt": "2026-05-19T00:00:00Z"
}
```

### 3.7 AnnotationExternalBindingResponse
```json
{
  "bindingId": "ANN-EXT-001",
  "taskId": "ANN-WELD-Q2",
  "provider": "LABEL_STUDIO",
  "externalProjectId": null,
  "externalUrl": "TODO_CONFIRM_LABEL_STUDIO_BASE_URL",
  "configStatus": "UNCONFIGURED",
  "lastSyncStatus": "UNCONFIGURED",
  "diagnosticCode": "LABEL_STUDIO_UNCONFIGURED",
  "diagnosticMessage": "TODO_CONFIRM_LABEL_STUDIO_BASE_URL;TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET",
  "launchUrl": null,
  "lastSyncAt": null
}
```

## 4. Errors

| HTTP | Business Code | Scenario | Rule |
|---|---:|---|---|
| 400 | 40001 | JSON 结构、枚举、日期或数值不合法 | 统一参数错误 |
| 401 | 40100 | 未认证或 token 失效 | 复用平台认证 |
| 403 | 40300 | 缺少 annotation/label-template 权限或跨 BU 写操作 | PLT-001 / PLT-009 |
| 404 | 40400 | 资源不存在或跨 BU 读不可见 | DAT-012 |
| 409 | 40900 | 非法状态流转、已完成任务再次提交/审核 | Annotation 状态机 |
| 422 | 42200 | 非 ACTIVE 数据集、非图片数据集、未发布模板、自审、质量检查失败、标注文件生成失败、Label Studio 未配置 | DAT-003/004/009/010/013 |

## 5. Domain / State / Rules

### 5.1 State transitions

Annotation task:
- `DRAFT -> ASSIGNED -> IN_PROGRESS -> PENDING_REVIEW -> APPROVED -> COMPLETED`
- `IN_PROGRESS -> COMPLETED` when `reviewEnabled=false` and all work items submitted.
- `PENDING_REVIEW -> REJECTED -> IN_PROGRESS`
- `DRAFT/ASSIGNED/IN_PROGRESS -> PAUSED -> IN_PROGRESS`
- `DRAFT/ASSIGNED/IN_PROGRESS/PAUSED -> CANCELLED`

Work item:
- `PENDING -> DRAFT -> SUBMITTED -> REVIEW_PENDING -> APPROVED`
- `REVIEW_PENDING -> REJECTED -> DRAFT`
- `SUBMITTED -> APPROVED` when review disabled.

Template:
- `DRAFT -> PUBLISHED -> ARCHIVED`

External binding:
- `UNCONFIGURED -> READY -> SYNCED`
- `READY/SYNCED -> SYNC_FAILED`

### 5.2 MUST rules

- MUST-ANN-001 / DAT-009: `sourceDataset.status` 必须为 `ACTIVE`，且当前用户可见。
- MUST-ANN-001A: `sourceDataset.dataType` 必须为 `IMAGE`；影音数据集本阶段可纳管但不得创建图片标注任务。
- MUST-ANN-002 / DAT-003: `template.status` 必须为 `PUBLISHED` 才能创建/启动任务。
- MUST-ANN-003 / DAT-004: `reviewerId != annotatorId`，自审必须拒绝。
- MUST-ANN-004 / DAT-010: 发布 `ANNOTATED` 数据集前必须通过完整性、格式和覆盖率检查。
- MUST-ANN-004A / DAT-013: 发布 `ANNOTATED` 数据集前必须生成并保存标注文件，且标注文件必须作为 `ANNOTATION_RESULT` 绑定到输出版本。
- MUST-ANN-005 / DAT-012 / PLT-001: 所有查询与写操作按 tenantId/BU 隔离；跨 BU 读不可见或写 403。
- MUST-ANN-006 / PLT-011: 跨租户拒绝、数据集发布、Label Studio 同步失败等必须写审计。
- MUST-ANN-007: Label Studio token 只能以 `secretRef` 表示，响应不得泄露明文凭据。
- MUST-ANN-008: 外部未配置时必须返回 `UNCONFIGURED`/`TODO_CONFIRM_*`，不得返回成功同步。
- MUST-ANN-009 / PLT-014: 用户停用检查应能识别进行中标注/审核任务，作为平台停用流程证据。

## 6. Permissions and audit events

### Permissions
- `menu:ann`
- `menu:annreview`
- `menu:annwork`
- `data:annotation:read`
- `data:annotation:write`
- `data:annotation:assign`
- `data:annotation:submit`
- `data:annotation:review`
- `data:annotation:publish`
- `data:annotation:admin`
- `data:label-template:read`
- `data:label-template:write`
- `data:label-template:publish`

### Audit events
- `ANNOTATION_TEMPLATE_CREATED`
- `ANNOTATION_TEMPLATE_PUBLISHED`
- `ANNOTATION_TASK_CREATED`
- `ANNOTATION_TASK_ASSIGNED`
- `ANNOTATION_TASK_STARTED`
- `ANNOTATION_RESULT_SUBMITTED`
- `ANNOTATION_REVIEW_APPROVED`
- `ANNOTATION_REVIEW_REJECTED`
- `ANNOTATION_REVIEW_SELF_REJECTED`
- `ANNOTATION_QUALITY_CHECK_FAILED`
- `ANNOTATION_DATASET_PUBLISHED`
- `ANNOTATION_LABEL_STUDIO_SYNC_FAILED`
- `ANNOTATION_CROSS_TENANT_DENIED`

## 7. Compatibility

- Backward compatibility: F006/F009/F010/F011 既有 endpoint、DTO 字段和 E2E 不得删除或改名。
- Versioning: 本期仍使用 `/api/v1`；新增字段向后兼容，前端允许忽略未知字段。
- Security: 不新增依赖，不保存明文 secret，不真实调用未配置 Label Studio。
- Data compatibility: 标注输出必须复用 `dataset`、`dataset_version`、`dataset_file`、`platform_file_object`、`data_lineage`。
- Scope compatibility: 本阶段 `scene` 仅验收 `IMAGE_TAGGING` 和 `IMAGE_SEGMENTATION`；历史 `OBJECT_DETECTION` 可在实现中映射到图片打标语义，但不再作为业务主口径。
