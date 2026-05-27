# Feature Contract: RTSP 视频流式输入接入

## Contract Metadata
- Version: v1
- Status: frozen
- Owner: codex
- Created: 2026-05-27
- Updated: 2026-05-27
- Feature: F018-rtsp-video-stream-input

## 1. Requirement Summary
- 用户目标：在既有数据源管理中登记 RTSP 视频流，完成连接测试、激活和手动采样，最终生成受治理的 `RAW/AUDIO_VIDEO` 数据集。
- 业务价值：让工业摄像头/视频网关的流式视频样本进入平台 `dataset/version/file/lineage` 治理，并衔接 F017 抽帧 Pipeline 与后续图片标注。
- 业务资料：`docs/business/bizdocs/01-业务场景清单.md`、`docs/business/bizdocs/02-01-业务流程-数据管理.md`、`docs/business/bizdocs/03-01-系统功能-数据管理.md`、`docs/business/domain/01-领域对象-数据域.md`、`docs/business/rules/01-数据管理规则.md`。
- 原型页面：`docs/prototype/SMP工业AI平台-原型v2.html` page key `datasrc`、`ds`、`dsdetail`、`pipeline`。

## 2. API Contract

### 2.1 Create / Update RTSP Data Source
- Method: `POST` / `PUT`
- Path: `/api/v1/data-sources` / `/api/v1/data-sources/{sourceId}`
- Description: 创建或更新 RTSP 视频流数据源。`sourceType` 固定为 `RTSP_STREAM`，凭据只保存 secret 引用或 TODO placeholder，不允许明文 password/query secret。
- Auth: Bearer token
- Permission: `data:source:write`
- Audit Event: `RTSP_DATA_SOURCE_CREATED` / `RTSP_DATA_SOURCE_UPDATED`（兼容保留通用 `DATA_SOURCE_CREATED/UPDATED` 审计也可接受）

#### Request Schema
```json
{
  "name": "焊缝相机 RTSP 视频流",
  "sourceType": "RTSP_STREAM",
  "tenantId": "TENANT-CABIN",
  "projectId": "TENANT-VISION",
  "endpoint": "rtsp://camera.sandbox.internal/live/weld",
  "port": 554,
  "databaseName": "camera-line-01",
  "credentialMode": "SECRET_REF",
  "secretRef": "secret://sandbox/rtsp-camera",
  "sharedScope": "BU",
  "description": "F018 RTSP 视频流式输入接入"
}
```

#### Response Schema
```json
{
  "sourceId": "DSRC-...",
  "name": "焊缝相机 RTSP 视频流",
  "sourceType": "RTSP_STREAM",
  "tenantId": "TENANT-CABIN",
  "projectId": "TENANT-VISION",
  "endpoint": "rtsp://camera.sandbox.internal/live/weld",
  "port": 554,
  "databaseName": "camera-line-01",
  "credentialMode": "SECRET_REF",
  "secretRefMasked": "secret://sandbox/rtsp-camera",
  "sharedScope": "BU",
  "description": "F018 RTSP 视频流式输入接入",
  "status": "INACTIVE",
  "lastTestAt": null,
  "diagnosticCode": "NOT_TESTED",
  "diagnosticMessage": "待连接测试",
  "latencyMs": null,
  "updatedAt": "2026-05-27T00:00:00Z"
}
```

#### Validation
- `sourceType` 必须归一为 `RTSP_STREAM`。
- `endpoint` 为空或 `TODO_CONFIRM*`：允许创建为 `UNCONFIGURED`，诊断 `RTSP_SOURCE_UNCONFIGURED`。
- `endpoint` 为 URL 时 scheme 必须为 `rtsp://`；仅 host:port/path 形式允许由服务端按 RTSP 候选探测处理。
- `credentialMode=SECRET_REF` 时 `secretRef` 不得为空，除非仍是 `secret://TODO_CONFIRM_*` 且源保持不可激活。
- 不得保存含 `password=`、`credentialSecret`、`accessKeySecret` 等明文密钥片段。

### 2.2 Test RTSP Data Source
- Method: `POST`
- Path: `/api/v1/data-sources/{sourceId}/test`
- Permission: `data:source:test`
- Audit Event: `RTSP_DATA_SOURCE_TESTED` / `DATA_SOURCE_TEST_SUCCEEDED` / `DATA_SOURCE_TEST_FAILED`

