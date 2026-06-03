# Feature Contract: 模型中心与模型版本基础

## Contract Metadata
- Version: v1
- Status: frozen
- Owner: contract-architect
- Created: 2026-06-03
- Updated: 2026-06-03
- Feature: F019-model-registry-foundation
- Trace: TASK-model-registry-foundation

## 1. Requirement Summary
- 用户目标：在模型中心纳管模型、模型版本、模型文件、权限和生命周期，为开发环境、训练任务、模型评估、工程化和推理部署提供统一模型版本事实源。
- 业务价值：避免各模型域模块重复定义模型版本；固化模型文件治理、跨 BU 共享、发布评估准入、活跃推理引用删除阻断与审计。
- 业务资料：`docs/business/bizdocs/02-02-业务流程-模型开发与训练.md`、`docs/business/bizdocs/03-02-系统功能-模型开发.md`、`docs/business/domain/02-领域对象-模型域.md`、`docs/business/rules/02-模型开发规则.md`。
- 原型页面：`docs/prototype/SMP工业AI平台-原型v2.html` page key `hub`、`train`、`exp`、`eval`。

## 2. Scope

### In Scope
- 模型列表/详情/搜索筛选。
- 模型元数据维护与标签。
- 模型版本创建、文件对象绑定、版本历史、当前版本。
- 文件类型白名单：`.pt`、`.pth`、`.onnx`、`.zip`；最大 2GB。
- 生命周期状态机：`DEVELOPMENT -> TESTING -> PRODUCTION -> DEPRECATED`。
- 管理员外部评估证明导入；未评估禁止发布 Production。
- 活跃推理引用删除阻断 seam。
- `PLATFORM` / `BU` / `PRIVATE` scope 与跨 BU 单级审批。
- 10 分钟 MinIO 预签名下载 URL 与审计。

### Out of Scope
- 训练任务、开发环境、真实模型评估执行、工程化、推理部署。
- 自动执行或解析上传模型代码。
- 真实 MLflow/KServe/Argo Workflows/外部模型仓库集成。

## 3. Domain Contract

### 3.1 Model
| Field | Type | Required | Description |
|---|---|---:|---|
| modelId | string | yes | 模型 ID，格式 `MODEL-*` |
| name | string | yes | 模型名称，1-100 字符 |
| description | string | no | 模型描述 |
| framework | enum | yes | `PYTORCH` / `TENSORFLOW` / `PADDLE` / `ONNX` |
| taskType | enum | yes | `IMAGE_CLASSIFICATION` / `OBJECT_DETECTION` / `SEMANTIC_SEGMENTATION` / `NLP_TEXT_CLASSIFICATION` / `TIME_SERIES_FORECAST` / `ANOMALY_DETECTION` |
| inputFormat | string | yes | 输入格式，如 `image:640x640 RGB` |
| outputFormat | string | yes | 输出格式，如 `bbox[class,score,x1,y1,x2,y2]` |
| runtimeRequirements | string | no | 运行时要求 JSON 或说明 |
| tags | string[] | no | 检索标签 |
| scope | enum | yes | `PLATFORM` / `BU` / `PRIVATE` |
| source | enum | yes | `PLATFORM_BUILT_IN` / `LOCAL_UPLOAD` / `TRAINING_OUTPUT` / `EXTERNAL_IMPORT` |
| ownerUserId | string | yes | owner 用户 ID |
| ownerOrgId | string | yes | owner 所属 BU/组织 ID |
| tenantId | string | yes | 租户/BU ID |
| currentVersionId | string | no | 当前版本 ID |
| visibilityStatus | enum | yes | `ACTIVE` / `ARCHIVED` |
| createdAt | string datetime | yes | 创建时间 |
| updatedAt | string datetime | yes | 更新时间 |

