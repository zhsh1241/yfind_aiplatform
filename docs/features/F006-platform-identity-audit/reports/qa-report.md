# F006 QA 验收报告

## Summary
- Feature: F006-platform-identity-audit
- Worktree: `.codex/worktrees/feature-platform-identity-audit`
- Date: 2026-05-17
- Tester: qa-tester
- Verdict: PASS

## 验收范围
- 契约：`docs/features/F006-platform-identity-audit/contract.md`
- 测试计划：`docs/features/F006-platform-identity-audit/test-plan.md`
- 代码审查：`docs/features/F006-platform-identity-audit/reports/code-review-report.md`
- 联调报告：`docs/features/F006-platform-identity-audit/reports/integration-report.md`
- 代码与自动化测试：后端 Spring Boot 测试、前端 Vitest、Playwright、AI scaffold gate

## 结论
本次 QA 基于最新代码、自动化测试、代码审查报告与联调报告执行。P0 用例全部通过，AC-01~AC-09 均有对应证据支撑；原型 `login` / `usermgmt` / `perm` 页面关键文案、Tab、表格、矩阵、卡片、弹窗入口均已覆盖；后端身份/权限/审计关键规则与前端真实 API 接入均已验证；代码审查结论为 `APPROVE`，联调结论为 `PASS`，质量门禁通过，因此本次验收判定 `PASS`。

## Test Execution

### P0 Tests (Must Pass)
| ID | AC | Scenario | Status | Evidence |
|---|---|---|---|---|
| T-P0-01 | AC-01 | 认证 API envelope 与 traceId | PASS | `PlatformIdentityAuthControllerTest.authApisReturnEnvelopeTraceIdAndInvalidateOldSessionAfterRoleChange`；`mvn -f backend/pom.xml -pl smp-app test -Dtest=PlatformIdentityAuthControllerTest,PlatformPermissionAuditControllerTest,PlatformUserManagementControllerTest -q` 通过 |
| T-P0-02 | AC-02 | 连续失败锁定 | PASS | `PlatformIdentityAuthControllerTest.accountLocksAfterFiveFailedLoginsAndWritesAudit` 验证 5 次失败锁定、正确密码仍拒绝、写入 `AUTH_ACCOUNT_LOCKED` |
| T-P0-03 | AC-03 | 最后超管保护 | PASS | `PlatformUserManagementControllerTest.protectsLastSuperAdminAndRejectsLastRoleRevocation` 返回 `40900` 并阻断最后超管停用 |
| T-P0-04 | AC-04 | 零权限新用户与最后角色撤销保护 | PASS | `PlatformUserManagementControllerTest.zeroPermissionUserCanLoginButGetsEmptyConsole` + `protectsLastSuperAdminAndRejectsLastRoleRevocation` |
| T-P0-05 | AC-05 | BU 边界与默认拒绝 | PASS | `PlatformUserManagementControllerTest.buAdminCannotManageOtherBuUsersAndDefaultDenyApplies` 覆盖未登录 401、普通用户 403、跨 BU 403 |
| T-P0-06 | AC-06 | 权限变更后旧 session 失效 | PASS | `PlatformIdentityAuthControllerTest.authApisReturnEnvelopeTraceIdAndInvalidateOldSessionAfterRoleChange`、`refreshAndLogoutRevokeBearerSessionToken` |
| T-P0-07 | AC-07 | 审计追加写入与签名校验 | PASS | `PlatformPermissionAuditControllerTest.exposesPresetPermissionMatrixAndVerifiesAuditSignature` 与 `auditLogsSupportContractFiltersAndPagination` |
| T-P0-08 | AC-08 | 前端三页面接入 API | PASS | `frontend/src/App.test.tsx` 3 个 Vitest 用例覆盖 login/usermgmt/perm，数据均由 API mock 驱动 |
| T-P0-09 | AC-08 | 浏览器 E2E 主路径 | PASS | `frontend/e2e/platform-identity-audit.spec.ts`；`npm --prefix frontend run e2e` 显示 2 passed |

