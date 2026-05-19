# Feature Contract: 完整 Pipeline 编辑器与算子市场

## Contract Metadata
- Version: v1
- Status: frozen
- Owner: contract-architect
- Created: 2026-05-18
- Frozen: 2026-05-18
- Feature: F011-pipeline-editor-operator-marketplace
- Source plan: `docs/features/F011-pipeline-editor-operator-marketplace/plan.md`

## 1. Requirement Summary

F011 实现完整 Pipeline 编辑器控制平面与算子广场：前端贴近原型 `pipeline` / `opmarket` 信息架构，后端提供可持久化、可审计、可校验、可沙箱运行的 DAG 定义、版本、变量、运行历史、节点日志、输出数据集/血缘和算子审核 seam。

### Business references
- `docs/business/bizdocs/03-01-系统功能-数据管理.md`：FUNC-DATA-016、017、080~092。
- `docs/business/原型页面完成度清单.md`：Pipeline 编辑器、算子广场、添加算子侧边栏。
- `docs/prototype/SMP工业AI平台-原型v2.html`：`pipeline`、`opmarket`、`dsdetail`、`lineage`。

### Compatibility requirements
- 不破坏 F009 数据集、版本、文件、血缘和访问控制 API。
- 不破坏 F010 标准化任务 API；标准化能力作为 Pipeline 内置算子/模板复用。
- 所有响应继续使用统一 `ApiResponse<T>` envelope。

## 2. API Contract

### 2.1 Pipeline list/create

#### `GET /api/v1/pipelines`
- Description: 查询当前用户可见 Pipeline。
- Auth: Bearer token。
- Permission: `data:pipeline:read`。
- Query: `keyword?`, `status?`, `page?`, `pageSize?`。
- Response: `PipelineListResponse`。

#### `POST /api/v1/pipelines`
- Description: 创建 Pipeline 草稿并持久化初始 DAG。
- Auth: Bearer token。
- Permission: `data:pipeline:write`。
- Audit: `PIPELINE_CREATED` / `PIPELINE_VALIDATION_FAILED`。
- Request: `PipelineSaveRequest`。
- Response: `PipelineDetailResponse`。

### 2.2 Pipeline detail/update/validate

#### `GET /api/v1/pipelines/{pipelineId}`
- Description: 获取 Pipeline 定义、节点、边、变量、版本、运行历史。
- Permission: `data:pipeline:read`。
- Response: `PipelineDetailResponse`。

#### `PUT /api/v1/pipelines/{pipelineId}`
- Description: 更新 Pipeline 草稿 DAG、节点配置、变量。
- Permission: `data:pipeline:write`。
- Audit: `PIPELINE_UPDATED` / `PIPELINE_VALIDATION_FAILED`。
- Request: `PipelineSaveRequest`。
- Response: `PipelineDetailResponse`。

#### `POST /api/v1/pipelines/{pipelineId}/validate`
- Description: 仅校验当前持久化 DAG，不创建版本或运行。
- Permission: `data:pipeline:write`。
- Audit: 失败时 `PIPELINE_VALIDATION_FAILED`。
- Response: `PipelineValidationResponse`。

### 2.3 Versions

#### `POST /api/v1/pipelines/{pipelineId}/versions`
- Description: 保存当前 DAG 版本快照。
- Permission: `data:pipeline:write`。
- Audit: `PIPELINE_VERSION_SAVED`。
- Request:
```json
{
  "versionName": "v1.3",
  "note": "调整图像增强参数"
}
```
- Response: `PipelineVersionResponse`。

#### `GET /api/v1/pipelines/{pipelineId}/versions`
- Description: 查询版本快照列表。
- Permission: `data:pipeline:read`。
- Response: `PipelineVersionResponse[]`。

#### `POST /api/v1/pipelines/{pipelineId}/versions/{versionId}/restore`
- Description: 将指定快照恢复为当前草稿。
- Permission: `data:pipeline:write`。
- Audit: `PIPELINE_VERSION_RESTORED`。
- Response: `PipelineDetailResponse`。

### 2.4 Runs

#### `POST /api/v1/pipelines/{pipelineId}/runs`
- Description: 发起沙箱测试运行；本期不调用真实生产调度。
- Permission: `data:pipeline:run`。
- Audit: `PIPELINE_RUN_STARTED` 后跟 `PIPELINE_RUN_SUCCEEDED` 或 `PIPELINE_RUN_FAILED`。
- Request:
```json
{
  "triggerMode": "MANUAL",
  "sampleDatasetId": "DATASET-WELD-DEFECT"
}
```
- Response: `PipelineRunDetailResponse`。

#### `GET /api/v1/pipelines/{pipelineId}/runs`
- Description: 查询 Pipeline 运行历史。
- Permission: `data:pipeline:read`。
- Response: `PipelineRunSummaryResponse[]`。

