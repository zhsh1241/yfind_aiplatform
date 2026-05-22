# Integration Check Report

## Summary
- Feature: F015 本地图片上传创建数据集
- Date: 2026-05-22
- Verdict: PASS
- 检查范围：`docs/features/F015-local-dataset-upload/contract.md`、`backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementController.java`、`backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java`、`backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java`、`frontend/src/features/platform/platformApi.ts`、`frontend/src/features/data/DataPages.tsx`、`frontend/src/features/foundation/apiClient.ts`、`frontend/e2e/local-dataset-upload.spec.ts`、`frontend/e2e/helpers.ts`。

## 总体结论
- F015 的本地上传主链路已经打通：后端提供 `create / files / query / commit` 四个接口，前端 `platformApi` 已对接，E2E 也覆盖了无可用数据源入口、本地上传提交后跳转详情页继续发起标注任务、旧路径数据源导入回归，以及高风险内容提交后进入安全待处理并阻断标注入口。
- 后端 F015 相关集成测试已通过：`mvn -q -f backend/pom.xml -pl smp-app -Dtest=DataManagementControllerTest test` 结果为 `18 tests, 0 failures`。
- 前端 F015 E2E 已通过：`npm --prefix frontend run e2e -- local-dataset-upload.spec.ts` 结果为 `4 passed`。
- 代码层面，阶段进度映射已补齐 `VALIDATING_FILES / INDEXING_METADATA / CREATING_VERSION`，`41300` 超限响应也已在 `GlobalExceptionHandler` 中对外可观测。
- 因此本次联调检查结论为 **PASS**，可以关闭 F015 integration-check。

## API Endpoint: /api/v1/dataset-upload-sessions

### Request / Endpoint Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path | `/api/v1/dataset-upload-sessions` | `DataManagementController` 已实现 `@PostMapping("/dataset-upload-sessions")` | ✅ |
| Method | POST | POST | ✅ |
| Auth / Permission | Bearer + `data:dataset:write` | `PlatformResponses` 统一 envelope；`DataManagementService` 明确 `identityService.requirePermission(..., "data:dataset:write")` | ✅ |
| Request schema | `name / tenantId / datasetType=RAW / dataType=IMAGE / accessLevel / tags / description / creationMode=LOCAL_UPLOAD` | `platformApi.createDatasetUploadSession(...)` 与后端 `DatasetUploadSessionCreateRequest(...)` 对齐 | ✅ |

### Response Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Response envelope | `ApiResponse<T>` with `code/message/data/traceId/timestamp` | `ApiResponse.success(...)` + `TraceIdFilter` 返回 `X-Trace-Id`，与前端 `ApiResponse` 定义一致 | ✅ |
| `status` | `PENDING_UPLOAD` | 后端创建后写入 `dataset_upload_session.status='PENDING_UPLOAD'` | ✅ |
| `creationMode` | `LOCAL_UPLOAD` | 后端强制为 `LOCAL_UPLOAD` | ✅ |
| `datasetId/versionId` | contract 示例为 `null` | 后端创建时保持 `null`，仅在 commit 时生成并回填 | ✅ |

### Error Handling Check
| Scenario | Expected Code | Actual Code | Status |
|----------|---------------|-------------|--------|
| 非 `LOCAL_UPLOAD` | `42200` | `42200`，`DATASET_UPLOAD_CREATION_MODE_INVALID` | ✅ |
| 非 `RAW` / 非 `IMAGE` | `42200` | `42200`，`DATASET_UPLOAD_DATASET_TYPE_INVALID` / `DATASET_UPLOAD_DATA_TYPE_INVALID` | ✅ |
| 权限不足 | `40300` | `40300` | ✅ |

## API Endpoint: /api/v1/dataset-upload-sessions/{sessionId}/files

### Request Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path | `/api/v1/dataset-upload-sessions/{sessionId}/files` | 后端 `@PostMapping(..., consumes = MULTIPART_FORM_DATA_VALUE)` | ✅ |
| Method | POST | POST | ✅ |
| Content-Type | `multipart/form-data` | 前端 `FormData.append('files', file)` 并显式设置 `multipart/form-data` | ✅ |
| Payload | 支持多图片 / zip | 后端 `processUploadPart` 支持普通文件与 zip 分发 | ✅ |

### Response / Behavior Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Accepted file status | `ACCEPTED` / `UPLOADED` | 后端落库状态为 `UPLOADED`，contract 已允许两者并存 | ✅ |
| Rejected file status | `REJECTED` | 后端对不支持格式写入 `REJECTED` | ✅ |
| 文件对象事实源 | `platform_file_object` | 后端为合格图片生成 `platform_file_object` | ✅ |
| 上传限额错误码 | contract 预留 `41300` | `GlobalExceptionHandler` 对 `MaxUploadSizeExceededException` 返回 `41300`，F015 超限断言已通过 | ✅ |

