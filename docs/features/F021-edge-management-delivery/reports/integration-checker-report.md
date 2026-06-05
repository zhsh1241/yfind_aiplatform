# F021 联调检查报告

- Feature: F021-edge-management-delivery（边端服务器与模型下发）
- Date: 2026-06-05
- Scope: `contract.md`、后端 Controller/Service/DTO/异常处理、前端 `platformApi`/`EdgeManagementPage`、后端/前端/E2E 测试证据
- Status: PASS

## 结论

F021 前后端契约已对齐，边端服务器管理、下发申请、owner 审批、执行 seam、完整性校验、回滚 seam、权限隔离、审计与错误 envelope 均满足冻结契约要求。上一轮发现的 Spring `int @RequestParam` 类型转换异常已修复：`MethodArgumentTypeMismatchException`、`MissingServletRequestParameterException`、`BindException` 与请求体解析错误统一映射为 HTTP 400 / business code `40000`，并补充了回归断言。

## API Endpoint Check

| Endpoint | Contract | Backend | Frontend | Status |
|---|---|---|---|---|
| `GET /api/v1/edge-servers` | 查询边端服务器，分页与筛选参数 | 路径/方法/响应对齐；非法 enum 与非数字分页参数返回 `40000` | `platformApi.edgeServers(params)` 对齐 | ✅ |
| `POST /api/v1/edge-servers` | 创建边端服务器 | 初始状态、权限、审计与空 body `40000` 对齐 | `createEdgeServer` 与页面表单对齐 | ✅ |
| `GET /api/v1/edge-servers/{edgeServerId}` | 边端详情 | 路径/字段/权限对齐 | `edgeServerDetail` 对齐 | ✅ |
| `PATCH /api/v1/edge-servers/{edgeServerId}` | 更新边端 | 字段、状态与审计对齐 | `updateEdgeServer` 对齐 | ✅ |
| `POST /api/v1/edge-servers/{edgeServerId}/heartbeat` | 心跳上报 | 停用阻断 `40961` 对齐 | `heartbeatEdgeServer` 对齐 | ✅ |
| `POST /api/v1/edge-servers/{edgeServerId}/actions:decommission` | 停用边端 | 状态、权限、审计对齐 | `decommissionEdgeServer` 对齐 | ✅ |
| `GET /api/v1/edge-deployments` | 查询下发任务 | 路径/方法/响应对齐；非法 enum 与非数字分页参数返回 `40000` | `edgeDeployments(params)` 对齐 | ✅ |
| `POST /api/v1/edge-deployments` | 创建下发申请 | Production 准入、停用边端、artifact/hash 校验错误码对齐 | `createEdgeDeployment` 与页面表单对齐 | ✅ |
| `GET /api/v1/edge-deployments/{deploymentId}` | 下发详情 | deployment/server/approvals 对齐 | `edgeDeploymentDetail` 对齐 | ✅ |
| `POST /api/v1/edge-deployments/{deploymentId}/approvals:approve` | owner 审批 | owner/super admin 授权、状态机、审计对齐 | `approveEdgeDeployment` 对齐 | ✅ |
| `POST /api/v1/edge-deployments/{deploymentId}/approvals:reject` | owner 拒绝 | owner/super admin 授权、状态机、审计对齐 | `rejectEdgeDeployment` 对齐 | ✅ |
| `POST /api/v1/edge-deployments/{deploymentId}/actions:execute` | 执行下发 seam | 未审批 `40962`、终态 `40963`、停用边端阻断对齐 | `executeEdgeDeployment` 对齐 | ✅ |
| `POST /api/v1/edge-deployments/{deploymentId}/actions:verify-integrity` | SHA-256 完整性校验 | 成功/失败状态、`42263`、审计对齐 | `verifyEdgeDeploymentIntegrity` 对齐 | ✅ |
| `POST /api/v1/edge-deployments/{deploymentId}/actions:rollback` | 回滚 seam | 状态限制、回滚目标隔离、响应对齐 | `rollbackEdgeDeployment` 对齐 | ✅ |

## Error Handling Check

| Scenario | Expected | Actual | Status |
|---|---:|---:|---|
| 空 JSON body / `null` body | 400 / `40000` | 400 / `40000` | ✅ |
| malformed JSON | 400 / `40000` | 400 / `40000` | ✅ |
| 非法 `status` / `strategy` 枚举 | 400 / `40000` | 400 / `40000` | ✅ |
| 非数字 `page` / `pageSize` | 400 / `40000` | 400 / `40000` | ✅ |
| 跨 BU 无权限 | 403 / `40304` | 403 / `40304` | ✅ |
| 资源不存在 | 404 / `40400` | 404 / `40400` | ✅ |
| 停用边端不可下发/执行 | 409 / `40961` | 409 / `40961` | ✅ |
| 未授权下发不可执行 | 409 / `40962` | 409 / `40962` | ✅ |
| 终态/非法状态重复操作 | 409 / `40963` | 409 / `40963` | ✅ |
| 非 Production 模型版本 | 422 / `42261` | 422 / `42261` | ✅ |
| artifact/hash 缺失或不可信 | 422 / `42262` | 422 / `42262` | ✅ |
| 完整性校验失败 | 422 / `42263` | 422 / `42263` | ✅ |

## Verification Evidence

```powershell
mvn -f backend/pom.xml -pl smp-app -Dtest=EdgeManagementControllerTest test -q
# PASS

npm exec vitest run src/features/edge/EdgeManagementPage.test.tsx src/features/platform/platformApi.test.ts -- --reporter=verbose --pool=forks --poolOptions.forks.singleFork=true
# Test Files 2 passed; Tests 3 passed

npm exec playwright test e2e/model-registry-foundation.spec.ts e2e/edge-management-delivery.spec.ts
# PASS
```

## Remaining Notes

真实边端 Agent、mTLS、外部审批系统与回滚命令仍保留为 `TODO_CONFIRM_*` seam；不影响本轮平台侧契约闭环。
