# F016 联调检查报告

## Summary

本次检查仅做静态联调一致性核对，未修改任何业务代码。对照 `contract.md`、后端 DTO/Controller/Service、前端 `platformApi.ts` / `DataPages.tsx` 以及 3 个 E2E 用例后，F016 的数据集生命周期字段、版本视图、上传追加路径与错误反馈在前后端之间总体一致，未发现阻塞性问题。

## 逐类一致性检查

### 1. 数据集生命周期字段一致性

- 后端 `DatasetSummaryResponse` 已包含 F016 需要的核心字段：`currentVersionId`、`currentVersionName`、`versionCount`、`mutable`、`hardDeletable`。
- 前端 `frontend/src/features/platform/platformApi.ts` 的 `DatasetSummary` 类型与后端字段对齐，并在 `DataPages.tsx` 列表页展示 `版本数`、`当前版本`、`管理员硬删除`。
- 列表页操作与状态门禁一致：`归档` 依赖 `dataset.mutable`，`彻底删除` 依赖 `hardDeletable` 且仅超级管理员显示。
- E2E `dataset-lifecycle-management.spec.ts` 已覆盖版本数与删除入口展示。

### 2. 版本视图一致性

- 后端 `GET /api/v1/datasets/{id}?versionId={versionId}` 返回 `selectedVersionId`、`selectedVersion`、`versions`、`files`，支持按选中版本切换视图。
- `DataPages.tsx` 使用 `selectedVersionId` 驱动详情查询，并通过下拉框切换版本；当前/历史版本标签、只读提示、文件表格与版本历史表格均围绕该视图渲染。
- 前端只在满足 `dataset.status !== 'ARCHIVED' && dataset.mutable && selectedVersion.isCurrent && selectedVersion.mutable` 时允许追加/解绑/上传向导追加，与后端对当前可变版本的约束一致。
- E2E 已覆盖切换到 `v1` 后展示“当前为只读版本视图”，并确认追加文件/上传向导追加按钮禁用。

### 3. 上传追加到既有版本一致性

- 后端 `POST /api/v1/dataset-upload-sessions` 支持 `targetAction=APPEND_VERSION`，并校验 `targetDatasetId`、`targetVersionId`、当前版本门禁及版本可变性。
- 前端 `platformApi.createDatasetUploadSession` 已暴露 `targetAction: 'CREATE_DATASET' | 'APPEND_VERSION'` 及目标 dataset/version 参数。
- `DataPages.tsx` 的上传向导追加入口会把当前版本 ID 作为 `appendTarget`，并在提交后根据会话返回结果回跳到目标详情页。
- E2E `dataset-lifecycle-management.spec.ts` 已覆盖 `APPEND_VERSION` 场景、上传完成后回到详情页、并展示 `versionStatus=SECURITY_PENDING` 的提示。

### 4. 错误反馈与状态提示一致性

- 后端已明确返回 F016 关键业务错误码，例如：`DATASET_VERSION_IMMUTABLE`、`DATASET_TARGET_VERSION_NOT_CURRENT`、`DATASET_VERSION_LAST_ONE_FORBIDDEN`、`DATASET_HARD_DELETE_ADMIN_ONLY`、`DATASET_HARD_DELETE_REJECTED`、`DATASET_REFERENCED` 等。
- 前端统一通过 `msg.error(e.message)` 透出后端错误消息，因此业务错误会直达页面，不会被静默吞掉。
- 对于内容安全/上传结果，`DataPages.tsx` 已提供 `SECURITY_PENDING`、只读版本视图、上传追加完成等提示文案，与后端会话状态和诊断码字段保持一致。
- E2E `local-dataset-upload.spec.ts` 已覆盖 `DATASET_UPLOAD_SECURITY_BLOCKED / SECURITY_BLOCKED` 反馈链路，说明高风险内容的错误提示链路与后端返回约定一致。

## 发现问题

- 无阻塞问题。

## 结论 Verdict

**PASS**

