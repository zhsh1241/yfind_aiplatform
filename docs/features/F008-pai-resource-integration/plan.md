---
feature: F008-pai-resource-integration
title: 阿里云 PAI 资源集成控制面
plan_status: approved
approved_at: 2026-05-17
owner: codex
created_at: 2026-05-17
updated_at: 2026-05-17
---

# Plan: 阿里云 PAI 资源集成控制面

## 1. 背景与目标

路线图原 F008 `resource-inventory-quota` 计划覆盖集群、节点、GPU/NPU、资源池、配额和存储池视图。但用户已明确资源相关能力统一放在阿里云 PAI 平台，SMP 只调用相关接口。因此 F008 不再建设本地资源调度/物理纳管事实源，而是将资源域定位为 **PAI 资源集成控制面**：SMP 负责组织映射、权限审计、连接配置、同步快照、只读展示和后续训练/推理资源引用；真实资源、配额与调度执行以 PAI 为权威事实源。

- 业务来源：`docs/business/bizdocs/01-业务场景清单.md` RES-001/002/003，`docs/business/bizdocs/02-04-业务流程-平台运营.md` 计算资源/存储中心/镜像管理流程，`docs/business/bizdocs/03-04-系统功能-平台管理.md` FUNC-RES-001~039，`docs/business/api/01-API接口规范.md` 资源域 API 草案。
- 原型来源：`docs/prototype/SMP工业AI平台-原型v2.html` 与 compiled demo；重点页面 key：`resource`，标题“资源管理”，Tab：`集群总览`、`GPU 节点`、`资源池`、`存储`。
- 技术基线：`docs/architecture/01-technology-stack-baseline.md`，继续使用 Java 21 / Spring Boot 4.0.x / Flyway / JPA / Spring Security / OpenAPI 3.1 与 React 19 / TypeScript 6 / Vite 8 / Ant Design 6。
- 规划证据：`reports/planning/deep-interview.md`、`reports/planning/prd.md`、`reports/planning/test-spec.md`。
- 外部参考：阿里云 PAI Resource Quota、AIWorkspace、DLC/训练任务资源引用相关官方文档；具体 API 名称、Region、Endpoint、SDK 与权限策略在 `/build-feature` 的 `contract.md` 阶段继续核验并冻结。

## 2. Intent / Desired Outcome

### Intent

将 SMP 资源域从“本地资源库存与调度”收敛为“阿里云 PAI 资源集成控制面”，避免重复建设 GPU/NPU/CPU/存储调度系统，并为后续 Pipeline、训练、推理能力提供统一、可审计、可授权的 PAI 资源引用 seam。

### Desired Outcome

F008 完成后，平台应具备：

1. `resource` 页面保持原型信息架构和主要视觉语义，但展示 PAI 连接状态、Workspace / Quota / Resource Group、GPU/NPU/CPU/内存/存储用量、同步状态和诊断。
2. 后端提供 `PaiResourceClient`、`PaiResourceService`、`PlatformPaiResourceController` 等 seam，调用 PAI 官方 API 或经批准的适配层，不伪造资源同步成功。
3. SMP 维护集团/BU/项目到 PAI Workspace / Quota / Resource Group 或等价资源标识的映射，后续 F012/F018/F019 只引用资源绑定，不重复实现资源发现。
4. 所有 PAI 配置变更、组织映射变更、手动同步、失败诊断、跨 BU 拒绝均复用 F006 身份权限审计，并复用 F007 组织/配置/敏感参数 seam。
5. 未确认外部参数以 `TODO_CONFIRM_PAI_*` 显式保留；未配置或 PAI 调用失败时返回真实 `UNCONFIGURED` / `PAI_*` 诊断，不用 mock 数据替代核心流程。

## 3. 范围

### In Scope

#### 后端

