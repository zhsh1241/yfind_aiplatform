---
feature: F006-platform-identity-audit
title: 身份、权限与审计底座
plan_status: draft
approved_at: ""
owner: codex
created_at: 2026-05-16
updated_at: 2026-05-16
---

# Plan: 身份、权限与审计底座

## 1. 背景与目标

F003/F004/F005 已恢复后端、前端和部署工程底座。F006 是 R2 平台治理的首个业务底座，目标是在后续数据、模型、推理、资源等业务功能之前，建立统一的身份认证、租户/BU 边界、角色权限和审计日志事实源，并将前端 `login`、`usermgmt`、`perm` 页面从占位推进到真实接口接入。

- 业务来源：`docs/business/bizdocs/05-01-系统功能-平台基础.md`、`docs/business/bizdocs/05-02-系统功能-国际化与审计日志.md`、`docs/business/domain/04-领域对象-平台域.md`、`docs/business/rules/05-平台与权限规则.md`、`docs/business/api/01-API接口规范.md`。
- 原型来源：`docs/prototype/SMP工业AI平台-原型v2.html`、`docs/prototype/SMP工业AI平台-原型v2-compiled.html`、`docs/prototype/screen-perm.png`、`docs/prototype/screen-sys.png`，重点页面 key：`login`、`usermgmt`、`perm`。
- 规划证据：`reports/planning/deep-interview.md`、`reports/planning/prd.md`、`reports/planning/test-spec.md`。
- 目标结果：形成生产可演进、本地可运行、后续 feature 可复用的 PLATFORM 身份权限审计底座；前端必须保持与原型页面的信息架构、主文案、Tab、表格、矩阵、卡片和弹窗结构一致。

## 2. 范围

### In Scope

- 认证与会话：本地开发/测试账号登录、登出、刷新、当前用户上下文、权限变更后会话失效；企业 LDAP/SSO 配置 seam 与 `TODO_CONFIRM_*` 占位。
- 用户管理：用户列表、创建、停用/启用、解锁、角色分配、状态、最后登录、BU/租户归属。
- 角色与权限：6 个预设角色、菜单/功能/数据级权限词表、角色权限矩阵、RBAC 默认拒绝、必要 ABAC tenant/BU 边界校验。
- 审计日志：登录成功/失败、账号锁定、角色/权限变更、账号停用、越权访问、高危操作事件；审计记录追加写入、不可修改/删除、含签名字段。
- 前端接入：`login`、`usermgmt`、`perm` 三个页面按原型结构接入真实 API；菜单可见性由后端 `/api/v1/auth/me` 返回的权限驱动。
- 测试与质量：后端单元/API/集成测试，前端组件/E2E 测试，OpenAPI 契约、权限矩阵、审计事件清单和质量门禁证据。

### Out of Scope

- 不确认真实 YF LDAP、SSO/OAuth2/SAML、短信/邮件、企业审批系统、生产密钥管理参数。
- 不实现完整 F007 组织管理、系统配置、文件元数据；F006 仅保留权限判断所需的 tenant/BU 字段和默认种子数据。
- 不实现 F011 数据资产门户访问审批全闭环；F006 只提供可复用的授权/审批底座与权限页面入口。
- 不实现 MFA、SCIM/HR 同步、密码找回、API Key 全生命周期；相关能力在后续 feature 中规划。
- 不重新设计前端 UI；任何偏离原型的信息架构或布局都必须在报告中说明并经过审查。

## 3. Intent / Desired Outcome

### Intent

避免后续 DATA、MODEL、INFERENCE、RESOURCE 功能各自重复实现认证授权和审计逻辑，确保平台从第一个业务底座开始就具备企业级权限边界和审计可追踪性。

### Desired Outcome

F006 完成后，平台可通过本地 dev/test 账号登录，后端能返回用户上下文和权限集合，服务端对受保护接口默认拒绝并执行 RBAC/tenant 校验；管理员可在用户管理和权限管理页面维护用户、角色与授权；关键操作写入不可变审计日志；原型 `login`、`usermgmt`、`perm` 的结构和视觉层级得到保留。

## 4. Decision Boundaries

- 可由实现阶段决定 Spring 包结构、JPA 实体/DTO、Flyway migration、权限码命名、前端组件拆分和测试 fixture。
- 可实现本地 dev/test 认证 seam 保障联调，但不得把本地账号模式描述为生产 SSO 结论。
- 企业 LDAP/SSO、Token 签名密钥来源、邮件/短信、审计冷存储等未确认参数必须保留 `TODO_CONFIRM_*`。
- 前端不得仅通过隐藏按钮实现安全；所有敏感操作必须由后端权限校验兜底。
- PLT-002 与 PLT-012 的边界按本计划解释：新建/待激活/零权限用户可存在并登录空控制台；撤销已有 ACTIVE 用户最后有效角色必须阻断。

## 5. Exception Scenarios

- 连续登录失败 5 次后账号锁定 30 分钟，锁定期间即使密码正确也不可登录，并写 WARNING 审计。
- 最后一个有效 `SUPER_ADMIN` 不得被停用、删除或撤销超级管理员角色。
- 权限变更、账号停用、BU 禁用后，既有 token/session 必须立即失效或通过会话版本机制拒绝继续使用。
- BU 管理员跨 BU 操作时默认拒绝；涉及隐藏资源存在性的场景返回 404，其余返回 403，并记录审计。
- 审计写入失败时，高危业务操作必须阻断，不允许业务先成功再异步补审计。

## Reuse Strategy

### Must Reuse

