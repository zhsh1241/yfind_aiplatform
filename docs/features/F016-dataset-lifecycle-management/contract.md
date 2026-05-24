---
feature: F016-dataset-lifecycle-management
version: v1
status: frozen
owner: contract-executor
frozen_at: 2026-05-24
---

# Feature Contract: 数据集生命周期管理增强

**Status: frozen**

## 1. 范围与契约目标

F016 在 F009「数据源与数据集管理基础能力」和 F015「本地图片上传创建数据集」之上，冻结数据集生命周期增强契约，覆盖以下正式操作：

1. 数据集元信息编辑
2. 新建版本（默认复制上一版本文件集合）
3. 删除版本
4. 当前版本追加文件
5. 当前版本解绑文件
6. 数据集归档
7. 管理员硬删除
8. 上传向导追加到既有版本

本契约只冻结外部可观察行为，不新增平行数据模型；唯一事实源仍为：

- `dataset`
- `dataset_version`
- `dataset_file`
- `platform_file_object`
- `data_lineage`
- `dataset_upload_session` / `dataset_upload_session_file`（F015 上传会话）

## 2. 设计约束与兼容性原则

### 2.1 保持不变

- API 前缀继续使用 `/api/v1`
- 统一响应 envelope 继续使用 `ApiResponse<T>`
- 鉴权继续使用 `Authorization: Bearer <token>`
- 租户/BU 隔离继续由 F006 身份与租户上下文负责
- 文件事实仍由 `platform_file_object` 持有，版本操作只增删 `dataset_file` 绑定，不直接删除底层文件对象

### 2.2 F016 明确收敛

- 数据集首个版本号统一为 `v1`，后续人工版本按 `v2`、`v3` 递增；不再以 `v0.1.0` 作为产品契约口径。
- “编辑数据集”与“编辑版本内容”严格分离：
  - 编辑数据集：仅改 Dataset 元信息
  - 编辑版本内容：只通过“新建版本 / 追加文件 / 解绑文件 / 删除版本”完成
- 已发布版本不可被追加、解绑、删除，必须通过新建版本迭代。
- 普通删除入口收敛为“归档”；`DELETE /datasets/{datasetId}` 在 F016 中冻结为“管理员硬删除”语义。

### 2.3 上游依赖

以下 F009/F015 既有契约继续有效，F016 只在其上补充或收紧语义：

- `POST /api/v1/datasets/{datasetId}/versions/{versionId}/publish`
- `GET /api/v1/dataset-references`
- `POST /api/v1/dataset-upload-sessions/*`

## 3. API 总览

| Method | Path | 用途 | Permission | 审计事件 |
|---|---|---|---|---|
| GET | `/api/v1/datasets` | 数据集列表，新增版本统计 | `data:dataset:read` | - |
| GET | `/api/v1/datasets/{datasetId}?versionId={versionId?}` | 数据集详情，按选中版本返回文件视图 | `data:dataset:read` | - |
| PUT | `/api/v1/datasets/{datasetId}` | 编辑数据集元信息 | `data:dataset:write` | `DATASET_UPDATED` / `DATASET_UPDATE_REJECTED` |
| POST | `/api/v1/datasets/{datasetId}/versions` | 新建版本，默认复制上一版本文件集合 | `data:dataset:write` | `DATASET_VERSION_CREATED` |
| DELETE | `/api/v1/datasets/{datasetId}/versions/{versionId}` | 删除单个版本 | `data:dataset:write` | `DATASET_VERSION_DELETED` / `DATASET_VERSION_DELETE_REJECTED` |
| POST | `/api/v1/datasets/{datasetId}/versions/{versionId}/files` | 向当前版本追加文件 | `data:dataset:write` | `DATASET_FILE_ATTACHED` / `DATASET_FILE_ATTACH_REJECTED` |
| DELETE | `/api/v1/datasets/{datasetId}/versions/{versionId}/files/{bindingId}` | 从当前版本解绑文件 | `data:dataset:write` | `DATASET_FILE_UNBOUND` / `DATASET_FILE_UNBIND_REJECTED` |
| POST | `/api/v1/datasets/{datasetId}/archive` | 归档数据集 | `data:dataset:delete` | `DATASET_ARCHIVED` / `DATASET_ARCHIVE_REJECTED` |
| DELETE | `/api/v1/datasets/{datasetId}` | 管理员硬删除数据集 | `data:dataset:delete` + 超级管理员 | `DATASET_HARD_DELETED` / `DATASET_HARD_DELETE_REJECTED` |
| POST | `/api/v1/dataset-upload-sessions` | 创建上传会话，支持“新建数据集”或“追加到既有版本” | `data:dataset:write` | `DATASET_UPLOAD_SESSION_CREATED` |
| POST | `/api/v1/dataset-upload-sessions/{sessionId}/files` | 上传本地文件到会话 | `data:dataset:write` | `DATASET_UPLOAD_FILE_ACCEPTED` / `DATASET_UPLOAD_FILE_REJECTED` |
| GET | `/api/v1/dataset-upload-sessions/{sessionId}` | 查询上传会话状态 | `data:dataset:read` | - |
| POST | `/api/v1/dataset-upload-sessions/{sessionId}/commit` | 提交上传会话：新建数据集或追加到既有版本 | `data:dataset:write` | `DATASET_UPLOAD_COMMITTED` / `DATASET_UPLOAD_APPEND_COMMITTED` / `DATASET_UPLOAD_FAILED` |

