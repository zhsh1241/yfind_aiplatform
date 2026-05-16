> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-platform-identity-audit.md`
> Interview transcript: `.omx/interviews/platform-identity-audit-20260516T005830Z.md`

﻿# Deep Interview Spec: F006-platform-identity-audit

## Metadata
- Feature: F006-platform-identity-audit
- Profile: standard, evidence-backed planning
- Context type: brownfield rebuild baseline
- Final ambiguity: 0.18
- Threshold: 0.20
- Context snapshot: `.omx/context/platform-identity-audit-*`

## Intent
建立生产可演进的身份、权限与审计底座，避免后续数据、模型、推理、资源功能各自重复实现认证授权和审计逻辑。

## Desired Outcome
F006 完成后，平台具备可运行的本地认证/会话、用户/角色/权限 API、RBAC + tenant/BU ABAC 校验、审计日志写入与查询、以及与原型一致的登录、用户管理、权限管理页面接入。

## In-Scope
- 认证/会话：`/api/v1/auth/login`、`/api/v1/auth/logout`、`/api/v1/auth/refresh`、`/api/v1/auth/me`。
- 用户：查询、创建、停用/启用、解锁、角色分配、权限变更触发会话失效。
- 角色/权限：6 个预设角色、权限码词表、角色权限矩阵、默认拒绝、BU 管理员边界。
- 审计：不可变审计表、签名字段、关键事件写入、审计查询/导出契约草案。
- 前端：`login`、`usermgmt`、`perm` 按原型接入真实 API；菜单可见性由后端 `me` 权限控制。
- 测试：规则 PLT-001~PLT-014 的 P0 覆盖，尤其最后超管、登录锁定、零角色边界、审计不可改删。

## Out-of-Scope / Non-goals
- 真实企业 LDAP/SSO、MFA、短信/邮件、SCIM/HR 同步、生产密钥管理。
- F007 完整组织管理和系统配置页面。
- F011 数据资产访问审批全业务闭环。
- 业务资源细粒度 ACL 的全部场景实现。

## Decision Boundaries
- Codex 可新增 Spring Security/JPA/Flyway/React 模块内必要代码 seam。
- Codex 不得新增未批准依赖；若必须新增安全/JWT 依赖，须在 contract.md 说明替代方案和理由。
- 未确认外部参数必须保留 `TODO_CONFIRM_*`。
- 页面实现必须以 `docs/prototype/SMP工业AI平台-原型v2.html` 和截图为准，不得为了便利重排主结构。

## Constraints
- 后端为授权事实源；前端不得只靠隐藏按钮实现安全。
- 所有正式文档中文输出。
- 使用 `/api/v1`、统一 envelope、traceId、OpenAPI 3.1。
- 审计写入失败时高危操作阻断。

## Testable Acceptance Criteria
- AC-01 登录成功/失败、刷新、登出、当前用户上下文可用。
- AC-02 连续失败 5 次锁定 30 分钟，锁定期间不可登录。
- AC-03 用户创建、停用、解锁、角色分配遵守 PLT-002/003/010/014。
- AC-04 6 个预设角色和权限矩阵可查询，默认拒绝生效。
- AC-05 BU 管理员不能跨 BU 管理或越权分配角色。
- AC-06 审计日志追加写入、不可修改/删除，关键事件含 before/after 与风险等级。
- AC-07 前端 `login` / `usermgmt` / `perm` 与原型结构一致，并通过 E2E smoke。
- AC-08 未确认 LDAP/SSO 参数全部以 `TODO_CONFIRM_*` 显式保留。
