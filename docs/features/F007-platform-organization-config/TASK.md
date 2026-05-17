# Task: 组织、配置与文件元数据

## Metadata
- Feature: F007-platform-organization-config
- ID: TASK-platform-organization-config
- Status: completed
- Owner: codex
- Created: 2026-05-17
- Updated: 2026-05-17
- 前置：同目录 `plan.md` 已人审批准；`reports/planning/deep-interview.md`、`prd.md`、`test-spec.md` 已归档。

## 1. 需求摘要

### User Story

作为 SMP 平台管理员和后续 DATA / MODEL / INFERENCE / RESOURCE 业务功能开发者，我想要统一的组织树、BU/PROJECT 配置、文件元数据、通知渠道和 API Key 管理能力，以便后续功能复用同一套平台治理事实源，并让 `org`、`sys` 两个原型页面接入真实 API。

### Business Value

- 在数据源、数据集、模型资产、推理服务、资源管理等业务 feature 之前统一 BU/PROJECT 上下文、配置读取、object key 与 API Key seam。
- 满足 `docs/business/rules/05-平台与权限规则.md` 中 PLT-009、PLT-010、PLT-011、PLT-012、PLT-014 等 MUST 规则。
- 将原型 `org`、`sys` 从占位页推进为真实 API 驱动页面，同时保持页面 key、信息架构、主文案、Tab、表格、状态和弹窗入口与原型一致。
- 未确认的 LDAP/SSO/MinIO/SMTP/IM/KMS/API Gateway 参数明确保留 `TODO_CONFIRM_*`，不伪造外部系统连通。

### Source References

- Business docs:
  - `docs/business/bizdocs/03-04-系统功能-平台管理.md`
  - `docs/business/bizdocs/05-01-系统功能-平台基础.md`
  - `docs/business/bizdocs/05-03-系统功能-通知与文件管理.md`
  - `docs/business/domain/04-领域对象-平台域.md`
  - `docs/business/rules/05-平台与权限规则.md`
  - `docs/business/api/01-API接口规范.md`
- Prototype:
  - `docs/prototype/SMP工业AI平台-原型v2.html`
  - `docs/prototype/SMP工业AI平台-原型v2-compiled.html`
  - `docs/prototype/screen-org.png`
  - `docs/prototype/screen-sys.png`
  - Page keys: `org`, `sys`
- Planning evidence:
  - `docs/features/F007-platform-organization-config/reports/planning/deep-interview.md`
  - `docs/features/F007-platform-organization-config/reports/planning/prd.md`
  - `docs/features/F007-platform-organization-config/reports/planning/test-spec.md`

## 2. 范围

### In Scope

- [x] 组织树支持集团 CORP、BU、PROJECT 三级结构，包含查询、新建、重命名/配额更新、禁用/删除前检查与编码唯一性。
- [x] 组织成员支持用户绑定、角色作用域、BU/PROJECT 作用域和跨 BU 边界校验。
- [x] 系统配置支持 GLOBAL / BU / PROJECT 作用域、继承链、版本记录、敏感值脱敏、集团上限校验和审计。
- [x] 文件元数据支持 object key 分配、上传完成登记、hash/size 校验、软删除/恢复、下载 URL seam 和权限校验。
- [x] 通知渠道支持邮件、钉钉、企业微信、Webhook 的配置读取/保存/测试；未配置时返回 `UNCONFIGURED` 与 `TODO_CONFIRM_*`。
- [x] API Key 支持创建、一次性明文展示、脱敏列表、撤销、有效期、权限范围和 CRITICAL 审计。
- [x] `org` 页面真实接入组织树、租户列表、成员列表、新建租户、添加成员、编辑配额、BU 配置入口。
- [x] `sys` 页面真实接入基础设置、存储配置、通知设置、API 密钥、数据安全、认证集成、标签管理。
- [x] 所有写操作复用 F006 `PlatformIdentityService`、`PlatformPrincipal`、RBAC/ABAC 边界和 `platform_audit_log`。

### Out of Scope