- PAI 连接配置与健康诊断：
  - 字段草案：`regionId`、`endpoint`、`workspaceId`、`quotaId`、`resourceGroupId`、`credentialMode`、`ramRoleArn`、`accessKeyRef`、`syncIntervalSeconds`、`timeoutMillis`、`enabled`。
  - 状态：`CONFIGURED`、`UNCONFIGURED`、`AUTH_FAILED`、`UNAVAILABLE`、`RATE_LIMITED`、`STALE`。
  - 未确认项使用 `TODO_CONFIRM_PAI_REGION`、`TODO_CONFIRM_PAI_ENDPOINT`、`TODO_CONFIRM_PAI_WORKSPACE_ID`、`TODO_CONFIRM_PAI_QUOTA_ID`、`TODO_CONFIRM_PAI_RAM_ROLE_ARN`、`TODO_CONFIRM_PAI_ACCESS_KEY_STRATEGY`、`TODO_CONFIRM_PAI_VPC_NETWORK`。
- 组织到 PAI 的映射：
  - `organizationId` / `tenantId` / `buId` / `projectId` → PAI `workspaceId`、`quotaId`、`resourceGroupId` 或官方等价对象。
  - 映射状态：`ACTIVE`、`DISABLED`、`PAI_NOT_FOUND`、`NEEDS_REVIEW`、`UNCONFIGURED`。
  - 映射变更必须权限校验、状态校验和审计。
- PAI 资源同步与快照：
  - 同步 Workspace、Quota、Quota usage、Resource Group / queue / node 等 PAI 可获得资源摘要。
  - 保存 `lastSyncAt`、`sourceVersion`、`status`、`diagnosticCode`、`diagnosticMessage`、`usageSummaryJson`、`paiRequestId`、`traceId`。
  - 支持手动同步；计划同步 seam 可在 contract 阶段按复杂度裁剪。
  - 失败时保留最近成功快照并标记 stale，不覆盖为假成功。
- 资源视图 API 草案：
  - `GET /api/v1/platform/pai-resources/status`
  - `GET /api/v1/platform/pai-resources/overview`
  - `GET /api/v1/platform/pai-resources/workspaces`
  - `GET /api/v1/platform/pai-resources/nodes`
  - `GET /api/v1/platform/pai-resources/pools`
  - `GET /api/v1/platform/pai-resources/storage`
  - `POST /api/v1/platform/pai-resources/sync`
  - `PUT /api/v1/platform/pai-resources/bindings/{id}`
- 资源引用 seam：
  - 为 Pipeline、训练、推理、报表留下 `resourceBindingId`、`paiWorkspaceId`、`paiQuotaId`、`paiResourceId`、`resourceGroupId` 等引用字段。
  - `DISABLED` / `PAI_NOT_FOUND` / `UNCONFIGURED` 映射必须阻断后续任务引用。
- 权限与审计：
  - 新增 `menu:resource`。
  - 新增 `platform:pai-resource:read/configure/sync/binding:read/binding:update/diagnostic:read` 等权限码。
  - 配置、映射、同步、失败、跨 BU 拒绝写审计。

#### 前端

- `resource` 资源管理页面：
  - 保留页面 key、标题“资源管理”、资源卡片、用量进度条和 Tab 结构。
  - 副标题建议更新为“PAI 工作空间 · 资源配额 · GPU/NPU 用量 · 同步诊断”。
  - `集群总览` 展示 PAI 连接状态、Workspace/Quota、总量/用量、最近同步和诊断。
  - `GPU 节点` 展示 PAI 等价资源单元；若 PAI 不返回节点级字段，则展示 Quota/Resource Group 摘要与说明空态。
  - `资源池` 展示 PAI Quota / Resource Group 绑定、BU/项目映射和用量。
  - `存储` 展示 PAI/OSS 相关存储摘要；不得重复实现 F007 文件元数据/对象存储业务。
  - 提供手动同步按钮、loading/success/failure 状态、未配置引导和失败诊断。
