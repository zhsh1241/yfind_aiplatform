# Feature Contract: 组织、配置与文件元数据

## Contract Metadata

- Version: v1
- Status: implemented
- Owner: contract-architect
- Created: 2026-05-17
- Updated: 2026-05-17
- Feature: F007-platform-organization-config

## 1. Requirement Summary

- 用户目标：让 `org` 与 `sys` 页面接入真实 API，并提供组织树、配置继承、文件元数据、通知渠道和 API Key 管理能力。
- 业务价值：为后续 DATA / MODEL / INFERENCE / RESOURCE 功能提供统一 PLATFORM 组织上下文、配置读取、文件 object key 与密钥治理 seam。
- 业务资料：`docs/business/bizdocs/03-04-系统功能-平台管理.md`、`docs/business/bizdocs/05-01-系统功能-平台基础.md`、`docs/business/bizdocs/05-03-系统功能-通知与文件管理.md`、`docs/business/domain/04-领域对象-平台域.md`、`docs/business/rules/05-平台与权限规则.md`、`docs/business/api/01-API接口规范.md`。
- 原型页面：`docs/prototype/SMP工业AI平台-原型v2.html` page key `org` / `sys`，以及 `screen-org.png`、`screen-sys.png`。

## 2. API Contract

所有接口使用 `/api/v1` 前缀、JSON 请求体、Bearer Token 认证和 `ApiResponse<T>` envelope；调用方可传入 `X-Trace-Id`，服务端缺省生成。

### 2.1 Organization API

| Method | Path | Auth | Permission | Audit Event | Description |
|---|---|---|---|---|---|
| GET | `/api/v1/platform/organizations/tree` | Bearer | `platform:organization:read` | none | 查询当前主体可见的 CORP/BU/PROJECT 组织树。 |
| POST | `/api/v1/platform/organizations` | Bearer | `platform:organization:create` | `ORG_NODE_CREATED` | 新建 BU 或 PROJECT；BU code 全局唯一，PROJECT code 在 BU 内唯一。 |
| PATCH | `/api/v1/platform/organizations/{organizationId}` | Bearer | `platform:organization:update` | `ORG_NODE_UPDATED` | 更新名称、时区、语言、GPU/存储/API 配额。 |
| DELETE | `/api/v1/platform/organizations/{organizationId}` | Bearer | `platform:organization:delete` | `ORG_NODE_DISABLED` / `ORG_NODE_DELETE_BLOCKED` | 删除前检查子节点、成员和文件引用；存在引用则 409，否则禁用。 |
| GET | `/api/v1/platform/organizations/members` | Bearer | `platform:organization:member:read` | none | 查询可见组织成员与角色作用域。 |
| POST | `/api/v1/platform/organizations/{organizationId}/members` | Bearer | `platform:organization:member:assign` | `ORG_MEMBER_ASSIGNED` | 分配用户、角色、作用域和有效期。 |
| DELETE | `/api/v1/platform/organizations/{organizationId}/members/{memberId}` | Bearer | `platform:organization:member:remove` | `ORG_MEMBER_REMOVED` | 移除组织成员作用域。 |

#### `POST /api/v1/platform/organizations` Request

```json
{
  "name": "视觉质检项目",
  "code": "MFG-VISION",
  "tenantType": "PROJECT",
  "parentId": "TENANT-CABIN",
  "quotaGpu": 8,
  "quotaStorageTb": 5,
  "apiRateLimitPerDay": 10000
}
```

#### Organization Node Response

```json
{
  "id": "TENANT-CABIN",
  "code": "CABIN",
  "name": "智能座舱事业部",
  "tenantType": "BU",
  "parentId": "TENANT-YF",
  "path": "/TENANT-YF/TENANT-CABIN",
  "status": "ACTIVE",
  "timezone": "Asia/Shanghai",
  "defaultLocale": "zh-CN",
  "quotaGpu": 50,
  "quotaStorageTb": 500,
  "apiRateLimitPerDay": 10000,
  "userCount": 2,
  "usedGpu": 7,
  "children": []
}
```

### 2.2 Config API

| Method | Path | Auth | Permission | Audit Event | Description |
|---|---|---|---|---|---|
| GET | `/api/v1/platform/configs` | Bearer | `platform:config:read` | none | 按 `scopeType` / `scopeId` 查询配置定义、作用域值、有效值和继承来源。 |
| GET | `/api/v1/platform/configs/effective/{key}` | Bearer | `platform:config:read` | none | 查询单个 key 的有效配置值。 |
| PUT | `/api/v1/platform/configs/{key}` | Bearer | `platform:config:update` | `CONFIG_UPDATED` / `CONFIG_LIMIT_REJECTED` | 更新 GLOBAL/BU/PROJECT 配置，写版本和审计。 |

