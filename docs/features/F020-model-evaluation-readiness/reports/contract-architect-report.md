# Feature Contract: 模型评估结果与发布门禁

## Contract Metadata
- Version: v1
- Status: frozen
- Owner: contract-architect
- Created: 2026-06-04
- Updated: 2026-06-05
- Feature: F020-model-evaluation-readiness

## 1. Requirement Summary
- 用户目标：模型版本发布 Production 前必须有正式 `PASSED` 评估事实源。
- 业务价值：落实 `MDL-006`，并把 F019 imported proof seam 收敛为 F020 imported evaluation run。
- 业务资料：`docs/business/bizdocs/02-02-业务流程-模型开发与训练.md`、`docs/business/bizdocs/03-02-系统功能-模型开发.md`、`docs/business/rules/02-模型开发规则.md`
- 原型页面：`docs/prototype/SMP工业AI平台-原型v2.html` page key `eval`

## 2. API Contract
所有接口使用 `/api/v1`、Bearer Token、统一 `ApiResponse<T>` envelope 与平台 traceId。

### 2.1 List Evaluation Runs
- Method: `GET`
- Path: `/api/v1/model-evaluations`
- Permission: `model:evaluation:read`
- Query: `keyword?`, `modelId?`, `versionId?`, `status?`, `page=1`, `pageSize=20`
- Audit Event: 无（列表不逐条审计）
- Response `data`: `PageResponse<ModelEvaluationRunResponse>`

### 2.2 Create Evaluation Run
- Method: `POST`
- Path: `/api/v1/model-evaluations`
- Permission: `model:evaluation:write`
- Audit Event: `MODEL_EVALUATION_CREATED`
- Request:
```json
{
  "modelId": "MODEL-...",
  "versionId": "MVER-...",
  "datasetVersionId": "DVER-...",
  "taskType": "OBJECT_DETECTION",
  "metricConfig": { "primaryMetric": "mAP50" },
  "thresholdConfig": { "mAP50": 0.85 },
  "executorType": "IMPORTED",
  "notes": "外部实验报告导入"
}
```
- Response: `ModelEvaluationRunResponse`，初始 `status=READY`。

### 2.3 Get Evaluation Run Detail
- Method: `GET`
- Path: `/api/v1/model-evaluations/{evaluationRunId}`
- Permission: `model:evaluation:read`
- Audit Event: `MODEL_EVALUATION_REPORT_VIEWED`
- Response: `ModelEvaluationDetailResponse`，包含 run、metrics、artifacts、reportSummary。

### 2.4 Import Evaluation Results
- Method: `POST`
- Path: `/api/v1/model-evaluations/{evaluationRunId}/results:import`
- Permission: `model:evaluation:import`
- Audit Events: `MODEL_EVALUATION_RESULT_IMPORTED` and `MODEL_EVALUATION_PASSED` / `MODEL_EVALUATION_FAILED`
- Request:
```json
{
  "metricResults": { "mAP50": 0.91, "latencyMs": 18 },
  "reportSummary": "验证集 31200 条样本，mAP50 达标",
  "curveData": { "pr": [[0.0, 1.0], [1.0, 0.88]] },
  "confusionMatrix": { "labels": ["OK", "NG"], "matrix": [[98, 2], [4, 96]] },
  "errorCases": [{ "sampleId": "IMG-001", "reason": "反光误检" }],
  "artifacts": [{ "artifactType": "REPORT", "fileObjectId": "FILE-...", "name": "report.json" }],
  "externalRunId": "EXT-EVAL-001"
}
```
- Response: `ModelEvaluationDetailResponse`，按阈值写入 `PASSED` 或 `FAILED`。

### 2.5 Version Evaluations
- Method: `GET`
- Path: `/api/v1/models/{modelId}/versions/{versionId}/evaluations`
- Permission: `model:evaluation:read`
- Response: `List<ModelEvaluationRunResponse>`

### 2.6 Compare Version Evaluations
- Method: `GET`
- Path: `/api/v1/models/{modelId}/versions:compare-evaluations?versionIds=MVER-1,MVER-2`
- Permission: `model:evaluation:read`
- Audit Event: `MODEL_EVALUATION_COMPARE_VIEWED`
- Response: `ModelEvaluationCompareResponse`

### 2.7 Artifact Download URL
- Method: `GET`
- Path: `/api/v1/model-evaluations/{evaluationRunId}/artifacts/{artifactId}/download-url`
- Permission: `model:evaluation:download`
- Audit Event: `MODEL_EVALUATION_ARTIFACT_DOWNLOADED`
- Response: `{ "artifactId": "...", "downloadUrl": "/api/v1/platform/files/{fileId}/content", "expiresInSeconds": 600, "diagnostic": "AUTHENTICATED_CONTENT_ENDPOINT_READY" }`

## 3. Domain / State / Rules
- Domain objects: `Model`, `ModelVersion`, `EvaluationRun`, `EvaluationMetric`, `EvaluationReportArtifact`, `DatasetVersion`, `PlatformFileObject`, `PlatformAuditEvent`。
- State transitions: `READY -> PASSED|FAILED|CANCELLED`；`RUNNING -> PASSED|FAILED|CANCELLED`；终态不可再次导入结果。
- MUST rules:
  - `MDL-006`: Production 发布必须存在同一 `modelId/versionId` 的 `PASSED` evaluation run。
  - `MDL-009`: 模型版本状态机仍由 F019 控制；F020 不直接改写版本状态机，只提供门禁事实。
  - 评估任务必须绑定已发布 `dataset_version`。
  - `thresholdConfig` 中的必需指标必须出现在 `metricResults` 中。
  - 跨 BU 不可泄露不可见模型版本、评估报告或 artifact。

## 4. SQL Contract
- `model_evaluation_run(evaluation_run_id, model_id, version_id, dataset_id, dataset_version_id, task_type, status, metric_config_json, threshold_config_json, result_summary_json, report_summary, curve_data_json, confusion_matrix_json, error_cases_json, executor_type, external_run_id, owner_user_id, owner_org_id, tenant_id, created_at, updated_at, completed_at)`
- `model_evaluation_metric(metric_id, evaluation_run_id, metric_name, metric_value, threshold_value, passed, category, created_at)`
- `model_evaluation_report_artifact(artifact_id, evaluation_run_id, artifact_type, file_object_id, name, download_policy, created_at)`
- Required indexes: `(model_id, version_id, status)`, `(tenant_id, owner_org_id, status)`, metric `(evaluation_run_id, metric_name)`。

## 5. Errors
| HTTP | Business Code | Scenario | Rule |
|---|---:|---|---|
| 400 | 40000 | 参数格式错误 / 非法阈值 | API 规范 |
| 403 | 40304 | 无模型/评估访问权限 | 跨 BU 不泄露 |
| 404 | 40400 | 模型、版本、评估或 artifact 不存在 | API 规范 |
| 409 | 40952 | 终态评估重复导入 | 状态机 |
| 422 | 42252 | 未发布/不可访问数据集版本 | 数据集规则 |
| 422 | 42253 | 导入结果缺少必需指标 | 评估规则 |
| 422 | 42254 | Production 发布缺少 PASSED 评估 | MDL-006 |

## 6. Compatibility
- Backward compatibility: 保留 F019 `evaluation_status` 字段用于摘要展示，但 Production 门禁改用 F020 `PASSED` run。
- Versioning: v1 不接入真实执行器；后续 executor 接入必须保持上述导入与查询 API 兼容。