## 4. 请求与响应 Schema

> 所有示例仅展示 `data` 字段；外层统一 envelope 为：
>
> ```json
> {
>   "code": 0,
>   "message": "success",
>   "data": {},
>   "traceId": "uuid"
> }
> ```

### 4.1 公共对象

#### 4.1.1 DatasetSummary

| 字段 | 类型 | 说明 |
|---|---|---|
| `datasetId` | string | 数据集 ID |
| `name` | string | 数据集名称 |
| `datasetType` | enum | `RAW` / `PREPROCESSED` / `ANNOTATED` / `AUGMENTED` |
| `dataType` | enum | `IMAGE` / `TEXT` / `AUDIO` / `VIDEO` / `MULTI_MODAL` |
| `tenantId` | string | 所属租户 |
| `projectId` | string \| null | 项目 ID |
| `status` | enum | `DRAFT` / `ACTIVE` / `ARCHIVED` |
| `accessLevel` | enum | `PUBLIC` / `TEAM` / `PRIVATE` / `RESTRICTED` |
| `tags` | string[] | 标签 |
| `description` | string \| null | 描述 |
| `ownerId` | string | 所有者 ID |
| `ownerName` | string | 所有者名称 |
| `currentVersionId` | string \| null | 当前版本 ID |
| `currentVersionName` | string \| null | 当前版本号 |
| `versionCount` | number | 版本总数（不含已删除版本） |
| `recordCount` | number | 当前口径记录数 |
| `sizeBytes` | number | 当前口径大小 |
| `archivedAt` | string \| null | 归档时间 |
| `updatedAt` | string | 更新时间 |
| `mutable` | boolean | 是否允许继续生命周期写操作 |
| `hardDeletable` | boolean | 当前调用人视角下是否满足硬删除前置条件 |

#### 4.1.2 DatasetVersion

| 字段 | 类型 | 说明 |
|---|---|---|
| `versionId` | string | 版本 ID |
| `datasetId` | string | 所属数据集 ID |
| `versionName` | string | 版本号，F016 冻结为 `v1`/`v2`/`v3`… |
| `status` | enum | `DRAFT` / `READY` / `SECURITY_PENDING` / `PUBLISHED` / `ARCHIVED` / `FAILED` |
| `isCurrent` | boolean | 是否当前版本 |
| `sourceVersionId` | string \| null | 复制来源版本 ID；首版本为空 |
| `recordCount` | number | 版本记录数 |
| `fileCount` | number | 当前版本绑定文件数 |
| `sizeBytes` | number | 当前版本总大小 |
| `contentSafetyStatus` | enum | `UNCONFIGURED` / `PENDING` / `PASSED` / `BLOCKED` |
| `diagnosticCode` | string \| null | 诊断码 |
| `diagnosticMessage` | string \| null | 诊断说明 |
| `createdAt` | string | 创建时间 |
| `publishedAt` | string \| null | 发布时间 |
| `mutable` | boolean | 是否允许追加/解绑/删除 |
| `deletable` | boolean | 是否允许删除版本 |
| `deleteBlockedReason` | string \| null | 不可删原因码 |

#### 4.1.3 DatasetFileBinding