- F008 资源资产、集群节点、GPU/NPU 真实库存采集与调度配额执行。
- F009 数据源连接测试、数据集上传向导、数据集版本状态机与数据集文件业务管理。
- F011 数据资产门户访问申请/审批完整闭环。
- F016 告警中心、报表中心、通知中心收件箱和运营统计。
- F017 生产级可观测、安全扫描、审计冷存储、KMS、OpenSearch/Kafka、真实 SSO/LDAP/SMTP/IM/MinIO 集成。
- API Key 使用侧完整网关鉴权；F007 仅提供治理与生命周期 seam。

## 3. 技术分析

### Backend

- Module/API:
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformOrganizationConfigController.java`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformOrganizationConfigService.java`
  - `/api/v1/platform/organizations/**`
  - `/api/v1/platform/configs/**`
  - `/api/v1/platform/files/**`
  - `/api/v1/platform/notification-channels/**`
  - `/api/v1/platform/api-keys/**`
- Domain objects:
  - `OrganizationNode`、`OrganizationMember`、`ConfigDefinition`、`ConfigValue`、`FileObject`、`NotificationChannel`、`ApiKey`。
- Business rules:
  - 复用 F006 `PlatformIdentityService.requirePrincipal`、`requirePermission`、`PlatformPrincipal`。
  - `SUPER_ADMIN` 可管理全局；`BU_ADMIN` 限定在本 BU 子树内。
  - 配置继承顺序：`PROJECT > BU > GLOBAL`。
  - BU/PROJECT 配置不能突破 GLOBAL 上限。
  - API Key 明文只在创建响应中返回一次，数据库仅存 hash 和脱敏值。
  - 文件完成登记必须校验 hash/size。

### Frontend

- Prototype page key:
  - `org`：组织管理。
  - `sys`：系统配置。
- Pages/components:
  - `frontend/src/features/platform/OrganizationManagementPage.tsx`
  - `frontend/src/features/platform/SystemConfigPage.tsx`
  - `frontend/src/features/platform/platformApi.ts`
  - `frontend/src/App.tsx`
- States/interactions:
  - `org` 保留“组织架构 / 部门管理 / 成员管理”3 Tab。
  - `sys` 保留“基础设置 / 存储配置 / 通知设置 / API 密钥 / 数据安全 / 认证集成 / 标签管理”7 Tab。
  - 前端通过 `platformApi` 调用后端真实 API；仅单元测试和 E2E fixture mock HTTP。

### AI Adapter / Integration

- Adapter endpoint: F007 不新增 AI Adapter endpoint。
- External system placeholders:
  - `TODO_CONFIRM_MINIO_ENDPOINT`、`TODO_CONFIRM_MINIO_BUCKET`、`TODO_CONFIRM_MINIO_KMS_KEY`
  - `TODO_CONFIRM_SMTP_HOST`、`TODO_CONFIRM_SMTP_SENDER`
  - `TODO_CONFIRM_DINGTALK_WEBHOOK`、`TODO_CONFIRM_WECHAT_WEBHOOK`
  - `TODO_CONFIRM_LDAP_URL`、`TODO_CONFIRM_IDP_METADATA_URL`
  - `TODO_CONFIRM_API_GATEWAY_KEY_STRATEGY`

### Database

- Tables / columns:
  - 扩展 `platform_tenant`：`tenant_type`、`path`、`timezone`、`default_locale`、`quota_gpu`、`quota_storage_tb`、`api_rate_limit_per_day`、`updated_at`。
  - 新增 `platform_organization_member`。
  - 新增 `platform_config_definition`、`platform_config_value`、`platform_config_version`。
  - 新增 `platform_file_object`。
  - 新增 `platform_notification_channel`、`platform_notification_test_log`。
  - 新增 `platform_api_key`。
- Migrations:
  - `backend/smp-app/src/main/resources/db/migration/V3__platform_organization_config_file.sql`

## Reuse Plan

### Existing reference seams to reuse

- `docs/business/domain/04-领域对象-平台域.md` 的 Tenant/User/Role/Notification/AuditLog 平台域对象。
- `docs/business/rules/05-平台与权限规则.md` 的 PLT-009、PLT-010、PLT-011、PLT-012、PLT-014。
- `docs/business/api/01-API接口规范.md` 的 `/api/v1`、Bearer Token、统一 envelope 与 traceId。
- `docs/prototype/SMP工业AI平台-原型v2.html` 的 `Org`、`Sys` 页面结构与 Tab 文案。