#### `GET /api/v1/pipeline-runs/{runId}`
- Description: 查询单次运行详情和节点日志。
- Permission: `data:pipeline:read`。
- Response: `PipelineRunDetailResponse`。

### 2.5 Operators

#### `GET /api/v1/operators`
- Description: 查询算子市场，支持分类、关键词、状态筛选。
- Permission: `data:operator:read`。
- Query: `keyword?`, `category?`, `stage?`, `status?`。
- Response: `OperatorListResponse`。

#### `GET /api/v1/operators/{operatorId}`
- Description: 查询算子详情、参数 schema、示例、统计和审核记录。
- Permission: `data:operator:read`。
- Response: `OperatorDetailResponse`。

#### `POST /api/v1/operators/custom`
- Description: 创建自定义算子草稿。
- Permission: `data:operator:write`。
- Audit: `OPERATOR_CREATED`。
- Request: `OperatorCustomRequest`。
- Response: `OperatorDetailResponse`。

#### `POST /api/v1/operators/{operatorId}/submit-review`
- Description: 提交审核。
- Permission: `data:operator:write`。
- Audit: `OPERATOR_SUBMITTED`。
- Response: `OperatorDetailResponse`。

#### `POST /api/v1/operators/{operatorId}/approve`
- Description: 审核通过并发布算子。
- Permission: `data:operator:review`。
- Audit: `OPERATOR_APPROVED` / `OPERATOR_PUBLISHED`。
- Request: `{ "reason": "安全策略已核对" }`。
- Response: `OperatorDetailResponse`。

#### `POST /api/v1/operators/{operatorId}/reject`
- Description: 审核驳回。
- Permission: `data:operator:review`。
- Audit: `OPERATOR_REJECTED`。
- Request: `{ "reason": "Endpoint 安全策略未确认" }`。
- Response: `OperatorDetailResponse`。

## 3. DTO Schema

### 3.1 Pipeline DTO

```json
{
  "pipelineId": "PIPE-IMG-PREP",
  "name": "图像预处理 Pipeline",
  "tenantId": "TENANT-CABIN",
  "projectId": null,
  "status": "DRAFT|VALIDATED|ACTIVE|ARCHIVED",
  "currentVersionId": "PVER-001",
  "ownerId": "USR-ADMIN",
  "description": "焊缝缺陷图像预处理",
  "nodes": [
    {
      "nodeId": "read",
      "operatorId": "OP-READ-DATASET",
      "label": "读取数据集",
      "positionX": 80,
      "positionY": 160,
      "configJson": "{\"datasetId\":\"DATASET-WELD-DEFECT\"}",
      "status": "READY"
    }
  ],
  "edges": [{ "edgeId": "EDGE-read-resize", "sourceNodeId": "read", "targetNodeId": "resize", "edgeType": "DATA" }],
  "variables": [{ "name": "batch_size", "valueType": "INT", "valueKind": "LITERAL", "valueMasked": "32", "required": true }],
  "versions": [],
  "runs": []
}
```

### 3.2 PipelineSaveRequest

```json
{
  "name": "图像预处理 Pipeline",
  "tenantId": "TENANT-CABIN",
  "projectId": null,
  "description": "用于焊缝缺陷数据标准化",
  "nodes": [],
  "edges": [],
  "variables": []
}
```

### 3.3 PipelineValidationResponse

```json
{
  "valid": true,
  "diagnosticCode": "OK",
  "diagnosticMessage": "DAG 校验通过",
  "errors": [],
  "warnings": ["TODO_CONFIRM_PIPELINE_SCHEDULER_TARGET"]
}
```

### 3.4 PipelineRunDetailResponse

```json
{
  "runId": "PRUN-001",
  "pipelineId": "PIPE-IMG-PREP",
  "versionId": "PVER-001",
  "status": "SUCCEEDED|FAILED|RUNNING|QUEUED|CANCELLED",
  "triggerMode": "MANUAL",
  "startedAt": "2026-05-18T12:00:00Z",
  "endedAt": "2026-05-18T12:02:00Z",
  "durationMs": 120000,
  "diagnosticCode": "OK",
  "diagnosticMessage": "SANDBOX_PIPELINE_RUN_SUCCEEDED",
  "outputDatasetId": "DATASET-PIPE-001",
  "nodeRuns": []
}
```

### 3.5 Operator DTO

```json
{
  "operatorId": "OP-NORMALIZE-IMAGE",
  "name": "图像归一化",
  "category": "图像处理",
  "stage": "标准化",
  "kind": "BUILTIN|HTTP|CUSTOM",
  "status": "DRAFT|SUBMITTED|APPROVED|REJECTED|PUBLISHED|DISABLED",
  "parameterSchemaJson": "{\"type\":\"object\"}",
  "inputSchemaJson": "{\"datasetType\":\"IMAGE\"}",
  "outputSchemaJson": "{\"datasetType\":\"IMAGE\"}",
  "beforeExample": "原始像素分布不一致",
  "afterExample": "归一化到统一均值/方差",
  "usageCount": 1280,
  "pipelineCount": 18,
  "errorRate": 0.02
}
```

