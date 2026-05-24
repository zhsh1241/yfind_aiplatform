# Integration Check Report

## Summary
- Feature: F015 本地图片上传创建数据集
- Date: 2026-05-22
- Verdict: PARTIAL
- 检查范围：`docs/features/F015-local-dataset-upload/contract.md`、`backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementController.java`、`backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java`、`backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java`、`frontend/src/features/platform/platformApi.ts`、`frontend/src/features/data/DataPages.tsx`、`frontend/src/features/foundation/apiClient.ts`、`frontend/e2e/local-dataset-upload.spec.ts`、`frontend/e2e/helpers.ts`。

## 总体结论
- F015 的本地上传会话主链路已经实现：后端提供 `create / files / query / commit` 四个接口，前端 `platformApi` 已对接，E2E 也已覆盖“无可用数据源时展示本地上传入口”。
- 后端集成测试已通过，说明当前实现可以完成本地会话创建、文件上传、查询、提交与跨租户/非法上传等关键路径。
- 但 contract 与实现仍存在几处明确不一致：会话创建响应的 `datasetId/versionId` 是否为空、上传限额错误码 41300 是否真正落地、以及阶段进度枚举是否完整覆盖 contract 要求。
- 因此本次联调检查结论为 **PARTIAL**，不建议直接按 PASS 关闭。

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
| `datasetId/versionId` | contract 示例为 `null` | 后端创建时已预生成 `datasetId` 与 `versionId` 并返回非空 | ❌ |

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
| 上传限额错误码 | contract 预留 `41300` | 后端当前对超限文件仅写入拒绝记录并继续返回 200；未看到对外 `41300` 响应 | ❌ |

## API Endpoint: /api/v1/dataset-upload-sessions/{sessionId}

### Response Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path / Method | GET | GET | ✅ |
| Session summary | `totalFiles / acceptedFiles / rejectedFiles` | `uploadSessionResponse(...)` 计算并返回 | ✅ |
| `progress.phase` | contract 要求可表达 `PENDING_UPLOAD / VALIDATING_FILES / UPLOADING_FILES / SECURITY_SCAN / INDEXING_METADATA / CREATING_VERSION / READY / FAILED / SECURITY_PENDING` | 后端当前只会返回 `PENDING_UPLOAD / UPLOADING_FILES / SECURITY_SCAN / READY / SECURITY_PENDING / FAILED / CANCELLED`，未见 `VALIDATING_FILES / INDEXING_METADATA / CREATING_VERSION` | ❌ |
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
| E2E 覆盖 | 至少覆盖上传会话创建、上传、提交、详情跳转之一 | 当前 `frontend/e2e/local-dataset-upload.spec.ts` 只验证“无可用数据源时展示本地上传入口”，未覆盖上传/提交链路 | ❌ |

## Issues Found
| ID | Severity | Description | Location |
|----|----------|-------------|----------|
| 1 | HIGH | `POST /api/v1/dataset-upload-sessions` 的响应语义与 contract 示例不一致：contract 示例中 `datasetId/versionId` 为 `null`，而后端创建时已预生成并返回非空值。 | `docs/features/F015-local-dataset-upload/contract.md` 2.4；`backend/.../DataManagementService.java:217-233` |
| 2 | MEDIUM | contract 预留的上传限额错误码 `41300` 未在当前实现中对外体现；超限文件目前仅被逐个拒绝并继续返回 200，没有看到对应 413 响应。 | `docs/features/F015-local-dataset-upload/contract.md` 4；`backend/.../DataManagementService.java:440` |
| 3 | MEDIUM | contract 要求前端阶段进度至少能表达 `VALIDATING_FILES / INDEXING_METADATA / CREATING_VERSION`，但后端进度枚举未产出这些阶段，前端也只是透传后端值。 | `docs/features/F015-local-dataset-upload/contract.md` 2.9；`backend/.../DataManagementService.java:491-514`；`frontend/.../DataPages.tsx` |
| 4 | MEDIUM | 当前 E2E 仅覆盖“无可用数据源时展示本地上传入口”，未覆盖本地上传会话创建、上传文件、提交创建数据集的完整联调链路。 | `frontend/e2e/local-dataset-upload.spec.ts`；`frontend/e2e/helpers.ts` |

## Recommendations
- 优先统一 `POST /dataset-upload-sessions` 的响应语义：要么让 contract 示例改为“创建后即返回 datasetId/versionId”，要么让后端按 contract 重新延迟生成/回填。
- 明确上传限额策略：若 F015 仍需对外返回 41300，应在后端把超限从“逐文件拒绝”升级为可观测的 HTTP / business code；若暂缓，则 contract 需收敛为现实现状。
- 补齐阶段进度枚举，至少让后端或前端能够表达 `VALIDATING_FILES / INDEXING_METADATA / CREATING_VERSION`，避免页面与状态机脱节。
- 为 F015 增加端到端 E2E：覆盖创建 session、上传图片/zip、提交、跳转详情与异常分支（空会话、非法格式）。

## Verification Evidence
- 后端测试：`mvn -pl smp-app -Dtest=DataManagementControllerTest test` → `Tests run: 13, Failures: 0, Errors: 0, Skipped: 0`，`BUILD SUCCESS`
- 前端 E2E：`npx playwright test e2e/local-dataset-upload.spec.ts --project=chromium` → `1 passed`
- 关键实现入口：
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementController.java:28-31`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java:217-301, 440, 491-514`
  - `frontend/src/features/platform/platformApi.ts:428-431, 632-643`
  - `frontend/src/features/foundation/apiClient.ts:18-19`
  - `frontend/e2e/local-dataset-upload.spec.ts:4-15`
