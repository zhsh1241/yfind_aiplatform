# Feature Contract: 身份、权限与审计底座

## Contract Metadata

- Version: v1
- Status: implemented
- Owner: contract-architect
- Created: 2026-05-16
- Updated: 2026-05-17
- Feature: F006-platform-identity-audit

## 1. Requirement Summary

- 用户目标：提供统一身份认证、用户角色权限、租户/BU 边界和审计日志底座，并让 `login`、`usermgmt`、`perm` 三个原型页面接入真实 API。
- 业务价值：后续所有业务域统一复用 PLATFORM 安全治理能力，避免各 feature 自行实现授权和审计。
- 业务资料：`docs/business/domain/04-领域对象-平台域.md`、`docs/business/rules/05-平台与权限规则.md`、`docs/business/api/01-API接口规范.md`。
- 原型页面：`docs/prototype/SMP工业AI平台-原型v2.html` 的 `Login`、`UserMgmt`、`Perm`，以及 `screen-perm.png`、`screen-sys.png`。

## 2. API Contract

所有接口使用 `/api/v1` 前缀、JSON 请求体、统一 `ApiResponse<T>` envelope，响应体必须包含 `code`、`message`、`data`、`traceId`、`timestamp`。调用方可传入 `X-Trace-Id`；服务端缺省生成。

### 2.1 Auth API

