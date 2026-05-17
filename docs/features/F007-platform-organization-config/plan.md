---
feature: F007-platform-organization-config
title: 组织、配置与文件元数据
plan_status: approved
approved_at: 2026-05-17
owner: codex
created_at: 2026-05-17
updated_at: 2026-05-17
---

# Plan: 组织、配置与文件元数据

## 1. 背景与目标

F006 已交付身份、权限与审计底座，但当前组织/租户仍停留在最小 seed 与权限边界支撑层，系统配置、通知渠道、API Key、文件元数据与对象存储 key 尚未形成可复用生产能力。F007 是 R2 平台治理第二个基础功能，目标是在进入 F009 数据源/数据集、F013 模型资产、F015 边端下发等业务域之前，先建立统一的组织上下文、BU/项目配置、文件元数据与通知配置 seam。

- 业务来源：`docs/business/bizdocs/03-04-系统功能-平台管理.md`、`docs/business/bizdocs/05-01-系统功能-平台基础.md`、`docs/business/bizdocs/05-03-系统功能-通知与文件管理.md`、`docs/business/domain/04-领域对象-平台域.md`、`docs/business/rules/05-平台与权限规则.md`、`docs/business/api/01-API接口规范.md`。
- 原型来源：`docs/prototype/SMP工业AI平台-原型v2.html`、`docs/prototype/SMP工业AI平台-原型v2-compiled.html`、`docs/prototype/screen-org.png`、`docs/prototype/screen-sys.png`；重点页面 key：`org`、`sys`。
- 技术基线：`docs/architecture/01-technology-stack-baseline.md`，继续使用 Java 21 / Spring Boot 4.0.x / Flyway / JPA / Spring Security / OpenAPI 3.1 与 React 19 / TypeScript 6 / Vite 8 / Ant Design 6。
- 规划证据：`reports/planning/deep-interview.md`、`reports/planning/prd.md`、`reports/planning/test-spec.md`。

## 2. Intent / Desired Outcome

### Intent

在 F006 身份权限审计底座之上建立后续业务域可复用的平台组织、配置、通知与文件元数据基础，避免每个 DATA/MODEL/RESOURCE/INFERENCE feature 重复定义 BU/项目、配置读取、对象存储 key、API Key 和审计规则。

### Desired Outcome

F007 完成后，平台应具备：

1. `org` 页面真实接入集团/BU/项目组织树、租户列表、部门/成员管理、新建租户、添加成员、编辑配额与 BU 个性化配置。
2. `sys` 页面真实接入基础设置、存储配置、通知设置、API Key、数据安全、认证集成、标签管理等配置分组。
3. 后端提供可复用的组织上下文、配置注册/版本/作用域覆盖、文件元数据/object key、通知渠道测试、API Key 管理 seam。
4. 所有组织、配置、文件、通知测试、API Key 写操作均复用 F006 的认证、RBAC/ABAC、tenant/BU 边界和审计日志。
5. 未确认的 LDAP/SSO/MinIO/SMTP/IM/KMS 等外部参数以 `TODO_CONFIRM_*` 显式保留，不用假成功或 mock 替代核心流程。

## 3. 范围

### In Scope

#### 后端

- 组织树与租户扩展：
  - 集团 `CORP` → BU → 项目 `PROJECT` 三级结构。
  - 组织节点查询、新增、重命名/配置更新、禁用/删除前检查。
  - 租户/组织编码唯一性：BU 编码全局唯一，项目编码在 BU 内唯一。
  - 基于 F006 Principal 的 SUPER_ADMIN / BU_ADMIN 子树边界校验。
- 组织成员与作用域授权：
  - 用户绑定 BU/项目。
  - 用户-角色-组织作用域关系。
  - 跨 BU 用户绑定与身份切换契约，为后续完整会话切换预留 seam。
- 系统配置：
  - 配置 registry：`key`、`group`、`scope`、`valueType`、`defaultValue`、`sensitivity`、`validationRule`、`effectiveValue`。
  - 作用域：`GLOBAL` / `BU` / `PROJECT`，解析优先级 `PROJECT > BU > GLOBAL`。
  - 配置分组：基础设置、存储配置、通知设置、API Key、数据安全、认证集成、标签管理、BU 个性化配置。
  - 配置版本、变更审计、敏感配置脱敏展示。
