> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-platform-identity-audit.md`

﻿# PRD: F006-platform-identity-audit 身份、权限与审计底座

## Problem
后续业务域都依赖统一的身份、租户边界、角色权限与审计。如果 F006 不先建立事实源，数据/模型/推理/资源功能会重复实现授权逻辑，导致跨 BU 访问、审计缺失和原型页面长期停留在静态占位。

## Goals
1. 提供本地可运行、生产可替换的认证与会话底座。
2. 落地用户、角色、权限、租户/BU 上下文、审计日志的后端领域模型与 API。
3. 建立 6 个预设角色和菜单/功能/数据级权限词表，服务后续 feature 复用。
4. 将前端 `login`、`usermgmt`、`perm` 页面按原型结构接入真实 API。
5. 覆盖 `docs/business/rules/05-平台与权限规则.md` 中 P0/MUST 规则。

## Users
- 超级管理员：管理全平台用户、角色、权限、审计。
- BU 子管理员：管理本 BU 用户和授权，不得跨 BU。
- 普通平台用户：登录、查看自身权限、在授权范围内使用菜单。
- 审计/安全管理员：查询高危操作和权限变更日志。

## Functional Requirements
### Auth
- 支持本地 dev/test 账号登录、登出、刷新、当前用户上下文。
- 保留企业 LDAP/SSO 配置 seam：`TODO_CONFIRM_YF_LDAP_*`、`TODO_CONFIRM_SSO_*`。
- 连续失败 5 次锁定 30 分钟；SSO 用户不支持本地密码重置。

### User / Role / Permission
- 用户字段覆盖 employeeId、name、email、phone、tenant/BU、status、authType、lastLoginAt、failedLoginCount、lockedUntil、preferredLocale。
- 预置角色：SUPER_ADMIN、BU_ADMIN、DATA_ANNOTATOR、DATA_REVIEWER、MODEL_TRAINER、MODEL_OPS。
- 权限粒度：菜单、功能、数据行/资源条件；默认拒绝。
- 角色变更、账号停用必须触发会话失效。

### Audit
- 审计日志包含 eventId、operator、tenant、action、resource、result、riskLevel、before/after、traceId、signature。
- 高危操作写 CRITICAL 并触发告警占位事件；审计记录不可更新/删除。
- 提供审计查询 API，支持时间、操作人、资源、风险等级过滤。

### Frontend / Prototype Consistency
- 登录页保留原型全屏深色布局、平台标识、账号密码表单、版本标注和 SSO/语言入口占位。
- 用户管理保留 3-Tab：用户列表、角色管理、权限矩阵；保留用户表、角色卡片、新建用户弹窗。
- 权限管理保留角色权限矩阵、待审批卡片、权限申请审批弹窗、数据集访问授权列表、添加授权弹窗和申请历史 Tab。
- 所有页面数据来自 F006 API 或测试 fixture，不在 UI 内硬编码核心状态。

## Non-goals
- 不实现生产 LDAP/SSO 实参、MFA、短信/邮件、SCIM/HR 同步。
- 不实现完整 F007 组织管理、F011 数据资产审批、F017 安全生产加固。
- 不偏离原型重新设计 UI。

## Success Criteria
- `plan.md`、`TASK.md`、`contract.md`、`test-plan.md` 完整且通过 feature artifact gate。
- 后端单元/API 测试覆盖身份、权限、审计 MUST 规则。
- 前端测试和 Playwright 覆盖登录、用户管理、权限管理关键路径。
- `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F006-platform-identity-audit --run-e2e` 通过。

## Risks / Mitigations
- 外部 SSO 未确认：使用 `TODO_CONFIRM_*` + 可替换接口，不硬编码。
- PLT-002 与 PLT-012 边界易混淆：合同中明确“新建零权限”和“撤销最后角色”两个状态。
- 原型复杂度高：前端按组件切片实现，并用截图/页面 key 做验收清单。
