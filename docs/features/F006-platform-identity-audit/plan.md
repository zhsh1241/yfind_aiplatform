---
feature: F006-platform-identity-audit
title: 身份、权限与审计底座
plan_status: approved
approved_at: 2026-05-16
owner: codex
created_at: 2026-05-16
updated_at: 2026-05-16
---

# Plan: 身份、权限与审计底座

## 1. 背景与目标

F003/F004/F005 已恢复后端、前端、部署工程底座。F006 是 R2 平台治理首个业务底座，目标是在后续 DATA、MODEL、INFERENCE、RESOURCE 功能开发前，先建立统一可复用的身份认证、用户角色权限、租户/BU 边界和审计日志事实源，并将原型 `login`、`usermgmt`、`perm` 三个页面从占位推进到真实 API 接入。

- 业务来源：`docs/business/bizdocs/05-01-系统功能-平台基础.md`、`docs/business/bizdocs/05-02-系统功能-国际化与审计日志.md`、`docs/business/domain/04-领域对象-平台域.md`、`docs/business/rules/05-平台与权限规则.md`、`docs/business/api/01-API接口规范.md`。
- 原型来源：`docs/prototype/SMP工业AI平台-原型v2.html`、`docs/prototype/SMP工业AI平台-原型v2-compiled.html`、`docs/prototype/screen-perm.png`、`docs/prototype/screen-sys.png`；重点页面 key：`login`、`usermgmt`、`perm`。
- 规划证据：`reports/planning/deep-interview.md`、`reports/planning/prd.md`、`reports/planning/test-spec.md`。
- 流程纠偏：此前错误草稿已隔离到 `reports/planning/superseded-*`，本计划基于当前 slug `platform-identity-audit` 重新执行的 deep-interview 与 ralplan 产物起草。

## 2. Intent / Desired Outcome

### Intent

建立后续业务功能统一复用的身份、权限和审计基础，避免各业务 feature 重复实现授权与审计逻辑，并确保平台从治理底座开始就满足 tenant/BU 隔离、最后超管保护、审计不可篡改等 MUST 规则。

### Desired Outcome

F006 完成后，平台支持本地 dev/test 登录与会话、用户管理、角色权限矩阵、服务端 RBAC/tenant 校验、不可变审计日志，以及与原型一致的 `login`、`usermgmt`、`perm` 页面真实 API 接入。`org` 组织管理与 `sys` 系统配置不进入 F006，实现范围留给 F007/F017。

## 3. 范围

### In Scope

#### 后端

- 认证会话 API：`POST /api/v1/auth/login`、`POST /api/v1/auth/logout`、`POST /api/v1/auth/refresh`、`GET /api/v1/auth/me`。
- 用户 API：用户查询、创建、启用/停用、解锁、角色分配、状态和最后登录时间。
- 角色权限 API：6 个预设角色、权限词表、角色权限矩阵。
- 审计 API：审计日志查询、按 eventId 查询、签名校验、导出契约占位。
- 安全校验：RBAC 默认拒绝、BU 管理员边界、最后超管保护、登录失败锁定、权限变更会话失效。
- 数据库：Tenant/User/Role/Permission/UserRole/AuditLog 的最小表结构与 seed 数据。

#### 前端

- `login`：登录表单、错误提示、SSO/语言入口占位、登录后跳转。
- `usermgmt`：用户列表、角色管理、权限矩阵、新建用户弹窗、启停/解锁入口。
- `perm`：角色权限矩阵、当前权限概览/申请历史 Tab、待审批卡片、授权列表、审批/添加授权/创建角色弹窗。
- 菜单权限：基于 `/api/v1/auth/me` 返回的 `menu:*` 权限控制可见性与未授权状态。

### Out of Scope / Non-goals

- `org` 组织管理页面和完整组织树维护：F007。
- `sys` 系统配置与认证集成配置 UI：F007/F017。
- 真实 YF LDAP/SSO/OAuth2/SAML 参数、MFA、SCIM/HR 同步、短信/邮件、密码找回、API Key 完整生命周期。
- F011 数据资产访问审批完整业务闭环。
- 不用 mock/假接口替代核心身份权限审计能力；测试 fixture 必须与后端契约一致。

## 4. Decision Boundaries

