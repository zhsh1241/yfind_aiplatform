# Test Plan: 边端服务器与模型下发

## Metadata
- Feature: F021-edge-management-delivery
- Created: 2026-06-05
- Updated: 2026-06-05
- Source: `TASK.md` AC-01~AC-10, `contract.md`

## 1. Coverage Matrix
| Test ID | AC | Scenario | Priority | Layer |
|---|---|---|---|---|
| T-P0-01 | AC-01 AC-09 | 注册边端服务器并记录审计 | P0 | Backend |
| T-P0-02 | AC-02 AC-09 | 心跳更新状态；停用服务器不可下发 | P0 | Backend |
| T-P0-03 | AC-03 AC-08 | 非 Production / 不可见模型版本创建下发被拒绝 | P0 | Backend |
| T-P0-04 | AC-04 AC-09 | 未审批不可执行；审批/拒绝记录审计 | P0 | Backend |
| T-P0-05 | AC-05 AC-06 AC-09 | 授权后执行与 hash 校验成功/失败 | P0 | Backend |
| T-P0-06 | AC-07 | 下发历史、回滚记录、失败原因查询 | P0 | Backend |
| T-P1-01 | AC-10 | `/edge` 列表、详情、注册、下发、审批/执行 UI | P1 | Frontend Unit |
| T-P1-02 | AC-10 | `/edge` Playwright 主链路，真实 API 路径 | P1 | E2E |

## 2. Backend Tests
- `EdgeManagementControllerTest`
  - `registerEdgeServerCreatesManagedRecordAndAudit`
  - `heartbeatUpdatesStatusAndDecommissionedServerCannotReceiveDeployment`
  - `deploymentRejectsNonProductionOrInvisibleModelVersion`
  - `deploymentRequiresOwnerApprovalBeforeExecution`
  - `approvedDeploymentExecutesAndIntegrityPasses`
  - `integrityMismatchFailsAndBlocksDeployment`
  - `deploymentHistoryAndRollbackAreQueryable`
  - `crossBuUserCannotReadOrOperateEdgeResources`

## 3. Frontend Unit Tests
- `frontend/src/features/edge/EdgeManagementPage.test.tsx`
  - renders list from `/api/v1/edge-servers`
  - opens detail/history and no prototype mock text
  - submits register form and deployment request
  - approve/execute/verify actions call contract endpoints
  - integrity failure diagnostic is visible

## 4. E2E Tests
- `frontend/e2e/edge-management-delivery.spec.ts`
  - login -> `/edge`
  - intercept `/api/v1/edge-servers` and `/api/v1/edge-deployments`
  - create server -> request deployment -> approve -> execute -> verify deployed
  - mismatch hash shows failure and not deployed

## 5. Verification Commands
```powershell
mvn -f backend/pom.xml -pl smp-app -Dtest=EdgeManagementControllerTest test
Push-Location frontend; npm exec vitest run src/features/edge/EdgeManagementPage.test.tsx; Pop-Location
Push-Location frontend; npm exec playwright test e2e/edge-management-delivery.spec.ts; Pop-Location
node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F021-edge-management-delivery
node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F021-edge-management-delivery
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F021-edge-management-delivery --run-e2e
```

## 6. Risks / Manual QA
- 验证 seam 文案必须明确 `TODO_CONFIRM_EDGE_AGENT_PROTOCOL`，不得让用户误以为真实 Agent 已自动传输。
- 权限失败、非 Production、hash mismatch 必须不能被 UI 绕过。
- 视觉上保持原型 `edge` 信息架构。
