# Test Plan: 身份、权限与审计底座

## 1. Test Scope

- Feature: F006-platform-identity-audit
- Contract version: v1
- Business references: `docs/business/domain/04-领域对象-平台域.md`, `docs/business/rules/05-平台与权限规则.md`, `docs/business/api/01-API接口规范.md`
- Prototype references: `docs/prototype/SMP工业AI平台-原型v2.html`, `docs/prototype/SMP工业AI平台-原型v2-compiled.html`, `docs/prototype/screen-perm.png`, `docs/prototype/screen-sys.png`

## 2. P0 - Blocking

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-01 | 认证 API envelope 与 traceId | `POST /api/v1/auth/login` 后 `GET /api/v1/auth/me`，传入 `X-Trace-Id` | HTTP 200；body/header traceId 一致；返回 token、user、roles、permissions、menuPermissions |
| T-P0-02 | AC-02 | 连续失败锁定 | 同一用户连续 5 次错误密码登录，再用正确密码登录 | 第 5 次写锁定审计；锁定期正确密码仍被拒绝；返回业务错误 |
| T-P0-03 | AC-03 | 最后超管保护 | 对最后一个 `SUPER_ADMIN` 执行停用或撤销角色 | HTTP 409/422；操作阻断；写 CRITICAL 审计 |
| T-P0-04 | AC-04 | 最后角色撤销保护与零权限新用户 | 创建零权限用户；对 ACTIVE 有角色用户撤销最后角色 | 新用户可登录但权限为空；撤销最后角色被阻断 |
| T-P0-05 | AC-05 | BU 管理员边界与默认拒绝 | BU 管理员访问其他 BU 用户；普通用户调用管理接口 | 403/404；写 WARNING/CRITICAL 审计；无权限接口默认拒绝 |
| T-P0-06 | AC-06 | 权限变更后旧 session 失效 | 登录拿 token；修改角色或停用账号；用旧 token 调用 `/me` | 返回 401；新 sessionVersion 生效 |
| T-P0-07 | AC-07 | 审计追加写入与签名校验 | 执行登录、用户创建、角色变更后查询审计并校验签名 | 审计记录包含 before/after/riskLevel/signature；verify 返回 valid=true |
| T-P0-08 | AC-08 | 前端三页面接入 API | Vitest mock API 渲染 `login/usermgmt/perm` | 主文案、Tab、表格、矩阵、弹窗入口存在；数据来自 API mock |
| T-P0-09 | AC-08 | 浏览器 E2E 主路径 | Playwright 登录后访问 `/usermgmt`、`/perm` | 登录成功；页面可见；用户管理 3 Tab 与权限管理矩阵可见 |

## 3. P1 - Important

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-01, AC-07 | API 文档和契约一致 | 检查 Controller/OpenAPI 暴露路径 | 路径与 contract.md 一致 |
| T-P1-02 | AC-05 | 权限码矩阵完整 | 查询 `/api/v1/platform/permissions/matrix` | 6 个预设角色、菜单/平台权限模块完整 |
| T-P1-03 | AC-08 | 菜单权限驱动可见性 | 使用零权限用户登录 | 显示空权限控制台提示，管理菜单不可访问或显示未授权 |
| T-P1-04 | AC-09 | Out-of-scope 未越界 | 检查变更和页面 | `org/sys` 未新增业务实现；`TODO_CONFIRM_*` 保留 |

## 4. P2 - Nice to Have

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-07 | 审计导出 seam | 调用 `/api/v1/platform/audit-logs/export` | 返回 accepted 或未配置冷存储说明；写 `AUDIT_EXPORT_REQUESTED` |
| T-P2-02 | AC-08 | 原型视觉抽查 | 对照 `screen-perm.png` 和原型源码人工检查 | 主要布局、标题、Tab、矩阵、卡片和弹窗一致 |

## 5. Cross-cutting Verification

- Permission: 覆盖未认证 401、无权限 403、跨 tenant/BU 403/404、角色权限矩阵和菜单权限。
- Audit: 覆盖登录成功/失败/锁定、用户创建、停用、解锁、角色授予/撤销、权限变更、跨 BU 拒绝、审计导出请求。
- Business rules: 明确覆盖 PLT-001、PLT-002、PLT-003、PLT-004、PLT-005、PLT-009、PLT-010、PLT-011、PLT-012、PLT-014。
- NFR: 统一 envelope、traceId、Flyway/JPA validate、无新增未审查依赖、前端 lint/test/build/E2E。
- Frontend visual/prototype parity: `login`、`usermgmt`、`perm` 必须对照原型页面 key、主文案、Tab、表格列、矩阵、卡片、弹窗入口。

## 6. Automated Test Mapping

- Backend JUnit / Spring Boot:
  - `PlatformIdentityAuthControllerTest` -> T-P0-01, T-P0-02, T-P0-06
  - `PlatformUserManagementControllerTest` -> T-P0-03, T-P0-04, T-P0-05
  - `PlatformPermissionAuditControllerTest` -> T-P0-07, T-P1-02, T-P2-01
  - `PlatformIdentityPolicyTest` -> PLT-001/002/003/004/009/010/011/012/014 unit coverage
- Frontend Vitest:
  - `App.test.tsx` / feature tests -> T-P0-08, T-P1-03
- Playwright:
  - `frontend/e2e/platform-identity-audit.spec.ts` -> T-P0-09
- Scaffold:
  - `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F006-platform-identity-audit`
  - `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F006-platform-identity-audit`
  - `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F006-platform-identity-audit --run-e2e`

## 7. Traceability

- AC-01 -> T-P0-01, T-P1-01
- AC-02 -> T-P0-02
- AC-03 -> T-P0-03
- AC-04 -> T-P0-04
- AC-05 -> T-P0-05, T-P1-02
- AC-06 -> T-P0-06
- AC-07 -> T-P0-07, T-P2-01
- AC-08 -> T-P0-08, T-P0-09, T-P1-03, T-P2-02
- AC-09 -> T-P1-04