### 3.6 OperatorCustomRequest

```json
{
  "name": "HTTP 自定义算子",
  "category": "自定义算子",
  "stage": "扩展",
  "description": "调用第三方 HTTP 服务",
  "parameterSchemaJson": "{\"type\":\"object\"}",
  "endpoint": "TODO_CONFIRM_OPERATOR_HTTP_ENDPOINT",
  "credentialRef": "secret://TODO_CONFIRM_OPERATOR_SECRET",
  "timeoutSeconds": 30,
  "concurrencyLimit": 2
}
```

## 4. Errors

| HTTP | Business Code | Scenario | Rule |
|---|---:|---|---|
| 400 | 40001 | JSON 结构或枚举值不合法 | 统一参数错误 |
| 401 | 40100 | 未认证或 token 失效 | 复用平台认证 |
| 403 | 40300 | 缺少 pipeline/operator 权限或跨 BU 写操作 | F006 权限与 BU 隔离 |
| 404 | 40400 | 资源不存在或跨 BU 读不可见 | 不泄露其他 BU 资源 |
| 409 | 40900 | 状态冲突，如未提交审核却批准 | 状态机约束 |
| 422 | 42200 | DAG 有环、必填参数缺失、变量引用不存在、明文密钥 | 业务规则失败 |

## 5. Domain / State / Rules

### 5.1 State transitions

Pipeline:
- `DRAFT -> VALIDATED -> ACTIVE -> ARCHIVED`
- `DRAFT/VALIDATED/ACTIVE -> DRAFT`（版本恢复后进入草稿）

Pipeline run:
- `QUEUED -> RUNNING -> SUCCEEDED`
- `QUEUED -> RUNNING -> FAILED`
- `QUEUED/RUNNING -> CANCELLED`（本期可保留状态，取消 API 不强制实现）

Operator:
- `DRAFT -> SUBMITTED -> APPROVED -> PUBLISHED -> DISABLED`
- `SUBMITTED -> REJECTED -> DRAFT`

### 5.2 MUST rules

- MUST-PIPE-001: Pipeline DAG 必须无环。
- MUST-PIPE-002: Pipeline 至少包含一个输入节点与一个输出/处理节点。
- MUST-PIPE-003: 节点 `operatorId` 必须存在且状态为 `PUBLISHED` 或 `APPROVED`。
- MUST-PIPE-004: 必填参数必须存在，变量引用必须能在 `pipeline_variable` 找到。
- MUST-PIPE-005: 运行成功必须写 `pipeline_run`、`pipeline_run_node`，并生成输出数据集/版本/文件占位和血缘。
- MUST-SEC-001: 变量、节点配置、HTTP 算子配置中疑似明文密码、token、accessKeySecret、credentialSecret 必须拒绝。
- MUST-SEC-002: 自定义 HTTP 算子凭据只允许 `secret://...` 或 `TODO_CONFIRM_*`。
- MUST-AUDIT-001: 创建、更新、版本、运行、失败、提交、审核、发布必须写 `platform_audit_log`。
- MUST-TENANT-001: 非超级管理员只能访问自身组织路径下资源；跨 BU 写操作返回 403，跨 BU 读可返回 404。

## 6. Permissions and audit events

### Permissions
- `menu:pipeline`
- `menu:opmarket`
- `data:pipeline:read`
- `data:pipeline:write`
- `data:pipeline:run`
- `data:pipeline:admin`
- `data:operator:read`
- `data:operator:write`
- `data:operator:review`
- `data:operator:admin`

### Audit events
- `PIPELINE_CREATED`
- `PIPELINE_UPDATED`
- `PIPELINE_VERSION_SAVED`
- `PIPELINE_VERSION_RESTORED`
- `PIPELINE_VALIDATION_FAILED`
- `PIPELINE_RUN_STARTED`
- `PIPELINE_RUN_SUCCEEDED`
- `PIPELINE_RUN_FAILED`
- `OPERATOR_CREATED`
- `OPERATOR_SUBMITTED`
- `OPERATOR_APPROVED`
- `OPERATOR_REJECTED`
- `OPERATOR_PUBLISHED`

## 7. Compatibility

- Backward compatibility: F009/F010 既有 endpoint、DTO 字段和 E2E 不得删除或改名。
- Versioning: 本期仍使用 `/api/v1`；新增字段必须向后兼容，前端允许忽略未知字段。
- Security: 不新增依赖，不保存明文 secret，不真实调用外部 HTTP 算子。