- 菜单与权限：
  - 复用 F006 sessionStore / permission store 控制 `menu:resource`。
  - 无权限访问显示 403/未授权状态，不改变原型信息架构。

### Out of Scope / Non-goals

- 不自建 Kubernetes/GPU/NPU/CPU/存储资源调度系统。
- 不在 SMP 本地注册物理服务器、GPU 卡、NPU 卡、驱动版本或芯片共享策略作为权威事实源。
- 不本地创建真实资源池、节点分配、队列抢占、亲和/反亲和、芯片独占/共享调度策略。
- 不实现训练任务、Pipeline 调度、推理服务部署、批量推理或边端下发；仅提供后续引用 PAI 资源的 seam。
- 不实现镜像仓库导入、构建、推送、生命周期；如 PAI 镜像能力需要展示，先作为只读 seam 或后续 feature。
- 不保存明文 AccessKey/Secret，不猜测 PAI 账号、Region、Workspace、Quota、VPC、RAM 权限或公网/专线策略。
- 不用静态 mock 数据伪造 PAI 同步成功。

## 4. Decision Boundaries

- 可以把业务/API 草案中的 `/clusters`、`/resource-pools`、`/ai-chips`、`/storage-pools` 概念映射为 SMP 的 PAI 资源视图 API；contract 必须标明字段来源于 PAI 同步快照、实时调用或未配置诊断。
- 可以新增本地表保存 PAI 连接配置（脱敏/引用）、组织映射、同步快照、同步日志和资源引用；这些表不得成为物理资源调度事实源。
- 可以通过 Java SDK/HTTP Client 直连 PAI，或通过 `ai-adapter` 封装 PAI；最终方案必须在 `contract.md` 基于依赖、安全、部署和测试成本冻结。
- 可以保留原型 Tab 和资源用量卡，但必须在文案/空态中说明“PAI 同步 / PAI Quota / PAI Resource Group”。
- 可以在 PAI 未配置时展示页面结构和配置引导，但数据状态必须是 `UNCONFIGURED`，不能显示假在线。
- 可以保存必要的脱敏 rawRef 或 PAI requestId 用于诊断，但业务 DTO 必须稳定，避免直接暴露上游原始结构给前端。

## 5. Exception Scenarios

- PAI 未配置 Region/Endpoint/Workspace/Quota/RAM：资源页面返回 `UNCONFIGURED` 和 `TODO_CONFIRM_PAI_*` 诊断，不阻断其他平台页面。
- PAI 调用失败、限流、超时、鉴权失败：返回 `PAI_UNAVAILABLE` / `PAI_AUTH_FAILED` / `PAI_RATE_LIMITED` 等明确错误，保留最近成功快照并标注 stale。
- BU_ADMIN 查看或更新其他 BU 的 PAI 映射：返回 403，并写跨 BU 访问审计。
- 组织映射的 PAI Workspace/Quota 与集团上限或 PAI 返回状态不一致：阻断保存或标记 `NEEDS_REVIEW`，写审计。
- 同步过程中 PAI 删除/禁用 Workspace 或 Quota：本地映射进入 `PAI_NOT_FOUND` / `DISABLED` 诊断状态，后续训练/推理引用必须阻断。
- 配置包含明文 AccessKey/Secret：拒绝保存或仅通过安全配置 seam 存储脱敏引用，不在响应中回显。
- PAI 返回字段缺少原型节点级信息：前端展示 Quota/Resource Group 摘要与“PAI 未提供节点级明细”的真实空态。

## Reuse Strategy

### Must Reuse

- F006 身份、权限与审计：
  - `PlatformIdentityService`、`PlatformPrincipal`、平台 session/filter/security 配置。
  - `platform_user`、`platform_role`、`platform_permission`、`platform_user_role`、`platform_session`、`platform_audit_log`。
  - 401/403、BU 边界、跨租户拒绝和高危操作审计模式。
