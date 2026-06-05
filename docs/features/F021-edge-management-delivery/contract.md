# Feature Contract: 边端服务器与模型下发

## Contract Metadata
- Version: v1
- Status: frozen
- Owner: contract-architect
- Created: 2026-06-05
- Updated: 2026-06-05
- Feature: F021-edge-management-delivery

## 1. Requirement Summary
- 用户目标：纳管边端服务器，并将已进入 Production 的模型版本经 owner 授权后下发到边端服务器。
- 业务价值：落实 `INF-003` 与 `INF-008`，将 F019/F020 模型生产准入延伸到边端部署。
- 业务资料：`docs/business/bizdocs/02-03-业务流程-模型部署与推理.md`、`docs/business/bizdocs/03-03-系统功能-模型部署.md`、`docs/business/rules/03-推理部署规则.md`
- 原型页面：`docs/prototype/SMP工业AI平台-原型v2.html` page key `edge`

## 2. API Contract
所有接口使用 `/api/v1`、Bearer Token、统一 `ApiResponse<T>` envelope 与平台 traceId。

### 2.1 List Edge Servers
- Method: `GET`
- Path: `/api/v1/edge-servers`
- Permission: `edge:server:read`
- Query: `keyword?`, `status?`, `organizationId?`, `page=1`, `pageSize=20`
- Response `data`: `PageResponse<EdgeServerResponse>`

### 2.2 Create Edge Server
- Method: `POST`
- Path: `/api/v1/edge-servers`
- Permission: `edge:server:write`
- Audit Event: `EDGE_SERVER_REGISTERED`
- Request: `{ "serverName": "工厂A车间-推理服务器-001", "location": "上海工厂A车间", "organizationId": "ORG-CABIN", "ownerUserId": "USER-OWNER", "hostAddress": "10.1.1.20", "agentVersion": "1.0.0", "hardwareSummary": { "gpu": "NVIDIA T4 x1" } }`
- Response: `EdgeServerResponse`

### 2.3 Get / Update Edge Server
- Method: `GET` / `PATCH`
- Path: `/api/v1/edge-servers/{edgeServerId}`
- Permissions: `edge:server:read` / `edge:server:write`
- Patch Audit: `EDGE_SERVER_UPDATED`

### 2.4 Heartbeat
- Method: `POST`
- Path: `/api/v1/edge-servers/{edgeServerId}/heartbeat`
- Permission: `edge:server:write`
- Audit Event: `EDGE_SERVER_HEARTBEAT_RECEIVED`
- Request: `{ "status": "ONLINE", "agentVersion": "1.0.1", "resourceSummary": { "cpuUsage": 0.35 }, "diagnostic": "agent healthy" }`
- Response: `EdgeServerResponse`

### 2.5 Decommission Edge Server
- Method: `POST`
- Path: `/api/v1/edge-servers/{edgeServerId}/actions:decommission`
- Permission: `edge:server:write`
- Audit Event: `EDGE_SERVER_DECOMMISSIONED`

### 2.6 List / Create Edge Deployments
- Method: `GET` / `POST`
- Path: `/api/v1/edge-deployments`
- Permissions: `edge:deployment:read` / `edge:deployment:request`
- Create Audit: `EDGE_DEPLOYMENT_REQUESTED`
- Request: `{ "edgeServerId": "EDGE-...", "modelId": "MODEL-...", "versionId": "MVER-...", "strategy": "IMMEDIATE", "notes": "夜班前下发" }`
- Response: `EdgeDeploymentResponse` with `status=REQUESTED` and `approvalStatus=PENDING`.

### 2.7 Get Edge Deployment Detail
- Method: `GET`
- Path: `/api/v1/edge-deployments/{deploymentId}`
- Permission: `edge:deployment:read`
- Response: `EdgeDeploymentDetailResponse`

### 2.8 Approve / Reject Deployment
- Method: `POST`
- Path: `/api/v1/edge-deployments/{deploymentId}/approvals:approve` / `approvals:reject`
- Permission: `edge:deployment:approve`
- Audit Events: `EDGE_DEPLOYMENT_APPROVED` / `EDGE_DEPLOYMENT_REJECTED`
- Request: `{ "comment": "同意下发" }`