- 文件元数据与对象 key：
  - 文件 ID、资产类型、bucket/key、hash、size、contentType、storageTier、tenant/BU/project、owner、状态、审计关联。
  - object key 分配、上传完成登记、hash/size 校验、下载授权/签名 URL seam、软删除/恢复。
  - 大文件字节流与真实对象存储连接参数不在数据库中保存明文；外部对象存储参数使用 `TODO_CONFIRM_MINIO_*`。
- 通知渠道配置测试：
  - 邮件、企业微信、钉钉、Webhook 等渠道的配置保存、脱敏展示、测试发送、失败诊断与审计。
  - 未配置时返回明确 `UNCONFIGURED` / `TODO_CONFIRM_*` 状态，不伪造测试成功。
- API Key 最小管理能力：
  - 创建、一次性明文展示、脱敏列表、撤销、有效期、审计。
  - API Key 使用侧完整调用鉴权可作为 seam，推理服务/API 网关集成留给后续 feature。
- 权限与审计：
  - 新增 `menu:org`、`menu:sys` 及组织/配置/文件/通知/API Key 操作权限码。
  - 高危操作按 PLT-011 记录 CRITICAL 审计；跨 BU/越权按 F006 规则记录审计。

#### 前端

- `org` 组织管理页面：
  - 保留 3 Tab：组织架构、部门管理、成员管理。
  - 保留组织架构图/组织树、租户列表、搜索、租户配额进度、状态标识、权限跳转、编辑配额、BU 配置入口。
  - 接入新建租户、添加成员、节点添加/重命名/删除确认、编辑配额、BU 个性化配置弹窗。
- `sys` 系统配置页面：
  - 保留基础设置、存储配置、通知设置、API 密钥、数据安全、认证集成、标签管理 Tab。
  - 接入配置读取/保存、通知渠道测试、存储配置状态、API Key 新建/撤销、标签维护、认证集成未配置态。
- 菜单与授权：
  - 复用 F006 sessionStore、`platformApi`、`apiClient`、菜单权限控制。
  - `org` / `sys` 仅受权限控制可见性和访问结果，不改变原型信息架构。

### Out of Scope / Non-goals

- F008 资源资产、集群节点、GPU/NPU、资源池真实库存采集与调度配额执行。
- F009 数据源连接测试、数据集上传向导、数据集版本状态机与数据集文件业务管理。
- F011 数据资产门户访问申请/审批完整闭环。
- F016 告警中心、报表中心、完整通知中心收件箱、运营统计与告警规则运营闭环。
- F017 生产级可观测、安全扫描、审计冷存储、KMS/密钥托管、OpenSearch/Kafka 完整落地。
- 真实 LDAP/SSO/SAML/OAuth2、SMTP、企业微信、钉钉、MinIO/S3/KMS 参数猜测。
- 不恢复或复制已删除旧 backend/frontend 实现。

## 4. Decision Boundaries

- 可以新增 `organization`、`config`、`file`、`notification`、`apikey` 等平台子模块，但必须位于 `platform` 领域下，并复用 F006 Principal、权限校验和审计 seam。
- 可以扩展 `platform_tenant` 为正式组织树事实源；不得建立与 `Tenant` 冲突的平行组织/租户事实源。
- 可以新增配置 registry、配置版本、文件元数据、通知渠道、API Key 表；表名和契约在 `/build-feature` 的 `contract.md` 中冻结。
- 可以设计 API Key 本地哈希存储和一次性明文展示；外部 API 网关、签名算法、Key 下发边界保留 `TODO_CONFIRM_API_GATEWAY_*`。
- 可以规划对象存储 bucket/key/hash 元数据；真实大文件存储、KMS、生命周期和 endpoint 参数保留 `TODO_CONFIRM_MINIO_*`。
- 可以保留原型中部分外部集成配置为“未配置/待确认”真实状态，但不得用静态 mock 假装联通。

## 5. Exception Scenarios