#### `PUT /api/v1/platform/configs/{key}` Request

```json
{
  "scopeType": "BU",
  "scopeId": "TENANT-CABIN",
  "value": "120",
  "reason": "BU 下调上传上限"
}
```

#### Config Item Response

```json
{
  "key": "upload.maxFileSizeMb",
  "groupName": "storage",
  "valueType": "NUMBER",
  "scopeAllowed": ["GLOBAL", "BU", "PROJECT"],
  "sensitive": false,
  "defaultValue": "200",
  "scopeValue": "120",
  "effectiveValue": "120",
  "inheritedFrom": "BU:TENANT-CABIN",
  "version": 3,
  "status": "ACTIVE"
}
```

### 2.3 File Object API

| Method | Path | Auth | Permission | Audit Event | Description |
|---|---|---|---|---|---|
| GET | `/api/v1/platform/files` | Bearer | `platform:file:read` | none | 查询文件元数据，支持 assetType/status/organizationId。 |
| POST | `/api/v1/platform/files/init` | Bearer | `platform:file:init` | `FILE_OBJECT_INITIATED` | 分配文件 ID、bucket、objectKey 和待上传状态。 |
| POST | `/api/v1/platform/files/{fileId}/complete` | Bearer | `platform:file:complete` | `FILE_UPLOAD_COMPLETED` / `FILE_HASH_MISMATCH` | 上传完成登记并校验 hash/size。 |
| POST | `/api/v1/platform/files/{fileId}/delete` | Bearer | `platform:file:delete` | `FILE_SOFT_DELETED` | 软删除文件元数据。 |
| POST | `/api/v1/platform/files/{fileId}/restore` | Bearer | `platform:file:restore` | `FILE_RESTORED` | 恢复软删除文件。 |
| GET | `/api/v1/platform/files/{fileId}/download-url` | Bearer | `platform:file:download` | `FILE_DOWNLOAD_REQUESTED` | 返回下载授权 seam；MinIO/S3 未配置时返回 `UNCONFIGURED`。 |

### 2.4 Notification Channel API

| Method | Path | Auth | Permission | Audit Event | Description |
|---|---|---|---|---|---|
| GET | `/api/v1/platform/notification-channels` | Bearer | `platform:notification:read` | none | 查询通知渠道、脱敏配置、状态和诊断。 |
| PUT | `/api/v1/platform/notification-channels/{channelId}` | Bearer | `platform:notification:update` | `NOTIFICATION_CHANNEL_UPDATED` | 保存渠道配置；TODO_CONFIRM 参数保持未配置态。 |
| POST | `/api/v1/platform/notification-channels/{channelId}/test` | Bearer | `platform:notification:test` | `NOTIFICATION_TEST_REQUESTED` / `NOTIFICATION_TEST_FAILED` | 测试通知渠道；未配置返回 `UNCONFIGURED` 和诊断原因。 |

### 2.5 API Key API

| Method | Path | Auth | Permission | Audit Event | Description |
|---|---|---|---|---|---|
| GET | `/api/v1/platform/api-keys` | Bearer | `platform:apikey:read` | none | 查询 API Key 列表，仅返回 `prefix` 与 `maskedKey`。 |
| POST | `/api/v1/platform/api-keys` | Bearer | `platform:apikey:create` | `API_KEY_CREATED` | 创建 API Key，仅在响应中一次性返回 `plainTextKey`。 |
| POST | `/api/v1/platform/api-keys/{keyId}/revoke` | Bearer | `platform:apikey:revoke` | `API_KEY_REVOKED` | 撤销 API Key，不可恢复。 |

#### `POST /api/v1/platform/api-keys` Response `data`

```json
{
  "id": "AK-...",
  "name": "batch-inference-prod",
  "prefix": "smp_live_7f3a",
  "maskedKey": "smp_live_7f3a************c91e",
  "plainTextKey": "smp_live_7f3a...",
  "scopeType": "BU",
  "scopeId": "TENANT-CABIN",
  "expiresAt": "2026-08-15T00:00:00Z",
  "status": "ACTIVE"
}
```

## 3. Error Contract

| HTTP | Business Code | Scenario | Rule |
|---|---:|---|---|
| 400 | 40001 | 请求参数格式错误 | API 统一校验 |
| 401 | 40100 | token 缺失、token 过期或 sessionVersion 失效 | F006 / AC-09 |
| 403 | 40300 | RBAC 权限不足、BU 管理员越权、跨 BU/PROJECT 访问 | PLT-009 / AC-02 |
| 404 | 40400 | 资源不存在或隐藏跨 BU 资源 | PLT-001 |
| 409 | 40900 | 组织存在引用、重复完成、重复撤销或唯一键冲突 | AC-01 / AC-05 / AC-07 |
| 422 | 42200 | 配置突破集团上限、hash/size 不匹配、业务规则失败 | AC-04 / AC-05 / AC-06 |
| 500 | 50000 | 未处理系统异常 | PLT-011 |