#### Response Schema
```json
{
  "sourceId": "DSRC-...",
  "result": "SUCCESS",
  "status": "TESTED",
  "diagnosticCode": "OK",
  "diagnosticMessage": "SANDBOX RTSP_STREAM connector verified",
  "latencyMs": 42,
  "traceId": "uuid",
  "testedAt": "2026-05-27T00:00:00Z"
}
```

#### Diagnostics
| diagnosticCode | Scenario |
|---|---|
| OK | sandbox/internal RTSP 或安全 TCP 探测成功 |
| RTSP_SOURCE_UNCONFIGURED | endpoint 为空或 TODO_CONFIRM |
| RTSP_SOURCE_URL_INVALID | URL scheme 非 rtsp 或 host 为空 |
| RTSP_SOURCE_CREDENTIAL_REQUIRED | `credentialMode=SECRET_REF` 但 secretRef 未配置 |
| RTSP_STREAM_UNREACHABLE | 外部地址不可达或当前环境不允许真实探测 |

### 2.3 Activate / Disable RTSP Data Source
- Method: `POST`
- Path: `/api/v1/data-sources/{sourceId}/activate` / `/api/v1/data-sources/{sourceId}/disable`
- Permission: `data:source:activate`
- Audit Event: `RTSP_DATA_SOURCE_ACTIVATED` / `RTSP_DATA_SOURCE_DISABLED`
- Rule: 只有最近测试 `diagnosticCode=OK` 的 RTSP 源可激活；禁用源不可运行采样。

### 2.4 Create RTSP Sample Task
- Method: `POST`
- Path: `/api/v1/data-source-sync-tasks`
- Description: 复用 sync task 作为 RTSP 手动采样任务。
- Permission: `data:sync-task:write`
- Audit Event: `RTSP_SAMPLE_TASK_CREATED`

#### Request Schema
```json
{
  "sourceId": "DSRC-RTSP-...",
  "targetDatasetId": null,
  "name": "焊缝 RTSP 手动采样",
  "scheduleMode": "MANUAL",
  "syncScope": "durationSeconds=10;sampleName=weld-line"
}
```

#### Response Schema
```json
{
  "taskId": "DSYNC-...",
  "sourceId": "DSRC-RTSP-...",
  "sourceName": "焊缝相机 RTSP 视频流",
  "targetDatasetId": null,
  "targetDatasetName": null,
  "name": "焊缝 RTSP 手动采样",
  "scheduleMode": "MANUAL",
  "syncScope": "durationSeconds=10;sampleName=weld-line",
  "status": "PAUSED",
  "lastRunAt": null,
  "lastResult": null,
  "diagnosticCode": "RTSP_SAMPLE_READY",
  "diagnosticMessage": "TODO_CONFIRM_RTSP_CAPTURE_ADAPTER; manual sample task ready"
}
```

### 2.5 Run RTSP Sample Task
- Method: `POST`
- Path: `/api/v1/data-source-sync-tasks/{taskId}/run`
- Permission: `data:sync-task:write`
- Audit Event: `RTSP_SAMPLE_TASK_RUN_STARTED` / `RTSP_SAMPLE_TASK_RUN_SUCCEEDED` / `RTSP_SAMPLE_TASK_RUN_FAILED` / `RTSP_SAMPLE_DATASET_BOUND`

#### Response Schema
```json
{
  "taskId": "DSYNC-...",
  "sourceId": "DSRC-RTSP-...",
  "sourceName": "焊缝相机 RTSP 视频流",
  "targetDatasetId": "DATASET-...",
  "targetDatasetName": "焊缝相机 RTSP 视频流 rtsp sample",
  "name": "焊缝 RTSP 手动采样",
  "scheduleMode": "MANUAL",
  "syncScope": "durationSeconds=10;sampleName=weld-line",
  "status": "SUCCEEDED",
  "lastRunAt": "2026-05-27T00:00:00Z",
  "lastResult": "SUCCESS",
  "diagnosticCode": "OK",
  "diagnosticMessage": "SANDBOX_RTSP_STREAM_SAMPLE_READY"
}
```