- 删除组织节点时存在子节点、用户、项目、文件元数据或后续业务引用：阻断删除或进入 `DISABLED`，不得物理删除事实记录，并写审计。
- BU_ADMIN 尝试查看/修改其他 BU 或集团级配置：返回 403，写 WARNING/CRITICAL 审计。
- BU/PROJECT 配置试图放宽集团上限（例如上传大小、下载开关、安全策略、API 限流）：返回业务规则失败并写审计。
- 通知渠道未配置、凭证缺失或测试失败：返回 `UNCONFIGURED` / `FAILED` 和可诊断原因，不影响其他配置保存，不伪造成功。
- 文件上传完成时 hash/size 不匹配、重复完成、越权下载、软删除后访问：返回 409/422/403/404，写审计。
- API Key 明文关闭后再次查看：只展示脱敏值，不允许恢复明文；撤销后不可再使用。
- 敏感配置读取：只返回脱敏值和配置状态，不返回 secret 明文。

## Reuse Strategy

### Must Reuse

- F006 后端身份权限审计：
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformIdentityController.java`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformIdentityService.java`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformSessionAuthenticationFilter.java`
  - `backend/smp-app/src/main/java/com/yf/smp/app/config/SecurityConfig.java`
  - `platform_tenant`、`platform_user`、`platform_role`、`platform_permission`、`platform_user_role`、`platform_session`、`platform_audit_log`。
- F003/F004 底座：
  - `backend/smp-common` 的统一 `ApiResponse`、错误码/异常基础。
  - `TraceIdFilter`、OpenAPI、Flyway、Spring Security 配置。
  - `frontend/src/features/foundation/apiClient.ts`、`frontend/src/features/platform/platformApi.ts`、`frontend/src/features/platform/sessionStore.ts`。
  - `frontend/src/components/AppNavigation.tsx` 的页面 key 与导航结构。
- 业务事实：
  - `docs/business/domain/04-领域对象-平台域.md` 中 Tenant/User/Role/Notification/AuditLog 等平台域对象。
  - `docs/business/rules/05-平台与权限规则.md` 中 PLT-007、PLT-009、PLT-010、PLT-011、PLT-012、PLT-014 等规则。
  - `docs/business/bizdocs/05-03-系统功能-通知与文件管理.md` 中 FUNC-NOTIFY-001~010、FUNC-FILE-001~009。
- 原型事实：
  - `docs/prototype/SMP工业AI平台-原型v2.html` 中 `Org`、`Sys` 组件结构。
  - `docs/prototype/screen-org.png`、`docs/prototype/screen-sys.png`。
- 脚手架门禁：
  - `tools/ai-scaffold` 的 `archive-planning-artifacts`、`check-build-feature-prereqs`、`check-feature-artifacts`、`verify-contract`、`check-task-traceability`、`gate`。

### Duplication Rejected

- 不新增与 `platform_tenant` 并行的组织/租户事实源。
- 不在 DATA/MODEL/RESOURCE/INFERENCE feature 内重复定义配置表、文件元数据表或 object key 规则。
- 不在前端硬编码配置保存成功、通知测试成功、API Key 明文或组织成员结果来替代真实后端能力。
- 不复制原型 JSX 作为生产实现；应按现有 React/Ant Design 工程结构重建并保持信息架构与文案语义一致。
- 不引入新依赖来规避现有 Spring Security、Flyway、JPA/JdbcTemplate、React Query/Zustand seam，除非 contract 明确证明必要。

### Approved New Seams

- `platform_organization` / 扩展 `platform_tenant` 的组织树字段、配置字段和引用检查 seam（最终表名在 contract 冻结）。
- `platform_config_definition`、`platform_config_value`、`platform_config_version`。
- `platform_file_object` 或等价文件元数据表。
- `platform_notification_channel`、`platform_notification_test_log`。
- `platform_api_key`。
- 前端 `OrganizationManagementPage`、`SystemConfigPage` 及可复用 platform API/types，可从当前 `PrototypePage` 占位迁移到真实页面。

## 7. 交付方案

1. **契约冻结**：定义组织、成员、配置、文件元数据、通知测试、API Key API；明确 DTO、错误码、权限码、审计事件、SQL 表、外部 `TODO_CONFIRM_*`。
2. **测试设计**：从 PRD/test-spec 转化 `TASK.md` 与 `test-plan.md`，覆盖 happy path、权限失败、状态机错误、审计行为、原型一致性和未配置外部系统状态。
3. **后端 TDD**：先写组织树规则、配置继承与上限校验、文件元数据状态机、API Key 一次性展示、通知测试未配置/失败、F006 权限审计回归测试。
4. **后端实现**：Flyway migration、领域服务、Controller、权限码 seed、审计事件、OpenAPI 注解。
5. **前端接入**：按原型接入 `org`、`sys` 页面，复用 `apiClient` 与 session/permission store，保留主要 Tab、表格、弹窗、提示与状态。
6. **联调与 QA**：验证 envelope、401/403、tenant/BU 边界、配置保存、通知测试、API Key、文件元数据、审计日志和视觉一致性。
7. **质量门禁**：执行 contract、traceability、feature artifacts、gate；涉及前端行为时补充 Playwright E2E 与截图/视觉差异说明。

## 8. 数据、权限与审计

### 领域对象 / 表结构草案

- `Tenant / OrganizationNode`：`id`、`code`、`name`、`tenantType`、`parentId`、`path`、`status`、`timezone`、`defaultLocale`、`createdAt`、`updatedAt`。
- `OrganizationMember`：`id`、`organizationId`、`userId`、`roleCode`、`scopeType`、`scopeId`、`status`、`expiresAt`。
- `ConfigDefinition`：`key`、`group`、`valueType`、`defaultValue`、`sensitive`、`scopeAllowed`、`validationRule`。
- `ConfigValue`：`key`、`scopeType`、`scopeId`、`valueJson`、`maskedValue`、`version`、`updatedBy`。
- `FileObject`：`fileId`、`assetType`、`tenantId`、`projectId`、`bucket`、`objectKey`、`sha256`、`sizeBytes`、`contentType`、`storageTier`、`status`、`ownerId`。
- `NotificationChannel`：`channelId`、`type`、`scopeType`、`scopeId`、`enabled`、`configMasked`、`status`、`lastTestAt`。
- `ApiKey`：`keyId`、`name`、`prefix`、`keyHash`、`scope`、`expiresAt`、`revokedAt`、`createdBy`、`lastUsedAt`。

### MUST / SHOULD 规则

- PLT-009：BU 管理员权限边界限定在本 BU 子树内。
- PLT-010：权限变更、组织成员作用域变更后必须即时生效。
- PLT-011：修改全局系统配置、跨租户操作、API Key 创建/撤销、文件删除等高危操作记录 CRITICAL 审计并触发告警 seam。
- PLT-012：新用户零权限原则；F007 添加成员/作用域授权必须显式分配。
- PLT-014：账号停用和组织成员状态变更应复用 F006 强制下线/权限失效 seam。
- FUNC-PLT-031~038：组织树、租户上下文、BU 配置、项目隔离、跨 BU 用户绑定、BU 系统配置隔离。
- FUNC-NOTIFY-001~010：通知配置、偏好、历史/统计 seam。
- FUNC-FILE-001~009：文件上传、存储分层、下载权限、回收站、存储配额 seam。

### 权限码草案

- `menu:org`、`menu:sys`
- `platform:organization:read/create/update/delete`
- `platform:organization:member:read/assign/remove`
- `platform:config:read/update/test`
- `platform:config:sensitive:read`
- `platform:file:read/init/complete/delete/restore/download`
- `platform:notification:read/update/test`
- `platform:apikey:read/create/revoke`

### 审计事件草案

- `ORG_NODE_CREATED`、`ORG_NODE_UPDATED`、`ORG_NODE_DISABLED`、`ORG_NODE_DELETE_BLOCKED`
- `ORG_MEMBER_ASSIGNED`、`ORG_MEMBER_REMOVED`、`ORG_SCOPE_CHANGED`
- `CONFIG_UPDATED`、`CONFIG_ROLLED_BACK`、`CONFIG_LIMIT_REJECTED`、`SENSITIVE_CONFIG_READ_ATTEMPT`
- `FILE_OBJECT_INITIATED`、`FILE_UPLOAD_COMPLETED`、`FILE_HASH_MISMATCH`、`FILE_SOFT_DELETED`、`FILE_RESTORED`、`FILE_DOWNLOAD_REQUESTED`
- `NOTIFICATION_CHANNEL_UPDATED`、`NOTIFICATION_TEST_REQUESTED`、`NOTIFICATION_TEST_FAILED`
- `API_KEY_CREATED`、`API_KEY_REVOKED`、`API_KEY_REVEAL_ATTEMPTED`

## 9. 原型一致性验收

- `org` 页面：
  - 保留标题“组织管理”和副标题语义。
  - 保留 3 Tab：组织架构 / 部门管理 / 成员管理。
  - 保留组织架构图、组织树、租户列表、租户搜索、配额进度条、状态 badge、权限跳转、编辑配额、BU 配置。
  - 保留新建租户、添加成员、节点重命名、添加子节点、删除确认、编辑配额、BU 个性化配置弹窗。
- `sys` 页面：
  - 保留 Tab：基础设置 / 存储配置 / 通知设置 / API 密钥 / 数据安全 / 认证集成 / 标签管理。
  - 保留存储用量概览、存储路径配置、清理缓存交互、通知渠道测试、API Key 一次性展示、数据分级/脱敏/加密、认证集成配置、标签管理结构。
  - 对未配置外部系统显示真实“未配置/待确认”状态，不能显示假成功。
- QA 阶段必须对照 `docs/prototype/SMP工业AI平台-原型v2.html`、编译版和 `screen-org.png` / `screen-sys.png` 记录差异。

## 10. 风险与依赖

- F007 范围横跨 `org` 与 `sys` 多个 Tab，容易膨胀；实现阶段应先冻结契约与测试，再按组织/配置/文件/通知/API Key 分层实现。
- F006 当前平台服务类承担认证、权限、审计等职责，F007 若拆分服务必须先锁定 F006 回归测试，避免破坏登录、用户、角色、审计。
- 外部参数未确认：
  - `TODO_CONFIRM_LDAP_URL`、`TODO_CONFIRM_LDAP_BASE_DN`、`TODO_CONFIRM_SSO_PROTOCOL`、`TODO_CONFIRM_IDP_METADATA_URL`
  - `TODO_CONFIRM_MINIO_ENDPOINT`、`TODO_CONFIRM_MINIO_BUCKET`、`TODO_CONFIRM_MINIO_KMS_KEY`
  - `TODO_CONFIRM_SMTP_HOST`、`TODO_CONFIRM_SMTP_SENDER`、`TODO_CONFIRM_DINGTALK_WEBHOOK`、`TODO_CONFIRM_WECHAT_WEBHOOK`
  - `TODO_CONFIRM_API_GATEWAY_KEY_STRATEGY`、`TODO_CONFIRM_API_KEY_SIGNING_ALGORITHM`
- API Key 管理涉及敏感信息，contract 必须明确只存 hash、一次性展示、撤销不可逆、审计。
- 文件元数据要服务 F009/F013/F015，必须避免把数据集/模型/边端业务状态机提前塞入 F007。

## 11. 后续验收项草案

- AC-01 组织树支持 CORP/BU/PROJECT 查询、新增、重命名、禁用/删除前检查，编码唯一。
- AC-02 BU/项目成员支持用户绑定、角色作用域和跨 BU 边界校验，复用 F006 用户角色。
- AC-03 系统配置支持 GLOBAL/BU/PROJECT 作用域、继承链、版本记录、校验和审计。
- AC-04 BU/PROJECT 配置不能突破集团上限，配置变更后有效配置可即时读取。
- AC-05 文件元数据支持 object key 分配、上传完成登记、hash/size 校验、软删除/恢复和权限校验。
- AC-06 通知渠道配置测试返回真实状态并记录审计；未配置外部参数时返回 `UNCONFIGURED` / `TODO_CONFIRM_*`。
- AC-07 API Key 创建仅一次展示明文，列表脱敏，撤销后不可用并记录 CRITICAL 审计。
- AC-08 `org`、`sys` 页面结构、Tab、核心表格/弹窗与原型一致并接入真实 API。
- AC-09 所有写操作具备认证、授权、tenant/BU/project 边界、状态机校验和审计证据。
- AC-10 F008/F009/F011/F016/F017 范围不被提前实现，仅保留必要 seam。

## 12. 审批记录

- Reviewer: 待人审
- Decision: draft，需人工审阅并将 frontmatter 改为 `plan_status: approved` 且填写 `approved_at: YYYY-MM-DD` 后，方可进入 `/build-feature`。