### Existing service/scaffold seams to reuse

- 后端身份权限审计：
  - `PlatformIdentityService.requirePrincipal`、`requirePermission`、`PlatformPrincipal`。
  - `PlatformIdentityController` 已交付的登录、用户、角色、权限、审计能力。
  - `platform_tenant`、`platform_user`、`platform_role`、`platform_permission`、`platform_role_permission`、`platform_user_role`、`platform_session`、`platform_audit_log`。
- 统一 envelope / trace：
  - `backend/smp-common/src/main/java/com/yf/smp/common/api/ApiResponse.java`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformResponses.java`
  - `TraceIdFilter`。
- 前端 API 与 session：
  - `frontend/src/features/foundation/apiClient.ts`
  - `frontend/src/features/platform/platformApi.ts`
  - `frontend/src/features/platform/sessionStore.ts`
  - `frontend/src/components/AppNavigation.tsx` 的 page key / 菜单权限结构。
- 测试与门禁：
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/*` HTTP/JUnit 测试基座。
  - `frontend/src/App.test.tsx`、`frontend/e2e/helpers.ts`、`frontend/e2e/*.spec.ts`。
  - `tools/ai-scaffold/dist/cli.js verify-contract`、`check-task-traceability`、`gate`。

### New seams allowed only if existing seams cannot be reused, because

- `platform_config_definition/value/version`：F006 没有配置 registry，后续业务需要统一读取配置。
- `platform_file_object`：F006 没有文件元数据和 object key seam，F009/F013/F015 需要复用。
- `platform_notification_channel/test_log`：F006 只有审计，没有通知渠道治理。
- `platform_api_key`：F006 session token 不能替代面向外部调用方的 API Key 生命周期管理。
- 扩展 `platform_tenant`：避免新增平行组织事实源，保持 BU/PROJECT 上下文统一。

## 5. Acceptance Criteria

- [x] AC-01: 组织树支持 CORP/BU/PROJECT 查询、新增、重命名、禁用/删除前检查，编码唯一。
- [x] AC-02: BU/项目成员支持用户绑定、角色作用域和跨 BU 边界校验，复用 F006 用户角色。
- [x] AC-03: 系统配置支持 GLOBAL/BU/PROJECT 作用域、继承链、版本记录、校验和审计。
- [x] AC-04: BU/PROJECT 配置不能突破集团上限，配置变更后有效配置可即时读取。
- [x] AC-05: 文件元数据支持 object key 分配、上传完成登记、hash/size 校验、软删除/恢复和权限校验。
- [x] AC-06: 通知渠道配置测试返回真实状态并记录审计；未配置外部参数时返回 `UNCONFIGURED` / `TODO_CONFIRM_*`。
- [x] AC-07: API Key 创建仅一次展示明文，列表脱敏，撤销后不可用并记录 CRITICAL 审计。
- [x] AC-08: `org`、`sys` 页面结构、Tab、核心表格/弹窗与原型一致并接入真实 API。
- [x] AC-09: 所有写操作具备认证、授权、tenant/BU/project 边界、状态机校验和审计。
- [x] AC-10: F008/F009/F011/F016/F017 所需组织上下文、配置、文件、通知、API Key seam 与 `TODO_CONFIRM_*` 已保留。

## 6. Definition of Done

- [x] plan.md 已批准。
- [x] contract.md 为 implemented。
- [x] test-plan.md 引用全部 AC-xx。
- [x] 复用审查已完成。
- [x] 后端 Flyway migration、Controller、Service、DTO 与测试已交付。
- [x] 前端 `/org`、`/sys` 页面和 `platformApi` 已接入。
- [x] 后端 JUnit、前端 Vitest、Playwright E2E、scaffold gate 已通过。
- [x] integration/code-review/QA reports 已归档。

## 7. 风险与问题

- 真实 LDAP/SSO/MinIO/SMTP/企业微信/钉钉/KMS/API Gateway 参数仍待外部确认；F007 以 `TODO_CONFIRM_*` 和 `UNCONFIGURED` 明确表达。
- API Key 使用侧完整网关鉴权留给后续 API Gateway / 推理服务集成 feature。
- 文件元数据已提供 object key seam，但真实大文件流转、生命周期、冷存储和 KMS 不在 F007 范围。