| 字段 | 类型 | 说明 |
|---|---|---|
| `bindingId` | string | `dataset_file.id` |
| `datasetId` | string | 数据集 ID |
| `versionId` | string | 版本 ID |
| `fileId` | string | 文件对象 ID |
| `fileRole` | enum | `RAW` / `LABEL` / `MANIFEST` / `THUMBNAIL` / `OTHER` |
| `status` | enum | `BOUND` / `SECURITY_BLOCKED` |
| `objectKey` | string | 对象存储 key |
| `contentType` | string \| null | MIME type |
| `sizeBytes` | number \| null | 文件大小 |
| `sha256` | string \| null | 文件摘要 |
| `displayName` | string \| null | UI 展示名称 |
| `boundAt` | string \| null | 绑定时间 |

### 4.2 `GET /api/v1/datasets`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `keyword` | string | 否 | 关键字 |
| `datasetType` | string | 否 | 数据集类型过滤 |
| `status` | string | 否 | 数据集状态过滤 |
| `accessLevel` | string | 否 | 权限级别过滤 |
| `page` | number | 否 | 默认 `1` |
| `pageSize` | number | 否 | 默认 `20` |

#### Response `data`

```json
{
  "items": [
    {
      "datasetId": "DATASET-001",
      "name": "焊缝缺陷样本集",
      "datasetType": "RAW",
      "dataType": "IMAGE",
      "tenantId": "TENANT-CABIN",
      "projectId": null,
      "status": "ACTIVE",
      "accessLevel": "TEAM",
      "tags": ["焊接", "质检"],
      "description": "现场采集图片",
      "ownerId": "USER-001",
      "ownerName": "张工",
      "currentVersionId": "DVER-002",
      "currentVersionName": "v2",
      "versionCount": 2,
      "recordCount": 1280,
      "sizeBytes": 874321123,
      "archivedAt": null,
      "updatedAt": "2026-05-24T08:00:00Z",
      "mutable": true,
      "hardDeletable": false
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "stats": {
    "total": 1,
    "raw": 1,
    "preprocessed": 0,
    "annotated": 0,
    "restricted": 0,
    "totalSizeBytes": 874321123
  }
}
```

### 4.3 `GET /api/v1/datasets/{datasetId}?versionId={versionId?}`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `versionId` | string | 否 | 不传时默认返回当前版本视图 |

#### Response `data`

```json
{
  "dataset": {
    "datasetId": "DATASET-001",
    "name": "焊缝缺陷样本集",
    "datasetType": "RAW",
    "dataType": "IMAGE",
    "tenantId": "TENANT-CABIN",
    "projectId": null,
    "status": "ACTIVE",
    "accessLevel": "TEAM",
    "tags": ["焊接", "质检"],
    "description": "现场采集图片",
    "ownerId": "USER-001",
    "ownerName": "张工",
    "currentVersionId": "DVER-002",
    "currentVersionName": "v2",
    "versionCount": 2,
    "recordCount": 1280,
    "sizeBytes": 874321123,
    "archivedAt": null,
    "updatedAt": "2026-05-24T08:00:00Z",
    "mutable": true,
    "hardDeletable": false
  },
  "selectedVersionId": "DVER-002",
  "selectedVersion": {
    "versionId": "DVER-002",
    "datasetId": "DATASET-001",
    "versionName": "v2",
    "status": "READY",
    "isCurrent": true,
    "sourceVersionId": "DVER-001",
    "recordCount": 1280,
    "fileCount": 1280,
    "sizeBytes": 874321123,
    "contentSafetyStatus": "PASSED",
    "diagnosticCode": "OK",
    "diagnosticMessage": "VERSION_READY",
    "createdAt": "2026-05-24T07:00:00Z",
    "publishedAt": null,
    "mutable": true,
    "deletable": true,
    "deleteBlockedReason": null
  },
  "versions": [],
  "files": [],
  "grants": [],
  "lineage": [],
  "previewStatus": "PREVIEWABLE",
  "previewDiagnostic": "样例可预览"
}
```

约束：

- `versions` 返回全部未删除版本。
- `files` 只返回 `selectedVersionId` 对应版本的文件绑定，不再返回全数据集混合文件视图。
- 若 `versionId` 不属于该 `datasetId`，返回 `404 RESOURCE_NOT_FOUND`。

### 4.4 `PUT /api/v1/datasets/{datasetId}`

#### Request

