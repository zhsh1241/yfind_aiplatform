# Feature Contract: 本地图片/视频上传创建数据集

## Contract Metadata
- Version: v1.1
- Status: frozen
- Owner: codex
- Created: 2026-05-22
- Updated: 2026-05-26
- Feature: F015-local-dataset-upload

## 1. Requirement Summary
- 用户目标：用户可在数据集上传向导中直接选择本地图片或 `mp4/mov/avi` 视频文件，通过平台 upload session 创建受治理的 `RAW` 数据集。
- 业务价值：补齐无可用数据源时的创建入口，并支持工业视觉原始视频进入平台 dataset/version/file/lineage 治理，后续可通过 F017 视频抽帧 Pipeline 转成 `IMAGE` 结果集再标注。
- 业务资料：`docs/business/bizdocs/02-01-业务流程-数据管理.md`、`docs/business/bizdocs/03-01-系统功能-数据管理.md`、`docs/business/rules/01-数据管理规则.md`
- 原型页面：`docs/prototype/SMP工业AI平台-原型v2.html` page key `up`、`ds`、`dsdetail`。

## 2. API Contract

### 2.1 Create Upload Session
- Method: `POST`
- Path: `/api/v1/dataset-upload-sessions`
- Description: 创建本地上传会话。`datasetType` 固定为 `RAW`；`dataType` 支持 `IMAGE` 与 `AUDIO_VIDEO`，入参 `VIDEO` 归一为 `AUDIO_VIDEO`。
- Auth: Bearer token
- Permission: `data:dataset:write`
- Audit Event: `DATASET_UPLOAD_SESSION_CREATED`

#### Request Schema
```json
{
  "name": "F015 本地上传视频数据集",
  "tenantId": "TENANT-CABIN",
  "datasetType": "RAW",
  "dataType": "AUDIO_VIDEO",
  "accessLevel": "TEAM",
  "tags": ["视频", "直传"],
  "description": "前端直接上传 mp4/mov/avi 建立视频数据集",
  "creationMode": "LOCAL_UPLOAD",
  "targetAction": "CREATE_DATASET"
}
```

#### Response Schema
```json
{
  "sessionId": "DUS-...",
  "datasetId": null,
  "versionId": null,
  "status": "PENDING_UPLOAD",
  "creationMode": "LOCAL_UPLOAD",
  "targetAction": "CREATE_DATASET",
  "progress": { "phase": "PENDING_UPLOAD", "percent": 0 },
  "summary": { "totalFiles": 0, "acceptedFiles": 0, "rejectedFiles": 0 },
  "datasetStatus": "DRAFT",
  "versionStatus": "DRAFT",
  "diagnosticCode": "OK",
  "diagnosticMessage": "SESSION_CREATED",
  "files": []
}
```

### 2.2 Upload Files
- Method: `POST`
- Path: `/api/v1/dataset-upload-sessions/{sessionId}/files`
- Consumes: `multipart/form-data`，字段名 `files`
- Permission: `data:dataset:write`
- Audit Event: `DATASET_UPLOAD_FILE_ACCEPTED` / `DATASET_UPLOAD_FILE_REJECTED`

#### File Rules
- `IMAGE` session: 支持 `jpg/jpeg/png/bmp/webp` 与 zip（zip 内逐文件校验图片）。
- `AUDIO_VIDEO` session: 支持 `.mp4`、`.mov`、`.avi`，content type 支持 `video/mp4`、`video/quicktime`、`video/x-msvideo`、`video/avi`。
- 单文件大小固定为 `MAX_UPLOAD_FILE_BYTES=100MB`；zip 固定为 `MAX_UPLOAD_ZIP_BYTES=500MB`，由后端与 Spring multipart 配置共同兜底。
- 视频文件一期执行扩展名/content-type/非空校验，不做编解码解析；内容安全 scan 仍按文件元数据调用既有 seam。

### 2.3 Query Session
- Method: `GET`
- Path: `/api/v1/dataset-upload-sessions/{sessionId}`
- Permission: `data:dataset:read`

### 2.4 Commit Session
- Method: `POST`
- Path: `/api/v1/dataset-upload-sessions/{sessionId}/commit`
- Permission: `data:dataset:write`
- Audit Event: `DATASET_UPLOAD_COMMITTED` / `DATASET_UPLOAD_FAILED` / `DATASET_SECURITY_BLOCKED`
- Effect: 创建或更新 `dataset`、`dataset_version`、`dataset_file`、`platform_file_object` 与 `data_lineage(sourceType=LOCAL_UPLOAD, sourceId=sessionId)`。

## 3. Errors
| HTTP | Business Code | Scenario | Rule |
|---|---|---|---|
| 400 | INVALID_PARAM | 参数错误 | API 输入必须完整 |
| 401 | UNAUTHORIZED | 未认证 | F006 |
| 403 | FORBIDDEN | 无写权限或跨 BU 写 | DAT-012 |
| 404 | RESOURCE_NOT_FOUND | 跨 BU 读 session/dataset | DAT-012 |
| 409 | CONFLICT | session 状态不可上传/提交，或追加目标不可写 | DAT-005 |
| 413 | DATASET_UPLOAD_FILE_LIMIT_EXCEEDED / DATASET_UPLOAD_ZIP_SIZE_EXCEEDED | 单文件超过 100MB 或 zip 超过 500MB | F015 |
| 422 | DATASET_UPLOAD_DATA_TYPE_INVALID | 本地上传 dataType 非 `IMAGE/AUDIO_VIDEO/VIDEO` | F015 |
| 422 | DATASET_UPLOAD_FILE_TYPE_UNSUPPORTED | `IMAGE` 上传非图片/zip，或 `AUDIO_VIDEO` 上传非 mp4/mov/avi | F015 |
| 422 | DATASET_UPLOAD_EMPTY_SESSION | 无 accepted 文件提交 | F015 |

## 4. Domain / State / Rules
- Domain objects: `DatasetUploadSession`、`DatasetUploadSessionFile`、`Dataset`、`DatasetVersion`、`DatasetFile`、`PlatformFileObject`、`DataLineage`。
- State transitions: `PENDING_UPLOAD -> UPLOADING -> PROCESSING -> READY | SECURITY_PENDING | FAILED`。
- MUST rules:
  - DAT-002：内容安全未通过不得伪造成可用发布态。
  - DAT-005：追加模式只能写当前且可变版本；视频创建新数据集首期不开放追加到既有版本。
  - DAT-009：视频原始数据集不可直接创建图片标注任务，必须先经抽帧预处理输出 `IMAGE` 数据集。
  - DAT-012：session 与最终数据集均受 BU 隔离。

## 5. Compatibility
- Backward compatibility: 现有图片/zip 上传、数据源导入、图片标注链路保持兼容。
- Versioning: v1.1 扩展 `dataType=AUDIO_VIDEO`，不改变 API path。
