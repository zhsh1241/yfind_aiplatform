> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-dataset-annotation-task-export.md`

# RALPLAN Test Spec: 数据集发起标注任务与训练格式导出

## 1. Test Strategy

目标验证 F014 不重做标注系统，而是在 F009/F012/F013 基础上补齐：数据集入口创建一对多标注任务、完成后多训练格式导出、FileObject 下载、权限审计与诊断。

测试分层：

- Unit: format registry、formatter、gating predicate、DTO mapper。
- Backend integration: API、DB、权限、审计、FileObject、dataset relation。
- Frontend component/unit: dataset detail tab、导出弹窗、下载诊断。
- E2E: 用户从数据集详情创建任务、完成后导出下载的 happy path 和失败路径。
- Scaffold gates: feature artifacts、frontend/backend build/test、AI scaffold gate。

## 2. P0 Acceptance Tests

### T-P0-01 数据集详情可发起标注任务

- Given 用户具备 `data:annotation:write` 且数据集 `DATASET-WELD-DEFECT` 为 ACTIVE/IMAGE
- When 在数据集详情点击“创建标注任务”
- Then 新建任务表单预填数据集 ID、版本 ID、名称、样本数
- And 提交后创建 `annotation_task`，source dataset/version 与数据集详情一致
- And 审计 `ANNOTATION_TASK_CREATED_FROM_DATASET` 写入

### T-P0-02 同一数据集可创建多个标注任务

- Given 同一 ACTIVE 图片数据集版本
- When 以不同 template/scene/sampleScope 创建两个任务
- Then 两个任务均创建成功且 taskId 不同
- And 数据集详情“标注任务/导出”Tab 显示两个任务
- And 每个任务输出/导出状态独立

### T-P0-03 非 ACTIVE 或非图片数据集被拒绝

- Given 数据集状态为 DRAFT/ARCHIVED 或 dataType=AUDIO_VIDEO
- When 通过 UI 或 API 创建标注任务
- Then API 返回业务错误 `DATASET_NOT_ACTIVE` 或 `ANNOTATION_DATASET_TYPE_UNSUPPORTED`
- And 不创建 task
- And 前端显示诊断

### T-P0-04 未完成任务不能正式导出训练格式

- Given annotation task 状态为 IN_PROGRESS 或 PENDING_REVIEW
- When 请求 `POST /api/v1/annotation/tasks/{taskId}/exports` format=COCO_DETECTION
- Then 返回 `ANNOTATION_EXPORT_NOT_READY`
- And 不创建 AVAILABLE 文件对象
- And 失败/拒绝审计可查

### T-P0-05 完成且质检通过任务可生成 SMP_JSONL

- Given task COMPLETED，存在 `annotation_artifact_file_id`，质量检查 PASSED
- When 请求 format=SMP_JSONL
- Then 创建 export record 状态 AVAILABLE
- And 创建 `platform_file_object`，绑定 fileId
- And diagnosticCode=`ANNOTATION_EXPORT_READY`
- And 审计 `ANNOTATION_EXPORT_GENERATED`

### T-P0-06 COCO/YOLO 格式适用性校验

- Given scene=IMAGE_TAGGING 且 annotation_json 含 box/label
- When 请求 COCO_DETECTION 或 YOLO_DETECTION
- Then formatter 输出包含类别、图片、框信息的 schema-compliant 包摘要/fixture
- Given scene=IMAGE_SEGMENTATION
- When 请求 YOLO_DETECTION
- Then 若不支持返回 `ANNOTATION_EXPORT_FORMAT_INCOMPATIBLE`，不得生成假文件

### T-P0-07 下载复用 FileObject download-url

- Given export 状态 AVAILABLE 且 fileId 存在
- When 前端点击“下载”
- Then 调用 `/api/v1/platform/files/{fileId}/download-url`
- And 有 URL 时打开下载
- And 无 URL 时显示 `TODO_CONFIRM_*` 诊断
- And 不直接暴露 objectKey 作为下载地址

### T-P0-08 权限与租户隔离

- Given 用户无 `data:annotation:read/export/download` 或跨 BU 无授权
- When 查询同源任务、创建导出或下载
- Then 返回 403/404（按规则不暴露资源存在性）
- And 写 `ANNOTATION_EXPORT_UNAUTHORIZED` 或 `ANNOTATION_EXPORT_CROSS_TENANT_DENIED`

### T-P0-09 导出失败保留诊断

- Given formatter 抛出 schema error 或对象存储未配置
- When 请求导出
- Then export record status=FAILED
- And diagnosticCode 区分 `ANNOTATION_EXPORT_SCHEMA_FAILED` / `ANNOTATION_EXPORT_STORAGE_UNCONFIGURED`
- And 前端展示失败原因
- And 审计 `ANNOTATION_EXPORT_FAILED`

## 3. P1 / Extended Tests

- T-P1-01: `LABEL_STUDIO_JSON` 导出复用 F013 导入结果，未导入时返回 `RESULT_NOT_READY`。
- T-P1-02: `VOC_DETECTION` 对图片打标任务生成 Pascal VOC XML fixture；`SEGMENTATION_MASK_MANIFEST` 对图片分割任务生成 mask manifest fixture，包内包含图片副本；PNG mask palette/类别编码未固化时在 metadata 中输出诊断。
- T-P1-03: 导出 options（类别过滤、train/val split、是否包含图片清单）被保存到 `options_json` 并影响输出摘要。
- T-P1-04: 已过期导出返回 EXPIRED，不允许下载，提示重新生成。
- T-P1-05: 重复请求相同 task+format+options 可复用 AVAILABLE 产物或生成新版本，行为需明确并测试。

## 4. Unit Test Matrix

| Component | Cases |
| --- | --- |
| `AnnotationExportEligibility` | completed/pass/file exists; incomplete; quality failed; missing artifact; cross tenant |
| `AnnotationExportFormatRegistry` | supported formats by scene; unsupported; TODO formats hidden/diagnostic |
| `SmpJsonlFormatter` | box results, segmentation results, empty annotations, invalid JSON |
| `CocoFormatter` | category mapping, bbox conversion, missing image size fallback diagnostic |
| `YoloFormatter` | normalized xywh conversion, invalid image dimension diagnostic |
| `AnnotationExportService` | record lifecycle, FileObject creation, audit success/failure |

## 5. Backend Integration Tests

- `POST /api/v1/datasets/{datasetId}/annotation-tasks` creates task with pinned version.
- `GET /api/v1/datasets/{datasetId}/annotation-tasks` returns only tenant-visible tasks.
- `POST /api/v1/annotation/tasks/{taskId}/exports` enforces permissions and gating.
- `GET /api/v1/annotation/tasks/{taskId}/exports` lists export records.
- `GET /api/v1/annotation/exports/{exportId}/download-url` or platform file download URL path works via existing seam.
- Flyway migration validates new table/index/permissions.

## 6. Frontend / E2E Tests

Suggested file: `frontend/e2e/dataset-annotation-task-export.spec.ts`.

Scenarios:

1. 数据集详情展示“标注任务/训练导出”Tab。
2. 从数据集详情创建标注任务，表单预填源数据集。
3. 同一数据集创建第二个任务后列表显示两个任务。
4. 未完成任务点击导出显示 not ready 诊断。
5. 完成任务选择 `SMP_JSONL` 导出后显示 AVAILABLE 和下载按钮。
6. 下载 URL 未配置时显示“文件下载未配置：TODO_CONFIRM_*”；当前生产基线按 Docker MinIO/`smp-datasets` 配置时应返回平台 download-url seam 状态。
7. 权限不足用户看不到创建/导出按钮或收到 403 提示。

## 7. Static / Gate Verification

规划阶段：

```powershell
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F014-dataset-annotation-task-export --stage deep-interview
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F014-dataset-annotation-task-export --stage ralplan
node tools/ai-scaffold/dist/cli.js check-feature-artifacts docs/features/F014-dataset-annotation-task-export
```

后续 build-feature 阶段至少：

```powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F014-dataset-annotation-task-export
mvn -q -f backend/pom.xml -pl smp-app test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
npm --prefix frontend run e2e -- dataset-annotation-task-export.spec.ts
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F014-dataset-annotation-task-export --run-e2e
```

## 8. Exit Criteria

- 所有 AC 均映射到 TASK/test-plan（build-feature 阶段）。
- 关键失败路径（非 ACTIVE、非图片、未完成、格式不兼容、下载未配置、跨租户）均有自动化证据。
- 无明文对象存储 URL/token 泄露。
- `plan.md` 人审批准前不得写业务实现代码。