```json
{
  "name": "焊缝缺陷样本集-修订",
  "accessLevel": "RESTRICTED",
  "tags": ["焊接", "质检", "车身"],
  "description": "补充夜间场景说明"
}
```

#### 字段约束

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | 否 | 仅修改数据集名称 |
| `accessLevel` | 否 | 修改数据集访问级别 |
| `tags` | 否 | 整体替换标签集合 |
| `description` | 否 | 修改描述 |

禁止：

- 通过此接口修改 `currentVersionId`
- 通过此接口修改任何版本文件集合
- 通过此接口修改版本状态

#### Response

返回 `DatasetDetailResponse`（同 4.3），其中：

- `selectedVersionId` 默认回到 `currentVersionId`
- `versions/files` 均反映更新后状态，但文件集合不发生变化

### 4.5 `POST /api/v1/datasets/{datasetId}/versions`

#### Request

```json
{
  "versionName": "v3",
  "sourceVersionId": "DVER-002",
  "inheritPreviousFiles": true,
  "description": "新增夜间焊缝样本前的版本快照"
}
```

#### 字段约束

| 字段 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `versionName` | 否 | 系统生成下一个 `vN` | 允许用户手动指定，但必须唯一 |
| `sourceVersionId` | 否 | 当前版本 ID | 复制来源版本 |
| `inheritPreviousFiles` | 否 | `true` | 是否复制来源版本文件绑定 |
| `description` | 否 | `null` | 版本备注 |

#### Response `data`

返回 `DatasetVersion`。

#### 行为冻结

- 创建成功后：
  - 新版本自动成为 `currentVersionId`
  - `sourceVersionId` 必须被记录，供追溯与删除回退判定使用
  - 当 `inheritPreviousFiles=true` 时，新版本必须复制来源版本的 `dataset_file` 绑定快照
- 复制行为只复制“绑定关系”，不得复制 `platform_file_object` 实体
- 若来源版本不存在或跨 BU 不可见，返回 `404 RESOURCE_NOT_FOUND`

### 4.6 `DELETE /api/v1/datasets/{datasetId}/versions/{versionId}`

#### Response `data`

```json
{
  "datasetId": "DATASET-001",
  "deletedVersionId": "DVER-003",
  "currentVersionId": "DVER-002",
  "currentVersionName": "v2",
  "versionCount": 2
}
```

#### 行为冻结

- 删除成功后，该版本不再出现在列表与详情中。
- 若删除的是当前版本，系统必须将 `currentVersionId` 切换到：
  1. `sourceVersionId` 对应且仍存在的版本；否则
  2. 剩余版本中创建时间最近的版本
- 删除版本只删除该版本与 `dataset_file` 绑定关系；不得删除被其他版本复用的 `platform_file_object`

### 4.7 `POST /api/v1/datasets/{datasetId}/versions/{versionId}/files`

#### Request

```json
{
  "fileId": "FILE-009",
  "fileRole": "RAW"
}
```

#### Response `data`

返回 `DatasetFileBinding`。

#### 行为冻结

- 仅允许向“当前选中且可变”的版本追加。
- 若目标版本非当前版本，返回 `409 DATASET_TARGET_VERSION_NOT_CURRENT`。
- 追加前必须完成文件对象完整性校验；失败返回 `422 DATASET_FILE_HASH_MISMATCH`。
- 追加成功后需重新计算该版本 `fileCount`、`recordCount`、`sizeBytes`，并同步更新 dataset 汇总口径。

### 4.8 `DELETE /api/v1/datasets/{datasetId}/versions/{versionId}/files/{bindingId}`

#### Response `data`

```json
{
  "datasetId": "DATASET-001",
  "versionId": "DVER-003",
  "bindingId": "DF-001",
  "fileId": "FILE-009",
  "remainingFileCount": 1279
}
```

#### 行为冻结

- 解绑只删除 `dataset_file` 绑定，不删除 `platform_file_object`。
- 解绑后若该文件仍被其他版本绑定，其他版本不得受影响。
- 解绑后不得自动删除 lineage；lineage 仍以版本演进事实存在。

### 4.9 `POST /api/v1/datasets/{datasetId}/archive`

#### Response `data`

返回更新后的 `DatasetSummary`。

#### 行为冻结

- 成功后 `dataset.status = ARCHIVED`
- 归档后禁止：
  - 编辑元信息
  - 新建版本
  - 追加文件
  - 解绑文件
  - 上传向导追加到该数据集版本
