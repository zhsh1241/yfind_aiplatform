# Test Plan：模型仓库 MVP

## Metadata
- Feature: F006-model-registry-mvp
- Status: implemented
- Contract: `docs/features/F006-model-registry-mvp/contract.md`
- Trace Tag: `TASK-model-registry-mvp`
- Updated: 2026-05-05

## Test Scope

- 后端模型 API：列表、详情、注册、审批、驳回、归档、可部署查询。
- 权限：401 / 403、`model:read`、`model:manage`。
- 前端模型仓库：列表、版本详情、审批/驳回弹窗。
- Playwright：模型仓库主流程。

## P0

| ID | Scenario | Verification |
| --- | --- | --- |
| T1 | AC-01/AC-04 模型列表返回 trace 和 `model:read` permission | `ModelRegistryControllerTest.listModels` |
| T2 | AC-02/AC-03 模型详情返回训练来源、artifact、指标、checksum 和 deployable | `ModelRegistryControllerTest.detailIncludesVersionLineageAndMetrics` |
| T3 | AC-01/AC-02 注册模型版本返回 `REGISTERED` 和训练 artifact URI | `ModelRegistryControllerTest.registerVersion` |
| T4 | AC-01/AC-03 审批版本后 deployable=true | `ModelRegistryControllerTest.approveVersion` |
| T5 | AC-01 驳回和归档版本后不可部署 | `ModelRegistryControllerTest.rejectAndArchiveVersion` |
| T6 | AC-04 缺 token / 缺权限返回 401 / 403 | `ModelRegistryControllerTest.rejectsUnauthorizedAndForbiddenRequests` |
| T7 | AC-05 前端展示模型仓库、版本详情和审批交互 | `frontend/src/App.test.tsx` |
| T8 | AC-06 Playwright 覆盖模型仓库主流程 | `frontend/e2e/model-registry.spec.ts` |
| T9 | AC-07 scaffold gate 全量通过 | `tools/ai-scaffold` |

## Traceability

- AC-01 -> T1, T3, T4, T5, T9
- AC-02 -> T2, T3, T9
- AC-03 -> T2, T4, T5, T9
- AC-04 -> T1, T6, T9
- AC-05 -> T7, T9
- AC-06 -> T8, T9
- AC-07 -> T9

## Execution Notes

- 所有新增测试必须包含 `TASK-model-registry-mvp` 或 AC 标识。
- F006 不接入真实 MLflow / 对象存储，测试只验证占位 seam。