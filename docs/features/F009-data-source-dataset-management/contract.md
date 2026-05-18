---
feature: F009-data-source-dataset-management
version: v1
status: frozen
owner: contract-architect
frozen_at: 2026-05-18
---

# Feature Contract: 数据源与数据集管理基础能力

## 1. API Contract

所有 API 使用 `ApiResponse<T>`，鉴权为 `Authorization: Bearer <token>`，trace 使用 `X-Trace-Id`。

### Data Source

| Method | Path | Permission | Audit |
|---|---|---|---|
| GET | `/api/v1/data-sources` | `data:source:read` | - |
| POST | `/api/v1/data-sources` | `data:source:write` | `DATA_SOURCE_CREATED` |
| PUT | `/api/v1/data-sources/{sourceId}` | `data:source:write` | `DATA_SOURCE_UPDATED` |
| POST | `/api/v1/data-sources/{sourceId}/test` | `data:source:test` | `DATA_SOURCE_TEST_REQUESTED/SUCCEEDED/FAILED` |
| POST | `/api/v1/data-sources/{sourceId}/activate` | `data:source:activate` | `DATA_SOURCE_ACTIVATED` / `DATA_SOURCE_ACTIVATE_REJECTED` |
| POST | `/api/v1/data-sources/{sourceId}/disable` | `data:source:activate` | `DATA_SOURCE_DISABLED` |
| GET/POST | `/api/v1/data-source-sync-tasks` | `data:sync-task:*` | `DATA_SYNC_TASK_CREATED` |
| POST | `/api/v1/data-source-sync-tasks/{taskId}/run` | `data:sync-task:write` | `DATA_SYNC_TASK_UNCONFIGURED` |

### Dataset

| Method | Path | Permission | Audit |
|---|---|---|---|
| GET/POST | `/api/v1/datasets` | `data:dataset:read/write` | `DATASET_CREATED` |
| GET/PUT | `/api/v1/datasets/{datasetId}` | `data:dataset:read/write` | `DATASET_UPDATED` / `DATASET_VERSION_IMMUTABLE_REJECTED` |
| POST | `/api/v1/datasets/{datasetId}/versions` | `data:dataset:write` | `DATASET_VERSION_CREATED` |
| POST | `/api/v1/datasets/{datasetId}/versions/{versionId}/files` | `data:dataset:write` | `DATASET_FILE_ATTACHED` / `DATASET_FILE_HASH_MISMATCH` |
| POST | `/api/v1/datasets/{datasetId}/versions/{versionId}/publish` | `data:dataset:publish` | `DATASET_VERSION_PUBLISHED` / `DATASET_SECURITY_PENDING` |
| POST/DELETE | `/api/v1/datasets/{datasetId}/archive`, `/api/v1/datasets/{datasetId}` | `data:dataset:delete` | `DATASET_ARCHIVED/DELETED/DELETE_BLOCKED` |
| GET | `/api/v1/datasets/{datasetId}/lineage` | `data:lineage:read` | - |
| POST | `/api/v1/datasets/{datasetId}/access-requests` | authenticated | `DATASET_ACCESS_REQUESTED` |
| PUT | `/api/v1/dataset-access-requests/{requestId}/approve|reject` | `data:dataset:grant` | `DATASET_ACCESS_APPROVED/REJECTED` |
| GET | `/api/v1/dataset-references` | `data:dataset:read` | `DATASET_REFERENCE_REQUESTED/BLOCKED` |

## 2. Domain / State / Rules

- 数据源状态：`INACTIVE`、`TESTED`、`ACTIVE`、`FAILED`、`DISABLED`、`UNCONFIGURED`。
- 版本状态：`DRAFT`、`SECURITY_PENDING`、`READY`、`PUBLISHED`、`ARCHIVED`、`FAILED`。
- DAT-001：未通过连接测试的数据源不得激活。
- DAT-002：内容安全服务未配置时不得伪造通过，发布返回 `DATASET_SECURITY_PENDING`。
- DAT-005：已发布版本核心元数据不可变。
- DAT-006：受限数据集访问需要有效期授权。
- DAT-011：删除前检查 `dataset_reference_guard` 活跃引用。
- DAT-012：跨 BU 无授权返回 404/403 并写审计。

## 3. Error Codes

| HTTP | Code | Scenario |
|---|---|---|
| 403 | 40300 | 权限不足、受限数据集无授权 |
| 404 | 40400 | 跨 BU 隔离下不暴露资源存在性 |
| 409 | 40900 | 数据源未测试激活、版本不可变、存在引用 |
| 422 | 42200 | hash/size 不一致、内容安全未配置、参数/状态规则失败 |

## 4. Compatibility

F009 新增 DATA 域表与 API，不修改 F006/F007/F008 既有 API 响应结构；文件对象事实继续由 `platform_file_object` 持有。
