# Integration Check Report

## Summary
- Feature: F020-model-evaluation-readiness（模型评估结果与发布门禁）
- Date: 2026-06-05
- Status: PASS
- 检查范围：冻结契约 `contract.md`、`TASK.md`、`test-plan.md`、后端 `ModelEvaluationController` / `ModelEvaluationService` / `ModelRegistryService`、前端 `platformApi` / `ModelEvaluationPage`、目标单测与 E2E。
- 复审结论：此前 I-001~I-006 均已关闭。后端 7 个 F020 冻结契约端点、权限、审计、状态机与 Production 发布门禁已对齐；前端 `/eval` 使用真实 API 路径，已展示评估报告 seam 并支持导入扩展字段；E2E 追溯已移除不实 AC-06 声明并补齐 AC-08 实际断言。

## Verification Evidence
| 类型 | 命令/检查 | 结果 |
|---|---|---|
| 后端目标测试 | `mvn -pl smp-app -Dtest=ModelEvaluationControllerTest test`（在 `backend/`） | PASS：1 tests / 0 failures / 0 errors，覆盖创建、导入、重复导入、发布门禁、对比、跨 BU 与审计 |
| 前端目标单测 | `npm exec vitest run src/features/model-evaluation/ModelEvaluationPage.test.tsx`（在 `frontend/`） | PASS：2 tests / 0 failures，覆盖详情展示、导入扩展字段、artifact 下载与创建评估 |
| 前端目标 E2E | `npm exec playwright test e2e/model-evaluation-readiness.spec.ts`（在 `frontend/`） | PASS：1 passed，覆盖 AC-07/AC-08/AC-09/AC-12 主链路 |
| 静态契约检查 | 对比 `contract.md` 与后端 Controller/Service、前端 `platformApi` / 页面 | PASS：路径、方法、请求/响应字段、错误码与诊断允许值一致 |

> 备注：Playwright 输出 Ant Design `Drawer.width`、`Space.direction`、`Alert.message` deprecated 警告；不影响 F020 契约一致性，非本次阻塞项。

## Prior Issues Closure
| ID | 原问题 | 复审结果 | Status |
|---|---|---|---|
| I-001 | 前端详情未展示 `curveData`、`confusionMatrix`、`errorCases` seam | `EvaluationDetail` 已新增“PR 曲线数据”“混淆矩阵”“错误样例摘要”展示区；Vitest 与 E2E 断言 `IMG-001` 和三个区块可见 | ✅ Closed |
| I-002 | 导入表单不能提交 `curveData`、`confusionMatrix`、`errorCases`、`artifacts` | 导入弹窗已提供四个 JSON 输入框；`importModelEvaluationResults` 调用提交对应字段；Vitest 验证传参 | ✅ Closed |
| I-003 | E2E 声明 AC-08 但未实际触发多版本对比 | E2E 已输入 `MVER-YOLO-001-V2`，触发 compare API，并断言 `v2.0: 0.9400 · best` | ✅ Closed |
| I-004 | E2E 声明 AC-06 但未断言 PASSED 后发布 | E2E 标题已调整为 AC-07/AC-08/AC-09/AC-12；AC-06 由后端集成测试覆盖 `PASSED` 后 `PRODUCTION` 成功 | ✅ Closed |
| I-005 | 契约错误表未列 `42255` artifact 文件不可用 | `contract.md` Errors 已补充 `42255`：评估报告 artifact 文件对象不存在或不可用；实现 `fileObjectById` 返回该码 | ✅ Closed |
| I-006 | Artifact download `diagnostic` 允许值未在契约说明 | `contract.md` 2.7 已列 `PRESIGNED_URL_READY`、`AUTHENTICATED_CONTENT_ENDPOINT_READY`、`TODO_CONFIRM_*;AUTHENTICATED_CONTENT_ENDPOINT_READY`、`ARTIFACT_WITHOUT_FILE_OBJECT`；实现返回值落在允许范围 | ✅ Closed |

## API Endpoint: GET /api/v1/model-evaluations

### Request Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path | `/api/v1/model-evaluations` | `@GetMapping("/model-evaluations")` under `/api/v1`，前端 `apiClient.get('/api/v1/model-evaluations')` | ✅ |
| Method | GET | GET | ✅ |
| Auth | Bearer Token | Controller 读取 `Authorization`，`requirePrincipal`；前端 interceptor 注入 Bearer | ✅ |
| Permission | `model:evaluation:read` | `identityService.requirePermission(..., "model:evaluation:read")` | ✅ |
| Query | `keyword?`, `modelId?`, `versionId?`, `status?`, `page=1`, `pageSize=20` | Controller 参数与前端 `ModelEvaluationListQuery` 对齐，Service 限制 `pageSize <= 100` | ✅ |

