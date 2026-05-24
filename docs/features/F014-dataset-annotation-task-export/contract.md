---
feature: F014-dataset-annotation-task-export
status: frozen
frozen_at: 2026-05-21
owner: codex
---

# Contract: 数据集发起标注任务与训练格式导出

## 1. API 契约

### 1.1 查询数据集标注候选
`GET /api/v1/datasets/{datasetId}/annotation-candidates`

Response `DatasetAnnotationCandidateResponse`:
- `datasetId`, `datasetName`, `currentVersionId`, `dataType`, `status`
- `eligible: boolean`
- `diagnosticCode`, `diagnosticMessage`
- `templates: AnnotationLabelTemplateResponse[]`
- `supportedFormats: string[]`

诊断码：`OK`、`DATASET_NOT_ACTIVE`、`ANNOTATION_DATASET_TYPE_UNSUPPORTED`、`ANNOTATION_TEMPLATE_REQUIRED`、`ANNOTATION_CROSS_TENANT_DENIED`。

### 1.2 从数据集创建标注任务
`POST /api/v1/datasets/{datasetId}/annotation-tasks`

Body 复用 `AnnotationTaskCreateRequest`，服务端强制覆盖/校验 `sourceDatasetId=path.datasetId`，并固定 `sourceVersionId`。

Response: `AnnotationTaskDetailResponse`。

### 1.3 查询同源标注任务与导出摘要
`GET /api/v1/datasets/{datasetId}/annotation-tasks`

Response `DatasetAnnotationTaskResponse[]`:
- `task: AnnotationTaskSummaryResponse`
- `exports: AnnotationTrainingExportResponse[]`

### 1.4 查询/创建训练格式导出
`GET /api/v1/annotation/tasks/{taskId}/exports`

`POST /api/v1/annotation/tasks/{taskId}/exports`

Body `AnnotationTrainingExportRequest`:
- `format`: `SMP_JSONL` | `LABEL_STUDIO_JSON` | `COCO_DETECTION` | `YOLO_DETECTION` | `VOC_DETECTION` | `SEGMENTATION_MASK_MANIFEST`
- `optionsJson?: string`

Response `AnnotationTrainingExportResponse`:
- `exportId`, `taskId`, `format`, `formatVersion`
- `status`: `REQUESTED` | `GENERATING` | `AVAILABLE` | `FAILED` | `EXPIRED` | `UNSUPPORTED_FORMAT`
- `diagnosticCode`, `diagnosticMessage`
- `fileId`, `downloadUrl`, `expiresAt`
- `sizeBytes`, `asyncRequired`, `packageIncludesImages`

### 1.5 查询/下载导出
`GET /api/v1/annotation/exports/{exportId}`

`GET /api/v1/annotation/exports/{exportId}/download-url`

下载可代理 FileObject download-url，但不得暴露 bucket/objectKey 真实路径；也可返回 `fileId` 由前端调用 `/api/v1/platform/files/{fileId}/download-url`。

## 2. 数据契约

新增表 `annotation_training_export`：见 `sql/V14__dataset_annotation_task_export.sql` 与后端 Flyway。

关键字段：`format`、`status`、`diagnostic_code`、`source_annotation_file_id`、`export_file_id`、`size_bytes`、`async_required`、`package_includes_images`、`expires_at`。

约束：
- `task_id` FK -> `annotation_task`。
- `source_annotation_file_id` / `export_file_id` FK -> `platform_file_object`。
- 导出文件保留 3 个月。
- 超过 200 MB 异步导出。

## 3. 格式契约

- `SMP_JSONL`: 包内 `images/` + `annotations/smp.jsonl` + `metadata.json`。
- `LABEL_STUDIO_JSON`: 包内 `images/` + `annotations/label-studio.json` + `metadata.json`。
- `COCO_DETECTION`: 包内 `images/` + `annotations/instances.json` + `metadata.json`。
- `YOLO_DETECTION`: 包内 `images/` + `labels/*.txt` + `labels/classes.txt` + `metadata.json`。
- `VOC_DETECTION`: 包内 `images/` + `annotations/*.xml` + `metadata.json`。
- `SEGMENTATION_MASK_MANIFEST`: 包内 `images/` + `masks/` + `annotations/mask-manifest.json` + `metadata.json`；PNG palette/像素编码由 `metadata.json` 记录。

所有格式必须包含图片副本；`metadata.json` 必须包含 source dataset/version/task/export/fileId/objectKey/sha256。

## 4. 权限与审计契约

权限：
- 创建任务：`data:annotation:write` + `data:annotation:assign` + 数据集可见。
- 生成导出：`data:annotation:export`。
- 下载导出：`data:dataset:download` + `platform:file:download`。

新增审计事件：
- `ANNOTATION_TASK_CREATED_FROM_DATASET`
- `ANNOTATION_EXPORT_REQUESTED`
- `ANNOTATION_EXPORT_GENERATED`
- `ANNOTATION_EXPORT_FAILED`
- `ANNOTATION_EXPORT_DOWNLOADED`
- `ANNOTATION_EXPORT_UNAUTHORIZED`
- `ANNOTATION_EXPORT_CROSS_TENANT_DENIED`
- `ANNOTATION_EXPORT_EXPIRED`

## 5. 错误契约

- `DATASET_NOT_ACTIVE`
- `ANNOTATION_DATASET_TYPE_UNSUPPORTED`
- `ANNOTATION_EXPORT_NOT_READY`
- `ANNOTATION_QUALITY_CHECK_FAILED`
- `ANNOTATION_ARTIFACT_MISSING`
- `ANNOTATION_EXPORT_FORMAT_INCOMPATIBLE`
- `UNSUPPORTED_FORMAT`
- `TODO_CONFIRM_TRAINING_EXPORT_FORMATS`
- `ANNOTATION_EXPORT_EXPIRED`

## 6. 前端契约

- `DatasetDetailPage` 新增“标注任务/训练导出”Tab。
- 支持从数据集详情创建任务、查看同源任务、选择格式生成导出、获取下载 URL。
- 未配置下载时显示 `文件下载未配置：TODO_CONFIRM_*`。
