> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-platform-identity-audit.md`

﻿# Test Spec: F006-platform-identity-audit

## 1. 验收项映射

| AC | 覆盖需求 | 证据类型 |
|---|---|---|
| AC-01 | 认证 API 登录/登出/刷新/me | 后端 API 测试、前端登录 E2E |
| AC-02 | 5 次失败锁定 30 分钟 | 后端单元/API 测试、审计断言 |
| AC-03 | 最后 SUPER_ADMIN 保护 | 后端服务/API 测试 |
| AC-04 | 零权限边界与最后角色撤销阻断 | 后端服务/API 测试、前端空权限状态 |
| AC-05 | RBAC 默认拒绝与 BU_ADMIN 边界 | 安全过滤/API 测试 |
| AC-06 | 权限变更/停用后会话失效 | 后端集成测试 |
| AC-07 | 审计日志不可改删、签名校验、高危阻断 | 后端服务/API 测试 |
| AC-08 | `login/usermgmt/perm` 原型一致并真实接入 | 前端组件测试、Playwright、视觉 QA 报告 |
| AC-09 | `org/sys` 不进入 F006，外部参数 TODO_CONFIRM | 文档/contract 检查 |

## 2. 后端测试计划

### Unit Tests
- `LoginFailurePolicyTest`：失败次数、锁定时间、锁定期间拒绝。
- `RoleAssignmentPolicyTest`：最后角色撤销、最后超管保护、BU_ADMIN 角色上限。
- `PermissionEvaluatorTest`：菜单/功能权限、默认拒绝、tenant/BU 条件。
- `AuditLogSignatureTest`：签名生成、校验、before/after 序列化。
- `SessionInvalidationTest`：权限版本变化后旧 token/session 拒绝。

### API / Integration Tests
- `AuthControllerTest`：login/logout/refresh/me envelope、traceId、401/403。
- `PlatformUserControllerTest`：列表过滤、创建、停用、解锁、角色分配。
- `PlatformRoleControllerTest`：预设角色、权限矩阵、权限词表。
- `AuditLogControllerTest`：查询过滤、eventId 查询、签名校验；确认无 update/delete endpoint。
- `PlatformSecurityTest`：受保护接口默认拒绝、BU_ADMIN 跨 BU 操作拒绝并写审计。

## 3. 前端测试计划

### Component / Store Tests
- 登录表单：必填、错误提示、锁定提示、成功后写入 session。
- 权限菜单：`menu:usermgmt`、`menu:perm` 控制导航可见性；无权限显示空权限提示。
- 用户管理：3-Tab 渲染、用户表字段、角色卡片、新建用户弹窗、停用/解锁操作反馈。
- 权限管理：矩阵表、申请历史 Tab、待审批卡片、添加授权/审批/创建角色弹窗。

### E2E
- 登录成功进入工作台。
- 打开用户管理，检查 3-Tab 与用户表。
- 打开新建用户弹窗，提交必填校验。
- 打开权限管理，检查标题、副标题、矩阵、申请历史 Tab、添加授权弹窗。
- 登出后访问受保护页面应回到登录或显示未认证状态。

## 4. 原型一致性 QA

对照资料：
- `docs/prototype/SMP工业AI平台-原型v2.html`
- `docs/prototype/SMP工业AI平台-原型v2-compiled.html`
- `docs/prototype/screen-perm.png`
- 用户管理和登录页对应原型源代码片段

检查项：
- 页面 key 不变：`login`、`usermgmt`、`perm`。
- 主标题/副标题不漂移。
- Tab 数量和名称不漂移。
- 表格列、角色矩阵、权限矩阵结构不漂移。
- 主要按钮和弹窗入口不漂移。

## 5. 门禁命令

规划阶段：
```powershell
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F006-platform-identity-audit --stage deep-interview
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F006-platform-identity-audit --stage ralplan
```

批准后进入开发前：
```powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F006-platform-identity-audit
```

实现完成后：
```powershell
node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F006-platform-identity-audit
node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F006-platform-identity-audit
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F006-platform-identity-audit --run-e2e
```

## 6. 退出条件

- 所有 P0 AC 均有自动化测试或 QA 证据。
- 代码审查 Verdict 放行。
- 原型一致性报告无 P0 偏差。
- 外部集成未知项全部以 `TODO_CONFIRM_*` 记录，无 secrets。