## 4. Data Contract

| Table / Columns | Purpose |
|---|---|
| `platform_tenant.tenant_type/path/timezone/default_locale/quota_gpu/quota_storage_tb/api_rate_limit_per_day/updated_at` | 扩展 tenant 为 CORP/BU/PROJECT 组织事实源。 |
| `platform_organization_member` | 组织成员、角色与作用域绑定。 |
| `platform_config_definition` | 配置 registry：key、group、valueType、defaultValue、sensitive、scopeAllowed、validationRule。 |
| `platform_config_value` | GLOBAL/BU/PROJECT 作用域配置值。 |
| `platform_config_version` | 配置变更版本与 reason。 |
| `platform_file_object` | 文件元数据：bucket/objectKey/hash/size/status/tenant/project/owner。 |
| `platform_notification_channel` | 通知渠道、脱敏配置、状态与诊断。 |
| `platform_notification_test_log` | 通知测试日志。 |
| `platform_api_key` | API Key prefix/hash/masked/scope/expires/revoked 生命周期。 |

## 5. Permission Contract

新增权限码：

- 菜单：`menu:org`、`menu:sys`。
- 组织：`platform:organization:read/create/update/delete`。
- 组织成员：`platform:organization:member:read/assign/remove`。
- 配置：`platform:config:read/update/test`、`platform:config:sensitive:read`。
- 文件：`platform:file:read/init/complete/delete/restore/download`。
- 通知：`platform:notification:read/update/test`。
- API Key：`platform:apikey:read/create/revoke`。

授权策略：

- `SUPER_ADMIN` 拥有全量 F007 权限。
- `BU_ADMIN` 拥有 `menu:org`、`menu:sys` 以及 BU 范围组织、成员、配置、文件、通知、API Key 权限，不允许写 GLOBAL 配置或跨 BU 操作。
- 默认拒绝，业务方法必须调用 `requirePermission`。

## 6. Audit Contract

所有写操作写入 `platform_audit_log`：

- `ORG_NODE_CREATED`、`ORG_NODE_UPDATED`、`ORG_NODE_DISABLED`、`ORG_NODE_DELETE_BLOCKED`
- `ORG_MEMBER_ASSIGNED`、`ORG_MEMBER_REMOVED`、`ORG_SCOPE_CHANGED`
- `CONFIG_UPDATED`、`CONFIG_LIMIT_REJECTED`、`SENSITIVE_CONFIG_READ_ATTEMPT`
- `FILE_OBJECT_INITIATED`、`FILE_UPLOAD_COMPLETED`、`FILE_HASH_MISMATCH`、`FILE_SOFT_DELETED`、`FILE_RESTORED`、`FILE_DOWNLOAD_REQUESTED`
- `NOTIFICATION_CHANNEL_UPDATED`、`NOTIFICATION_TEST_REQUESTED`、`NOTIFICATION_TEST_FAILED`
- `API_KEY_CREATED`、`API_KEY_REVOKED`、`API_KEY_REVEAL_ATTEMPTED`

API Key 创建/撤销、配置突破集团上限、文件删除、跨 BU 操作按 `CRITICAL` 或 `WARNING` 风险等级记录。

## 7. Frontend Contract

- Route/page key:
  - `/org` 渲染 `OrganizationManagementPage`。
  - `/sys` 渲染 `SystemConfigPage`。
- 原型一致性:
  - `/org` 保留“组织管理”“花叔工业智能 · 组织架构管理”“组织架构 / 部门管理 / 成员管理”3 Tab，以及租户列表、新建租户、添加成员、编辑配额、BU 配置、权限跳转入口。
  - `/sys` 保留“基础设置 / 存储配置 / 通知设置 / API 密钥 / 数据安全 / 认证集成 / 标签管理”7 Tab，以及通知测试、API Key 一次性展示、认证集成未配置态。
- API source:
  - 页面数据、配置保存、通知测试、API Key 创建/撤销必须通过 `platformApi` 调用后端；生产 UI 不使用 mock 数据。

## 8. Compatibility

- Backward compatibility：F006 `/api/v1/auth/**`、`/api/v1/platform/users/roles/permissions/audit-logs` 保持兼容。
- Versioning：F007 使用既有 `/api/v1/platform` 前缀。
- External systems：LDAP/SSO、SMTP/企业微信/钉钉、MinIO/S3、KMS、API Gateway 参数保留 `TODO_CONFIRM_*`，接口返回 `UNCONFIGURED` 而非假成功。
- Out-of-scope：F008/F009/F011/F016/F017 不在 F007 内实现，但复用 seam 已冻结。
