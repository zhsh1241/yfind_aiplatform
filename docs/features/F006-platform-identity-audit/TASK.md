# Task: 身份、权限与审计底座

## Metadata
- Feature: F006-platform-identity-audit
- ID: TASK-platform-identity-audit
- Status: completed
- Owner: codex
- Created: 2026-05-16
- Updated: 2026-05-17
- 前置：同目录 `plan.md` 已人审批准；`reports/planning/deep-interview.md`、`prd.md`、`test-spec.md` 已归档。

## 1. 需求摘要

### User Story

作为 SMP 平台管理员和后续业务功能开发者，我想要统一的身份认证、用户角色权限、租户/BU 边界与审计日志底座，以便平台所有 DATA、MODEL、INFERENCE、RESOURCE 功能都复用同一套安全治理能力，并让 `login`、`usermgmt`、`perm` 三个原型页面接入真实 API。

### Business Value

- 在业务功能大规模开发前统一认证、授权、租户隔离和审计事实源，避免各功能重复实现安全逻辑。
- 满足 `docs/business/rules/05-平台与权限规则.md` 中 PLT-001、PLT-002、PLT-003、PLT-004、PLT-005、PLT-009、PLT-010、PLT-011、PLT-012、PLT-014 等 MUST 规则的最小生产级闭环。
- 将原型 `login`、`usermgmt`、`perm` 从占位页推进为真实 API 驱动页面，同时保持页面 key、信息架构、主文案、Tab、表格、矩阵、卡片和弹窗与原型一致。

### Source References

- Business docs:
  - `docs/business/bizdocs/05-01-系统功能-平台基础.md`
  - `docs/business/bizdocs/05-02-系统功能-国际化与审计日志.md`
  - `docs/business/domain/04-领域对象-平台域.md`
  - `docs/business/rules/05-平台与权限规则.md`
  - `docs/business/api/01-API接口规范.md`
- Prototype:
  - `docs/prototype/SMP工业AI平台-原型v2.html`
  - `docs/prototype/SMP工业AI平台-原型v2-compiled.html`
  - `docs/prototype/screen-perm.png`
  - `docs/prototype/screen-sys.png`
  - Page keys: `login`, `usermgmt`, `perm`
- Planning evidence:
  - `docs/features/F006-platform-identity-audit/reports/planning/deep-interview.md`
  - `docs/features/F006-platform-identity-audit/reports/planning/prd.md`
  - `docs/features/F006-platform-identity-audit/reports/planning/test-spec.md`

## 2. 范围

### In Scope

- [x] AC-01: 认证 API 支持 `POST /api/v1/auth/login`、`POST /api/v1/auth/logout`、`POST /api/v1/auth/refresh`、`GET /api/v1/auth/me`，统一返回 `ApiResponse` envelope、`traceId` 与会话信息。
- [x] AC-02: 本地 dev/test 账号连续登录失败 5 次后锁定 30 分钟，锁定期间拒绝登录，并写入 WARNING/CRITICAL 审计事件。
- [x] AC-03: 系统始终保护最后一个有效 `SUPER_ADMIN`，禁止停用、删除或撤销其超级管理员角色。
- [x] AC-04: 已激活用户撤销最后一个有效角色时被阻断；新建零权限用户可存在，但登录后只显示空权限控制台和提示。
- [x] AC-05: 服务端 RBAC 默认拒绝，BU 管理员只能管理本 BU 子树内用户和角色，跨 BU 越权返回 403/404 并记录审计。
- [x] AC-06: 权限变更、角色撤销、账号停用或解锁后会话版本变化，旧访问令牌立即失效或等效阻断。
- [x] AC-07: 审计日志仅追加写入，关键身份/权限事件包含 eventId、tenantId、operator、action、result、riskLevel、before/after 和 SHA-256 签名，并支持按条件查询和签名校验。
- [x] AC-08: 前端 `login`、`usermgmt`、`perm` 页面接入真实 API，保留原型主结构：登录卡片、用户管理 3 Tab、角色卡片、权限矩阵、权限管理 Tab、待审批卡片、授权列表和弹窗。
- [x] AC-09: `org` 组织管理和 `sys` 系统配置不进入 F006；真实 YF LDAP/SSO/OAuth2/SAML、MFA、SCIM/HR 同步、审计冷存储等未知外部参数保留 `TODO_CONFIRM_*`。

