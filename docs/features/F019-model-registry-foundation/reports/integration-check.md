# Integration Check Report

## Summary
- Feature: F019-model-registry-foundation
- Date: 2026-06-03
- Status: PASS

## Verdict
PASS

## Scope
- 检查对象：`.codex/worktrees/feature-model-registry-foundation`
- 重点项：`ModelVersionResponse` 契约字段、scope 可见性升级审批规则、访问申请入口的 authenticated user 口径、模型选择器可用版本过滤

## API Endpoint: GET /api/v1/models/{modelId}/versions/{versionId}

### Request Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path | /api/v1/models/{modelId}/versions/{versionId} | `ModelRegistryController` 声明一致 | ✅ |
| Method | GET | `@GetMapping` | ✅ |
| Permission | `model:model:read` | 由 `requireViewableModel()` + `canView()` 约束 | ✅ |

### Response Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| permissionSummary | 包含 | `ModelVersionResponse.permissionSummary` 已存在 | ✅ |
| downloadAvailable | 包含 | `ModelVersionResponse.downloadAvailable` 已存在 | ✅ |
| transitionActions | 包含 | `ModelVersionResponse.transitionActions` 已存在 | ✅ |
| 前端消费 | 与契约一致 | `ModelRegistryPage.tsx` 读取上述字段并渲染 | ✅ |

## API Endpoint: PATCH /api/v1/models/{modelId}

### Request Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path | /api/v1/models/{modelId} | `@PatchMapping("/models/{modelId}")` | ✅ |
| Scope change reason | 跨 BU 可见升级需审批 | `ModelUpdateRequest.scopeChangeReason` 存在 | ✅ |

### Response Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| PRIVATE -> BU | 同 BU 内共享，直接更新 | `requiresScopeApproval()` 不拦截 BU，返回更新后的 `scope=BU` | ✅ |
| PRIVATE -> PLATFORM | 触发跨 BU 可见升级审批 seam | `requiresScopeApproval()` 仅在 requestedScope 为 `PLATFORM` 且当前非 `PLATFORM` 时触发，返回 `42241` 并记录 `MODEL_SCOPE_CHANGE_REQUESTED` | ✅ |
| BU -> PLATFORM | 触发跨 BU 可见升级审批 seam | 同上，返回 `42241` 并记录 `MODEL_SCOPE_CHANGE_REQUESTED` | ✅ |
| PLATFORM -> 其他 | 降级为更小范围，直接更新 | 不触发跨 BU 可见升级审批 | ✅ |

## API Endpoint: POST /api/v1/models/{modelId}/access-requests

### Request Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| Path | /api/v1/models/{modelId}/access-requests | `@PostMapping("/models/{modelId}/access-requests")` | ✅ |
| Method | POST | POST | ✅ |
| Auth scope | authenticated user | Controller 通过 `identityService.requirePrincipal(authorization)` 仅要求已认证主体 | ✅ |
| Request schema | versionId/permission/reason/expiresAt | `ModelAccessRequestCreateRequest` 与契约一致 | ✅ |

### Response Check
| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| status | PENDING | `requestAccess()` 持久化并返回 `PENDING` | ✅ |
| audit | MODEL_ACCESS_REQUESTED | `recordAudit(..., "MODEL_ACCESS_REQUESTED", ...)` | ✅ |
| duplicate approve/reject | 非 PENDING 请求返回冲突 | `approveAccessRequest()` / `rejectAccessRequest()` 增加 `PENDING` 前置校验，重复处理返回 `40900` | ✅ |

## Frontend: ModelSelector

| Item | Expected | Actual | Status |
|------|----------|--------|--------|
| 训练可用模型 | 只展示当前用户可训练且存在当前版本的非废弃模型 | `ModelSelector` 同时过滤 `currentVersionId/currentVersionNo`、`currentVersionStatus !== DEPRECATED` 与 `canUseForTraining` | ✅ |
| 无当前版本模型 | 不应进入训练模型选择下拉 | 前端单测加入 `canUseForTraining=true` 但 `currentVersion*=null` 的模型并断言不展示 | ✅ |

## Verification
| Command | Result |
|---------|--------|
| `mvn -pl smp-app -Dtest=ModelRegistryControllerTest test` | 通过，`BUILD SUCCESS` |
| `npm --prefix frontend run test:ci -- ModelRegistry` | 通过，`1 file passed, 5 tests passed` |

## Evidence
- `backend/smp-app/src/main/java/com/yf/smp/app/platform/ModelRegistryDtos.java`：`ModelVersionResponse` 已包含 `permissionSummary`、`downloadAvailable`、`transitionActions`
- `backend/smp-app/src/main/java/com/yf/smp/app/platform/ModelRegistryService.java`：`enrichVersion()` 填充上述字段；`requiresScopeApproval()` 仅对 `PLATFORM` 跨 BU 可见升级触发审批；访问申请审批/拒绝要求请求状态为 `PENDING`
- `backend/smp-app/src/test/java/com/yf/smp/app/platform/ModelRegistryControllerTest.java`：覆盖版本详情字段、PRIVATE -> BU 直接更新、BU -> PLATFORM 审批、访问申请与重复审批冲突
- `frontend/src/features/platform/platformApi.ts`：`ModelVersion` 类型同步声明 `permissionSummary`、`downloadAvailable`、`transitionActions`
- `frontend/src/features/model-registry/ModelRegistryPage.tsx`：版本详情与动作区已消费上述字段；`ModelSelector` 过滤无当前版本和废弃当前版本的模型
- `frontend/src/features/model-registry/ModelRegistryPage.test.tsx`：前端单测覆盖版本详情、下载可用性、访问申请交互、模型选择器过滤

## Issues Found
- 无

## Recommendations
- 后续若扩展模型版本状态流转、下载鉴权或 scope 审批规则，优先同步更新 `contract.md`、`ModelRegistryDtos`、前端 `platformApi.ts` 和 `ModelRegistryPage.tsx`，避免契约漂移。
