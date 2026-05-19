# Feature Contract: Label Studio 生产化联通

- Feature: F013-label-studio-production-integration
- Source plan: `docs/features/F013-label-studio-production-integration/plan.md`
- Status: frozen
- Frozen at: 2026-05-19

## 1. Contract Summary

F013 在 F012 `/api/v1/annotation/*` 契约上扩展 Label Studio 生产化联通能力。所有 API 继续使用平台统一 `ApiResponse<T>` envelope、Bearer 鉴权、平台权限和 BU 隔离。Label Studio token/API key 只能通过 `secretRef` 或运行时配置解析，响应和持久化数据不得包含明文 token。

## 2. Reuse / Compatibility Contract

- MUST reuse F012 `AnnotationController` API 路径，不新增平行 Label Studio controller。
- MUST reuse F012 `LabelStudioAnnotationAdapter` seam；新增 HTTP adapter 只能替换实现，不替换标注业务模型。
- MUST keep F012 `UNCONFIGURED` behavior when config is missing.
- MUST keep DAT-003/004/009/010/012 and PLT-001/011/014 behavior.
- MUST keep frontend page keys and IA: `/ann`、`/annwork`、`/annreview`。

## 3. Configuration Contract

| Key | Required | Description | Secret |
| --- | --- | --- | --- |
| `smp.label-studio.enabled` / `SMP_LABEL_STUDIO_ENABLED` | no | 是否启用 HTTP adapter | no |
| `smp.label-studio.base-url` / `SMP_LABEL_STUDIO_BASE_URL` | when enabled | Label Studio API base URL | no |
| `smp.label-studio.token-secret-ref` / `SMP_LABEL_STUDIO_TOKEN_SECRET_REF` | when enabled | token 的 secretRef 或 env ref | yes-ref only |
| `smp.label-studio.workspace-id` / `SMP_LABEL_STUDIO_WORKSPACE_ID` | no | workspace / project 策略占位 | no |
| `smp.label-studio.storage-policy` / `SMP_LABEL_STUDIO_STORAGE_POLICY` | no | 样本 URL 暴露策略 | no |
| `smp.label-studio.export-format` / `SMP_LABEL_STUDIO_EXPORT_FORMAT` | no | 默认 `JSON` | no |
| `smp.label-studio.timeout-ms` / `SMP_LABEL_STUDIO_TIMEOUT_MS` | no | HTTP 超时 | no |

`tokenSecretRef` 支持本地开发 `env:LABEL_STUDIO_API_TOKEN`；生产 secret backend 仍为 `TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET`。

## 4. API Contract

### 4.1 `GET /api/v1/annotation/tasks/{taskId}/label-studio/status`

- Permission: `data:annotation:read`
- Response: `AnnotationExternalBindingResponse`
- Behavior: 返回任务级 Label Studio 配置、project/task 总览与最后诊断；不触发外部写操作。

### 4.2 `POST /api/v1/annotation/tasks/{taskId}/label-studio/sync-project`

- Permission: `data:annotation:admin`
- Response: `AnnotationExternalBindingResponse`
- Success: Label Studio project created/reused, `externalProjectId` 非空，`lastSyncStatus=PROJECT_SYNCED`。
- Audit: success `ANNOTATION_LABEL_STUDIO_PROJECT_SYNCED`; failure `ANNOTATION_LABEL_STUDIO_SYNC_FAILED`。
- Idempotency: 已存在 `externalProjectId` 时不得重复创建不可控 project。

### 4.3 `POST /api/v1/annotation/work-items/{workItemId}/label-studio/sync-task`

- Permission: `data:annotation:submit`
- Response: `AnnotationExternalBindingResponse`
- Success: work item task created/reused, `externalTaskId` 非空，`lastSyncStatus=TASK_SYNCED`。
- Audit: success `ANNOTATION_LABEL_STUDIO_TASK_SYNCED`; failure `ANNOTATION_LABEL_STUDIO_SYNC_FAILED`。
- Idempotency: `(provider, workItemId)` 唯一。

### 4.4 `POST /api/v1/annotation/tasks/{taskId}/label-studio/import-results`