#### Effects
- 新建或更新目标 `dataset`：`datasetType=RAW`、`dataType=AUDIO_VIDEO`、`tags` 包含 `rtsp` / `sample` / `RTSP_STREAM`。
- 新建 `dataset_version`：`status=PUBLISHED`、`contentSafetyStatus=PASSED`、诊断 `SANDBOX_CONTENT_SAFETY_PASSED`。
- 新建 `platform_file_object`：`contentType=video/mp4`、扩展名 `.mp4`、`assetType=DATASET`。
- 新建 `dataset_file`：`fileRole=RAW`、`status=BOUND`。
- 新建 `data_lineage`：`sourceType=RTSP_STREAM`、`sourceId={sourceId}`、`targetType=DATASET_VERSION`、`targetId={versionId}`、`transformType=CAPTURE_SAMPLE`。

### 2.6 Dataset Detail / Annotation Candidate
- Method: `GET`
- Path: `/api/v1/datasets/{datasetId}` / `/api/v1/datasets/{datasetId}/annotation-candidates`
- Permission: `data:dataset:read`
- Rule: RTSP 采样数据集必须展示 `RTSP_STREAM` lineage；`AUDIO_VIDEO` annotation candidate 必须返回 `eligible=false`，诊断 `ANNOTATION_DATASET_TYPE_UNSUPPORTED`，文案提示先抽帧生成 `IMAGE`。

## 3. Errors
| HTTP | Business Code | Scenario | Rule |
|---|---|---|---|
| 400 | INVALID_PARAM | JSON/路径参数格式错误 | API 输入完整性 |
| 401 | UNAUTHORIZED | 未认证 | F006 |
| 403 | FORBIDDEN | 权限不足或跨 BU 写操作 | DAT-012 |
| 404 | RESOURCE_NOT_FOUND | 跨 BU 读 source/task/dataset 或资源不存在 | DAT-012 |
| 409 | DATA_SOURCE_TEST_FAILED | 未通过连接测试时激活 | DAT-001/DAT-012 |
| 409 | DATA_SYNC_TASK_SOURCE_REJECTED | 源被禁用/不可引用时创建或运行采样 | DAT-012 |
| 422 | DATA_SOURCE_TYPE_UNSUPPORTED | sourceType 不支持 | 数据源枚举 |
| 422 | RTSP_SOURCE_URL_INVALID | RTSP URL 非法 | F018 |
| 422 | RTSP_SOURCE_CREDENTIAL_REQUIRED | 缺少 secretRef | F018 |
| 422 | RTSP_SAMPLE_FAILED | 采样失败不得生成可用数据集 | DAT-002 |

## 4. Domain / State / Rules
- Domain objects: `DataSource`、`DataSourceSyncTask`、`Dataset`、`DatasetVersion`、`PlatformFileObject`、`DatasetFile`、`DataLineage`。
- State transitions:
  - DataSource: `UNCONFIGURED|INACTIVE -> TESTED -> ACTIVE -> DISABLED`。
  - Sample Task: `PAUSED -> SUCCEEDED`；失败时保留 `FAILED`/诊断，不创建可用版本。
  - Dataset: RTSP 采样创建 `ACTIVE` + current `PUBLISHED` version。
- MUST rules:
  - DAT-002：采样失败或内容安全未通过不得伪造成可用版本。
  - DAT-005：版本不可原地修改；采样追加或新建必须创建/绑定版本。
  - DAT-007：必须写入 `data_lineage`。
  - DAT-009：`AUDIO_VIDEO` 原始视频不可直接图片标注。
  - DAT-012：BU 隔离与凭据 masking。

## 5. Compatibility
- Backward compatibility: 现有 `RELATIONAL_DB`、`OBJECT_STORAGE`、`STREAM`、`TIME_SERIES`、`INDUSTRIAL_PROTOCOL`、`API`、`FILE` 行为不变。
- Versioning: v1 使用现有 `/api/v1` 路径与 `data_source_sync_task` seam；新增 `RTSP_STREAM` 字符串枚举值与 RTSP 诊断码。
- Implementation boundary: 一期不引入真实视频解码依赖；sandbox sample content 可为可下载的 mp4 占位字节并记录 `TODO_CONFIRM_RTSP_CAPTURE_ADAPTER`。
