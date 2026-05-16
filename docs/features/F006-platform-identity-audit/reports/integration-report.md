# F006 Phase 5 二次修复后联调复验报告

## Summary
- Feature: F006-platform-identity-audit
- Worktree: `.codex/worktrees/feature-platform-identity-audit`
- Date: 2026-05-17
- Verdict: PASS

## 结论
本轮复验基于代码、契约与测试结果确认以下目标均已满足：
1. 审计签名 canonical payload 已覆盖 `occurredAt`，且篡改 `occurredAt` 后 `verify` 返回 `valid=false`；
2. `SecurityConfig` 对 `/api/v1/platform/**` 默认拒绝，未登录请求返回 401；
3. `platform_user` 种子密码使用 BCrypt，未发现 `{noop}` 明文种子；
4. `GET /api/v1/platform/audit-logs` 支持 actor/action/riskLevel/result/time range/page/pageSize 多条件过滤与分页；
5. 前端 `platformApi.auditLogs(query)` 直接透传查询参数，`PermissionManagementPage` 的待审批/授权数据来自 `auditOverview()` 的 API 派生结果，而不是静态假数据。

## 检查范围
- 契约：`docs/features/F006-platform-identity-audit/contract.md`
- 后端：`backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformIdentityService.java`、`backend/smp-app/src/main/java/com/yf/smp/app/config/SecurityConfig.java`
- 前端：`frontend/src/features/platform/platformApi.ts`、`frontend/src/features/platform/PermissionManagementPage.tsx`
- 测试：`backend/smp-app/src/test/java/com/yf/smp/app/platform/PlatformPermissionAuditControllerTest.java`、`backend/smp-app/src/test/java/com/yf/smp/app/platform/PlatformUserManagementControllerTest.java`

## 证据

### 1) 审计签名覆盖 `occurredAt`，篡改后 verify 返回 `valid=false`
- `backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformIdentityService.java`
  - `recordAudit(...)` 在生成签名时传入 `occurredAt`：`auditSignature(..., occurredAt)`。
  - `auditSignature(AuditLogSummary item)` 读取 `item.occurredAt()` 并参与签名计算。
  - `canonicalTime(occurredAt)` 已被实际纳入 SHA-256 canonical payload。
- `backend/smp-app/src/test/java/com/yf/smp/app/platform/PlatformPermissionAuditControllerTest.java`
  - 先验证 `/verify` 返回 `valid=true`。
  - 再执行 `UPDATE platform_audit_log SET occurred_at = DATEADD('SECOND', -5, occurred_at)` 篡改时间字段。
  - 再次调用 `/verify`，断言 `tampered.at("/data/valid").asBoolean()` 为 `false`。

### 2) Security 默认拒绝
- `backend/smp-app/src/main/java/com/yf/smp/app/config/SecurityConfig.java`
  - `/api/v1/platform/**` 已配置为 `.authenticated()`，不再 `permitAll()`。
  - `PlatformSessionAuthenticationFilter` 已挂载到 Spring Security 过滤链。
- `backend/smp-app/src/test/java/com/yf/smp/app/platform/PlatformUserManagementControllerTest.java`
  - `GET /api/v1/platform/users` 未携带 token 时返回 `40100`，证明默认拒绝生效。

### 3) BCrypt 种子
- `backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformIdentityService.java`
  - 登录校验使用 `PasswordEncoder.matches(...)`。
  - 新增用户使用 `passwordEncoder.encode(...)`。
  - `PlatformDevPasswordSeeder` 仅在 `test/dev/local` profile 下重写测试账号密码。
- `backend/smp-app/src/test/java/com/yf/smp/app/platform/PlatformIdentityAuthControllerTest.java`
  - 断言 `platform_user.password_hash LIKE '{noop}%'` 的计数为 0。
- `backend/smp-app/src/main/resources/db/migration/V2__platform_identity_audit.sql`
  - 未发现 `{noop}` 明文密码种子。