## API Endpoint: /api/v1/dataset-upload-sessions/{sessionId}

### Response Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path / Method | GET | GET | ✅ |
| Session summary | `totalFiles / acceptedFiles / rejectedFiles` | `uploadSessionResponse(...)` 计算并返回 | ✅ |
| `progress.phase` | contract 要求可表达 `PENDING_UPLOAD / VALIDATING_FILES / UPLOADING_FILES / SECURITY_SCAN / INDEXING_METADATA / CREATING_VERSION / READY / FAILED / SECURITY_PENDING` | 当前实现已在 `uploadSessionPhase(...)` / `uploadSessionPercent(...)` 中补齐 `VALIDATING_FILES / INDEXING_METADATA / CREATING_VERSION` 映射，并由 `diagnosticMessage` 触发 | ✅ |
| `diagnosticCode` / `diagnosticMessage` | 应与流程一致 | 后端返回 `OK / SESSION_PROCESSING / UPLOAD_SUMMARY_UPDATED / DATASET_UPLOAD_READY / SECURITY_PENDING` 等，语义一致 | ✅ |

## API Endpoint: /api/v1/dataset-upload-sessions/{sessionId}/commit

### Request / Response Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path / Method | POST | POST | ✅ |
| Request body | `{ publishRequested: false }` | `platformApi.commitDatasetUploadSession(..., { publishRequested: false })` 与后端 `DatasetUploadSessionCommitRequest(Boolean)` 对齐 | ✅ |
| 成功状态 | `READY` | 后端未受阻时返回 `READY` | ✅ |
| 数据集状态 | `ACTIVE` | 后端写入 `dataset.status='ACTIVE'` | ✅ |
| 版本状态 | `READY` | 后端写入 `dataset_version.status='READY'` | ✅ |
| 内容安全阻断 | `SECURITY_PENDING` | 后端可在高风险文件时进入 `SECURITY_PENDING` | ✅ |

### Error Handling Check
| Scenario | Expected Code | Actual Code | Status |
|----------|---------------|-------------|--------|
| 空会话提交 | `42200` | `42200`，`DATASET_UPLOAD_EMPTY_SESSION` | ✅ |
| 重复提交 / 状态冲突 | `40900` | `40900`，`DATASET_UPLOAD_DUPLICATE_COMMIT` / `DATASET_UPLOAD_SESSION_STATE_INVALID` | ✅ |
| 高风险内容 | `42200` / `SECURITY_PENDING` | 后端按文件名命中风险词时进入 `SECURITY_PENDING` 并记录 `DATASET_SECURITY_BLOCKED` 审计 | ✅ |

## Frontend / E2E 一致性检查
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| API seam | 前端要直连 F015 session 四接口 | `frontend/src/features/platform/platformApi.ts` 已提供 `createDatasetUploadSession / uploadDatasetSessionFiles / datasetUploadSession / commitDatasetUploadSession` | ✅ |
| Auth / Trace | Bearer + `X-Trace-Id` | `platformApi.ts` 注入 `Authorization: Bearer ...`；`foundation/apiClient.ts` 注入 `X-Trace-Id` | ✅ |
| 页面入口 | 无可用数据源时展示本地上传入口 | `DataPages.tsx` 显示“当前无可用数据源 / 直接上传图片 / 本地上传图片” | ✅ |
| E2E 覆盖 | 至少覆盖上传会话创建、上传、提交、详情跳转之一 | `frontend/e2e/local-dataset-upload.spec.ts` 已覆盖无可用数据源入口、本地上传提交后跳转详情页继续发起标注任务、旧路径数据源导入回归，以及高风险内容提交后安全待处理 | ✅ |

## Issues Found
| ID | Severity | Description | Location |
|----|----------|-------------|----------|
| 无 | - | F015 本次复核未发现阻塞项。 | - |

## Recommendations
- 保留当前 F015 E2E 作为后续回归基线，防止本地上传入口、上传提交、详情页联动与高风险阻断语义回退。

## Verification Evidence
- 后端测试：`mvn -q -f backend/pom.xml -pl smp-app -Dtest=DataManagementControllerTest test` → `tests="18" failures="0" errors="0"`，F015 相关用例全部通过
- 前端 E2E：`npm --prefix frontend run e2e -- local-dataset-upload.spec.ts` → `4 passed`
- 关键实现入口：
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementController.java:28-31`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java:239-329, 433-475, 514-572`
  - `frontend/src/features/platform/platformApi.ts:595-660`
  - `frontend/src/features/foundation/apiClient.ts:18-19`
  - `frontend/src/features/data/DataPages.tsx:1013-1023, 1043-1072`
  - `frontend/e2e/local-dataset-upload.spec.ts:4-139`