- F007 组织、配置与敏感参数 seam：
  - `platform_tenant` / 组织树 / BU/项目上下文。
  - 配置 registry、配置作用域、敏感配置脱敏、API Key 或 secret reference 能力。
  - 文件元数据/object key seam；F008 存储页只读引用或展示 PAI 存储摘要，不重复建设文件服务。
- F003/F004 工程底座：
  - `backend/smp-common` 的统一 `ApiResponse`、错误码/异常基础。
  - `TraceIdFilter`、OpenAPI、Flyway、Spring Security/JPA 基线。
  - `frontend/src/features/foundation/apiClient.ts`、`frontend/src/features/platform/platformApi.ts`、`frontend/src/features/platform/sessionStore.ts`。
  - `frontend/src/components/AppNavigation.tsx` 的 `resource` 页面 key 与导航结构。
- 业务与原型事实：
  - `docs/business/bizdocs/02-04-业务流程-平台运营.md` RES-001/002/003。
  - `docs/business/bizdocs/03-04-系统功能-平台管理.md` FUNC-RES-001~039。
  - `docs/business/api/01-API接口规范.md` 资源域 API 风格与错误码。
  - `docs/prototype/SMP工业AI平台-原型v2.html` 的 `Resource` 页面结构。
- 脚手架门禁：
  - `tools/ai-scaffold` 的 `archive-planning-artifacts`、`check-build-feature-prereqs`、`verify-contract`、`check-task-traceability`、`gate`。

### Duplication Rejected

- 不新增与 `platform_tenant` 平行冲突的 BU/项目事实源。
- 不新增本地物理节点、GPU/NPU 卡、驱动、调度队列或资源池作为权威库存事实源。
- 不在 F008 重复实现 F007 的系统配置、敏感配置、文件元数据、对象存储 key 或 API Key 生命周期。
- 不在 F012/F018/F019 后续 feature 内重复拼接 PAI Workspace/Quota 参数；必须引用 F008 资源绑定 seam。
- 不在前端硬编码“PAI 在线/同步成功/GPU 用量”等静态假数据替代真实后端状态。
- 不复制原型 JSX 或已删除旧 backend/frontend 作为生产实现。
- 不引入新依赖来绕过现有 Spring Security、Flyway、JPA/JdbcTemplate、React/Ant Design、apiClient seam，除非 contract 证明必要。

### Approved New Seams

- `PaiResourceClient`：封装 PAI API 调用、超时、重试边界、错误码映射、requestId/traceId 采集。
- `PaiResourceService`：协调连接配置、组织映射、同步快照、资源引用、权限与审计。
- `PlatformPaiResourceController`：提供 `/api/v1/platform/pai-resources/*` API。
- `platform_pai_connection`、`platform_pai_resource_binding`、`platform_pai_resource_snapshot`、`platform_pai_sync_log` 或等价表；最终表名与字段在 `contract.md` 冻结。
- 前端 `ResourceManagementPage` / resource API types，可从当前占位页迁移为真实页面，但必须保持原型信息架构。

## 7. 交付方案

1. **契约冻结**：核对阿里云 PAI 官方文档，冻结 PAI 连接、映射、同步、资源视图、资源引用 API；列出 DTO、错误码、权限码、审计事件、SQL 表和 `TODO_CONFIRM_PAI_*`。
2. **测试设计**：从 PRD/test-spec 转化 `TASK.md` 与 `test-plan.md`，覆盖未配置、权限失败、PAI 鉴权失败、超时/限流、同步成功、stale 快照、资源引用阻断、审计和原型一致性。
3. **后端 TDD**：先写配置脱敏、组织映射权限、同步成功/失败、stale 快照、后续引用 seam、审计回归测试。
4. **后端实现**：Flyway migration、PAI client seam、service、controller、权限码 seed、审计事件、OpenAPI 注解；不在单元测试中真实访问公网。
5. **前端接入**：按原型实现 `resource` 页面真实 API 接入，保留 Tab/卡片/表格/进度条/同步按钮/诊断状态。
6. **联调与 QA**：验证 envelope、traceId、401/403、UNCONFIGURED、PAI 失败、成功快照、跨 BU 过滤、审计查询、原型视觉差异。
7. **质量门禁**：执行 `check-build-feature-prereqs`、contract、traceability、feature artifacts、gate；涉及前端行为时补充 Playwright E2E 与截图/视觉差异说明。