### Response / Error Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Response data | `PageResponse<ModelEvaluationRunResponse>` | `PageResponse<>(items,total,page,pageSize)`，前端 `PageResponse<ModelEvaluationRun>` | ✅ |
| Envelope | `ApiResponse<T>` + traceId | `PlatformResponses.ok(...)` | ✅ |
| Invalid status | 400 / 40000 | `normalizedStatus` 抛 40000 | ✅ |
| Cross-BU visibility | 不泄露不可见模型评估 | list SQL visibility 条件过滤，目标测试覆盖 scoped list 只含授权版本 | ✅ |

## API Endpoint: POST /api/v1/model-evaluations

### Request / Response / Error Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path / Method | `POST /api/v1/model-evaluations` | Controller 与前端 `createModelEvaluation` 一致 | ✅ |
| Permission | `model:evaluation:write` | Controller/Service 校验 write，且 `requireModelAction` 校验 scoped action | ✅ |
| Request fields | `modelId`, `versionId`, `datasetVersionId`, `taskType`, `metricConfig`, `thresholdConfig`, `executorType`, `notes` | 后端 DTO、前端类型与创建表单对齐 | ✅ |
| Initial status | `READY` | 插入 `status='READY'`；后端测试断言 | ✅ |
| Dataset rule | 必须绑定已发布、可访问 dataset version | `ensureDatasetAccessible` 校验 `PUBLISHED` 与授权 | ✅ |
| Invalid threshold | 400 / 40000 | `normalizeThresholds`；后端测试覆盖 | ✅ |
| Dataset unavailable | 422 / 42252 | `datasetVersionById` / `ensureDatasetAccessible` | ✅ |
| Audit | `MODEL_EVALUATION_CREATED` | `recordAudit(...MODEL_EVALUATION_CREATED...)` | ✅ |

## API Endpoint: GET /api/v1/model-evaluations/{evaluationRunId}

### Request / Response / Error Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path / Method | `GET /api/v1/model-evaluations/{evaluationRunId}` | Controller 与前端 `modelEvaluationDetail` 一致 | ✅ |
| Permission | `model:evaluation:read` | Controller/Service 校验 read | ✅ |
| Response data | `ModelEvaluationDetailResponse`，含 run、metrics、artifacts、reportSummary、报告 seam | 后端 `detailResponse` 返回 `curveData` / `confusionMatrix` / `errorCases`；前端详情展示三个 seam 区块 | ✅ |
| Audit | `MODEL_EVALUATION_REPORT_VIEWED` | `detail` 记录审计 | ✅ |
| Not found / Cross-BU | 40400 / 40304 | `runById` / `requireViewableModel`；后端测试覆盖 40304 | ✅ |

## API Endpoint: POST /api/v1/model-evaluations/{evaluationRunId}/results:import

### Request / Response / Error Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path / Method | `POST /api/v1/model-evaluations/{evaluationRunId}/results:import` | Controller 与前端 `importModelEvaluationResults` 一致 | ✅ |
| Permission | `model:evaluation:import` | Controller/Service 校验 import + scoped action | ✅ |
| Request fields | `metricResults`, `reportSummary`, `curveData`, `confusionMatrix`, `errorCases`, `artifacts`, `externalRunId` | 后端 DTO 支持全部字段；前端导入表单与类型均支持全部字段 | ✅ |
| Status judgment | 按阈值写入 `PASSED` / `FAILED` | `evaluateStatus` + metric snapshot；后端测试覆盖 PASSED/FAILED | ✅ |
| Required metrics | 缺少 `thresholdConfig` 指标返回 42253 | 后端测试覆盖缺少 `mAP50` 返回 42253 | ✅ |
| Terminal re-import | 409 / 40952 | 后端测试覆盖重复导入返回 40952 | ✅ |
| Artifact unavailable | 422 / 42255 | 契约已列 42255，Service `fileObjectById` 对齐 | ✅ |
| Audit | `MODEL_EVALUATION_RESULT_IMPORTED` + `MODEL_EVALUATION_PASSED/FAILED` | Service 写入两类审计 | ✅ |

## API Endpoint: GET /api/v1/models/{modelId}/versions/{versionId}/evaluations

### Request / Response / Error Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path / Method | `GET /api/v1/models/{modelId}/versions/{versionId}/evaluations` | Controller 与前端 `modelVersionEvaluations` 一致 | ✅ |
| Permission | `model:evaluation:read` | Service 校验 read + `requireViewableModel` | ✅ |
| Response data | `List<ModelEvaluationRunResponse>` | SQL 按同一 `modelId/versionId` 返回，`created_at DESC` 排序 | ✅ |
| Cross-BU | 不可见版本不可读取 | `requireViewableModel` | ✅ |