- 归档不等于硬删除；详情、血缘、审计、权限信息仍可只读查看

### 4.10 `DELETE /api/v1/datasets/{datasetId}`

#### Response

```json
null
```

#### 行为冻结

- 该接口在 F016 中专用于“管理员硬删除”。
- 仅超级管理员可执行。
- 必须先满足：
  - 数据集已归档
  - DAT-011 引用检查通过
- 成功后对外表现为资源不可恢复：后续 `GET` 返回 `404`。
- 实现可选择物理删除或等价不可恢复清理，但外部语义必须是“硬删除完成”。

### 4.11 `POST /api/v1/dataset-upload-sessions`

#### Request：新建数据集模式

```json
{
  "name": "焊缝缺陷样本集",
  "tenantId": "TENANT-CABIN",
  "datasetType": "RAW",
  "dataType": "IMAGE",
  "accessLevel": "TEAM",
  "tags": ["焊接", "质检"],
  "description": "现场采集图片",
  "creationMode": "LOCAL_UPLOAD",
  "targetAction": "CREATE_DATASET"
}
```

#### Request：追加到既有版本模式

```json
{
  "name": "焊缝缺陷样本集",
  "tenantId": "TENANT-CABIN",
  "datasetType": "RAW",
  "dataType": "IMAGE",
  "accessLevel": "TEAM",
  "tags": ["焊接", "质检"],
  "description": "现场采集图片",
  "creationMode": "LOCAL_UPLOAD",
  "targetAction": "APPEND_VERSION",
  "targetDatasetId": "DATASET-001",
  "targetVersionId": "DVER-003"
}
```

#### 字段约束

| 字段 | 必填 | 说明 |
|---|---|---|
| `creationMode` | 是 | F016 仍固定为 `LOCAL_UPLOAD` |
| `targetAction` | 是 | `CREATE_DATASET` / `APPEND_VERSION` |
| `targetDatasetId` | 条件必填 | `APPEND_VERSION` 时必填 |
| `targetVersionId` | 条件必填 | `APPEND_VERSION` 时必填，且必须等于当前版本 |

#### Response `data`

```json
{
  "sessionId": "DUS-001",
  "creationMode": "LOCAL_UPLOAD",
  "targetAction": "APPEND_VERSION",
  "datasetId": null,
  "versionId": null,
  "targetDatasetId": "DATASET-001",
  "targetVersionId": "DVER-003",
  "status": "PENDING_UPLOAD",
  "progress": {
    "phase": "PENDING_UPLOAD",
    "percent": 0
  },
  "summary": {
    "totalFiles": 0,
    "acceptedFiles": 0,
    "rejectedFiles": 0
  },
  "datasetStatus": "ACTIVE",
  "versionStatus": "READY",
  "diagnosticCode": "OK",
  "diagnosticMessage": "SESSION_CREATED"
}
```

### 4.12 `POST /api/v1/dataset-upload-sessions/{sessionId}/commit`

#### Request

```json
{
  "publishRequested": false
}
```

#### Response：追加到既有版本

```json
{
  "sessionId": "DUS-001",
  "creationMode": "LOCAL_UPLOAD",
  "targetAction": "APPEND_VERSION",
  "datasetId": "DATASET-001",
  "versionId": "DVER-003",
  "targetDatasetId": "DATASET-001",
  "targetVersionId": "DVER-003",
  "status": "READY",
  "progress": {
    "phase": "READY",
    "percent": 100
  },
  "summary": {
    "totalFiles": 20,
    "acceptedFiles": 20,
    "rejectedFiles": 0
  },
  "datasetStatus": "ACTIVE",
  "versionStatus": "SECURITY_PENDING",
  "diagnosticCode": "DATASET_UPLOAD_APPEND_READY",
  "diagnosticMessage": "文件已追加到既有版本，等待内容安全与索引完成"
}
```

#### 行为冻结

- `targetAction=APPEND_VERSION` 时，不得创建新 `dataset` 或新 `dataset_version`。
- commit 只向目标版本新增 `dataset_file` 绑定。
- 追加上传同样受 DAT-002 约束；安全结果未完成前不得伪造 `PASSED`。
- 目标版本若不可变、非当前版本、已归档或跨 BU 不可见，commit 必须失败。

## 5. 字段与对象补充说明

### 5.1 版本号规则

