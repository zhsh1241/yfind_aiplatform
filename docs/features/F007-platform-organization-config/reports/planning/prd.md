> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-platform-organization-config.md`

﻿# PRD: F007 组织、配置与文件元数据

## 1. Problem Statement

F006 已提供最小身份、权限与审计能力，但当前组织/租户只是 seed 数据，系统配置、文件元数据、通知渠道和 org/sys 页面仍未成为可复用生产能力。若直接进入数据域或资源域，后续 feature 会重复定义 BU/项目、配置读取、文件 object key 和审计规则，造成模型冲突与权限返工。

## 2. Goals

1. 将 platform_tenant 扩展为正式集团/BU/项目组织树与租户隔离事实源。
2. 建立 scoped config registry，支持 GLOBAL/BU/PROJECT 配置继承、版本与审计。
3. 建立通用文件元数据与对象存储 key 管理，供 F009/F013/F015 复用。
4. 建立通知渠道配置与测试 seam，供告警、任务、审批等后续能力复用。
5. 按原型接入 org 与 sys 页面，并复用 F006 权限与审计。

## 3. Personas / Users

- 超级管理员：维护集团组织树、全局配置、存储/通知/认证参数、API Key、数据安全开关。
- BU 管理员：维护本 BU 项目、成员、BU 个性化配置、配额和通知偏好，但不能突破集团上限。
- 平台运维/安全管理员：查看配置版本与审计，测试通知渠道，管理敏感配置占位。
- 后续业务开发者：复用组织上下文、配置读取、文件元数据和通知配置 seam。

## 4. Functional Scope

### 4.1 Organization

- GET /api/v1/platform/organizations/tree
- POST /api/v1/platform/organizations
- PATCH /api/v1/platform/organizations/{id}
- DELETE /api/v1/platform/organizations/{id}（优先软删除/禁用）
- GET /api/v1/platform/organizations/{id}/members
- POST /api/v1/platform/organizations/{id}/members
- DELETE /api/v1/platform/organizations/{id}/members/{userId}

规则：三级结构、唯一编码、删除前检查、BU_ADMIN 子树边界、成员角色作用域。

### 4.2 Configuration

- 配置 registry：key、group、scope、valueType、defaultValue、sensitivity、validationRule、effectiveValue。
- 配置范围：基础、存储、通知、API Key、数据安全、认证集成、标签管理、BU 个性化配置。
- API：读取有效配置、更新配置、查询版本历史、回滚（可选）、测试配置（通知/认证/存储）。

### 4.3 File Metadata

- 领域对象：FileObject / FileMetadata。
- 状态：INITIATED → UPLOADED → VERIFIED → SOFT_DELETED → PURGED。
- API：初始化 object key、完成上传登记、查询元数据、下载授权/签名 URL seam、软删除/恢复。
- 实际对象存储参数：TODO_CONFIRM_MINIO_ENDPOINT、TODO_CONFIRM_MINIO_BUCKET、TODO_CONFIRM_MINIO_KMS_KEY。

### 4.4 Notification Config

- 渠道：站内、邮件、企业微信、钉钉、Webhook。
- 能力：保存渠道配置、脱敏展示、测试发送、失败诊断、审计。
- 不含完整消息中心/告警中心运营闭环。

### 4.5 Frontend

- org：3 Tab（组织架构/部门管理/成员管理）、组织树 SVG/树列表、租户列表、弹窗（新建租户、添加成员、节点增删改、编辑配额、BU 配置）。
- sys：基础设置、存储配置、通知设置、API Key、数据安全、认证集成、标签管理；保存/测试/撤销/一次性展示交互。

## 5. Non-Functional Requirements

- 安全：所有写操作强制权限、tenant/BU/project 边界、审计；敏感配置脱敏。
- 审计：组织、配置、文件、通知测试、API Key 高危操作记录 CRITICAL/WARNING/INFO。
- 可追溯：配置版本化；文件元数据包含 hash、object key、owner、traceId。
- 可扩展：后续 F009/F013/F015 只引用 file/config seam，不复制表。
- 原型一致：保留页面 key、Tab、主要表格列、弹窗与文案语义。

## 6. Reuse / Architecture Decision

- Reuse F006 PlatformIdentityService.requirePrincipal、equirePermission、canManageUser、session invalidation 和 platform_audit_log 写入模式。
- Extend platform_tenant rather than creating a parallel org table as the tenant source of truth.
- Add new migration V3__platform_organization_config_file.sql in build stage.
- Use Spring Boot + JDBC/JPA baseline; no new dependency unless contract justifies.
- Frontend extends rontend/src/features/platform/platformApi.ts or splits cohesive platform API modules, reusing piClient and sessionStore.

## 7. Risks

- Scope is broad because sys prototype includes many tabs; mitigation: freeze core backend seams and keep non-ready external integrations as TODO-confirmed configuration states.
- Object storage and notification external credentials may be unavailable; mitigation: store metadata/config and return explicit UNCONFIGURED status, not fake success.
- F006 service currently combines identity, permission and audit in one class; build stage may need careful refactor or adapter extraction with regression tests first.

## 8. Suggested Build Phases

1. Contract/TASK/test-plan freeze with API, DTO, permission, audit and SQL mapping.
2. Backend tests first: org rules, config inheritance, file metadata state, API Key one-time reveal, notification unconfigured/failure.
3. Backend implementation: migration, services, controllers, audit/permission reuse.
4. Frontend implementation: org/sys real API integration while preserving prototype structure.
5. Integration/QA/gate with visual evidence and F006 regression.

## 9. Critic Verdict

APPROVE for planning draft. Conditions before build: plan.md must stay draft until human approval; /build-feature must first pass check-build-feature-prereqs; contract must explicitly separate F007 config/file seams from F008/F009/F016/F017 out-of-scope items.