## 8. 数据、权限与审计

### 领域对象 / 表结构草案

- `PaiConnectionConfig`：`id`、`scopeType`、`scopeId`、`regionId`、`endpoint`、`workspaceId`、`quotaId`、`resourceGroupId`、`credentialMode`、`secretRef`、`enabled`、`status`、`updatedBy`、`updatedAt`。
- `PaiResourceBinding`：`bindingId`、`tenantId`、`organizationId`、`buId`、`projectId`、`paiWorkspaceId`、`paiQuotaId`、`paiResourceGroupId`、`status`、`diagnosticCode`、`createdAt`、`updatedAt`。
- `PaiResourceSnapshot`：`snapshotId`、`bindingId`、`lastSyncAt`、`sourceVersion`、`usageSummaryJson`、`capacitySummaryJson`、`status`、`stale`、`paiRequestId`、`traceId`。
- `PaiSyncLog`：`syncId`、`bindingId`、`triggerType`、`actorUserId`、`startedAt`、`finishedAt`、`durationMs`、`result`、`diagnosticCode`、`diagnosticMessage`。
- `PaiResourceReference`：可作为 DTO/seam，不一定独立建表；包含后续任务引用所需 `resourceBindingId`、`paiWorkspaceId`、`paiQuotaId`、`resourceGroupId`、`status`。

### MUST / SHOULD 规则

- PLT-001：资源视图和映射必须按 tenant/BU 隔离。
- PLT-009：BU 管理员权限边界限定在本 BU 子树内。
- PLT-011：PAI 连接配置、映射变更、跨 BU 操作、同步失败等高风险事件记录审计。
- PLT-012：无资源权限用户不得看到资源详情或后续资源引用。
- PLT-014：账号停用/权限变更后资源同步和配置权限即时失效。
- 资源域规则重解释：资源总量、资源池、GPU/NPU、存储配额以 PAI 为事实源；SMP 本地快照只用于展示、诊断和审计，不用于调度执行。

### 权限码草案

- `menu:resource`
- `platform:pai-resource:read`
- `platform:pai-resource:configure`
- `platform:pai-resource:sync`
- `platform:pai-resource:binding:read`
- `platform:pai-resource:binding:update`
- `platform:pai-resource:diagnostic:read`
- `platform:pai-resource:reference:read`

### 审计事件草案

- `PAI_CONFIG_UPDATED`
- `PAI_CONFIG_SECRET_REJECTED`
- `PAI_BINDING_CREATED`
- `PAI_BINDING_UPDATED`
- `PAI_BINDING_DISABLED`
- `PAI_SYNC_REQUESTED`
- `PAI_SYNC_SUCCEEDED`
- `PAI_SYNC_FAILED`
- `PAI_SYNC_STALE_SNAPSHOT_USED`
- `PAI_CROSS_BU_ACCESS_DENIED`
- `PAI_RESOURCE_REFERENCE_REQUESTED`
- `PAI_RESOURCE_REFERENCE_BLOCKED`

### 错误码草案

- `PAI_UNCONFIGURED`
- `PAI_AUTH_FAILED`
- `PAI_UNAVAILABLE`
- `PAI_RATE_LIMITED`
- `PAI_TIMEOUT`
- `PAI_WORKSPACE_NOT_FOUND`
- `PAI_QUOTA_NOT_FOUND`
- `PAI_BINDING_DISABLED`
- `PAI_BINDING_NEEDS_REVIEW`
- `PAI_SECRET_NOT_ALLOWED`