- 首版本：`v1`
- 后续版本：`v2`、`v3`、`v4` …
- 同一 `datasetId` 下必须唯一
- F016 不冻结语义化版本号（如 `v1.0.0`）作为产品主口径

### 5.2 当前版本语义

- `currentVersionId` 表示默认展示、默认追加、默认上传目标版本
- 前端切换查看版本时，可通过详情 query `versionId` 获取不同文件视图
- 只有 `selectedVersionId == currentVersionId` 且版本可变时，UI 才允许出现“追加文件 / 解绑文件 / 上传向导追加”操作

### 5.3 文件复用语义

- 同一 `platform_file_object.fileId` 可同时被多个 dataset version 绑定
- 删除版本、解绑文件均不得直接删除底层文件对象
- 若未来需要垃圾回收，应在平台级离线任务中做“零引用文件清理”，不属于 F016 契约范围

## 6. 权限契约

| 操作 | Permission | 附加约束 |
|---|---|---|
| 列表/详情查询 | `data:dataset:read` | 继续受 DAT-012 限制 |
| 编辑元信息 | `data:dataset:write` | 调用人须可写该数据集 |
| 新建版本 | `data:dataset:write` | 调用人须可写该数据集 |
| 删除版本 | `data:dataset:write` | 调用人须可写该数据集 |
| 追加文件 | `data:dataset:write` | 调用人须可写该数据集 |
| 解绑文件 | `data:dataset:write` | 调用人须可写该数据集 |
| 创建/提交上传会话 | `data:dataset:write` | `APPEND_VERSION` 模式下还须可写目标版本 |
| 归档 | `data:dataset:delete` | 普通数据管理员即可 |
| 管理员硬删除 | `data:dataset:delete` | 另需超级管理员身份 |
| 引用检查联动 | `data:dataset:read` | 由后端内部或显式 reference API 完成 |

## 7. 审计事件契约

| 事件 | 触发时机 | 最低 detail 要求 |
|---|---|---|
| `DATASET_UPDATED` | 元信息编辑成功 | 修改字段列表、前后值摘要 |
| `DATASET_UPDATE_REJECTED` | 编辑被状态/权限/租户规则阻断 | 原因码、版本/状态上下文 |
| `DATASET_VERSION_CREATED` | 新版本创建成功 | `sourceVersionId`、`inheritPreviousFiles`、新旧版本号 |
| `DATASET_VERSION_DELETED` | 删除版本成功 | `deletedVersionId`、新 `currentVersionId` |
| `DATASET_VERSION_DELETE_REJECTED` | 版本删除被阻断 | 原因码、引用数/状态/是否最后一个版本 |
| `DATASET_FILE_ATTACHED` | 追加文件成功 | `versionId`、`fileId`、`bindingId` |
| `DATASET_FILE_ATTACH_REJECTED` | 追加文件失败 | 原因码、目标版本状态 |
| `DATASET_FILE_UNBOUND` | 解绑成功 | `versionId`、`fileId`、`bindingId` |
| `DATASET_FILE_UNBIND_REJECTED` | 解绑失败 | 原因码、目标版本状态 |
| `DATASET_ARCHIVED` | 归档成功 | 原状态、新状态 |
| `DATASET_ARCHIVE_REJECTED` | 归档失败 | 原因码 |
| `DATASET_HARD_DELETED` | 管理员硬删除成功 | 数据集 ID、版本数、清理摘要 |
| `DATASET_HARD_DELETE_REJECTED` | 硬删除失败 | 原因码、调用人身份、引用检查结果 |
| `DATASET_UPLOAD_SESSION_CREATED` | 上传会话创建 | `targetAction`、目标 dataset/version |
| `DATASET_UPLOAD_APPEND_COMMITTED` | 上传追加到既有版本成功 | `sessionId`、`datasetId`、`versionId`、acceptedFiles |
| `DATASET_UPLOAD_FAILED` | 上传提交失败 | 原因码、阶段、目标版本 |

所有事件必须继续写入 `platform_audit_log`，至少包含：

- `eventId`
- `tenantId`
- `operatorId`
- `action`
- `resourceType`
- `resourceId`
- `result`
- `riskLevel`
- `detailJson`
- `traceId`
- `occurredAt`

## 8. 错误码契约

