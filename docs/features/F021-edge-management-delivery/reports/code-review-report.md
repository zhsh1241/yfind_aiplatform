# Code Review Report

## Summary
- Feature: F021-edge-management-delivery（边端服务器与模型下发）
- Date: 2026-06-05
- Reviewer: code-reviewer 复审
- Review Mode: 只读复审，未修改代码
- Verdict: PASS_WITH_COMMENTS

## Scope
本轮复审覆盖 F021 后端、前端、SQL、测试与文档变更，重点复核上一轮 `CHANGES_REQUIRED` 修复项：
- owner 授权
- reject / rollback / execute 状态机
- 停用边端后续阻断
- 请求体验证 / 错误 envelope
- trusted `platform_file_object.sha256`
- 前端 `permissionSummary` / 状态机 / 错误 envelope
- 补充测试

## Files Reviewed
| File | Result |
|---|---|
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/EdgeManagementController.java` | 通过 |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/EdgeManagementDtos.java` | 通过 |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/EdgeManagementService.java` | 通过，有非阻塞建议 |
| `backend/smp-app/src/main/java/com/yf/smp/app/web/GlobalExceptionHandler.java` | 通过，有非阻塞建议 |
| `backend/smp-app/src/main/resources/db/migration/V26__edge_management_delivery.sql` | 通过 |
| `backend/smp-app/src/test/java/com/yf/smp/app/platform/EdgeManagementControllerTest.java` | 通过 |
| `frontend/src/features/platform/platformApi.ts` | 通过 |
| `frontend/src/features/platform/platformApi.test.ts` | 通过 |
| `frontend/src/features/edge/EdgeManagementPage.tsx` | 通过，有非阻塞建议 |
| `frontend/src/features/edge/EdgeManagementPage.test.tsx` | 通过 |
| `frontend/e2e/edge-management-delivery.spec.ts` | 通过 |
| `frontend/src/App.tsx` | 通过 |
| `docs/features/F021-edge-management-delivery/*` | 通过 |

## Blocking Issues
无。

## Comments / Non-blocking Suggestions
1. `EdgeManagementService.rollback(...)` 目前只将下发任务标记为 `ROLLED_BACK`，未回减 `model_registry_version.active_deployment_count`。当前 contract 将回滚定义为 seam / 记录能力，非阻塞；但若后续以该计数阻断模型版本删除，建议在真实回滚闭环中补齐 active reference 生命周期。
2. `GlobalExceptionHandler` 对 malformed JSON 当前返回 F021 契约要求的 `40000`；后续若平台统一区分“业务参数校验失败”和“JSON 不可读”，需同步更新 contract。
3. 前端下发历史 query 在未选择服务器时会请求租户全部下发任务，但空态文案是“请选择服务器查看下发历史”。不影响正确性，建议后续统一交互语义。

## Verification Evidence
已执行只读验证：

```powershell
node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F021-edge-management-delivery
# AC traceability check passed.

node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F021-edge-management-delivery
# All checked contracts are ready for development.

mvn -f backend/pom.xml -pl smp-app -Dtest=EdgeManagementControllerTest test
# BUILD SUCCESS; Tests run: 1, Failures: 0, Errors: 0

npm exec vitest run src/features/edge/EdgeManagementPage.test.tsx src/features/platform/platformApi.test.ts
# Test Files 2 passed; Tests 3 passed

npm exec playwright test e2e/edge-management-delivery.spec.ts
# 1 passed
```

## Final Recommendation
F021 当前修复已覆盖上一轮阻塞项，状态机、owner 授权、停用阻断、trusted hash、错误 envelope、前端权限控制与测试证据均可接受。建议以 `PASS_WITH_COMMENTS` 进入下一阶段。