### Out of Scope

- `org` 组织树完整维护、BU 配置 UI 和组织成员批量导入，留给 F007。
- `sys` 系统配置、SSO/LDAP 管理界面和生产身份源接入，留给 F017 或专门集成 feature。
- F011 数据资产访问申请完整业务闭环；F006 只在 `perm` 页面保留审批/授权原型结构和最小演示数据契约。
- 真实短信、邮件、密码找回、MFA、API Key 生命周期、审计冷存储和安全告警通道生产集成。

## 3. 技术分析

### Backend

- Module/API:
  - 复用 `backend/smp-app` Spring Boot 4 应用和 `backend/smp-common` envelope/error seam。
  - 新增 `com.yf.smp.app.platform.identity`、`permission`、`audit` 或同等 PLATFORM 包结构。
  - 新增 `/api/v1/auth/*`、`/api/v1/platform/users/*`、`/api/v1/platform/roles/*`、`/api/v1/platform/permissions/*`、`/api/v1/platform/audit-logs/*`。
- Domain objects:
  - Tenant、User、Role、Permission、UserRole、Session、AuditLog。
- Business rules:
  - PLT-001 tenant/BU 边界；PLT-002/PLT-012 零角色规则；PLT-003 最后超管；PLT-004 登录锁定；PLT-005 审计不可变；PLT-009 BU 管理员边界；PLT-010 权限即时生效；PLT-011 高危审计；PLT-014 停用强制下线。

### Frontend

- Prototype page key: `login`、`usermgmt`、`perm`。
- Pages/components:
  - 新增登录页、用户管理页、权限管理页、权限守卫和 session store。
  - 复用 `AppNavigation` 中现有 page key；替换对应 `PrototypePage` 占位实现。
- States/interactions:
  - 登录成功写入 token/session；`/api/v1/auth/me` 驱动菜单可见性。
  - `usermgmt` 保留“用户列表 / 角色管理 / 权限矩阵”Tab、用户表、新建用户弹窗、启停/解锁/角色分配入口。
  - `perm` 保留“当前权限概览 / 申请历史”Tab、角色权限矩阵、待审批、数据集访问授权、添加授权/创建角色弹窗。

### AI Adapter / Integration

- Adapter endpoint: 不涉及 `ai-adapter/`。
- External system placeholders:
  - `TODO_CONFIRM_YF_LDAP_URL`
  - `TODO_CONFIRM_YF_LDAP_BASE_DN`
  - `TODO_CONFIRM_SSO_PROTOCOL`
  - `TODO_CONFIRM_TOKEN_SIGNING_KEY_SOURCE`
  - `TODO_CONFIRM_AUDIT_COLD_STORAGE`
  - `TODO_CONFIRM_E2E_USERNAME`
  - `TODO_CONFIRM_E2E_PASSWORD`

### Database

- Tables:
  - `platform_tenant`
  - `platform_user`
  - `platform_role`
  - `platform_permission`
  - `platform_role_permission`
  - `platform_user_role`
  - `platform_session`
  - `platform_audit_log`
- Migrations:
  - Flyway migration `V2__platform_identity_audit.sql` 或后续版本，包含最小 seed tenant、6 个预设角色、权限词表、测试管理员用户。

## Reuse Plan

- Existing reference seams to reuse:
  - `docs/business/domain/04-领域对象-平台域.md` 的 Tenant/User/Role/AuditLog 聚合。
  - `docs/business/rules/05-平台与权限规则.md` 的 PLT-001~PLT-014。
  - `docs/prototype/SMP工业AI平台-原型v2.html` 的 `Login`、`UserMgmt`、`Perm` 页面结构。