### P1 Tests (Should Pass)
| ID | AC | Scenario | Status | Evidence |
|---|---|---|---|---|
| T-P1-01 | AC-01, AC-07 | API 文档与契约一致 | PASS | `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F006-platform-identity-audit` 通过；`contract.md` 状态 frozen |
| T-P1-02 | AC-05 | 权限码矩阵完整 | PASS | `PlatformPermissionAuditControllerTest.exposesPresetPermissionMatrixAndVerifiesAuditSignature` 验证 6 个预设角色与 `平台管理` 模块 |
| T-P1-03 | AC-08 | 菜单权限驱动可见性 | PASS | `App.tsx` 通过 `menuPermissions` 控制页面访问；`zeroPermissionUserCanLoginButGetsEmptyConsole` 验证零权限用户登录后权限/菜单为空 |
| T-P1-04 | AC-09 | Out-of-scope 未越界 | PASS | `AppNavigation.tsx` 保留 `org`/`sys` 导航 key；契约声明 out-of-scope；未见 F006 对 `org/sys` 新增业务实现证据 |

### P2 Tests (Nice to Have)
| ID | AC | Scenario | Status | Evidence |
|---|---|---|---|---|
| T-P2-01 | AC-07 | 审计导出 seam | PASS | `PlatformPermissionAuditControllerTest.auditExportKeepsContractSeamAndWritesAudit` |
| T-P2-02 | AC-08 | 原型视觉抽查 | PASS | 人工对照 `LoginPage.tsx`、`UserManagementPage.tsx`、`PermissionManagementPage.tsx` 与原型关键结构，且 Vitest/Playwright 均覆盖关键文案与组件 |

## AC Coverage Matrix
| AC | Verdict | Evidence |
|---|---|---|
| AC-01 | PASS | 登录/`/me` envelope、traceId、token、菜单权限：`PlatformIdentityAuthControllerTest` |
| AC-02 | PASS | 连续失败锁定、锁定后拒绝正确密码、锁定审计：`PlatformIdentityAuthControllerTest` |
| AC-03 | PASS | 最后超管停用阻断：`PlatformUserManagementControllerTest` |
| AC-04 | PASS | 零权限用户创建/登录、最后角色撤销阻断：`PlatformUserManagementControllerTest` |
| AC-05 | PASS | 默认拒绝、BU 边界、角色权限矩阵：`PlatformUserManagementControllerTest`、`PlatformPermissionAuditControllerTest` |
| AC-06 | PASS | 角色变更后旧 session 失效、refresh/logout token 失效：`PlatformIdentityAuthControllerTest` |
| AC-07 | PASS | 审计查询、eventId 查询、签名校验、导出 seam：`PlatformPermissionAuditControllerTest` |
| AC-08 | PASS | 前端真实 API 接入、login/usermgmt/perm 原型一致性、Vitest + Playwright：`frontend/src/App.test.tsx`、`frontend/e2e/platform-identity-audit.spec.ts` |
| AC-09 | PASS | out-of-scope 边界、`TODO_CONFIRM_*` 保留、无越界业务实现：契约/代码抽查/联调报告 |

## 原型一致性检查

### Login (`/login`)
- PASS：深色全屏登录结构存在。
- PASS：主标识 `⚙ SMP`、`工业 AI 平台`、`账号登录`、用户名/密码/登录按钮存在。
- PASS：SSO 占位、语言入口、版本标注存在。
- Evidence：`frontend/src/features/platform/LoginPage.tsx`、`frontend/src/App.test.tsx` 第 1 个用例、`frontend/e2e/platform-identity-audit.spec.ts`。

### UserMgmt (`/usermgmt`)
- PASS：标题“用户管理”、副标题“账号管理 · 角色分配 · GPU 用量统计”。
- PASS：批量导入/新建用户按钮存在。
- PASS：3 个 Tab：用户列表 / 角色管理 / 权限矩阵。
- PASS：用户表、角色卡片、权限矩阵、新建用户弹窗入口存在。
- Evidence：`frontend/src/features/platform/UserManagementPage.tsx`、`frontend/src/App.test.tsx` 第 2 个用例、Playwright 路径验证。

### Perm (`/perm`)
- PASS：标题“权限管理”、副标题“RBAC 角色权限矩阵 · 6 个预设角色”。
- PASS：导出矩阵/创建角色按钮存在。
- PASS：Tab“当前权限概览”/“申请历史”存在。
- PASS：角色权限矩阵、待审批卡片、数据集访问授权表格、添加授权弹窗存在。
- Evidence：`frontend/src/features/platform/PermissionManagementPage.tsx`、`frontend/src/App.test.tsx` 第 3 个用例、Playwright 路径验证。