## API Endpoint: GET /api/v1/models/{modelId}/versions:compare-evaluations

### Request / Response / Error Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path / Method | `GET /api/v1/models/{modelId}/versions:compare-evaluations?versionIds=...` | Controller 与前端 `compareModelEvaluations(modelId, versionIds.join(','))` 一致 | ✅ |
| Permission | `model:evaluation:read` | Service 校验 read + 每个 version 可见性 | ✅ |
| Query | 至少两个 `versionIds` | `parseVersionIds` 后 `<2` 返回 40000；前端仅 `length >= 2` 触发 query | ✅ |
| Response data | `ModelEvaluationCompareResponse` | `modelId`, `versionIds`, `rows`；`markBest` 标记最佳值 | ✅ |
| E2E trace | AC-08 实际断言对比结果 | 目标 E2E 输入第二版本并断言 `best` 标签 | ✅ |
| Audit | `MODEL_EVALUATION_COMPARE_VIEWED` | Service 写入审计 | ✅ |

## API Endpoint: GET /api/v1/model-evaluations/{evaluationRunId}/artifacts/{artifactId}/download-url

### Request / Response / Error Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path / Method | `GET /api/v1/model-evaluations/{evaluationRunId}/artifacts/{artifactId}/download-url` | Controller 与前端 `modelEvaluationArtifactDownloadUrl` 一致 | ✅ |
| Permission | `model:evaluation:download` | Service 校验 download + model 可见性 + artifact 文件可访问性 | ✅ |
| Response data | `artifactId`, `downloadUrl`, `expiresInSeconds=600`, `diagnostic` | 实现返回 600 秒；downloadUrl 可为预签名或 `/api/v1/platform/files/{fileId}/content` seam；diagnostic 在契约允许值内 | ✅ |
| File unavailable | 422 / 42255 | 契约和实现一致 | ✅ |
| Audit | `MODEL_EVALUATION_ARTIFACT_DOWNLOADED` | Service 写入审计；后端/前端测试覆盖下载 URL | ✅ |

## Cross-cutting Checks

### 权限与跨 BU
| Item | Expected | Actual | Status |
|---|---|---|---|
| read/write/import/download | 四类权限均需校验 | V25 写入权限与角色授权；端点逐项校验 | ✅ |
| 跨 BU 不泄露 | 不可见模型版本、评估报告或 artifact 不泄露 | `requireViewableModel` + list SQL visibility；后端测试覆盖 40304 与 scoped list | ✅ |

### 审计
| Event | Expected | Actual | Status |
|---|---|---|---|
| `MODEL_EVALUATION_CREATED` | 创建评估任务 | 已记录 | ✅ |
| `MODEL_EVALUATION_RESULT_IMPORTED` | 导入结果 | 已记录 | ✅ |
| `MODEL_EVALUATION_PASSED/FAILED` | 判定结果 | 已记录 | ✅ |
| `MODEL_EVALUATION_REPORT_VIEWED` | 查看详情 | 已记录 | ✅ |
| `MODEL_EVALUATION_COMPARE_VIEWED` | 多版本对比 | 已记录 | ✅ |
| `MODEL_EVALUATION_ARTIFACT_DOWNLOADED` | artifact 下载 URL | 已记录 | ✅ |
| `MODEL_VERSION_PUBLISH_BLOCKED_EVALUATION_REQUIRED` | 无 PASSED 发布阻断 | `ModelRegistryService` 已记录，后端测试覆盖 42254 | ✅ |
| `MODEL_VERSION_PUBLISH_GATE_PASSED` | PASSED 后发布通过 | `ModelRegistryService` 已记录，后端测试覆盖 PRODUCTION 成功与审计查询 | ✅ |

### 发布门禁
| Item | Expected | Actual | Status |
|---|---|---|---|
| MDL-006 | Production 发布必须存在同 model/version 的 `PASSED` evaluation run | `transitionVersion` 调用 `modelEvaluationService.hasPassedEvaluation`；后端测试覆盖无记录阻断与 PASSED 后通过 | ✅ |
| MDL-009 | F020 不直接改写版本状态机 | 状态流转仍由 `ModelRegistryService` 控制；F020 只更新评估事实与 F019 摘要字段 | ✅ |

## Issues Found
无阻塞项。此前 I-001~I-006 已全部关闭。

## Recommendations
1. 非阻塞：可在后续 UI 清理中处理 Playwright 暴露的 Ant Design deprecated 属性警告（`Drawer.width`、`Space.direction`、`Alert.message`）。
2. 非阻塞：当前报告 seam 使用 JSON 摘要展示，符合“不新增图表依赖”范围；后续真实评估执行器接入后可在新 feature 中升级图表化展示。