| HTTP | Business Code | 场景 |
|---|---|---|
| 400 | `INVALID_PARAM` | 参数格式错误、query/path/body 不合法 |
| 401 | `UNAUTHORIZED` | 未认证或 token 失效 |
| 403 | `FORBIDDEN` | 权限不足 |
| 404 | `RESOURCE_NOT_FOUND` | DAT-012 场景下跨 BU 不暴露资源存在性 |
| 409 | `DATASET_VERSION_IMMUTABLE` | 已发布/已归档版本不可追加、解绑、删除 |
| 409 | `DATASET_TARGET_VERSION_NOT_CURRENT` | 仅当前版本允许追加/解绑/上传追加 |
| 409 | `DATASET_VERSION_LAST_ONE_FORBIDDEN` | 最后一个版本不可删除 |
| 409 | `DATASET_VERSION_REFERENCED` | 待删版本被后续训练/模型/lineage 引用 |
| 409 | `DATASET_ARCHIVED_READONLY` | 已归档数据集不可执行写操作 |
| 409 | `DATASET_NOT_ARCHIVED_FOR_HARD_DELETE` | 硬删除前未先归档 |
| 409 | `DATASET_REFERENCED` | DAT-011 删除前引用检查失败 |
| 409 | `DATASET_UPLOAD_DUPLICATE_COMMIT` | 上传会话重复提交 |
| 422 | `DATASET_SECURITY_PENDING` | DAT-002：内容安全结果未完成，不得伪造成功 |
| 422 | `DATASET_SECURITY_BLOCKED` | DAT-002：高风险内容阻断 |
| 422 | `DATASET_FILE_HASH_MISMATCH` | 文件完整性校验失败 |
| 422 | `DATASET_UPLOAD_EMPTY_SESSION` | 空上传会话提交 |

### 8.1 推荐 diagnosticCode

- `DATASET_UPDATE_ARCHIVED`
- `DATASET_VERSION_IMMUTABLE`
- `DATASET_VERSION_LAST_ONE_FORBIDDEN`
- `DATASET_VERSION_REFERENCED`
- `DATASET_TARGET_VERSION_NOT_CURRENT`
- `DATASET_ARCHIVED_READONLY`
- `DATASET_HARD_DELETE_ADMIN_ONLY`
- `DATASET_NOT_ARCHIVED_FOR_HARD_DELETE`
- `DATASET_REFERENCED`
- `DATASET_UPLOAD_TARGET_VERSION_IMMUTABLE`
- `DATASET_UPLOAD_TARGET_VERSION_NOT_CURRENT`
- `DATASET_UPLOAD_APPEND_READY`
- `DATASET_CROSS_TENANT_DENIED`

## 9. 规则映射（DAT-002 / DAT-005 / DAT-011 / DAT-012）

| 规则 | 约束对象 | F016 落地要求 |
|---|---|---|
| DAT-002 内容安全检测为强制前置 | 新建版本追加文件、上传向导追加既有版本 | 新增/追加文件进入版本可用态前必须完成内容安全检查；服务未配置或处理中时返回 `DATASET_SECURITY_PENDING`，不得伪造 `PASSED` |
| DAT-005 已发布版本不得修改 | 版本追加、解绑、删除 | `PUBLISHED` 版本不可执行 `POST files`、`DELETE files/{bindingId}`、`DELETE version`；若要变更，必须 `POST versions` 新建版本 |
| DAT-011 删除前须检查训练任务引用 | 管理员硬删除 | `DELETE /datasets/{datasetId}` 必须在事务内或等价原子步骤中执行引用检查；存在活跃训练/模型 lineage 引用则返回 `409 DATASET_REFERENCED` |
| DAT-012 数据集访问遵循 BU 隔离 | 所有读写接口 | 所有查询、编辑、追加、删除、上传追加均自动附加 tenant/BU 可见性校验；跨 BU 未授权访问返回 `404 RESOURCE_NOT_FOUND`，不暴露资源存在性 |

## 10. 状态机与门禁说明

### 10.1 Dataset 状态机（F016 口径）

```text
DRAFT -> ACTIVE -> ARCHIVED
```

补充说明：

- `DELETED` 不作为对外列表状态；硬删除成功后资源直接不可见。
- `ARCHIVED` 为只读终态；本期不提供“解归档”。

### 10.2 DatasetVersion 状态机（F016 口径）

```text
DRAFT -> READY -> PUBLISHED
   \       |
    \-> SECURITY_PENDING
     \-> FAILED
```

补充说明：

