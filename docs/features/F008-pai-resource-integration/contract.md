# Feature Contract: 阿里云 PAI 资源集成控制面

## Contract Metadata
- Version: v1
- Status: frozen
- Owner: contract-architect
- Created: 2026-05-17
- Updated: 2026-05-17
- Feature: F008-pai-resource-integration
- Trace tag: `TASK-pai-resource-integration`

## 1. Requirement Summary

- 用户目标：所有资源相关能力放在阿里云 PAI 平台，SMP 只调用相关接口。
- 业务价值：SMP 不重复建设本地 GPU/NPU/CPU/存储调度事实源；后续训练、Pipeline、推理统一引用已授权的 PAI 资源绑定。
- 业务资料：`docs/business/bizdocs/02-04-业务流程-平台运营.md`、`docs/business/bizdocs/03-04-系统功能-平台管理.md`、`docs/business/api/01-API接口规范.md`。
- 原型页面：`docs/prototype/SMP工业AI平台-原型v2.html` / page key `resource`。
- 规划证据：`reports/planning/deep-interview.md`、`reports/planning/prd.md`、`reports/planning/test-spec.md`。

## 2. PAI 官方接口核验与实现决策

### 2.1 已核验事实

- 阿里云 PAI Resource Quota 文档说明资源配额可关联 Workspace，并展示资源配额列表/详情，包含状态、关联工作空间、GPU 卡数、CPU cores、内存、节点、作业、用户与监控等信息。
- 阿里云 PAI 创建资源配额文档说明资源配额可绑定 Workspace，用于 AI 开发、DLC 训练、DSW 实例、EAS 服务。
- 阿里云 PAI DLC 创建训练任务文档说明 DLC Job 在目标 Region/Workspace 下创建；SDK/CLI 可提交任务。
- Alibaba Cloud SDK API 页面提示：若当前 Workspace 已绑定 resource quota，CreateJob 可指定 resource quota ID。

核验来源：

- `https://www.alibabacloud.com/help/en/pai/developer-reference/api-aiworkspace-2021-02-04-listquotas`：`ListQuotas` 获取资源配额列表，RAM Action 为 `pai:ListQuotas`，请求路径为 `GET /api/v1/quotas`。
- `https://help.aliyun.com/zh/pai/developer-reference/api-paistudio-2022-01-12-getquota`：`GetQuota` 获取资源配额详情，RAM Action 为 `pai:GetQuota`。
- `https://www.alibabacloud.com/help/en/pai/user-guide/configure-custom-ram-authorization-policy`：RAM 权限动作包含 `pai:GetQuota`、`pai:ListQuotas`、`pai:CreateQuota`、`pai:UpdateQuota` 等。
- `https://www.alibabacloud.com/help/en/pai/user-guide/configure-notification-on-job-status-changes`：Workspace 调度配置中 DLC Job 可按 Resource Quota 配置等待/运行规则。
- `https://www.alibabacloud.com/help/en/pai/user-guide/create-and-manage-dsw-instances/`：DSW 实例创建可选择 Public Resources 或 Resource Quota。
- `https://www.alibabacloud.com/help/en/pai/pai-product-purchase-guidelines`：PAI 购买/使用指南说明 DSW、DLC 可使用 Public Resources 或 Resource Quota。

### 2.2 当前实现决策

- F008 当前实现 **不新增 Alibaba Cloud SDK 依赖**，避免在 PAI 账号、Region、RAM 权限和 SDK 版本未确认前锁死依赖。
- 后端提供 `PaiResourceClient` seam；默认实现根据本地配置返回：
  - `UNCONFIGURED`：任何 `TODO_CONFIRM_PAI_*` 或未启用配置。
  - `READY`：仅当 Endpoint 或凭证引用明确标记 `SANDBOX` 的受控测试/沙箱配置已启用时返回本地可验证快照。
  - `AUTH_FAILED` / `UNAVAILABLE` / `RATE_LIMITED` / `TIMEOUT`：由配置中的诊断模式或后续 SDK 错误映射产生。
  - `PAI_CLIENT_NOT_CONFIGURED`：配置看似完整但未明确声明为 sandbox，且真实 SDK/HTTP/adapter 未接入时，必须失败并保留 stale 快照，不能伪造成 PAI 同步成功。
