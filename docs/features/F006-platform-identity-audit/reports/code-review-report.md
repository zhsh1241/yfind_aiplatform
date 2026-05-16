# F006 Phase 6 代码审查最终报告

## Summary
- Feature: F006-platform-identity-audit
- Worktree: `.codex/worktrees/feature-platform-identity-audit`
- Date: 2026-05-17
- Files Reviewed: 24（前两轮）+ 9（最终复核）
- Verdict: APPROVE

## 审查来源
- 第一轮 code-reviewer：`CHANGES_REQUIRED`，发现 H-01/H-02/H-03/M-01/L-01/L-02。
- 第二轮 code-reviewer：`REQUEST CHANGES`，确认 H-01/H-02/H-03/M-01 代码闭环，新增 token localStorage、BOM、运行产物、证据落档问题。
- 第三轮 code-reviewer（agent `019e31ab-62c2-7733-a478-05184967d004`）：`APPROVE`，0 issues；该 agent 因只读约束未直接改写本文件，本报告据其最终复审结论落档。

## 最终复核结论

### H-01 默认拒绝 / Bearer 鉴权：已闭环
- `backend/smp-app/src/main/java/com/yf/smp/app/config/SecurityConfig.java` 仅放行 login、foundation、OpenAPI、health。
- `/api/v1/auth/**`、`/api/v1/platform/**` 均要求 `authenticated()`。
- `PlatformSessionAuthenticationFilter` 将 Bearer session 解析为 `SecurityContext`。
- 未认证平台接口回归测试返回 `40100`。

### H-02 BCrypt / PasswordEncoder：已闭环
- 登录校验使用 `PasswordEncoder.matches(...)`。
- 新建用户密码使用 `passwordEncoder.encode(...)`。
- `V2__platform_identity_audit.sql` 中 seed 密码为 BCrypt hash，未发现 `{noop}`。
- dev/test/local profile 通过 seeder 提供测试账号口令，不在生产 migration 内置明文口令。

### H-03 审计签名完整性：已闭环
- 审计签名 canonical payload 已覆盖 `id/eventId/tenantId/operatorId/operatorName/operatorRole/action/resourceType/resourceId/result/riskLevel/before/after/detail/traceId/occurredAt`。
- `canonicalTime(occurredAt)` 已进入 SHA-256 摘要。
- 回归测试覆盖篡改 `occurred_at` 后 `/verify` 返回 `valid=false`。
- 不存在 eventId 返回 `40400`，不再出现空集 `valid=true`。

### M-01 audit-logs 查询过滤分页：已闭环
- `GET /api/v1/platform/audit-logs` 支持 `actor/action/riskLevel/result/startTime/endTime/page/pageSize`。
- Service 实现 operatorId/operatorName 匹配、条件过滤和真实分页。
- 前端 `platformApi.auditLogs(query)` 透传查询参数，`PermissionManagementPage` 的待审批/授权数据来自 API 派生。

### token localStorage 风险：已闭环
- 前端 Bearer token 已移除 `localStorage/sessionStorage` 持久化。
- 当前 token 仅保存于 `frontend/src/features/platform/platformApi.ts` 模块级内存变量，并由请求拦截器注入。
- `sessionStore.bootstrap()` 不再从浏览器持久化存储恢复 token。
- 全量检索 `localStorage|sessionStorage|smp.accessToken` 无命中。

### BOM 与运行产物：已闭环
- `frontend/src/components/AppNavigation.tsx`
- `frontend/src/styles/global.css`
- `frontend/src/features/platform/platformApi.ts`
- `frontend/src/features/platform/sessionStore.ts`
- `backend/smp-app/src/main/resources/db/migration/V2__platform_identity_audit.sql`
- 均确认 `BOM=False`。
- `frontend/dist` 与 `frontend/test-results` 已删除，提交前不包含运行产物。

### M-02 验证证据落档：已闭环
`docs/features/F006-platform-identity-audit/reports/integration-report.md` 已补齐：
- F006 专项后端测试；
- `$env:JAVA_HOME='C:\java\jdk-25'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; mvn -f backend/pom.xml verify -DskipITs=true`；
- `npm --prefix frontend run lint`；
- `npm --prefix frontend run test:ci`；
- `npm --prefix frontend run build`；
- `npm --prefix frontend run e2e`；
- BOM / 运行产物 / token 持久化清理验证。

## Issues Found
无阻塞问题。

## Security Review
- [x] 平台 API 默认拒绝，只有显式 public 端点放行。
- [x] 密码不以 `{noop}` 或明文存储，使用 BCrypt。
- [x] 前端 token 不落浏览器持久化存储。
- [x] SQL 使用参数化查询或固定 SQL，不拼接用户输入。
- [x] 审计签名覆盖关键字段并有篡改回归测试。

## Quality / Test Evidence
- `mvn -f backend/pom.xml verify -DskipITs=true`：PASS，`Tests run: 12, Failures: 0, Errors: 0, Skipped: 0`。
- `npm --prefix frontend run lint`：PASS，0 error / 1 non-blocking warning。
- `npm --prefix frontend run test:ci`：PASS，Vitest 3 passed。
- `npm --prefix frontend run build`：PASS。
- `npm --prefix frontend run e2e`：PASS，Playwright 2 passed。
- `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F006-platform-identity-audit`：PASS。
- `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F006-platform-identity-audit`：PASS。

## Recommendation
APPROVE