> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-platform-identity-audit.md`

﻿# Test Spec: F006-platform-identity-audit

## Acceptance Coverage
- AC-01: 登录、登出、刷新、当前用户上下文 API 返回统一 envelope 与 traceId。
- AC-02: 连续登录失败 5 次锁定账号 30 分钟；锁定事件写 WARNING 审计。
- AC-03: 最后一个 SUPER_ADMIN 不能被停用/删除。
- AC-04: ACTIVE 用户撤销最后有效角色被阻断；新建零权限用户可存在且菜单为空。
- AC-05: RBAC 默认拒绝，BU_ADMIN 跨 BU 操作返回 403/404 并写审计。
- AC-06: 权限变更、账号停用触发会话版本失效或 token 黑名单等效机制。
- AC-07: 审计日志只能追加写入和查询；无 UPDATE/DELETE API；签名字段可校验。
- AC-08: `login`、`usermgmt`、`perm` 页面结构与原型一致，核心表格/矩阵/弹窗可交互。
- AC-09: 未确认企业集成参数全部保留 `TODO_CONFIRM_*`，无 secrets。

## Backend Tests
- Unit: Password/lock policy, role assignment guard, permission evaluator, audit signature, tenant boundary evaluator。
- API: `/api/v1/auth/*`, `/api/v1/platform/users`, `/api/v1/platform/roles`, `/api/v1/platform/permissions`, `/api/v1/platform/audit-logs`。
- Integration: Flyway migration + seed roles + H2 PostgreSQL mode; security filter 401/403/default-deny。

## Frontend Tests
- Unit/component: 登录表单校验、用户列表渲染、角色卡片、权限矩阵、审批/授权弹窗。
- Integration: API client envelope、401 跳转登录、403 unauthorized 状态。
- E2E: 登录 → 用户管理 → 新建用户弹窗 → 权限管理矩阵/授权弹窗 → 登出。

## Manual / Visual QA
- 对照 `docs/prototype/SMP工业AI平台-原型v2.html`、`screen-perm.png`、`screen-sys.png` 和登录页原型检查布局、文案、Tab、表格列、按钮位置。
- 确认菜单 key `usermgmt`、`perm` 未变更；权限隐藏只影响可见性，不改变导航信息架构。

## Planned Commands
```powershell
node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F006-platform-identity-audit
node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F006-platform-identity-audit
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F006-platform-identity-audit --run-e2e
```