- 实现阶段可设计 Spring Security/JPA/Flyway/OpenAPI/React 组件结构，但必须复用 F003/F004 底座。
- 可实现本地 dev/test 认证 seam，但必须显式标注非生产 SSO。
- 可定义权限码词表和 seed 数据；后续 feature 扩展必须复用同一权限体系。
- 未确认外部参数必须保留 `TODO_CONFIRM_*`，不得猜测。
- 前端不得偏离原型信息架构；权限控制只能影响可见性/访问结果，不改变页面 key。

## 5. Exception Scenarios

- 连续登录失败 5 次：锁定 30 分钟，锁定期间不可登录，写 WARNING 审计。
- 最后一个超级管理员：禁止停用、删除或撤销其 `SUPER_ADMIN` 角色。
- ACTIVE 用户最后角色撤销：阻断；新建零权限用户允许存在但只显示空权限控制台。
- 权限变更/账号停用：会话版本失效或 token 黑名单等效机制立即生效。
- 跨 BU 越权：默认拒绝并写审计；隐藏资源存在性时返回 404，否则 403。
- 审计写入失败：高危业务操作阻断。

## Reuse Strategy

### Must Reuse

- 后端底座：`backend/smp-common` 的 `ApiResponse`、错误码/异常基线；`backend/smp-app` 的 `TraceIdFilter`、`SecurityConfig`、OpenAPI、Flyway/JPA 配置。
- 前端底座：`frontend/src/features/foundation/apiClient.ts` 的 envelope 类型和 `X-Trace-Id` 约定；`frontend/src/components/AppNavigation.tsx` 的页面 key 与导航结构；`frontend/src/App.tsx` 的路由骨架。
- 业务事实：`docs/business/domain/04-领域对象-平台域.md` 中 Tenant/User/Role/AuditLog 聚合；`docs/business/rules/05-平台与权限规则.md` 中 PLT-001~PLT-014。
- 原型事实：`docs/prototype/SMP工业AI平台-原型v2.html` 中 `Login`、`UserMgmt`、`Perm` 组件结构；`docs/prototype/screen-perm.png`、`docs/prototype/screen-sys.png`。
- 脚手架门禁：`tools/ai-scaffold` 的 `archive-planning-artifacts`、`check-build-feature-prereqs`、`verify-contract`、`check-task-traceability`、`gate`。

### Duplication Rejected

- 不复制已删除旧 backend/frontend 实现。
- 不新建与 `Tenant`、`User`、`Role`、`AuditLog` 冲突的平行领域模型。
- 不在前端硬编码“真实权限结果”替代服务端授权。
- 不绕过 F003 的统一 envelope、traceId、OpenAPI 和 Security 基线。
- 不把 F007 的 `org`/`sys` 页面能力提前塞入 F006。

### Approved New Seams

- 新增 PLATFORM 身份权限审计模块，建议包结构在 contract 阶段冻结：`identity`、`permission`、`audit`。
- 新增 `/api/v1/auth/*` 和 `/api/v1/platform/*` API seam。
- 新增权限码词表和 seed role migration，后续 F007~F020 复用。
- 新增前端 auth/session store、权限守卫、`login`/`usermgmt`/`perm` 页面组件。

## 7. 交付方案

1. **契约冻结**：定义认证、用户、角色、权限、审计 API；列出 DTO、错误码、权限码、审计事件、数据表和 `TODO_CONFIRM_*`。
2. **测试设计**：从 PLT-001~PLT-014 映射 AC 与测试用例，覆盖 happy path、权限失败、状态机错误、审计行为、原型视觉一致性。
3. **后端 TDD**：先写登录锁定、最后超管、最后角色撤销、BU 边界、审计签名和默认拒绝测试，再实现实体、migration、服务、Controller、Security。
4. **前端接入**：按原型拆分登录、用户管理、权限管理页面，接入后端 API 和权限菜单；保留主要文案、Tab、表格列、矩阵、卡片和弹窗。
5. **联调与 QA**：验证 envelope、401/403、登录态、权限菜单、审计写入、会话失效和页面原型一致性。
6. **质量门禁**：执行 contract、traceability、gate 与 E2E；证据归档到 `reports/`。

## 8. 数据、权限与审计

### 领域对象 / 表结构草案

- `platform_tenant`：最小 tenant/BU 数据，用于权限边界。
- `platform_user`：用户基础信息、状态、认证类型、失败次数、锁定时间、会话版本。
- `platform_role`：角色编码、名称、scope、preset、status。
- `platform_permission`：权限码、资源、动作、级别、条件。
- `platform_user_role`：用户-角色-BU 关联与有效期。
- `platform_audit_log`：不可变审计日志事实表。