- 真实 PAI Java SDK / HTTP API 接入必须在后续环境确认后实现，并保持本契约 DTO 不变。
- 若后续改由 `ai-adapter` 代理 PAI，必须保持本 contract 的 `/api/v1/platform/pai-resources/*` 对前端稳定。

### 2.3 TODO_CONFIRM 外部项

- `TODO_CONFIRM_PAI_REGION`
- `TODO_CONFIRM_PAI_ENDPOINT`
- `TODO_CONFIRM_PAI_WORKSPACE_ID`
- `TODO_CONFIRM_PAI_QUOTA_ID`
- `TODO_CONFIRM_PAI_RESOURCE_GROUP_ID`
- `TODO_CONFIRM_PAI_RAM_ROLE_ARN`
- `TODO_CONFIRM_PAI_ACCESS_KEY_STRATEGY`
- `TODO_CONFIRM_PAI_VPC_NETWORK`

## 3. API Contract

所有 API 使用统一 envelope：

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "traceId": "uuid",
  "timestamp": "2026-05-17T00:00:00Z"
}
```

### 3.1 GET `/api/v1/platform/pai-resources/status`

- Description: 获取 PAI 连接配置摘要、健康状态和最近同步状态。
- Auth: Bearer
- Permission: `platform:pai-resource:read`
- Audit Event: 无成功读审计；越权由 `ACCESS_DENIED` / `PAI_CROSS_BU_ACCESS_DENIED` 覆盖。

Response `PaiResourceStatusResponse`:

```json
{
  "status": "UNCONFIGURED",
  "configured": false,
  "enabled": false,
  "regionId": "TODO_CONFIRM_PAI_REGION",
  "endpoint": "TODO_CONFIRM_PAI_ENDPOINT",
  "workspaceId": "TODO_CONFIRM_PAI_WORKSPACE_ID",
  "quotaId": "TODO_CONFIRM_PAI_QUOTA_ID",
  "resourceGroupId": "TODO_CONFIRM_PAI_RESOURCE_GROUP_ID",
  "credentialMode": "RAM_ROLE",
  "credentialRefMasked": "TODO_CONFIRM_PAI_RAM_ROLE_ARN",
  "diagnosticCode": "PAI_UNCONFIGURED",
  "diagnosticMessage": "TODO_CONFIRM_PAI_REGION;TODO_CONFIRM_PAI_WORKSPACE_ID;TODO_CONFIRM_PAI_QUOTA_ID",
  "lastSyncAt": null,
  "stale": false
}
```

### 3.2 GET `/api/v1/platform/pai-resources/overview?organizationId=TENANT-CABIN`

- Description: 获取当前权限范围内 PAI 资源总览卡片、最近快照和同步诊断。
- Auth: Bearer
- Permission: `platform:pai-resource:read`

Response `PaiResourceOverviewResponse`:

```json
{
  "status": "READY",
  "scopeType": "BU",
  "scopeId": "TENANT-CABIN",
  "bindingId": "PAI-BIND-CABIN",
  "workspaceId": "pai-ws-cabin",
  "quotaId": "quota-cabin-a100",
  "resourceGroupId": "rg-cabin-general",
  "lastSyncAt": "2026-05-17T12:00:00Z",
  "stale": false,
  "diagnosticCode": "OK",
  "diagnosticMessage": "PAI resource snapshot synchronized",
  "cards": [
    { "key": "gpu", "label": "GPU 总量", "used": 36, "total": 48, "unit": "卡", "percent": 75, "status": "WARNING" }
  ],
  "updatedFrom": "PAI_SNAPSHOT"
}
```

### 3.3 GET `/api/v1/platform/pai-resources/workspaces`

- Description: 查询当前权限范围内组织到 PAI Workspace / Quota 的绑定列表。
- Auth: Bearer
- Permission: `platform:pai-resource:binding:read`

Response:

```json
{
  "items": [
    {
      "bindingId": "PAI-BIND-CABIN",
      "organizationId": "TENANT-CABIN",
      "organizationName": "智能座舱事业部",
      "scopeType": "BU",
      "workspaceId": "pai-ws-cabin",
      "workspaceName": "PAI-CABIN",
      "quotaId": "quota-cabin-a100",
      "quotaName": "训练资源配额",
      "resourceGroupId": "rg-cabin-general",
      "status": "ACTIVE",
      "diagnosticCode": "OK",
      "diagnosticMessage": "ready",
      "lastSyncAt": "2026-05-17T12:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 1
}
```

### 3.4 GET `/api/v1/platform/pai-resources/nodes?bindingId=PAI-BIND-CABIN`

- Description: 查询 PAI 等价资源单元列表。若真实 PAI 不提供节点级明细，返回 Quota / Resource Group 摘要并标注 `sourceType`。
- Auth: Bearer
- Permission: `platform:pai-resource:read`

Response:

```json
{
  "items": [
    {
      "nodeId": "pai-node-a100-01",
      "sourceType": "PAI_QUOTA_NODE",
      "hostOrZone": "cn-shanghai-a",
      "gpuSpec": "8×A100 80G",
      "cpuCores": 96,
      "memoryGb": 768,
      "gpuTotal": 8,
      "gpuUsed": 6,
      "gpuUtilizationPercent": 75,
      "status": "READY",
      "diagnostic": "from PAI quota snapshot"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 1
}
```

### 3.5 GET `/api/v1/platform/pai-resources/pools`

- Description: 查询 PAI Quota / Resource Group 视图。
- Auth: Bearer
- Permission: `platform:pai-resource:read`

Response:

```json
{
  "items": [
    {
      "poolId": "quota-cabin-a100",
      "poolName": "训练资源配额",
      "sourceType": "PAI_RESOURCE_QUOTA",
      "bindingId": "PAI-BIND-CABIN",
      "quotaId": "quota-cabin-a100",
      "workspaceId": "pai-ws-cabin",
      "gpuUsed": 21,
      "gpuTotal": 24,
      "cpuUsed": 240,
      "cpuTotal": 384,
      "memoryUsedGb": 1024,
      "memoryTotalGb": 1536,
      "userCount": 12,
      "status": "READY"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 1
}
```

### 3.6 GET `/api/v1/platform/pai-resources/storage`

- Description: 查询 PAI/OSS 相关存储摘要；不得替代 F007 文件元数据服务。
- Auth: Bearer
- Permission: `platform:pai-resource:read`

Response:

```json
{
  "items": [
    {
      "storageId": "oss-pai-workspace-cabin",
      "name": "PAI Workspace OSS",
      "sourceType": "PAI_WORKSPACE_STORAGE",
      "capacityGb": 204800,
      "usedGb": 145408,
      "percent": 71,
      "status": "READY",
      "diagnostic": "workspace storage summary"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 1
}
```

### 3.7 POST `/api/v1/platform/pai-resources/sync`

- Description: 手动触发 PAI 资源同步。
- Auth: Bearer
- Permission: `platform:pai-resource:sync`
- Audit Events: `PAI_SYNC_REQUESTED`、`PAI_SYNC_SUCCEEDED`、`PAI_SYNC_FAILED`、`PAI_SYNC_STALE_SNAPSHOT_USED`

Request:

```json
{
  "bindingId": "PAI-BIND-CABIN",
  "force": true
}
```

Response `PaiSyncResponse`:

```json
{
  "syncId": "PAI-SYNC-20260517-001",
  "bindingId": "PAI-BIND-CABIN",
  "result": "SUCCESS",
  "status": "READY",
  "diagnosticCode": "OK",
  "diagnosticMessage": "PAI resource snapshot synchronized",
  "lastSyncAt": "2026-05-17T12:00:00Z",
  "stale": false,
  "paiRequestId": "TODO_CONFIRM_PAI_REQUEST_ID_OR_SANDBOX"
}
```

### 3.8 PUT `/api/v1/platform/pai-resources/connection`

- Description: 更新全局 PAI 连接摘要、Endpoint、默认 Workspace/Quota 与脱敏凭证引用。
- Auth: Bearer
- Permission: `platform:pai-resource:configure`
- Role: `SUPER_ADMIN` only
- Audit Event: `PAI_CONNECTION_UPDATED`；非超级管理员尝试写入时 `PAI_CONNECTION_UPDATE_DENIED`
- Secret rule: 请求不得包含明文 `AccessKey` / `Secret`；`credentialRefMasked` 只保存脱敏引用或 RAM Role 引用。

Request:

```json
{
  "regionId": "cn-shanghai",
  "endpoint": "TODO_CONFIRM_PAI_ENDPOINT",
  "workspaceId": "TODO_CONFIRM_PAI_WORKSPACE_ID",
  "quotaId": "TODO_CONFIRM_PAI_QUOTA_ID",
  "resourceGroupId": "TODO_CONFIRM_PAI_RESOURCE_GROUP_ID",
  "credentialMode": "RAM_ROLE",
  "credentialRefMasked": "TODO_CONFIRM_PAI_RAM_ROLE_ARN",
  "enabled": true,
  "status": "READY",
  "diagnosticMessage": "ready for PAI sync"
}
```

Response: `PaiResourceStatusResponse`。

### 3.9 PUT `/api/v1/platform/pai-resources/bindings/{bindingId}`

- Description: 更新组织到 PAI Workspace / Quota 的绑定。
- Auth: Bearer
- Permission: `platform:pai-resource:binding:update`
- Audit Event: `PAI_BINDING_UPDATED`

Request:

```json
{
  "organizationId": "TENANT-CABIN",
  "workspaceId": "pai-ws-cabin",
  "workspaceName": "PAI-CABIN",
  "quotaId": "quota-cabin-a100",
  "quotaName": "训练资源配额",
  "resourceGroupId": "rg-cabin-general",
  "status": "ACTIVE",
  "diagnosticMessage": "updated by admin"
}
```

### 3.10 GET `/api/v1/platform/pai-resources/references?organizationId=TENANT-CABIN`

- Description: 后续训练/推理查询可用 PAI 资源引用。
- Auth: Bearer
- Permission: `platform:pai-resource:reference:read`
- Audit Event: `PAI_RESOURCE_REFERENCE_REQUESTED`；失效时 `PAI_RESOURCE_REFERENCE_BLOCKED`

Response:

```json
{
  "resourceBindingId": "PAI-BIND-CABIN",
  "organizationId": "TENANT-CABIN",
  "paiWorkspaceId": "pai-ws-cabin",
  "paiQuotaId": "quota-cabin-a100",
  "paiResourceGroupId": "rg-cabin-general",
  "status": "ACTIVE",
  "usable": true,
  "diagnosticCode": "OK",
  "diagnosticMessage": "ready"
}
```

## 4. Errors

| HTTP | Business Code | Scenario | Rule |
|---|---|---|---|
| 400 | INVALID_PARAM | 参数格式错误 | API 基线 |
| 401 | UNAUTHORIZED | 未认证 | F006 |
| 403 | FORBIDDEN | 权限不足 / 跨 BU | PLT-001 / PLT-009 |
| 404 | RESOURCE_NOT_FOUND | binding / organization 不存在 | API 基线 |
| 409 | PAI_BINDING_DISABLED | 绑定禁用或失效 | AC-07 |
| 422 | PAI_UNCONFIGURED | PAI Region/Workspace/Quota/RAM 未配置 | AC-02 |
| 422 | PAI_AUTH_FAILED | PAI 鉴权失败 | AC-06 |
| 422 | PAI_UNAVAILABLE | PAI 服务不可用 | AC-06 |
| 422 | PAI_RATE_LIMITED | PAI 限流 | AC-06 |
| 422 | PAI_TIMEOUT | PAI 调用超时 | AC-06 |
| 422 | PAI_WORKSPACE_NOT_FOUND | Workspace 不存在 | AC-03/07 |
| 422 | PAI_QUOTA_NOT_FOUND | Quota 不存在 | AC-03/07 |
| 422 | PAI_SECRET_NOT_ALLOWED | 请求含明文 secret | AC-03 |
| 422 | PAI_CLIENT_NOT_CONFIGURED | 非 sandbox 配置但真实 PAI SDK/HTTP/adapter 未接入 | AC-02 / AC-06 / AC-10 |

当前 `PlatformError` 仅提供通用 HTTP/business code；F008 响应在 `message` / `diagnosticCode` 中承载 PAI 业务错误码，后续如需细粒度 business code 可扩展 `PlatformError`。

## 5. Domain / State / Rules

### Domain Objects

- `PaiConnectionConfig`
- `PaiResourceBinding`
- `PaiResourceSnapshot`
- `PaiSyncLog`
- `PaiResourceReference`

### State transitions

```text
Connection: UNCONFIGURED -> CONFIGURED -> READY / AUTH_FAILED / UNAVAILABLE / RATE_LIMITED / STALE
Binding: UNCONFIGURED -> ACTIVE -> DISABLED / PAI_NOT_FOUND / NEEDS_REVIEW
Sync: REQUESTED -> SUCCESS / FAILED / STALE_SNAPSHOT_USED
Reference: ACTIVE usable=true；DISABLED/PAI_NOT_FOUND/UNCONFIGURED usable=false
```

### MUST rules

- PAI 未配置时必须返回 `PAI_UNCONFIGURED` / `UNCONFIGURED`，不得返回静态成功数据。
- 同步失败不得覆盖最近成功快照。
- BU_ADMIN 只能访问本 BU 子树。
- 配置和映射写操作必须审计。
- 请求体不得保存或回显明文 AccessKey/Secret。
- 本地 `platform_pai_*` 表仅保存配置摘要、映射、快照、日志和引用，不作为物理调度事实源。

## 6. Permissions

- `menu:resource`
- `platform:pai-resource:read`
- `platform:pai-resource:configure`
- `platform:pai-resource:sync`
- `platform:pai-resource:binding:read`
- `platform:pai-resource:binding:update`
- `platform:pai-resource:diagnostic:read`
- `platform:pai-resource:reference:read`

`SUPER_ADMIN` 拥有全部权限；`BU_ADMIN` 拥有 read/sync/binding read/reference read，是否允许 binding update 按组织作用域限制。

## 7. Audit Events

- `PAI_CONFIG_UPDATED`
- `PAI_CONFIG_SECRET_REJECTED`
- `PAI_BINDING_CREATED`
- `PAI_BINDING_UPDATED`
- `PAI_BINDING_DISABLED`
- `PAI_SYNC_REQUESTED`
- `PAI_SYNC_SUCCEEDED`
- `PAI_SYNC_FAILED`
- `PAI_SYNC_STALE_SNAPSHOT_USED`
- `PAI_CROSS_BU_ACCESS_DENIED`
- `PAI_RESOURCE_REFERENCE_REQUESTED`
- `PAI_RESOURCE_REFERENCE_BLOCKED`

## 8. SQL Contract

Migration: `backend/smp-app/src/main/resources/db/migration/V4__platform_pai_resource.sql`

Required tables:

- `platform_pai_connection`
- `platform_pai_resource_binding`
- `platform_pai_resource_snapshot`
- `platform_pai_sync_log`

Required seed:

- Permissions above.
- `SUPER_ADMIN` role permission rows for all F008 permissions.
- `BU_ADMIN` role permission rows for read/sync/binding read/reference read.
- Default global PAI connection with `TODO_CONFIRM_PAI_*` and `UNCONFIGURED`.
- At least one `TENANT-CABIN` sandbox binding for API/UI/test verification, status `ACTIVE` but diagnostic clearly indicates sandbox/test seam unless real PAI is configured.

## 9. Compatibility

- Backward compatibility: Adds new endpoints and tables only; does not remove existing F006/F007 APIs.
- Versioning: API remains under `/api/v1`.
- Frontend: `resource` route changes from `PrototypePage` placeholder to real page; navigation key stays `resource`.
- External PAI integration: DTO remains stable when replacing default seam with SDK/adapter implementation.

## 10. Verification Requirements

- `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F008-pai-resource-integration` must pass.
- Automated tests must include `TASK-pai-resource-integration` and all AC ids.
- `check-task-traceability` must pass.
- Code review report must verify no local physical scheduler was introduced.