### 2.9 Execute Deployment
- Method: `POST`
- Path: `/api/v1/edge-deployments/{deploymentId}/actions:execute`
- Permission: `edge:deployment:execute`
- Audit Event: `EDGE_DEPLOYMENT_EXECUTION_STARTED`
- Response: status `VERIFYING` or `TRANSFERRING`, diagnostic includes `MANUAL_AGENT_SEAM;TODO_CONFIRM_EDGE_AGENT_PROTOCOL`.

### 2.10 Verify Integrity
- Method: `POST`
- Path: `/api/v1/edge-deployments/{deploymentId}/actions:verify-integrity`
- Permission: `edge:deployment:execute`
- Audit Events: `EDGE_DEPLOYMENT_INTEGRITY_PASSED` + `EDGE_DEPLOYMENT_DEPLOYED`, or `EDGE_DEPLOYMENT_INTEGRITY_FAILED` + `EDGE_DEPLOYMENT_FAILED`
- Request: `{ "receivedSha256": "...", "diagnostic": "edge side checksum" }`
- Response: `EdgeDeploymentDetailResponse`

### 2.11 Rollback
- Method: `POST`
- Path: `/api/v1/edge-deployments/{deploymentId}/actions:rollback`
- Permission: `edge:deployment:execute`
- Audit Event: `EDGE_DEPLOYMENT_ROLLED_BACK`
- Request: `{ "targetDeploymentId": "EDGEDEP-...", "reason": "完整性失败后回滚" }`

## 3. Domain / State / Rules
- Domain objects: `EdgeServer`, `EdgeDeployment`, `EdgeDeploymentApproval`, `Model`, `ModelVersion`, `PlatformFileObject`, `PlatformAuditEvent`。
- EdgeServer status: `REGISTERED`, `ONLINE`, `OFFLINE`, `STALE`, `DECOMMISSIONED`。
- Deployment status: `REQUESTED`, `APPROVED`, `REJECTED`, `QUEUED`, `TRANSFERRING`, `VERIFYING`, `DEPLOYED`, `FAILED`, `ROLLED_BACK`, `CANCELLED`。
- Approval status: `PENDING`, `APPROVED`, `REJECTED`。
- MUST rules:
  - `INF-003`: 边端模型下发必须经边端应用 owner 授权。
  - `INF-008`: 模型下发后必须验证 SHA-256 完整性，失败不得启动边端推理服务。
  - 仅 `PRODUCTION` 模型版本可下发。
  - 停用服务器不可作为新下发目标。
  - 跨 BU 不可泄露边端、部署和 artifact。

## 4. SQL Contract
- `edge_server(edge_server_id, server_name, location, organization_id, owner_user_id, host_address, agent_version, hardware_summary_json, resource_summary_json, status, diagnostic, tenant_id, created_at, updated_at, last_heartbeat_at, decommissioned_at)`
- `edge_deployment(deployment_id, edge_server_id, model_id, version_id, model_name, version_no, artifact_file_object_id, artifact_sha256, strategy, status, approval_status, requested_by, approved_by, executed_by, tenant_id, organization_id, diagnostic, failure_reason, retry_count, scheduled_at, requested_at, approved_at, executed_at, verified_at, deployed_at, rolled_back_at, rollback_target_deployment_id, created_at, updated_at)`
- `edge_deployment_approval(approval_id, deployment_id, approver_user_id, decision, comment, decided_at, created_at)`
- Indexes: server `(tenant_id, organization_id, status)`, deployment `(edge_server_id, status)`, deployment `(model_id, version_id, status)`。

## 5. Errors
| HTTP | Business Code | Scenario | Rule |
|---|---:|---|---|
| 400 | 40000 | 参数格式错误 | API 规范 |
| 403 | 40304 | 无边端/部署/模型访问权限 | 跨 BU 不泄露 |
| 404 | 40400 | 边端、部署、模型版本不存在 | API 规范 |
| 409 | 40961 | 停用边端不可下发 | 状态机 |
| 409 | 40962 | 未授权下发不可执行 | INF-003 |
| 409 | 40963 | 终态部署不可重复执行 | 状态机 |
| 422 | 42261 | 模型版本非 Production | INF-001/边端准入 |
| 422 | 42262 | 模型 artifact/hash 缺失 | INF-008 |
| 422 | 42263 | 完整性校验失败 | INF-008 |

## 6. Compatibility
- 不改变 F019/F020 模型状态机；F021 只读取 `PRODUCTION` 版本作为下发准入。
- 真实 Agent/mTLS 接入必须兼容本 contract 的状态机和 diagnostic 字段。