### 3.2 ModelVersion
| Field | Type | Required | Description |
|---|---|---:|---|
| versionId | string | yes | 版本 ID，格式 `MVER-*` |
| modelId | string | yes | 所属模型 |
| versionNo | string | yes | 版本号，同一模型内唯一，如 `v1.0` |
| fileObjectId | string | yes | 绑定 `platform_file_object.file_id` |
| fileName | string | yes | 文件名 |
| fileExtension | string | yes | `.pt` / `.pth` / `.onnx` / `.zip` |
| fileSizeBytes | number | yes | 文件大小，最大 2147483648 |
| checksum | string | no | sha256 |
| storageBucket | string | yes | MinIO bucket 快照 |
| storageKey | string | yes | MinIO object key 快照 |
| metricsSummary | object | no | 指标摘要，JSON object |
| securityScanStatus | enum | yes | `PENDING` / `PASSED` / `SKIPPED`；一期默认 `PENDING` 或 `SKIPPED` |
| evaluationStatus | enum | yes | `NONE` / `PASSED` / `FAILED` / `IMPORTED_PROOF` |
| evaluationRecordId | string | no | 后续 F022 评估记录或外部证明 ID |
| evaluationProof | string | no | 管理员导入外部评估证明说明 |
| status | enum | yes | `DEVELOPMENT` / `TESTING` / `PRODUCTION` / `DEPRECATED` |
| activeDeploymentCount | number | yes | 活跃推理引用计数 seam |
| createdBy | string | yes | 创建人 |
| createdAt | string datetime | yes | 创建时间 |

### 3.3 ModelAccessRequest
| Field | Type | Required | Description |
|---|---|---:|---|
| requestId | string | yes | 访问申请 ID，格式 `MACC-*` |
| modelId | string | yes | 目标模型 |
| versionId | string | no | 可选目标版本 |
| requesterUserId | string | yes | 申请人 |
| requesterOrgId | string | yes | 申请人 BU |
| ownerOrgId | string | yes | owner BU |
| permission | enum | yes | `VIEW` / `DOWNLOAD` / `USE_FOR_TRAINING` / `DEPLOY` |
| reason | string | no | 申请原因 |
| status | enum | yes | `PENDING` / `APPROVED` / `REJECTED` / `EXPIRED` |
| reviewComment | string | no | 审批意见 |
| reviewedBy | string | no | 审批人 |
| reviewedAt | string datetime | no | 审批时间 |
| expiresAt | string datetime | no | 授权到期时间 |

## 4. API Contract

