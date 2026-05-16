> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-platform-identity-audit.md`
> Interview transcript: `.omx/interviews/platform-identity-audit-20260516T060322Z.md`

﻿# Deep Interview Spec: F006-platform-identity-audit

## Metadata
- Feature: F006-platform-identity-audit
- Slug: platform-identity-audit
- Profile: standard
- Rounds: 1 user-confirmed continuation + evidence-backed scope lock
- Final ambiguity: 0.17
- Threshold: 0.20
- Context snapshot: .omx/context/platform-identity-audit-20260516T060322Z.md
- Interview transcript: .omx/interviews/platform-identity-audit-20260516T060322Z.md

## Intent

为 SMP 平台建立统一可复用的身份、权限、租户/BU 边界和审计日志底座，避免后续业务 feature 重复实现授权与审计逻辑。

## Desired Outcome

F006 完成后，平台支持本地 dev/test 登录与会话、用户管理、角色权限矩阵、服务端 RBAC/tenant 校验、不可变审计日志，以及与原型一致的 login、usermgmt、perm 页面真实 API 接入。

## In Scope

- /api/v1/auth/*：登录、登出、刷新、当前用户上下文。
- /api/v1/platform/users：用户列表、创建、启用/停用、解锁、角色分配。
- /api/v1/platform/roles 与 /api/v1/platform/permissions：6 个预设角色、权限词表、权限矩阵。
- /api/v1/platform/audit-logs：审计查询、签名校验、导出契约占位。
- 后端权限校验：默认拒绝、BU 管理员边界、权限变更会话失效。
- 前端 login、usermgmt、perm 三个页面按原型实现真实接入。

## Out-of-Scope / Non-goals

- org 组织管理页面与完整组织树维护：F007。
- sys 系统配置/认证集成配置 UI：F007/F017。
- 真实 YF LDAP/SSO/OAuth2/SAML 参数、MFA、SCIM/HR 同步、短信/邮件、密码找回、API Key 全生命周期。
- F011 数据资产访问审批完整业务闭环。

## Decision Boundaries

- 可新增后端平台身份权限审计模块、Flyway 表、DTO、服务、Controller、测试。
- 可新增前端 auth/session store 与三页面组件，但必须保留原型页面 key 和信息架构。
- 未确认外部参数使用 TODO_CONFIRM_*。
- 不得在前端以 mock/静态状态替代服务端授权；测试 fixture 必须与后端契约一致。

## Constraints

- 后端是认证、授权、审计事实源。
- 所有 API 使用 /api/v1、统一 envelope、traceId。
- 审计写入失败时高危操作阻断。
- 原型一致性为硬验收：主标题、Tab、表格列、权限矩阵、卡片、弹窗必须对齐。

## Exception Scenarios

- 登录失败锁定、最后超管保护、最后角色撤销阻断、权限变更会话失效、跨 BU 越权拒绝、审计写入失败阻断。

## Testable Acceptance Criteria Draft

- AC-01 认证 API 支持登录/登出/刷新/me，返回统一 envelope 与 traceId。
- AC-02 连续失败 5 次锁定 30 分钟并写审计。
- AC-03 最后一个 SUPER_ADMIN 不可停用/删除/撤销。
- AC-04 ACTIVE 用户最后有效角色撤销被阻断；新建零权限用户只显示空权限控制台。
- AC-05 RBAC 默认拒绝与 BU 管理员边界生效。
- AC-06 权限变更或账号停用后旧会话失效。
- AC-07 审计日志追加写入、不可改删、关键事件含风险等级和 before/after。
- AC-08 login/usermgmt/perm 页面结构与原型一致并接入真实 API。
- AC-09 org/sys 不进入 F006；所有未确认外部参数保留 TODO_CONFIRM。
