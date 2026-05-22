---
feature: F015-local-dataset-upload
version: v1
status: frozen
owner: contract-architect
frozen_at: 2026-05-22
---

# Feature Contract: 本地图片上传创建数据集

## 1. Requirement Summary

- 用户目标：在没有可用数据源时，用户仍可直接上传本地图片创建数据集，而不是被空白数据源下拉阻断。
- 业务价值：补齐“本地数据集直接导入”正式入口，保持平台对数据集、版本、权限、审计和血缘的统一治理，并兼容后续标注与训练导出链路。
- 业务资料：
  - `docs/business/bizdocs/01-业务场景清单.md`
  - `docs/business/bizdocs/02-01-业务流程-数据管理.md`
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md`
  - `docs/business/rules/01-数据管理规则.md`
  - `docs/business/问题记录.md`
  - `docs/business/open-questions.md`
- 原型页面：`docs/prototype/SMP工业AI平台-原型v2.html` page key `up`、`ds`、`dsdetail`、`ann`，以及数据集上传向导/上传进度相关截图口径。

## 2. API Contract

所有接口使用 `/api/v1` 前缀、统一 `ApiResponse<T>` envelope、Bearer Token 认证和 `X-Trace-Id`。本 feature 不新增平台外上传入口；所有上传均先进入平台 dataset/version/file object 事实层。

### 2.1 Dataset Upload Session API

| Method | Path | Permission | Audit | Description |
|---|---|---|---|---|
| POST | `/api/v1/dataset-upload-sessions` | `data:dataset:write` | `DATASET_UPLOAD_SESSION_CREATED` | 创建本地上传会话，保存元数据、租户信息和创建方式。 |
| POST | `/api/v1/dataset-upload-sessions/{sessionId}/files` | `data:dataset:write` | `DATASET_UPLOAD_FILE_ACCEPTED` / `DATASET_UPLOAD_FILE_REJECTED` | 向 upload session 上传图片或 zip，并生成/登记平台文件对象。 |
| GET | `/api/v1/dataset-upload-sessions/{sessionId}` | `data:dataset:read` | - | 查询 session 状态、阶段进度、文件汇总与诊断。 |
| POST | `/api/v1/dataset-upload-sessions/{sessionId}/commit` | `data:dataset:write` | `DATASET_UPLOAD_COMMITTED` / `DATASET_UPLOAD_FAILED` / `DATASET_SECURITY_BLOCKED` | 提交 session，生成 dataset/version/file/lineage 绑定，并触发内容安全与可用性判定。 |

### 2.2 与既有 Dataset API 的边界

F015 不替换 F009 `GET/POST /api/v1/datasets` 与版本发布链路，只新增 upload session 作为“用户可见上传入口”。上传文件最终仍沉淀为：

- `dataset`
- `dataset_version`
- `dataset_file`
- `platform_file_object`
- `data_lineage`

本地上传模式下 `sourceId` 可为空，但必须通过 `LOCAL_UPLOAD` 血缘或 session 元数据建立可追溯关系。

### 2.3 `POST /api/v1/dataset-upload-sessions` Request

```json
{
  "name": "焊缝缺陷样本集",
  "tenantId": "TENANT-CABIN",
  "datasetType": "RAW",
  "dataType": "IMAGE",
  "accessLevel": "TEAM",
  "tags": ["质检", "焊缝"],
  "description": "现场采集图片样本",
  "creationMode": "LOCAL_UPLOAD"
}
```

约束：
- `creationMode` 在 F015 仅接受 `LOCAL_UPLOAD`；`DATA_SOURCE_IMPORT` 继续走 F009 数据源导入路径。
- `datasetType` 本期仅允许 `RAW`。
- `dataType` 本期仅允许 `IMAGE`。

### 2.4 `POST /api/v1/dataset-upload-sessions` Response `data`

```json
{
  "sessionId": "DUS-WELD-001",
  "datasetId": null,
  "versionId": null,
  "status": "PENDING_UPLOAD",
  "creationMode": "LOCAL_UPLOAD",
  "progress": {
    "phase": "PENDING_UPLOAD",
    "percent": 0
  },
  "summary": {
    "totalFiles": 0,
    "acceptedFiles": 0,
    "rejectedFiles": 0
  }
}
```

### 2.5 `POST /api/v1/dataset-upload-sessions/{sessionId}/files`

- Content-Type：`multipart/form-data`
- 支持：
  - 多张图片上传
  - 单个 zip 上传
- F015 不冻结客户端分片上传协议，也不引入平台外对象存储直传协议。

#### File upload response `data`

```json
{
  "sessionId": "DUS-WELD-001",
  "status": "UPLOADING",
  "summary": {
    "totalFiles": 10,
    "acceptedFiles": 8,
    "rejectedFiles": 2
  },
  "files": [
    {
      "fileName": "weld-001.jpg",
      "fileId": "FILE-WELD-001",
      "status": "ACCEPTED",
      "sizeBytes": 182340,
      "diagnosticCode": "OK",
      "diagnosticMessage": "FILE_ACCEPTED"
    },
    {
      "fileName": "bad.exe",
      "fileId": null,
      "status": "REJECTED",
      "sizeBytes": 9120,
      "diagnosticCode": "DATASET_UPLOAD_FILE_TYPE_UNSUPPORTED",
      "diagnosticMessage": "仅支持图片文件与 zip 包"
    }
  ]
}
```

#### 上传规则

- 合法图片：生成 `platform_file_object`，状态进入 `ACCEPTED` / `UPLOADED`。
- 非法格式：返回 `REJECTED`，不得生成 `dataset_file` 绑定。
- zip 中非法或损坏文件：允许逐文件失败，不得导致整体静默成功。

### 2.6 `GET /api/v1/dataset-upload-sessions/{sessionId}` Response `data`

```json
{
  "sessionId": "DUS-WELD-001",
  "datasetId": "DATASET-WELD-UPLOAD-001",
  "versionId": "DVER-WELD-UPLOAD-001",
  "status": "PROCESSING",
  "creationMode": "LOCAL_UPLOAD",
  "progress": {
    "phase": "SECURITY_SCAN",
    "percent": 64
  },
  "summary": {
    "totalFiles": 10,
    "acceptedFiles": 8,
    "rejectedFiles": 2
  },
  "diagnosticCode": "OK",
  "diagnosticMessage": "SESSION_PROCESSING"
}
```

### 2.7 `POST /api/v1/dataset-upload-sessions/{sessionId}/commit` Request

```json
{
  "publishRequested": false
}
```

说明：
- F015 允许 `commit` 仅完成 dataset/version/file/lineage 绑定，不强制同步发布。
- 是否自动发布由实现阶段按 F009 状态机与内容安全结果决定；契约要求不得跳过 DAT-002 / DAT-005。

### 2.8 `POST /api/v1/dataset-upload-sessions/{sessionId}/commit` Response `data`

```json
{
  "sessionId": "DUS-WELD-001",
  "datasetId": "DATASET-WELD-UPLOAD-001",
  "versionId": "DVER-WELD-UPLOAD-001",
  "status": "READY",
  "datasetStatus": "ACTIVE",
  "versionStatus": "READY",
  "diagnosticCode": "DATASET_UPLOAD_READY",
  "diagnosticMessage": "本地上传数据集已完成文件绑定，可进入后续流程"
}
```

### 2.9 前端阶段进度 contract

前端进度覆盖层必须至少表达以下阶段之一：

- `PENDING_UPLOAD`
- `VALIDATING_FILES`
- `UPLOADING_FILES`
- `SECURITY_SCAN`
- `INDEXING_METADATA`
- `CREATING_VERSION`
- `READY`
- `FAILED`
- `SECURITY_PENDING`

## 3. Domain / State / Rules

### 3.1 Domain Objects

| Object | Role |
|---|---|
| `DatasetUploadSession` | 本地上传会话聚合根，记录元数据、阶段状态、统计与诊断。 |
| `DatasetUploadSessionFile` | session 内部文件明细（可选持久化表，至少逻辑上存在）。 |
| `Dataset` | 复用 F009 数据集事实源。 |
| `DatasetVersion` | 复用 F009 数据集版本状态机。 |
| `DatasetFile` | 复用 F009 文件绑定事实。 |
| `PlatformFileObject` | 复用 F007 文件对象事实源。 |
| `DataLineage` | 复用 F009 血缘模型，新增 `sourceType=LOCAL_UPLOAD`。 |

### 3.2 Upload Session State

- `PENDING_UPLOAD`
- `UPLOADING`
- `PROCESSING`
- `READY`
- `FAILED`
- `SECURITY_PENDING`
- `CANCELLED`

### 3.3 File State

- `PENDING`
- `ACCEPTED`
- `UPLOADED`
- `REJECTED`
- `SECURITY_BLOCKED`
- `BOUND`

### 3.4 Dataset / Version State Reuse

复用 F009：
- 版本状态：`DRAFT`、`SECURITY_PENDING`、`READY`、`PUBLISHED`、`ARCHIVED`、`FAILED`
- 已发布版本不可变（DAT-005）

### 3.5 MUST Rules Mapping

- **DAT-002**：所有上传图片在进入最终可用版本前必须经过内容安全检测；高风险内容自动拦截；服务不可用不得假成功。
- **DAT-005**：已发布版本不可被 upload session 二次改写；重复 commit 不得篡改已发布版本。
- **DAT-009**：只有达到 ACTIVE/可用状态的数据集才可继续发起标注任务。
- **DAT-012**：session、dataset、file object、lineage 查询必须默认受 tenantId 约束；跨 BU 无授权返回 404/403。
- **DAT-008（相关约束）**：高风险内容不得被系统静默自动删除，应进入隔离/待管理员处置语义或留下处置诊断痕迹。

## 4. Error Contract

| HTTP | Business Code | Scenario | Rule |
|---|---|---|---|
| 400 | 40001 | 请求参数格式错误、multipart 结构错误 | API 统一校验 |
| 401 | 40100 | 未认证、token 失效 | F006 |
| 403 | 40300 | 无 `data:dataset:write` / `data:dataset:read` 等权限 | PLT-009 |
| 404 | 40400 | 跨 BU 无授权访问 session / dataset，不暴露资源存在性 | DAT-012 |
| 409 | 40900 | session 状态冲突、重复 commit、已发布版本不可变 | DAT-005 |
| 413 | 41300 | 上传文件数/大小超限（待配置冻结） | `TODO_CONFIRM_*` |
| 422 | 42200 | 业务规则失败、空会话 commit、格式不支持、内容安全阻断 | DAT-002 |

### 4.1 Recommended Diagnostic Codes

- `DATASET_UPLOAD_SESSION_NOT_FOUND`
- `DATASET_UPLOAD_SESSION_STATE_INVALID`
- `DATASET_UPLOAD_EMPTY_SESSION`
- `DATASET_UPLOAD_FILE_TYPE_UNSUPPORTED`
- `DATASET_UPLOAD_FILE_CORRUPTED`
- `DATASET_UPLOAD_FILE_LIMIT_EXCEEDED`
- `DATASET_UPLOAD_ZIP_SIZE_EXCEEDED`
- `DATASET_UPLOAD_SECURITY_PENDING`
- `DATASET_UPLOAD_SECURITY_BLOCKED`
- `DATASET_UPLOAD_STORAGE_UNCONFIGURED`
- `DATASET_UPLOAD_DUPLICATE_COMMIT`
- `DATASET_UPLOAD_VERSION_IMMUTABLE`
- `DATASET_UPLOAD_CROSS_TENANT_DENIED`

## 5. Permission Contract

复用既有权限体系，不新增平行 RBAC：

- `data:dataset:read`
- `data:dataset:write`
- `data:dataset:publish`
- `platform:file:download`
- `platform:file:read`（如实现中需要）

授权策略：
- 创建 session、上传文件、commit：要求 `data:dataset:write`
- 查询 session：要求 `data:dataset:read`
- 访问最终文件预览/下载：要求 `platform:file:download` 与 dataset 可见性通过
- 跨 BU 默认拒绝，除非有明确授权记录；上传/commit 不允许跨租户共享会话

## 6. Audit Contract

所有关键动作写入 `platform_audit_log`：

- `DATASET_UPLOAD_SESSION_CREATED`
- `DATASET_UPLOAD_FILE_ACCEPTED`
- `DATASET_UPLOAD_FILE_REJECTED`
- `DATASET_UPLOAD_COMMITTED`
- `DATASET_UPLOAD_FAILED`
- `DATASET_SECURITY_BLOCKED`

审计字段必须至少包含：
- `eventId`
- `tenantId`
- `operatorId`
- `action`
- `resourceType`（`DatasetUploadSession` / `Dataset` / `PlatformFileObject`）
- `resourceId`
- `result`
- `riskLevel`
- `detailJson`
- `traceId`
- `occurredAt`

## 7. Data Contract

### 7.1 New table suggestion

```sql
CREATE TABLE dataset_upload_session (
  session_id VARCHAR(96) PRIMARY KEY,
  dataset_id VARCHAR(96),
  version_id VARCHAR(96),
  tenant_id VARCHAR(64) NOT NULL REFERENCES platform_tenant(id),
  project_id VARCHAR(64) REFERENCES platform_tenant(id),
  creation_mode VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  total_files INT NOT NULL DEFAULT 0,
  accepted_files INT NOT NULL DEFAULT 0,
  rejected_files INT NOT NULL DEFAULT 0,
  diagnostic_code VARCHAR(96),
  diagnostic_message VARCHAR(1000),
  created_by VARCHAR(64) NOT NULL REFERENCES platform_user(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  committed_at TIMESTAMP WITH TIME ZONE
);
```

### 7.2 Optional file detail table

```sql
CREATE TABLE dataset_upload_session_file (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(96) NOT NULL REFERENCES dataset_upload_session(session_id),
  file_name VARCHAR(255) NOT NULL,
  file_id VARCHAR(96),
  status VARCHAR(32) NOT NULL,
  size_bytes BIGINT,
  diagnostic_code VARCHAR(96),
  diagnostic_message VARCHAR(1000)
);
```

### 7.3 Reused data tables

- `dataset`
- `dataset_version`
- `dataset_file`
- `platform_file_object`
- `data_lineage`

### 7.4 Lineage Contract

- `data_lineage.sourceType = LOCAL_UPLOAD`
- `data_lineage.sourceId = {sessionId}` 或等价会话标识
- `transformType = IMPORT` 或等价本地导入变体

## 8. Frontend Contract

### 8.1 Route / Page key

- `up`：新建数据集/上传向导
- `ds`：数据集管理
- `dsdetail`：数据集详情
- `ann`：后续标注任务入口

### 8.2 UX Contract

- `up` 页面必须提供创建方式切换：
  - `从数据源导入`
  - `本地上传图片`
- 无可用数据源时：
  - 不展示空白 `sourceId` Select
  - 展示空态文案和 CTA
- 上传列表必须展示：文件名、大小、状态、失败原因
- 进度覆盖层必须展示阶段进度与完成态
- 上传成功后必须可跳转到 `dsdetail`

### 8.3 Backward-compatible behavior

- 当存在可用数据源并选择 `DATA_SOURCE_IMPORT` 时，F009 旧路径保持原有行为。
- 本地上传能力不得破坏 `DatasetUploadPage` 既有 metadata step、dataset detail 跳转和后续标注入口语义。

## 9. Compatibility

- Backward compatibility：
  - F015 作为 F009 的增量扩展，不修改 F006/F007/F009/F012/F013/F014 既有 API 响应结构的基本 envelope。
  - `createDataset` 既有 `sourceId` 可选语义保持成立。
- Versioning：
  - 继续使用 `/api/v1`。
- External systems：
  - 内容安全服务接入参数、上传阈值、对象存储 bucket / KMS / TLS / 预签名 URL 继续保留 `TODO_CONFIRM_*`。
  - 不得因为这些参数未确认而伪造 READY/PUBLISHED/下载成功。
- Out-of-scope：
  - 不引入平台外直传 Label Studio 作为正式入口。
  - 不在本契约内冻结大文件分片协议和断点续传协议。