| Method | Path | Auth | Permission | Audit Event | Description |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/login` | none | none | `AUTH_LOGIN_SUCCESS` / `AUTH_LOGIN_FAILURE` / `AUTH_ACCOUNT_LOCKED` | 本地 dev/test 登录，生产 SSO 参数保留 `TODO_CONFIRM_*`。 |
| POST | `/api/v1/auth/logout` | Bearer | authenticated | `AUTH_LOGOUT` | 失效当前 session token。 |
| POST | `/api/v1/auth/refresh` | Bearer | authenticated | `SESSION_REFRESHED` | 基于当前有效 session 刷新令牌。 |
| GET | `/api/v1/auth/me` | Bearer | authenticated | none | 返回当前用户、角色、权限、菜单权限和 sessionVersion。 |

#### `POST /api/v1/auth/login` Request

```json
{
  "username": "admin",
  "password": "TODO_CONFIRM_E2E_PASSWORD_OR_dev_password",
  "tenantCode": "YF"
}
```

#### `POST /api/v1/auth/login` Response `data`

```json
{
  "accessToken": "session-token",
  "refreshToken": "refresh-token",
  "tokenType": "Bearer",
  "expiresInSeconds": 3600,
  "user": {
    "id": "USR-001",
    "username": "admin",
    "displayName": "平台管理员",
    "tenantId": "TENANT-YF",
    "tenantName": "延锋汽车内饰系统",
    "buCode": "YF",
    "roles": ["SUPER_ADMIN"],
    "permissions": ["menu:usermgmt", "platform:user:read"],
    "menuPermissions": ["dash", "usermgmt", "perm"]
  }
}
```

### 2.2 User API

| Method | Path | Auth | Permission | Audit Event | Description |
|---|---|---|---|---|---|
| GET | `/api/v1/platform/users` | Bearer | `platform:user:read` | none | 查询当前 tenant/BU 内用户，支持 `keyword`、`status`、`roleCode`、`page`、`pageSize`。 |
| POST | `/api/v1/platform/users` | Bearer | `platform:user:create` | `USER_CREATED` | 新建本地用户；默认零权限，不自动授予角色。 |
| PATCH | `/api/v1/platform/users/{userId}/status` | Bearer | `platform:user:update` | `USER_ENABLED` / `USER_DISABLED` / `SESSION_INVALIDATED` | 启用/停用账号；最后超管保护必须生效。 |
| POST | `/api/v1/platform/users/{userId}/unlock` | Bearer | `platform:user:update` | `USER_UNLOCKED` | 手动解锁账号并重置失败次数。 |
| PUT | `/api/v1/platform/users/{userId}/roles` | Bearer | `platform:role:assign` | `ROLE_ASSIGNED` / `ROLE_REVOKED` / `SESSION_INVALIDATED` | 设置用户角色；阻断 ACTIVE 用户最后有效角色撤销。 |

#### User Summary `data.items[]`

```json
{
  "id": "USR-001",
  "username": "admin",
  "displayName": "平台管理员",
  "email": "admin@yf.local",
  "tenantId": "TENANT-YF",
  "tenantName": "延锋汽车内饰系统",
  "buCode": "YF",
  "status": "ACTIVE",
  "authType": "LOCAL",
  "roles": ["SUPER_ADMIN"],
  "roleNames": ["超级管理员"],
  "lastLoginAt": "2026-05-16T09:00:00+08:00",
  "failedLoginCount": 0,
  "lockedUntil": null,
  "sessionVersion": 3
}
```

### 2.3 Role / Permission API

| Method | Path | Auth | Permission | Audit Event | Description |
|---|---|---|---|---|---|
| GET | `/api/v1/platform/roles` | Bearer | `platform:role:read` | none | 返回 6 个预设角色和后续自定义角色 seam。 |
| POST | `/api/v1/platform/roles` | Bearer | `platform:role:create` | `ROLE_CREATED` | 创建自定义角色；F006 可实现最小 seam。 |
| GET | `/api/v1/platform/permissions` | Bearer | `platform:permission:read` | none | 返回权限词表和模块分组。 |
| GET | `/api/v1/platform/permissions/matrix` | Bearer | `platform:permission:read` | none | 返回角色权限矩阵，用于 `usermgmt` 与 `perm`。 |
| PUT | `/api/v1/platform/roles/{roleCode}/permissions` | Bearer | `platform:permission:update` | `PERMISSION_CHANGED` / `SESSION_INVALIDATED` | 更新自定义角色权限；预设角色默认只读。 |

#### Preset Roles

- `SUPER_ADMIN` / 超级管理员
- `BU_ADMIN` / BU子管理员
- `DATA_ANNOTATOR` / 数据标注工程师
- `DATA_REVIEWER` / 审核工程师
- `MODEL_TRAINER` / 模型训练工程师
- `MODEL_OPS` / 模型应用工程师

### 2.4 Audit API

| Method | Path | Auth | Permission | Audit Event | Description |
|---|---|---|---|---|---|
| GET | `/api/v1/platform/audit-logs` | Bearer | `platform:audit:read` | none | 查询审计日志，支持 actor、action、riskLevel、result、time range、page/pageSize。 |
| GET | `/api/v1/platform/audit-logs/{eventId}` | Bearer | `platform:audit:read` | none | 按 eventId 返回相关审计链路。 |
| POST | `/api/v1/platform/audit-logs/{eventId}/verify` | Bearer | `platform:audit:read` | `AUDIT_SIGNATURE_VERIFIED` | 校验审计日志 SHA-256 签名。 |
| POST | `/api/v1/platform/audit-logs/export` | Bearer | `platform:audit:export` | `AUDIT_EXPORT_REQUESTED` | 导出契约占位，F006 可返回 accepted/未配置冷存储说明。 |

## 3. Error Contract

| HTTP | Business Code | Scenario | Rule |
|---|---:|---|---|
| 400 | 40001 | 请求参数格式错误 | API 统一校验 |
| 401 | 40100 | 未登录、token 缺失、token 过期、sessionVersion 失效 | AC-01 / AC-06 |
| 403 | 40300 | RBAC 权限不足、BU 管理员越权 | AC-05 |
| 404 | 40400 | 隐藏资源存在性的跨 tenant/BU 访问 | PLT-001 |
| 409 | 40900 | 最后超管保护、最后角色撤销、账号状态冲突 | AC-03 / AC-04 |
| 422 | 42200 | 登录锁定、密码错误、预设角色不可修改等业务规则失败 | AC-02 / AC-07 |
| 500 | 50000 | 审计写入失败或系统内部错误 | PLT-011 |

## 4. Data Contract

### Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `platform_tenant` | tenant/BU 边界 | `id`, `code`, `name`, `parent_id`, `status` |
| `platform_user` | 用户账号 | `id`, `username`, `password_hash`, `display_name`, `email`, `tenant_id`, `status`, `auth_type`, `failed_login_count`, `locked_until`, `session_version`, `last_login_at` |
| `platform_role` | 角色 | `code`, `name`, `scope`, `preset`, `tenant_id`, `status` |
| `platform_permission` | 权限词表 | `code`, `module`, `resource`, `action`, `level`, `description` |
| `platform_role_permission` | 角色权限 | `role_code`, `permission_code` |
| `platform_user_role` | 用户角色 | `user_id`, `role_code`, `tenant_id`, `expires_at`, `active` |
| `platform_session` | session token seam | `access_token`, `refresh_token`, `user_id`, `session_version`, `expires_at`, `revoked_at` |
| `platform_audit_log` | 不可变审计事实表 | `id`, `event_id`, `tenant_id`, `operator_id`, `operator_name`, `action`, `resource_type`, `resource_id`, `result`, `risk_level`, `before_json`, `after_json`, `detail_json`, `signature`, `occurred_at` |

### Seed Data

- Tenant: `TENANT-YF` / `YF` / 延锋汽车内饰系统。
- Dev super admin: `admin` / `TODO_CONFIRM_E2E_PASSWORD`（本地 profile 可使用固定测试密码，生产必须替换）。
- 6 个预设角色和最小权限词表。

## 5. Permission Contract

- 菜单权限：`menu:dash`、`menu:usermgmt`、`menu:perm` 等映射原型 page key。
- 平台用户权限：`platform:user:read`、`platform:user:create`、`platform:user:update`、`platform:role:assign`。
- 角色权限：`platform:role:read`、`platform:role:create`、`platform:permission:read`、`platform:permission:update`。
- 审计权限：`platform:audit:read`、`platform:audit:export`。
- 默认拒绝：除 `/api/v1/auth/login`、`/api/v1/foundation/**`、OpenAPI 和 actuator health 外，其余业务接口必须认证；业务方法按权限码再校验。

## 6. Audit Contract

所有审计日志必须：

- 追加写入，不开放 update/delete API。
- 包含 `eventId`、`tenantId`、`operatorId`、`operatorName`、`operatorRole`、`action`、`resourceType`、`resourceId`、`result`、`riskLevel`、`before/after/detail`、`traceId`、`signature`。
- 签名算法：F006 使用 SHA-256 对关键字段串联摘要；生产密钥来源保留 `TODO_CONFIRM_TOKEN_SIGNING_KEY_SOURCE` / `TODO_CONFIRM_AUDIT_SIGNING_KEY_SOURCE`。
- 审计写入失败时，高危操作阻断。

## 7. Frontend Contract

- Routes/page keys:
  - `/login` 或初始未登录视图必须渲染 `login` 页面结构。
  - `/usermgmt` 渲染用户管理页面。
  - `/perm` 渲染权限管理页面。
- 原型一致性:
  - `login`: 深色全屏、`⚙ SMP`、`工业 AI 平台`、账号登录、用户名/密码、登录按钮、SSO/语言入口占位、版本标注。
  - `usermgmt`: 标题“用户管理”、副标题“账号管理 · 角色分配 · GPU 用量统计”、批量导入/新建用户按钮、3 Tab、用户表、角色卡片、权限矩阵、新建用户弹窗。
  - `perm`: 标题“权限管理”、副标题“RBAC 角色权限矩阵 · 6 个预设角色”、导出/创建角色按钮、当前权限概览/申请历史 Tab、角色权限矩阵、待审批卡片、数据集访问授权、添加授权弹窗。
- API source:
  - 所有用户、角色、权限矩阵、审计摘要、菜单权限均来自后端 API；测试可以 mock HTTP，不得在生产 UI 中把 mock 当核心能力。

## 8. Compatibility

- Backward compatibility: 旧实现已清空，不兼容旧 API。
- Versioning: API 默认 `/api/v1`；后续权限码只增不随意重命名。
- External systems: 生产 LDAP/SSO、MFA、审计冷存储均使用 `TODO_CONFIRM_*` 标识，不伪造参数。
- Out-of-scope: `org`、`sys` 不在 F006 中实现，但导航 key 保留。
