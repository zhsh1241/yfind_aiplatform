> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-edge-management-delivery.md`

# Test Spec: F021-edge-management-delivery

## Metadata
- Feature: F021-edge-management-delivery
- Date: 2026-06-05
- Source PRD: `.omx/plans/prd-edge-management-delivery.md`
- Verdict: APPROVE for plan drafting

## Acceptance Coverage
| AC | Coverage Focus | Priority |
|---|---|---|
| AC-01 | 注册边端服务器，保存位置/BU/owner/Agent/硬件摘要/状态 | P0 |
| AC-02 | 心跳更新在线状态，停用服务器不可下发 | P0 |
| AC-03 | 仅 Production 且可见模型版本可创建下发申请 | P0 |
| AC-04 | owner 授权前不得执行下发 | P0 |
| AC-05 | 授权后执行状态机并记录结果 | P0 |
| AC-06 | SHA-256 完整性校验失败阻断部署并记录 retry/diagnostic | P0 |
| AC-07 | 查询下发历史、回滚记录、失败原因 | P1 |
| AC-08 | 跨 BU 无授权不可查看/操作边端、部署、artifact | P0 |
| AC-09 | 关键动作记录审计 | P0 |
| AC-10 | 前端 `/edge` 真实 API 主链路 | P1 |

## Backend Test Plan
### P0
1. `registerEdgeServerCreatesManagedRecord`
   - POST edge server returns generated `EDGE-*`, status `REGISTERED`/`ONLINE` or `OFFLINE`, audit `EDGE_SERVER_REGISTERED`.
2. `heartbeatUpdatesStatusAndResourceSummary`
   - heartbeat updates `lastHeartbeatAt`, status, resource summary, audit event.
3. `decommissionedServerCannotReceiveDeployment`
   - decommission then create deployment returns 409/422.
4. `deploymentRejectsNonProductionOrInvisibleModelVersion`
   - DEVELOPMENT/TESTING model version rejected; cross-BU invisible version rejected with 403/404 non-leak.
5. `deploymentRequiresOwnerApprovalBeforeExecution`
   - requested deployment cannot execute before approval; creates approval pending/audit.
6. `approvedDeploymentCanExecuteAndVerifyIntegrity`
   - approve -> execute -> verify with matching hash -> DEPLOYED, audit passed/deployed.
7. `integrityMismatchFailsAndBlocksDeployment`
   - received SHA mismatch -> FAILED, retry count/diagnostic, audit `EDGE_DEPLOYMENT_INTEGRITY_FAILED`.
8. `crossBuUserCannotReadOrOperateEdgeDeployment`
   - list/detail/approve/execute/download artifact forbidden or scoped.
9. `auditEventsRecordedForLifecycle`
   - verify requested/approved/rejected/executed/passed/failed/rolled_back events.

### P1
1. Query filters by server/status/model.
2. Rollback seam records `ROLLED_BACK` with target version.
3. Scheduled deployment seam stores `scheduledAt` but does not auto-run without scheduler.

## Frontend Unit Test Plan
- `EdgeManagementPage.test.tsx`
  - renders server list from API and no prototype mock text.
  - opens register form and submits `createEdgeServer` payload.
  - opens deployment request form with Production model version options.
  - blocks/decorates pending approval and exposes approve/execute actions based on status.
  - shows integrity failure diagnostic and retry hint.

## E2E Plan
- `frontend/e2e/edge-management-delivery.spec.ts`
  - route `/edge` after login.
  - intercept real `/api/v1/edge-servers` and `/api/v1/edge-deployments` endpoints.
  - create edge server happy path.
  - create deployment request -> approve -> execute -> verify deployed happy path.
  - verify integrity mismatch UI shows failure and does not show deployed.

## Integration Checks
- API contract paths/methods/envelope match frontend `platformApi`.
- Status enums match backend SQL, DTO and frontend labels.
- Error codes for non-Production, no approval, integrity mismatch and cross-BU are documented in contract and surfaced in UI.
- Audit event names match contract.
- `model_registry_version` and file object hash are the only trusted model artifact sources.

## Quality Gate Commands Planned
```powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F021-edge-management-delivery
mvn -f backend/pom.xml -pl smp-app -Dtest=EdgeManagementControllerTest test
Push-Location frontend; npm exec vitest run src/features/edge/EdgeManagementPage.test.tsx; Pop-Location
Push-Location frontend; npm exec playwright test e2e/edge-management-delivery.spec.ts; Pop-Location
node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F021-edge-management-delivery
node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F021-edge-management-delivery
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F021-edge-management-delivery --run-e2e
```

## Manual QA Focus
- 原型一致性：`edge` 导航、边端列表/详情/下发主流程符合编译原型信息架构。
- 生产安全：未授权/跨 BU/非 Production/hash mismatch 均不可被 UI 绕过。
- Seam 透明：真实 Agent 未接入时 UI 明确展示 diagnostic，不宣称自动下发成功。
