> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-platform-identity-audit.md`

﻿# PRD: F006-platform-identity-audit 身份、权限与审计底座

## 1. 问题陈述

F003/F004/F005 仅提供工程底座，当前前端 25 个原型页面仍缺少真实身份上下文、权限菜单和审计事实源。如果不先完成 F006，后续数据、模型、推理、资源功能会各自重复实现权限判断，造成跨 BU 边界不一致、审计不可追溯，以及原型页面长期停留在静态展示或 mock 状态。

## 2. 决策原则

1. **后端事实源**：认证、授权、审计判定必须由后端完成，前端只消费结果。
2. **原型一致优先**：`login`、`usermgmt`、`perm` 必须保留原型页面 key、信息架构、主文案、Tab、表格、矩阵、卡片和弹窗结构。
3. **边界先行**：F006 不吞并 F007 的 `org` / `sys`，只实现身份权限审计底座和三页面接入。
4. **未知不猜测**：LDAP/SSO/短信/邮件/审批系统/审计冷存储参数全部 `TODO_CONFIRM_*`。
5. **可复用权限词表**：后续 F007~F020 必须复用 F006 权限体系扩展，不创建平行权限模型。

## 3. 范围

### 3.1 In Scope

#### 后端
- 认证会话 API：`POST /api/v1/auth/login`、`POST /api/v1/auth/logout`、`POST /api/v1/auth/refresh`、`GET /api/v1/auth/me`。
- 用户 API：查询、创建、启用/停用、解锁、角色分配。
- 角色权限 API：预设角色、权限词表、角色权限矩阵。
- 审计 API：审计日志查询、按 eventId 查询、签名校验、导出契约占位。
- 安全校验：RBAC 默认拒绝、BU 管理员边界、最后超管保护、登录失败锁定、权限变更会话失效。
- 数据库：Tenant/User/Role/Permission/UserRole/AuditLog 的最小表结构和 seed 数据。

#### 前端
- `login`：登录表单、错误提示、SSO/语言入口占位、登录后跳转。
- `usermgmt`：用户列表、角色管理、权限矩阵、新建用户弹窗、启停/解锁入口。
- `perm`：角色权限矩阵、当前权限概览/申请历史 Tab、待审批卡片、授权列表、审批/添加授权/创建角色弹窗。
- 菜单权限：基于 `/auth/me` 返回的 `menu:*` 权限控制可见性与未授权状态。

### 3.2 Out of Scope

- `org` 组织管理页面和完整组织树维护：F007。
- `sys` 系统配置和认证集成配置 UI：F007/F017。
- 真实 YF LDAP/SSO/OAuth2/SAML、MFA、SCIM/HR 同步、短信/邮件、密码找回、API Key 完整生命周期。
- F011 数据资产访问审批完整业务闭环。

## 4. 用户与场景

| 用户 | 场景 |
|---|---|
| 超级管理员 | 登录平台；创建/停用用户；分配角色；查看权限矩阵和审计日志。 |
| BU 子管理员 | 管理本 BU 用户和授权；不得跨 BU 操作或越权分配角色。 |
| 普通用户 | 登录后根据权限看到对应菜单；无权限时看到空权限提示或 403。 |
| 审计/安全人员 | 查询登录失败、账号锁定、权限变更、越权访问、高危操作日志。 |

## 5. 功能需求

### FR-01 认证与会话
- 支持本地 dev/test 账号密码登录，返回会话 token 或等效 session 标识。
- 登录失败计数；连续 5 次失败锁定 30 分钟。
- `/auth/me` 返回用户、租户/BU、角色、权限、菜单可见性、会话版本。
- 权限变更、账号停用后旧会话必须失效。
- SSO/LDAP 参数保留配置 seam：`TODO_CONFIRM_YF_LDAP_URL`、`TODO_CONFIRM_YF_LDAP_BASE_DN`、`TODO_CONFIRM_SSO_PROTOCOL`。

### FR-02 用户管理
- 用户列表支持 BU、角色、状态、关键词过滤和分页。
- 创建用户支持 employeeId/name/email/phone/BU/初始角色；可创建零权限用户，但 UI 必须提示暂无权限。
- 停用用户前触发强制下线和进行中任务检查 seam；F006 可记录 `TODO_CONFIRM_IN_PROGRESS_TASK_CHECK`。
- 解锁用户重置失败计数和 lockedUntil。
- 最后一个 `SUPER_ADMIN` 不可停用/删除/撤销。

### FR-03 角色权限
- 预设角色：SUPER_ADMIN、BU_ADMIN、DATA_ANNOTATOR、DATA_REVIEWER、MODEL_TRAINER、MODEL_OPS。
- 权限级别：菜单权限、功能权限、数据/资源条件。
- 角色权限矩阵必须能支撑原型 `usermgmt` 和 `perm` 两处矩阵展示。
- ACTIVE 用户撤销最后有效角色必须阻断；新建零权限用户是合法初始状态。
- BU_ADMIN 不得跨 BU 管理或分配超过自身权限上限的角色。

### FR-04 审计日志
- 记录登录成功/失败、账号锁定、登出、用户创建/停用/启用/解锁、角色分配/撤销、权限变更、访问拒绝、跨租户访问尝试。
- 审计日志包含 eventId、timestamp、operator、tenant、action、resource、result、riskLevel、before/after、traceId、signature。
- 审计日志只追加，不提供 update/delete API。
- 高危操作写 CRITICAL；审计写入失败时阻断高危业务操作。

### FR-05 原型一致性前端
- `login` 保留全屏深色布局、平台标识、账号密码表单、登录按钮、版本标注、SSO/语言入口占位。
- `usermgmt` 保留 3-Tab：用户列表、角色管理、权限矩阵；用户表、角色卡片、新建用户弹窗。
- `perm` 保留“权限管理”标题、“RBAC 角色权限矩阵 · 6 个预设角色”副标题、当前权限概览/申请历史 Tab、角色权限矩阵、待审批卡片、授权列表、添加授权/审批/创建角色弹窗。

## 6. 非功能与约束

- 所有 API 使用 `/api/v1`、统一 envelope、traceId。
- 所有写操作必须有权限校验和审计。
- 不新增未批准依赖；如需 JWT 依赖，contract 阶段必须列出理由和替代方案。
- 本地测试可使用 H2 PostgreSQL mode；生产数据库参数不猜测。
- 文档、报告、验收说明使用中文。

## 7. 数据与权限模型草案

- `platform_tenant`：最小 tenant/BU 数据，用于权限边界。
- `platform_user`：用户基础信息、状态、认证类型、失败次数、锁定时间、会话版本。
- `platform_role`：角色编码、名称、scope、preset、status。
- `platform_permission`：权限码、资源、动作、级别、条件。
- `platform_user_role`：用户-角色-BU 关联与有效期。
- `platform_audit_log`：不可变审计日志事实表。

## 8. 成功标准

- 规划文件、契约、测试计划、报告完整并通过 feature artifact checks。
- 后端测试覆盖 PLT-001~PLT-014 中 F006 相关 MUST。
- 前端与 E2E 覆盖登录、用户管理、权限管理关键路径。
- 原型一致性 QA 记录明确列出 `login/usermgmt/perm` 对照结果。
- `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F006-platform-identity-audit --run-e2e` 在实现完成后通过。

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| SSO/LDAP 未确认 | 使用 `TODO_CONFIRM_*` + 可替换认证 seam，不伪造生产参数。 |
| F006 范围膨胀到 org/sys | plan/TASK/contract 明确 out of scope，F007 接续。 |
| 原型复杂导致偏离 | 以页面 key、截图、原型源代码作为 QA 检查项。 |
| 权限规则冲突 | contract 明确 PLT-002 与 PLT-012 的状态边界。 |
| 审计影响业务性能 | F006 先保证正确性和阻断语义，性能/冷存储由 F017 加固。 |