- Existing backend seams to reuse:
  - `backend/smp-common/src/main/java/com/yf/smp/common/api/ApiResponse.java`
  - `backend/smp-common/src/main/java/com/yf/smp/common/error/*`
  - `backend/smp-app/src/main/java/com/yf/smp/app/web/TraceIdFilter.java`
  - `backend/smp-app/src/main/java/com/yf/smp/app/config/SecurityConfig.java`
  - `backend/smp-app/src/main/resources/db/migration/V1__foundation_schema.sql`
  - 现有 Spring Boot / JPA / Flyway / Security / OpenAPI 测试基座。
- Existing frontend seams to reuse:
  - `frontend/src/features/foundation/apiClient.ts` 的 envelope 类型和 `X-Trace-Id` 注入。
  - `frontend/src/components/AppNavigation.tsx` 的 25 个原型 page key 和导航分组。
  - `frontend/src/App.tsx` 的路由骨架、TanStack Query 和 Ant Design 基座。
  - `frontend/src/App.test.tsx` 与 `frontend/e2e/smoke.spec.ts` 的测试入口。
- Existing scaffold seams to reuse:
  - `tools/ai-scaffold` 的 `check-build-feature-prereqs`、`verify-contract`、`check-task-traceability`、`gate --feature-dir`。
- Duplication rejected:
  - 不复制已删除旧 backend/frontend 实现。
  - 不创建与 Tenant/User/Role/AuditLog 冲突的平行领域模型。
  - 不在前端 mock 权限结果替代服务端授权；仅测试 fixture 可模拟 HTTP 响应。
  - 不绕过统一 envelope、traceId、OpenAPI 和 Security 基线。
- New seams allowed only if existing seams cannot be reused, because:
  - 身份、权限、审计是新业务底座能力，现有工程只有 foundation 占位；必须新增 PLATFORM 模块、API、migration、前端页面和权限 store。

## 5. Acceptance Criteria

- [x] AC-01: 认证 API 支持登录/登出/刷新/me，返回统一 envelope 与 traceId。
- [x] AC-02: 连续失败 5 次锁定 30 分钟并写审计。
- [x] AC-03: 最后一个 `SUPER_ADMIN` 不可停用、删除或撤销。
- [x] AC-04: ACTIVE 用户最后有效角色撤销被阻断；新建零权限用户只显示空权限控制台。
- [x] AC-05: RBAC 默认拒绝与 BU 管理员边界生效。
- [x] AC-06: 权限变更、角色撤销或账号停用后旧会话失效。
- [x] AC-07: 审计日志追加写入、不可改删、关键事件含风险等级、before/after 与签名校验。
- [x] AC-08: `login/usermgmt/perm` 页面结构与原型一致并接入真实 API。
- [x] AC-09: `org/sys` 不进入 F006；所有未确认外部参数保留 `TODO_CONFIRM_*`。

## 6. Definition of Done

- [x] plan.md 已批准。
- [x] contract.md 已冻结或实现态。
- [x] test-plan.md 引用全部 AC-xx。
- [x] 复用审查已完成。
- [x] 权限、审计和 MUST 规则有验证证据。
- [x] 后端 `mvn -f backend/pom.xml verify -DskipITs=true` 通过。
- [x] 前端 `npm run lint`、`npm run test:ci`、`npm run build` 通过。
- [x] Playwright E2E 覆盖 `login`、`usermgmt`、`perm` 主路径并通过。
- [x] `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F006-platform-identity-audit` 通过。
- [x] `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F006-platform-identity-audit` 通过。
- [x] `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F006-platform-identity-audit --run-e2e` 或等价 CI 通过。

## 7. 风险与问题

- 真实 YF LDAP/SSO/OAuth2/SAML 生产参数未确认，本 feature 只实现本地 dev/test seam 并保留 `TODO_CONFIRM_*`。
- 是否引入 JWT 第三方依赖需谨慎；优先实现服务端 session token seam，避免无审查新增依赖。
- 原型信息量较大，F006 必须保留核心结构和主文案；复杂审批业务闭环可按 out-of-scope 留到 F011，但 UI skeleton 不得丢失。
- 审计冷存储、告警渠道和 3 年保留的实际基础设施由后续 F017 收口，F006 先冻结 API/seam 与数据字段。