- Permission: `data:annotation:admin`
- Response: `AnnotationExternalBindingResponse`
- Success: 至少一个 Label Studio annotation 导入并回写 SMP work item，`lastSyncStatus=RESULT_IMPORTED`。
- Audit: success `ANNOTATION_LABEL_STUDIO_RESULTS_IMPORTED`; failure `ANNOTATION_LABEL_STUDIO_IMPORT_FAILED`。
- Downstream: 不发布数据集；仍由 F012 review/quality/publish API 控制。

## 5. DTO Contract

`AnnotationExternalBindingResponse` 扩展为向后兼容字段：

```json
{
  "bindingId": "ANN-EXT-001",
  "taskId": "ANN-WELD-Q2",
  "provider": "LABEL_STUDIO",
  "externalProjectId": "123",
  "externalUrl": "http://localhost:8083/projects/123",
  "externalTaskId": "456",
  "externalTaskUrl": "http://localhost:8083/projects/123/data?task=456",
  "configStatus": "CONFIGURED",
  "lastSyncStatus": "TASK_SYNCED",
  "diagnosticCode": "LABEL_STUDIO_TASK_SYNCED",
  "diagnosticMessage": "Label Studio task 已同步",
  "launchUrl": "http://localhost:8083/projects/123/data?task=456",
  "retryable": false,
  "lastSyncAt": "2026-05-19T06:00:00Z"
}
```

## 6. Persistence Contract

### 6.1 `annotation_external_binding`

Add nullable columns:

- `workspace_id VARCHAR(128)`
- `secret_ref VARCHAR(256)` stores only ref/masked value, never token
- `external_task_count BIGINT DEFAULT 0`
- `last_error_at TIMESTAMP WITH TIME ZONE`
- `retry_count INTEGER DEFAULT 0`

### 6.2 `annotation_external_task_binding`

Columns:

- `binding_id VARCHAR(96) PRIMARY KEY`
- `task_id VARCHAR(96) NOT NULL`
- `work_item_id VARCHAR(96) NOT NULL`
- `provider VARCHAR(64) NOT NULL`
- `external_project_id VARCHAR(128)`
- `external_task_id VARCHAR(128)`
- `external_task_url VARCHAR(512)`
- `sync_status VARCHAR(32) NOT NULL`
- `import_status VARCHAR(32) NOT NULL`
- `diagnostic_code VARCHAR(128) NOT NULL`
- `diagnostic_message VARCHAR(1000) NOT NULL`
- `last_sync_at TIMESTAMP WITH TIME ZONE`
- `last_import_at TIMESTAMP WITH TIME ZONE`

Unique:

- `(provider, work_item_id)`
- `(provider, external_project_id, external_task_id)` where applicable.

## 7. Diagnostic Contract

| Code | Meaning | Retryable |
| --- | --- | --- |
| `LABEL_STUDIO_UNCONFIGURED` | 配置缺失或 TODO | false |
| `LABEL_STUDIO_CONFIGURED` | 配置可用但尚未同步 | false |
| `LABEL_STUDIO_PROJECT_SYNCED` | project 已同步 | false |
| `LABEL_STUDIO_TASK_SYNCED` | task 已同步 | false |
| `LABEL_STUDIO_RESULTS_IMPORTED` | 结果已导入 | false |
| `LABEL_STUDIO_AUTH_UNCONFIGURED` | secretRef 缺失/不可解析 | false |
| `LABEL_STUDIO_AUTH_FAILED` | 401/403 | false |
| `LABEL_STUDIO_UNREACHABLE` | 网络/超时 | true |
| `LABEL_STUDIO_SCHEMA_REJECTED` | label config 或 task payload 被拒绝 | false |
| `LABEL_STUDIO_RESULT_NOT_READY` | 无可导入结果 | true |
| `LABEL_STUDIO_IMPORT_FORMAT_UNSUPPORTED` | 导入格式不支持 | false |

## 8. Security Contract

- MUST NOT persist raw token in database.
- MUST NOT expose raw token in API response.
- MUST NOT render raw token in frontend.
- MUST NOT log raw token or full Authorization header.
- Tests must scan response / DB / captured diagnostic for fake token.

## 9. Traceability

- AC-01 -> sections 3, 7
- AC-02 -> sections 4.2, 6
- AC-03 -> sections 4.3, 6.2
- AC-04 -> sections 4.4, 5
- AC-05 -> sections 7, 8
- AC-06 -> section 8
- AC-07 -> section 5 and frontend compatibility
- AC-08 -> section 3 local env
- AC-09 -> gate commands in `test-plan.md`