## 9. 原型一致性验收

- 页面 key 必须继续使用 `resource`，导航文案保留“资源管理”。
- 页面标题保留“资源管理”；副标题可调整为 PAI 语义，但不得改变页面入口和信息层级。
- 保留四个 Tab：`集群总览`、`GPU 节点`、`资源池`、`存储`；如字段语义从本地节点改为 PAI 等价资源，必须在页面中说明。
- 保留总览卡、用量进度条、资源池卡片、存储用量列表、状态 badge、同步/配置操作等主要视觉结构。
- 未配置 PAI 时显示真实“未配置/待确认/去配置”状态，不展示原型静态在线数据。
- PAI 调用失败但有旧快照时显示 stale 标记和失败诊断。
- QA 阶段必须对照 `docs/prototype/SMP工业AI平台-原型v2.html`、compiled demo 和必要截图记录差异。

## 10. 风险与依赖

- PAI 官方接口、SDK 版本、地域 Endpoint、权限策略、Workspace/Quota 字段未确认；contract 阶段必须核验官方文档和实际账号能力。
- PAI 资源概念与原型“GPU 节点/资源池/存储”不完全等价；需要稳定 DTO、空态和字段映射说明。
- 外部账号不可用可能阻塞真实联调；必须先覆盖 `UNCONFIGURED`、鉴权失败、超时/限流与 test double 错误映射。
- F007 配置/组织 seam 是前置依赖；若 F007 接口调整，F008 build 需同步适配并跑 F006/F007 回归。
- AccessKey/RAM Role/跨 BU 映射错误可能造成资源越权；需通过敏感配置脱敏、权限边界和审计测试降低风险。
- 计划同步如引入调度复杂度，可能超出 F008 MVP；contract 阶段可先交付手动同步和计划同步 seam。

## 11. 后续验收项草案

- AC-01 `resource` 页面保留原型标题、Tab、卡片和用量展示语义，并显示 PAI 连接/同步状态。
- AC-02 PAI 未配置时后端返回 `UNCONFIGURED` 与 `TODO_CONFIRM_PAI_*`，前端显示未配置引导且不展示假数据。
- AC-03 SUPER_ADMIN 可更新 PAI 连接配置和 Workspace/Quota 映射，敏感字段不回显并写审计。
- AC-04 BU_ADMIN 只能查看/维护本 BU 授权范围内的 PAI 映射，跨 BU 操作返回 403 并写审计。
- AC-05 手动同步 PAI 资源成功后保存同步快照、lastSyncAt、usage summary、PAI requestId/traceId。
- AC-06 PAI 调用失败、超时、限流、鉴权失败时返回明确错误，不覆盖最近成功快照，并标记 stale。
- AC-07 后续训练/推理资源引用 seam 能按组织返回 `resourceBindingId`、`paiWorkspaceId`、`paiQuotaId`；失效映射阻断引用。
- AC-08 所有配置变更、映射变更、同步触发、失败诊断和跨 BU 拒绝均可在审计日志查询。
- AC-09 F008 不创建本地物理节点/芯片/调度事实源，不实现训练/推理/镜像生命周期。
- AC-10 contract 阶段完成 PAI 官方接口核验，并记录 Java SDK vs `ai-adapter` 调用路径决策。

## 12. 审批记录

- Reviewer: 用户已在当前会话要求“继续做那个”，并在前序上下文中给出“批准并执行”；本轮将 F008 规划置为 approved 以便后续按规范进入 `/build-feature` 门禁。
- Decision: approved，可在通过 `check-build-feature-prereqs` 后进入 `/build-feature`；实现阶段仍必须先冻结 `TASK.md`、`contract.md`、`test-plan.md`，不得跳过官方 PAI API 核验。
