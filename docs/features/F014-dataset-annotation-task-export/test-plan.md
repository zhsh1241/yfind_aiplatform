# Test Plan: F014 数据集发起标注任务与训练格式导出

## 1. 覆盖矩阵

| AC | 测试 |
| --- | --- |
| AC-01 | 后端集成：`GET /datasets/{id}/annotation-candidates`；前端 E2E 数据集详情可见创建入口。 |
| AC-02 | 后端集成：同一 dataset/version 创建两个任务；`GET /datasets/{id}/annotation-tasks` 返回全部。 |
| AC-03 | 后端集成：非 ACTIVE、非 IMAGE、跨 BU 拒绝；审计查询。 |
| AC-04 | 后端集成：未完成任务、质量失败、缺少 annotation artifact 导出失败。 |
| AC-05 | 后端集成：完成+发布后 `SMP_JSONL` 生成 `platform_file_object` 与 export 记录。 |
| AC-06 | 后端集成：COCO/YOLO/VOC/Label Studio/Mask 场景校验；响应声明 `packageIncludesImages=true`。 |
| AC-07 | 后端集成：>200 MB 记录 `asyncRequired=true`/`GENERATING`；`expiresAt≈3个月`。 |
| AC-08 | 后端/前端：download-url seam；无 URL 显示 TODO 诊断。 |
| AC-09 | 后端集成：导出请求/生成/失败/下载/未授权/跨租户拒绝审计。 |
| AC-10 | Playwright：数据集详情 “标注任务/训练导出” Tab、生成导出、下载诊断。 |

## 2. 后端测试

- 新增/扩展 `DataManagementControllerTest`：`datasetAnnotationTaskExportFlowCreatesMultipleTasksAndTrainingPackages`。
- 验证权限：`MODEL_TRAINER` 可下载数据但需 `data:annotation:export` 才能生成导出；BU_ADMIN 可生成。
- 验证格式：`SMP_JSONL`、`COCO_DETECTION`、`YOLO_DETECTION`、`VOC_DETECTION`、`LABEL_STUDIO_JSON`、`SEGMENTATION_MASK_MANIFEST`。
- 验证负例：未完成任务 -> `ANNOTATION_EXPORT_NOT_READY`；分割请求检测格式 -> `ANNOTATION_EXPORT_FORMAT_INCOMPATIBLE`。

## 3. 前端测试

- 更新 `frontend/e2e/dataset-annotation-task-export.spec.ts`。
- Mock API 覆盖：candidate、dataset annotation tasks、exports、download-url。
- 断言：Tab 文案、200 MB 异步提示、3 个月保留、图片副本、自包含导出包推荐。

## 4. 门禁

```powershell
node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F014-dataset-annotation-task-export
node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F014-dataset-annotation-task-export
mvn -q -f backend/pom.xml -pl smp-app test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F014-dataset-annotation-task-export --run-e2e
```