所有响应使用既有 envelope：

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "traceId": "uuid"
}
```

### 4.1 List Models
- Method: `GET`
- Path: `/api/v1/models`
- Auth: Bearer
- Permission: `model:model:read`
- Audit: 可选 `MODEL_LISTED`，不强制每次列表写审计。

#### Query Parameters
| Name | Type | Required | Description |
|---|---|---:|---|
| keyword | string | no | 名称/描述/标签关键词 |
| tag | string | no | 标签，支持逗号分隔 |
| framework | string | no | 框架 |
| taskType | string | no | 任务类型 |
| scope | string | no | `PLATFORM` / `BU` / `PRIVATE` |
| status | string | no | 当前版本状态 |
| ownerOrgId | string | no | owner BU |
| page | number | no | 默认 1 |
| pageSize | number | no | 默认 20，最大 100 |

#### Response Data
```json
{
  "items": [
    {
      "modelId": "MODEL-YOLO-001",
      "name": "焊缝缺陷检测 YOLOv8",
      "description": "用于焊缝表面缺陷检测",
      "framework": "PYTORCH",
      "taskType": "OBJECT_DETECTION",
      "inputFormat": "image:640x640 RGB",
      "outputFormat": "bbox[class,score,x1,y1,x2,y2]",
      "tags": ["焊缝", "缺陷检测", "预训练"],
      "scope": "PLATFORM",
      "source": "PLATFORM_BUILT_IN",
      "ownerUserId": "USER-SYSTEM",
      "ownerOrgId": "TENANT-YF",
      "tenantId": "TENANT-YF",
      "currentVersionId": "MVER-YOLO-001-V1",
      "currentVersionNo": "v1.0",
      "currentVersionStatus": "PRODUCTION",
      "evaluationStatus": "IMPORTED_PROOF",
      "permissionSummary": { "canView": true, "canDownload": true, "canUseForTraining": true, "canDeploy": false },
      "createdAt": "2026-06-03T00:00:00Z",
      "updatedAt": "2026-06-03T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

### 4.2 Create Model
- Method: `POST`
- Path: `/api/v1/models`
- Permission: `model:model:write`
- Audit: `MODEL_CREATED`

#### Request Schema
```json
{
  "name": "焊缝缺陷检测 YOLOv8",
  "description": "用于焊缝表面缺陷检测",
  "framework": "PYTORCH",
  "taskType": "OBJECT_DETECTION",
  "inputFormat": "image:640x640 RGB",
  "outputFormat": "bbox[class,score,x1,y1,x2,y2]",
  "runtimeRequirements": "{\"python\":\"3.10\",\"torch\":\"2.4\"}",
  "tags": ["焊缝", "缺陷检测"],
  "scope": "BU",
  "source": "LOCAL_UPLOAD"
}
```

#### Response Data
返回 `Model` 对象，`currentVersionId=null`。

### 4.3 Get Model Detail
- Method: `GET`
- Path: `/api/v1/models/{modelId}`
- Permission: `model:model:read` + scope/授权检查
- Audit: `MODEL_VIEWED`

#### Response Data
```json
{
  "modelId": "MODEL-YOLO-001",
  "name": "焊缝缺陷检测 YOLOv8",
  "description": "用于焊缝表面缺陷检测",
  "framework": "PYTORCH",
  "taskType": "OBJECT_DETECTION",
  "inputFormat": "image:640x640 RGB",
  "outputFormat": "bbox[class,score,x1,y1,x2,y2]",
  "runtimeRequirements": "{\"python\":\"3.10\"}",
  "tags": ["焊缝", "缺陷检测"],
  "scope": "BU",
  "source": "LOCAL_UPLOAD",
  "ownerUserId": "USER-TRAINER",
  "ownerOrgId": "TENANT-CABIN",
  "tenantId": "TENANT-CABIN",
  "currentVersionId": "MVER-YOLO-001-V1",
  "permissionSummary": { "canView": true, "canDownload": true, "canUseForTraining": true, "canDeploy": false, "canManage": true },
  "versions": [],
  "auditEvents": [
    { "eventId": "AUD-1", "action": "MODEL_CREATED", "operatorName": "模型训练工程师", "occurredAt": "2026-06-03T00:00:00Z", "result": "SUCCESS" }
  ],
  "createdAt": "2026-06-03T00:00:00Z",
  "updatedAt": "2026-06-03T00:00:00Z"
}
```

### 4.4 Update Model
- Method: `PATCH`
- Path: `/api/v1/models/{modelId}`
- Permission: owner / `model:model:manage`
- Audit: `MODEL_UPDATED` or `MODEL_SCOPE_CHANGE_REQUESTED`

#### Request Schema
```json
{
  "name": "焊缝缺陷检测 YOLOv8",
  "description": "更新说明",
  "inputFormat": "image:640x640 RGB",
  "outputFormat": "bbox[class,score,x1,y1,x2,y2]",
  "runtimeRequirements": "{\"python\":\"3.10\"}",
  "tags": ["焊缝", "缺陷检测", "生产可用"],
  "scope": "PLATFORM",
  "scopeChangeReason": "开放给其他 BU 训练使用"
}
```

#### Rule
- `BU/PRIVATE -> PLATFORM` 或跨 BU 可见变更必须创建审批记录，审批通过前原 scope 不生效。

### 4.5 List Versions
- Method: `GET`
- Path: `/api/v1/models/{modelId}/versions`
- Permission: `model:model:read`

#### Response Data
```json
[
  {
    "versionId": "MVER-YOLO-001-V1",
    "modelId": "MODEL-YOLO-001",
    "versionNo": "v1.0",
    "fileObjectId": "FILE-MODEL-001",
    "fileName": "weld-yolo-v1.onnx",
    "fileExtension": ".onnx",
    "fileSizeBytes": 104857600,
    "checksum": "sha256...",
    "storageBucket": "smp-datasets",
    "storageKey": "TENANT-CABIN/models/MODEL-YOLO-001/v1.0/weld-yolo-v1.onnx",
    "metricsSummary": { "mAP50": 0.91, "latencyMs": 18 },
    "securityScanStatus": "PENDING",
    "evaluationStatus": "IMPORTED_PROOF",
    "evaluationRecordId": "EXT-EVAL-001",
    "status": "PRODUCTION",
    "activeDeploymentCount": 0,
    "createdBy": "USER-TRAINER",
    "createdAt": "2026-06-03T00:00:00Z"
  }
]
```

### 4.6 Create Version
- Method: `POST`
- Path: `/api/v1/models/{modelId}/versions`
- Permission: owner / `model:version:write`
- Audit: `MODEL_VERSION_CREATED`、`MODEL_VERSION_FILE_BOUND`

#### Request Schema
```json
{
  "versionNo": "v1.0",
  "fileObjectId": "FILE-MODEL-001",
  "runtimeRequirements": "{\"python\":\"3.10\",\"torch\":\"2.4\"}",
  "metricsSummary": { "mAP50": 0.91, "latencyMs": 18 },
  "evaluationStatus": "IMPORTED_PROOF",
  "evaluationProof": "外部评估报告 EXT-EVAL-001，管理员导入",
  "setAsCurrent": true
}
```

#### Validation
- `versionNo` 同一 `modelId` 内唯一；冲突返回 409。
- `fileObjectId` 必须存在且租户/BU 可访问。
- 文件扩展名必须是 `.pt`、`.pth`、`.onnx`、`.zip`。
- `fileSizeBytes <= 2147483648`。
- `evaluationStatus=IMPORTED_PROOF` 仅管理员或模型管理员可提交。
- 初始版本状态为 `DEVELOPMENT`，即使提供外部评估证明也不得直接跳到 `PRODUCTION`。

### 4.7 Get Version Detail
- Method: `GET`
- Path: `/api/v1/models/{modelId}/versions/{versionId}`
- Permission: `model:model:read`
- Audit: 可选 `MODEL_VERSION_VIEWED`

#### Response Data
返回完整 `ModelVersion`，附 `permissionSummary`、`downloadAvailable`、`transitionActions`。

### 4.8 Transition Version
- Method: `POST`
- Path: `/api/v1/models/{modelId}/versions/{versionId}/transition`
- Permission: owner / `model:version:manage`
- Audit: `MODEL_VERSION_TRANSITIONED` 或 `MODEL_VERSION_PUBLISH_BLOCKED`

#### Request Schema
```json
{
  "targetStatus": "TESTING",
  "reason": "进入测试验证阶段"
}
```

#### Legal Matrix
| Current | Allowed Target |
|---|---|
| DEVELOPMENT | TESTING |
| TESTING | PRODUCTION, DEPRECATED |
| PRODUCTION | DEPRECATED |
| DEPRECATED | none |

#### Production Rule
- `targetStatus=PRODUCTION` 时，`evaluationStatus` 必须为 `PASSED` 或 `IMPORTED_PROOF`。

### 4.9 Delete Version
- Method: `DELETE`
- Path: `/api/v1/models/{modelId}/versions/{versionId}`
- Permission: owner / `model:version:delete`
- Audit: `MODEL_VERSION_DELETED` 或 `MODEL_VERSION_DELETE_BLOCKED`

#### Response Data
```json
{
  "versionId": "MVER-YOLO-001-V1",
  "deleted": true,
  "blocked": false,
  "activeReferences": []
}
```

#### Blocking Response Data
```json
{
  "versionId": "MVER-YOLO-001-V1",
  "deleted": false,
  "blocked": true,
  "activeReferences": [
    { "serviceId": "INF-SVC-001", "serviceName": "焊缝在线检测", "status": "RUNNING" }
  ]
}
```

### 4.10 Request Cross-BU Access
- Method: `POST`
- Path: `/api/v1/models/{modelId}/access-requests`
- Permission: authenticated user
- Audit: `MODEL_ACCESS_REQUESTED`

#### Request Schema
```json
{
  "versionId": "MVER-YOLO-001-V1",
  "permission": "USE_FOR_TRAINING",
  "reason": "用于座舱缺陷检测训练对比",
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

#### Response Data
返回 `ModelAccessRequest`。

### 4.11 Approve / Reject Access
- Method: `PUT`
- Path: `/api/v1/model-access-requests/{requestId}/approve` / `/api/v1/model-access-requests/{requestId}/reject`
- Permission: owner 或 owner 所属 BU 管理员
- Audit: `MODEL_ACCESS_APPROVED` / `MODEL_ACCESS_REJECTED`

#### Request Schema
```json
{
  "reviewComment": "同意用于训练验证",
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

#### Response Data
返回 `ModelAccessRequest`；approve 同步生成 `ModelAccessGrant`。

### 4.12 Generate Download URL
- Method: `POST`
- Path: `/api/v1/models/{modelId}/versions/{versionId}/download-url`
- Permission: `model:model:download` 或授权 `DOWNLOAD`
- Audit: `MODEL_DOWNLOADED`

#### Response Data
```json
{
  "modelId": "MODEL-YOLO-001",
  "versionId": "MVER-YOLO-001-V1",
  "fileObjectId": "FILE-MODEL-001",
  "downloadUrl": "http://127.0.0.1:9000/smp-datasets/...X-Amz-Expires=600",
  "expiresInSeconds": 600,
  "diagnostic": "PRESIGNED_URL_READY"
}
```

#### Rule
- URL 有效期固定为 600 秒。
- 不返回 MinIO accessKey/secretKey。
- 若 MinIO client 不可用，可返回后端内容下载 URL seam 与诊断，但仍记录审计。

## 5. Error Contract
| HTTP | Business Code | Scenario | Message |
|---:|---|---|---|
| 400 | INVALID_PARAM | JSON 格式错误、字段类型错误 | 参数格式错误 |
| 401 | UNAUTHORIZED | 未认证或 token 失效 | 请先登录 |
| 403 | MODEL_PERMISSION_DENIED | 无权限查看/下载/管理模型 | 无模型访问权限 |
| 403 | MODEL_ACCESS_REQUIRED | 跨 BU 无授权 | 该模型属于其他 BU，请申请跨 BU 授权 |
| 404 | RESOURCE_NOT_FOUND | 模型/版本/申请不存在，或为避免泄露跨 BU 存在性 | 资源不存在 |
| 409 | MODEL_VERSION_CONFLICT | 同一模型版本号重复 | 模型版本号已存在 |
| 409 | MODEL_VERSION_IN_USE | 删除存在活跃推理引用的版本 | 该模型版本当前被推理服务引用，请先下线相关服务 |
| 422 | MODEL_VERSION_TRANSITION_INVALID | 状态跳跃或逆向流转 | 不支持从当前状态直接转换为目标状态 |
| 422 | MODEL_EVALUATION_REQUIRED | 未评估发布 Production | 该模型版本尚未通过评估，请先执行模型评估或导入评估证明 |
| 422 | MODEL_FILE_OBJECT_NOT_FOUND | 绑定文件对象不存在或不可访问 | 模型文件不存在或无法访问 |
| 422 | MODEL_FILE_TYPE_UNSUPPORTED | 文件扩展名不在白名单 | 仅支持 .pt/.pth/.onnx/.zip 模型文件 |
| 413 | MODEL_FILE_TOO_LARGE | 文件大于 2GB | 模型文件大小不能超过 2GB |
| 422 | MODEL_SCOPE_APPROVAL_REQUIRED | scope 跨 BU 可见变更需审批 | 跨 BU 共享需审批通过后生效 |

## 6. Permission Contract
| Action | Required Permission / Actor | Scope Rule |
|---|---|---|
| list/view model | `model:model:read` | PLATFORM 全局；BU 同 BU；PRIVATE owner；跨 BU 需 grant |
| create model | `model:model:write` | 创建人为 owner |
| update model | owner / `model:model:manage` | scope 升级需审批 |
| create version | owner / `model:version:write` | 文件对象必须可访问 |
| transition version | owner / `model:version:manage` | 遵守 MDL-006/009 |
| delete version | owner / `model:version:delete` | 遵守 MDL-003 |
| request access | authenticated user | 跨 BU 申请 |
| approve access | owner / owner BU admin | 单级审批 |
| download | `model:model:download` / grant DOWNLOAD | 记录审计 |
| use for training | `model:model:use` / grant USE_FOR_TRAINING | 预训练模型选择器使用 |
| deploy | `model:model:deploy` / grant DEPLOY | 后续推理域使用 |

## 7. Audit Contract
| Event | Trigger | Result |
|---|---|---|
| MODEL_CREATED | 创建模型 | SUCCESS / FAILED |
| MODEL_UPDATED | 更新元数据 | SUCCESS / FAILED |
| MODEL_VERSION_CREATED | 创建版本 | SUCCESS / FAILED |
| MODEL_VERSION_FILE_BOUND | 版本绑定文件对象 | SUCCESS / FAILED |
| MODEL_VERSION_TRANSITIONED | 合法状态流转 | SUCCESS |
| MODEL_VERSION_PUBLISH_BLOCKED | 发布 Production 被 MDL-006 阻断 | BLOCKED |
| MODEL_VERSION_DELETE_BLOCKED | 删除被 MDL-003 阻断 | BLOCKED |
| MODEL_VERSION_DELETED | 删除版本 | SUCCESS |
| MODEL_SCOPE_CHANGE_REQUESTED | scope 变更触发审批 | PENDING |
| MODEL_ACCESS_REQUESTED | 跨 BU 访问申请 | PENDING |
| MODEL_ACCESS_APPROVED | 访问审批通过 | SUCCESS |
| MODEL_ACCESS_REJECTED | 访问审批拒绝 | SUCCESS |
| MODEL_VIEWED | 查看详情 | SUCCESS |
| MODEL_DOWNLOADED | 生成下载 URL | SUCCESS / FAILED |

审计字段必须包含 actor、tenantId、ownerOrgId/requesterOrgId、resourceType、resourceId、action、result、traceId、beforeJson/afterJson 或 detailJson。

## 8. SQL / Persistence Contract

### Tables
- `model_registry_model`
- `model_registry_version`
- `model_access_request`
- `model_access_grant`

### Required Constraints
- `model_registry_model.model_id` primary key。
- `model_registry_version.version_id` primary key。
- `UNIQUE(model_id, version_no)`。
- `model_registry_version.file_object_id` references / logically references `platform_file_object.file_id`。
- `model_access_request.request_id` primary key。
- `model_access_grant.grant_id` primary key。

### Required Indexes
- `model_registry_model(tenant_id, owner_org_id, scope)`。
- `model_registry_model(framework, task_type)`。
- `model_registry_version(model_id, status)`。
- `model_access_request(model_id, status)`。
- `model_access_grant(model_id, requester_org_id, permission, status)`。

### Seed Data Contract
- 一期允许创建平台内置模型种子。
- 种子模型 `source=PLATFORM_BUILT_IN`，必须绑定真实 `platform_file_object` 或本地对象存储副本。
- 不伪造供应商或授权信息。

## 9. Business Rule Mapping
| Rule | Contract Enforcement |
|---|---|
| MDL-003 | `DELETE /versions/{versionId}` 查询 active deployment seam；存在 RUNNING/ENABLED 引用返回 `MODEL_VERSION_IN_USE` |
| MDL-004 | 跨 BU view/download/use/deploy 需 `model_access_grant`；scope 升级创建审批，审批前不生效 |
| MDL-006 | `Transition(PRODUCTION)` 检查 `evaluationStatus in (PASSED, IMPORTED_PROOF)` |
| MDL-009 | `Transition` 使用合法转换矩阵，拒绝跳跃和逆向 |

## 10. Handoff Notes

### To backend-tdd-engineer
- 新增 `ModelRegistryController` / `ModelRegistryService` / `ModelRegistryDtos`，复用 `PlatformResponses`、`PlatformException`、`ObjectStorageService`、`PlatformIdentityService`。
- Flyway migration 与归档 SQL 均需新增。
- TDD 必须覆盖 AC-01~AC-12，尤其 MDL-003/004/006/009。
- 文件下载调用 `ObjectStorageService.presignedDownloadUrl`，过期时间按本契约固定对外返回 600 秒；如果底层配置不同，接口响应仍必须表达 600 秒口径或调整配置。

### To frontend-engineer
- 新增模型中心页面并替换 `/hub` 现有 ModuleOverview 占位。
- 在 `platformApi.ts` 增加模型 API 类型与方法。
- 新增或复用模型选择器组件，后续 `train`/`exp`/`eval` 可复用。
- 页面不得出现“原型说明”性质元素。

### To test-designer
- `TASK-model-registry-foundation` 必须出现在后端/前端/E2E 测试中，用于 traceability。
- P0 必须覆盖创建模型、创建版本、合法流转、未评估发布阻断、删除引用阻断、跨 BU 访问、下载 URL 审计。