- `PUBLISHED`：不可追加/解绑/删除
- `ARCHIVED`：视为不可变终态
- `READY`：允许追加/解绑/删除（仍需满足“当前版本”“非最后一个版本”等门禁）
- `SECURITY_PENDING`：允许继续观察，不得发布，不得伪造安全通过

### 10.3 操作门禁矩阵

| 操作 | Dataset 门禁 | Version 门禁 | 其他门禁 |
|---|---|---|---|
| 编辑元信息 | `status != ARCHIVED` | 不适用 | 可写权限、同 BU |
| 新建版本 | `status in (DRAFT, ACTIVE)` | 来源版本可见 | 新版本号唯一 |
| 删除版本 | `status in (DRAFT, ACTIVE)` | 目标版本不可为 `PUBLISHED/ARCHIVED` | 非最后一个版本、无引用 |
| 追加文件 | `status in (DRAFT, ACTIVE)` | 目标版本必须为当前版本且可变 | 文件完整性通过 |
| 解绑文件 | `status in (DRAFT, ACTIVE)` | 目标版本必须为当前版本且可变 | 解绑后允许文件数变为 0，但版本不可自动删除 |
| 归档 | `status in (DRAFT, ACTIVE)` | 不适用 | 有删除权限 |
| 管理员硬删除 | `status = ARCHIVED` | 全部版本均已不可恢复清理 | 超级管理员、DAT-011 通过 |
| 上传追加到既有版本 | `status in (DRAFT, ACTIVE)` | 目标版本必须为当前版本且可变 | DAT-002、同 BU、session 未提交 |

## 11. Backend Handoff

1. `GET /datasets` 需要补 `versionCount`、`hardDeletable` 等聚合字段，避免前端自行推导。
2. `GET /datasets/{id}` 需要支持 `versionId` query，并只返回所选版本的 `files` 视图；现有“全数据集文件混合返回”不满足 F016。
3. `createVersion` 必须新增 `sourceVersionId` / `inheritPreviousFiles` 语义，并在事务内复制 `dataset_file` 绑定快照，而不是复制文件对象。
4. `deleteVersion`、`unbindFile`、`hardDeleteDataset` 需要新增服务 seam 与审计事件；删除逻辑必须严格区分“解绑”和“删底层文件”。
5. `DELETE /datasets/{id}` 语义需从 F009 的普通删除收敛为“超级管理员硬删除 + 归档前置 + DAT-011 引用检查”。
6. `dataset-upload-session` 需扩展 `targetAction/targetDatasetId/targetVersionId`，并支持 append commit 不创建新 dataset/version。

## 12. Frontend Handoff

1. 数据集列表页需新增“版本数”列，以及“编辑 / 归档 / 删除（仅管理员可见硬删除入口）”操作分层。
2. 数据集详情页必须把“当前查看版本”与“当前版本”概念区分清楚：
   - 允许查看历史版本
   - 只有当前版本且可变时才显示追加/解绑操作
3. 新建版本弹窗默认勾选“复制上一版本文件集合”，版本号默认展示系统建议值 `v{N+1}`。
4. 上传向导必须支持两种模式：
   - 新建数据集
   - 追加到既有版本
   并在 metadata 步骤锁定目标 dataset/version，不允许 commit 时偷偷切换。
5. 归档与硬删除必须使用不同确认文案；硬删除需明确“不可恢复、仅管理员可执行”。

## 13. Test Handoff

1. 后端集成测试需覆盖：`v1` 自动创建、新建版本复制文件、删除当前版本后的 `currentVersionId` 回退、最后一个版本不可删、解绑不删 `platform_file_object`。
2. 规则测试需覆盖：DAT-002（安全 pending / blocked）、DAT-005（发布版本不可变）、DAT-011（有引用不可硬删除）、DAT-012（跨 BU 返回 404）。
3. 前端组件/E2E 需覆盖：版本切换视图、编辑元信息与版本内容分离、上传向导追加到既有版本、归档与管理员硬删除分流。
4. 回归测试需确认 F009/F015 既有 `publish`、`reference`、上传进度和详情预览能力未被破坏。

## 14. 非目标与未冻结项

以下内容不在 F016 冻结范围：

- 版本 diff / 回滚 / 恢复
- 批量版本操作
- 文件物理垃圾回收策略
- 大文件分片上传协议
- 新增第二套 dataset/version/file 模型