### MUST 规则

- PLT-001：tenantId 隔离与跨租户显式授权。
- PLT-002 / PLT-012：零角色保护与新用户最小权限边界。
- PLT-003：最后一个超级管理员保护。
- PLT-004：连续失败锁定。
- PLT-005 / PLT-006：审计不可改删与至少 3 年保留策略占位。
- PLT-009 / PLT-010 / PLT-011 / PLT-014：BU 管理员边界、权限变更即时生效、高危审计、账号停用强制下线。

### 权限

- 预设角色：`SUPER_ADMIN`、`BU_ADMIN`、`DATA_ANNOTATOR`、`DATA_REVIEWER`、`MODEL_TRAINER`、`MODEL_OPS`。
- 权限粒度：菜单权限（如 `menu:usermgmt`）、功能权限（如 `platform:user:create`）、数据/资源条件（如 tenant/BU scope）。
- 默认策略：未认证返回 401；已认证无权限返回 403；隐藏资源存在性场景按规则返回 404。

### 审计事件

- `AUTH_LOGIN_SUCCESS`、`AUTH_LOGIN_FAILURE`、`AUTH_ACCOUNT_LOCKED`、`AUTH_LOGOUT`。
- `USER_CREATED`、`USER_DISABLED`、`USER_ENABLED`、`USER_UNLOCKED`。
- `ROLE_ASSIGNED`、`ROLE_REVOKED`、`PERMISSION_CHANGED`、`SESSION_INVALIDATED`。
- `ACCESS_DENIED`、`CROSS_TENANT_ACCESS_ATTEMPT`、`AUDIT_EXPORT_REQUESTED`。

## 9. 原型一致性验收

- `login`：保持全屏深色布局、平台 Logo/标题、账号/密码输入、登录按钮、版本标注、SSO/语言入口占位。
- `usermgmt`：保持 3-Tab（用户列表/角色管理/权限矩阵）、用户表字段、角色卡片网格、权限矩阵表、新建用户弹窗。
- `perm`：保持标题“权限管理”、副标题“RBAC 角色权限矩阵 · 6 个预设角色”、导出/创建角色按钮、当前权限概览/申请历史 Tab、角色权限矩阵、待审批卡片、数据集访问授权、添加授权弹窗。
- 菜单 key 必须继续使用 `login`、`usermgmt`、`perm`；权限控制只改变可见性和访问结果，不改变信息架构。
- QA 阶段必须对照 `docs/prototype/SMP工业AI平台-原型v2.html`、编译版和截图资产记录差异。

## 10. 风险与依赖

- `TODO_CONFIRM_YF_LDAP_URL`、`TODO_CONFIRM_YF_LDAP_BASE_DN`、`TODO_CONFIRM_SSO_PROTOCOL`、`TODO_CONFIRM_TOKEN_SIGNING_KEY_SOURCE`、`TODO_CONFIRM_AUDIT_COLD_STORAGE` 待确认。
- 是否允许新增 JWT 相关依赖需在 contract.md 中评估；优先利用 Spring Security 与现有依赖，避免无审查引入新依赖。
- 前端原型信息量大，必须分阶段实现但不可改变主结构；如果时间受限，优先保证 P0 登录、用户列表、权限矩阵、授权/审批关键路径。
- 审计冷存储与告警通道属于生产加固，F006 只定义 seam 与占位，F017 收口。

## 11. 后续验收项草案

- AC-01 认证 API 支持登录/登出/刷新/me，返回统一 envelope 与 traceId。
- AC-02 连续失败 5 次锁定 30 分钟并写审计。
- AC-03 最后一个 `SUPER_ADMIN` 不可停用/删除/撤销。
- AC-04 ACTIVE 用户最后有效角色撤销被阻断；新建零权限用户只显示空权限控制台。
- AC-05 RBAC 默认拒绝与 BU 管理员边界生效。
- AC-06 权限变更或账号停用后旧会话失效。
- AC-07 审计日志追加写入、不可改删、关键事件含风险等级和 before/after。
- AC-08 `login/usermgmt/perm` 页面结构与原型一致并接入真实 API。
- AC-09 `org/sys` 不进入 F006；所有未确认外部参数保留 `TODO_CONFIRM_*`。

## 12. 审批记录

- Reviewer: 待人审
- Decision: draft，需人工审阅并将 frontmatter 改为 `plan_status: approved` 后，方可进入 `/build-feature`。

