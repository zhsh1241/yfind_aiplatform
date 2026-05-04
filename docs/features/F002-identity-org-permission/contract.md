# 契约：身份、组织与权限基线

## 状态

- Status: frozen
- Contract Status：frozen
- Feature：F002-identity-org-permission
- 冻结日期：2026-05-02

## API 契约

### `GET /api/auth/status`

返回当前认证状态和 IAM 集成边界。

响应字段：

- `authenticated: boolean`
- `authMethod: string`，MVP 为 `LOCAL_DEV_PRINCIPAL`
- `principalSource: string`
- `iamProvider: string`，生产值必须保持 `TODO_CONFIRM_IAM_PROVIDER` 直到确认
- `ssoIssuer: string`，生产值必须保持 `TODO_CONFIRM_SSO_ISSUER` 直到确认
- `featureTrace: string`，固定为 `TASK-identity-org-permission`

### `GET /api/auth/me`

返回当前用户上下文。

响应字段：

- `userId`
- `username`
- `displayName`
- `organization { id, code, name, type, parentId }`
- `roles[] { key, name, description }`
- `permissions[]`
- `authMethod`
- `iamProvider`
- `featureTrace`

### `GET /api/auth/permissions`

返回 MVP 权限词表。权限 key 使用 `module:action` 形式，例如：

- `identity:user:read`
- `identity:role:manage`
- `dataset:manage`
- `training:execute`
- `inference:deploy`
- `edge:deploy`
- `audit:read`

每个权限返回：

- `key`
- `module`
- `action`
- `description`
- `highRisk`

### `GET /api/auth/check?permission={key}`

返回权限判定结果。

- 已知且当前主体拥有：`decision=ALLOW`，`granted=true`
- 未知权限：`decision=DENY`，`known=false`，`granted=false`
- 未知权限必须默认拒绝，并进入高风险访问审计义务。

### `GET /api/organizations/current`

返回当前组织占位信息，用于后续组织层级和租户绑定。

### `GET /api/audit/events`

返回 MVP 审计义务示例，至少覆盖：

- 登录事件 `LOGIN`
- 角色权限变更 `ROLE_PERMISSION_CHANGE`
- 高风险拒绝访问 `DENIED_HIGH_RISK_ACCESS`

## 前端契约

- 组织权限页必须展示当前用户上下文。
- 组织权限页必须展示模块权限门禁矩阵。
- 模块快捷入口展示“已放行/默认拒绝”的权限状态。
- 前端仅展示后端权限结果或原型占位，不作为最终授权来源。

## 安全约束

- 不写入真实 IAM/SSO URL、client id、secret、issuer、claim mapping。
- 所有未知权限默认拒绝。
- 高风险操作权限（管理、训练执行、推理部署、边缘下发）必须标记 `highRisk=true`。
- 后续接入真实 Spring Security/OIDC 时，本契约字段必须保持向后兼容或通过新版本契约升级。
