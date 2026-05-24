# F014 联调报告

## Verdict
PASS

## 范围
- 后端数据集入口、标注任务、训练格式导出、download-url seam。
- 前端数据集详情“标注任务/训练导出”Tab、创建任务、生成导出、下载诊断。

## 一致性检查
- API 路径与 `contract.md` 一致：`/datasets/{id}/annotation-candidates`、`/datasets/{id}/annotation-tasks`、`/annotation/tasks/{taskId}/exports`、`/annotation/exports/{exportId}/download-url`。
- DTO 字段与前端类型对齐：`packageIncludesImages`、`asyncRequired`、`expiresAt`、`diagnosticCode`、`downloadUrl`。
- 用户确认项已落入实现与 UI 文案：图片副本、200MB 异步、3 个月保留、自包含训练包。

## 验证证据
- `mvn -q -f backend/pom.xml -pl smp-app -Dtest=DataManagementControllerTest#datasetAnnotationTaskExportFlowCreatesMultipleTasksAndTrainingPackages test`：PASS。
- `npm --prefix frontend run e2e -- e2e/dataset-annotation-task-export.spec.ts --project=chromium`：1 passed。

## 风险
- 真实 MinIO TLS/KMS/签名策略仍按部署配置确认；本期仅通过 download-url seam 暴露诊断。