- 后端底座：`backend/smp-common` 的 `ApiResponse`、错误码/异常基线，`backend/smp-app` 的 `TraceIdFilter`、`SecurityConfig`、OpenAPI、Flyway/JPA 配置。
- 前端底座：`frontend/src/features/foundation/apiClient.ts` 的 envelope 类型、`X-Trace-Id` 约定，`frontend/src/components/AppNavigation.tsx` 的页面 key 与导航结构，`frontend/src/App.tsx` 的路由骨架。
- 业务事实：`docs/business/domain/04-领域对象-平台域.md` 中 Tenant/User/Role/AuditLog 聚合，`docs/business/rules/05-平台与权限规则.md` 中 PLT-001~PLT-014。
- 原型事实：`docs/prototype/SMP工业AI平台-原型v2.html` 的 `Login`、`UserMgmt`、`Perm` 组件结构和 `screen-perm.png`/`screen-sys.png` 视觉资产。
- 脚手架与质量门禁：`tools/ai-scaffold` 的 plan、contract、traceability、gate 检查。

### Duplication Rejected

- 不复制已删除旧 backend/frontend 实现。
- 不新建与 `Tenant`、`User`、`Role`、`AuditLog` 冲突的平行领域模型。
- 不在前端硬编码“真实权限结果”作为核心能力替代；只允许测试 fixture 或 dev seed 数据。
- 不绕过 F003 的统一 envelope、traceId、OpenAPI 和 Security 基线。

### Approved New Seams

- 新增 PLATFORM 身份权限包：建议 `com.yf.smp.app.platform.identity`、`...permission`、`...audit`，最终以 contract.md 为准。
- 新增 `/api/v1/auth/*` 与 `/api/v1/platform/*` API seam，承载认证、用户、角色、权限、审计查询。
- 新增权限码词表和 seed role migration，后续 F007~F020 复用同一权限体系扩展。
- 新增前端 auth/session store、权限守卫和 `login`/`usermgmt`/`perm` 页面组件，但必须保持原型页面结构。

## 7. 交付方案

1. **契约冻结**：定义认证、用户、角色、权限、审计 API；列出 DTO、错误码、权限码、审计事件和 `TODO_CONFIRM_*`。
2. **测试设计**：从 PLT-001~PLT-014 映射 AC 与测试用例，覆盖 happy path、权限失败、状态机错误、审计行为、原型视觉一致性。
3. **后端 TDD**：先写权限/登录锁定/最后超管/审计签名等测试，再实现实体、migration、服务、Controller、Security filter。
4. **前端接入**：按原型拆分登录、用户管理、权限管理页面，接入后端 API 与权限菜单；保留主要文案、Tab、表格列、矩阵、卡片和弹窗。
5. **联调与 QA**：验证前后端 envelope、401/403、登录态、权限菜单、审计写入和页面原型一致性。
6. **质量门禁**：执行 contract、traceability、gate 与 E2E；所有证据归档到 `docs/features/F006-platform-identity-audit/reports/`。

## 8. 数据、权限与审计

### 领域对象

- `Tenant`：F006 最小字段用于 tenant/BU 边界；完整组织树和配置由 F007 扩展。
- `User`：employeeId、name、email、phone、tenantIds/status/authType/lastLoginAt/failedLoginCount/lockedUntil/preferredLocale。
- `Role` / `Permission`：预设角色、自定义角色 seam、菜单/功能/数据级权限、ABAC conditions。
- `AuditLog`：eventId、timestamp、operator、tenant、action、resource、result、detail、riskLevel、traceId、signature。

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
- 菜单 key 必须继续使用 `usermgmt`、`perm`；权限控制只改变可见性和访问结果，不改变信息架构。
- QA 阶段必须对照 `docs/prototype/SMP工业AI平台-原型v2.html` 与截图资产记录差异。

## 10. 风险与未决问题

- `TODO_CONFIRM_YF_LDAP_URL`、`TODO_CONFIRM_YF_LDAP_BASE_DN`、`TODO_CONFIRM_SSO_PROTOCOL`、`TODO_CONFIRM_TOKEN_SIGNING_KEY_SOURCE`、`TODO_CONFIRM_AUDIT_COLD_STORAGE` 待确认。
- 是否允许新增 JWT 相关依赖需在 contract.md 中评估；优先利用 Spring Security 与现有依赖，避免无审查引入新依赖。
- 前端原型信息量大，必须分阶段实现但不可改变主结构；如果时间受限，优先保证 P0 登录、用户列表、权限矩阵、授权/审批关键路径。
- 审计冷存储与告警通道属于生产加固，F006 只定义 seam 与占位，F017 收口。

## 11. 后续验收项草案

- AC-01 登录、登出、刷新、当前用户上下文 API 可用并返回统一 envelope。
- AC-02 连续登录失败 5 次锁定账号 30 分钟。
- AC-03 最后一个 `SUPER_ADMIN` 不可被停用/删除/撤销。
- AC-04 RBAC 默认拒绝与 BU 管理员边界生效。
- AC-05 角色/权限变更触发会话失效。
- AC-06 审计日志可追加写入、查询、签名校验，不存在更新/删除 API。
- AC-07 `login`、`usermgmt`、`perm` 前端页面与原型结构一致并接入真实 API。
- AC-08 未确认外部参数均保留 `TODO_CONFIRM_*`，无 secrets。

## 12. 审批记录

- Reviewer: 待人审
- Decision: draft，需人工审阅并将 frontmatter 改为 `plan_status: approved` 后，方可进入 `/build-feature` 实现阶段。