## 后端身份 / 权限 / 审计规则验收
- PASS：默认拒绝策略生效，仅 login/foundation/OpenAPI/health 放行；未认证平台接口返回 `40100`。
- PASS：BCrypt 密码校验与 seed 密码哈希已验证，无 `{noop}`。
- PASS：最后超管不可停用、ACTIVE 用户最后角色不可撤销。
- PASS：BU 管理员不能越权管理其他 BU 用户；普通用户访问管理接口被拒绝。
- PASS：角色/状态变更后旧 session 失效。
- PASS：审计日志包含签名，支持 eventId 查询与 `/verify` 校验；篡改 `occurredAt` 后 `valid=false`。
- PASS：审计导出 seam 保留且可返回受理/占位说明。

## 前端真实 API 接入验收
- PASS：`platformApi.ts` 中 login、me、users、roles、permissionMatrix、auditLogs、auditOverview 均通过 `/api/v1/**` 调用后端 API。
- PASS：`App.tsx` 按 `menuPermissions` 控制菜单和页面访问，不依赖本地硬编码权限。
- PASS：单元测试中允许 mock HTTP，但生产页面逻辑本身依赖 `platformApi`，符合“测试可 mock，生产 UI 不得把 mock 当核心能力”的契约约束。

## 代码审查 / 联调结论
- Code Review: PASS。`docs/features/F006-platform-identity-audit/reports/code-review-report.md` 最终 Verdict 为 `APPROVE`。
- Integration: PASS。`docs/features/F006-platform-identity-audit/reports/integration-report.md` 最终 Verdict 为 `PASS`。

## 命令证据
| Command | Result | Key Evidence |
|---|---|---|
| `$env:JAVA_HOME='C:\java\jdk-25'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; mvn -f backend/pom.xml -pl smp-app test "-Dtest=PlatformIdentityAuthControllerTest,PlatformPermissionAuditControllerTest,PlatformUserManagementControllerTest" -q` | PASS | F006 专项后端测试通过 |
| `$env:JAVA_HOME='C:\java\jdk-25'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; mvn -f backend/pom.xml verify -DskipITs=true` | PASS | `Tests run: 12, Failures: 0, Errors: 0, Skipped: 0` |
| `npm --prefix frontend run lint` | PASS | 0 error；1 个非阻塞 warning（`react-refresh/only-export-components`） |
| `npm --prefix frontend run test:ci` | PASS | `Test Files 1 passed`，`Tests 3 passed` |
| `npm --prefix frontend run build` | PASS | Vite build 成功；仅 chunk size warning |
| `npm --prefix frontend run e2e` | PASS | Playwright `2 passed` |
| `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F006-platform-identity-audit` | PASS | Contract frozen 且 ready for development |
| `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F006-platform-identity-audit` | PASS | AC traceability check passed |
| `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F006-platform-identity-audit --run-e2e` | PASS | Backend / ai-adapter / frontend / E2E 全部通过，Quality gate passed |

## Issues Found

### Critical
- 无。

### Major
- 无。

### Minor
| ID | Description | Impact | Status |
|---|---|---|---|
| QA-MINOR-01 | `frontend/src/components/AppNavigation.tsx` 存在 `react-refresh/only-export-components` lint warning | 不阻塞发布；建议后续整理常量导出位置 | Open |
| QA-MINOR-02 | Vitest 输出 `Could not parse CSS stylesheet` | 不影响测试通过；属于测试环境噪声 | Open |
| QA-MINOR-03 | Vite build 输出大 chunk warning | 不影响 F006 功能验收；建议后续关注前端拆包 | Open |

## Contract Compliance Checklist
- [x] 所有契约定义的核心功能已验证
- [x] API 响应符合统一 envelope / traceId 要求
- [x] 错误处理覆盖 401 / 403 / 404 / 409 / 422 关键路径
- [x] 审计写入与签名校验符合契约
- [x] 前端 `login` / `usermgmt` / `perm` 通过真实 API abstraction 接入
- [x] `org` / `sys` 保持 out-of-scope，不越界实现

## Sign-off
- [x] Ready for Release
- [ ] Needs Fix Before Release
- [ ] Needs Re-test After Fix