### 4) `audit-logs` 多条件过滤分页
- `backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformIdentityService.java`
  - `auditLogs(String actor, String action, String riskLevel, String result, OffsetDateTime startTime, OffsetDateTime endTime, int page, int pageSize)` 支持：
    - actor 匹配 `operatorId/operatorName`
    - action 过滤
    - riskLevel 过滤
    - result 过滤
    - startTime/endTime 时间范围过滤
    - page/pageSize 分页
- `backend/smp-app/src/test/java/com/yf/smp/app/platform/PlatformPermissionAuditControllerTest.java`
  - `GET /api/v1/platform/audit-logs?actor=平台管理员&action=AUTH_LOGIN_SUCCESS&riskLevel=INFO&result=SUCCESS&page=1&pageSize=1`
  - 断言 `page=1`、`pageSize=1`、`total>=1`，并校验返回项的 `action/operatorName/result/riskLevel`。

### 5) 前端 `auditLogs(query)` 与权限页 API 派生数据
- `frontend/src/features/platform/platformApi.ts`
  - `auditLogs(query)` 直接将 `query` 作为 `params` 传给 `/api/v1/platform/audit-logs`。
  - `auditOverview()` 基于 `platformApi.auditLogs()` 的返回值计算 `approvals` 和 `grants`。
- `frontend/src/features/platform/PermissionManagementPage.tsx`
  - `approvals` 来自 `auditOverview.data?.approvals`。
  - `grants` 来自 `auditOverview.data?.grants`。
  - 历史表使用 `audits.data?.items`，未回退为静态假数据。

### 6) 运行验证结果
执行时间：2026-05-17（Asia/Shanghai），执行目录：`.codex/worktrees/feature-platform-identity-audit`。

| 命令 | 结果 | 关键摘要 |
|---|---|---|
| `$env:JAVA_HOME='C:\java\jdk-25'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; mvn -f backend/pom.xml -pl smp-app test "-Dtest=PlatformIdentityAuthControllerTest,PlatformPermissionAuditControllerTest,PlatformUserManagementControllerTest" -q` | PASS | F006 专项后端测试通过；认证、用户管理、权限审计测试均 0 failure。 |
| `$env:JAVA_HOME='C:\java\jdk-25'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; mvn -f backend/pom.xml verify -DskipITs=true` | PASS | Reactor Summary：`SMP Backend`、`SMP Common`、`SMP Platform Domain`、`SMP Application` 均 `SUCCESS`；`Tests run: 12, Failures: 0, Errors: 0, Skipped: 0`。 |
| `npm --prefix frontend run lint` | PASS | ESLint 退出码 0；仅保留 `AppNavigation.tsx` 的 `react-refresh/only-export-components` 非阻断 warning。 |
| `npm --prefix frontend run test:ci` | PASS | Vitest：`Test Files 1 passed (1)`；`Tests 3 passed (3)`。 |
| `npm --prefix frontend run build` | PASS | `tsc -b && vite build` 成功；Vite 输出 `✓ built`，仅 chunk size warning。 |
| `npm --prefix frontend run e2e` | PASS | Playwright：`2 passed`，覆盖 foundation smoke 与 F006 `login/usermgmt/perm` 主路径。 |

补充清理验证：执行 E2E/Build 后已删除 `frontend/dist` 与 `frontend/test-results`；`frontend/src/features/platform/platformApi.ts`、`frontend/src/features/platform/sessionStore.ts`、`backend/smp-app/src/main/resources/db/migration/V2__platform_identity_audit.sql` 均已确认 `BOM=False`；前端源码检索未发现 `localStorage` / `sessionStorage` / `smp.accessToken` token 持久化残留。

## Issues Found
- 无阻塞问题。

## Recommendations
- 保持 `verifyAudit()` 对缺失事件返回 404 的语义。
- 后续如继续增强审计不可篡改性，可考虑增加更多字段篡改回归用例，但当前复验目标已满足。

## 变更文件
- `docs/features/F006-platform-identity-audit/reports/integration-report.md`