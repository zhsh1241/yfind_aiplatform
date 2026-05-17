# Task: 阿里云 PAI 资源集成控制面

## Metadata
- Feature: F008-pai-resource-integration
- ID: TASK-pai-resource-integration
- Status: approved-for-build
- Owner: codex
- Created: 2026-05-17
- Updated: 2026-05-17
- 前置：同目录 `plan.md` 已批准；`check-build-feature-prereqs` 已通过。

## 1. 需求摘要

### User Story

作为平台超级管理员 / BU 子管理员，我想在 SMP 的“资源管理”页面查看和维护阿里云 PAI Workspace、Quota 与组织映射，并触发资源同步诊断，以便后续训练、Pipeline、推理服务只引用已授权的 PAI 资源绑定，而不在 SMP 自建 GPU/NPU/CPU/存储调度事实源。

### Business Value

- 统一资源事实源到阿里云 PAI，避免 SMP 重复建设本地集群、节点、GPU/NPU 和资源池调度系统。
- 为 F012 Pipeline、F018 训练实验、F019 推理服务提供可审计的 `resourceBindingId` / `paiWorkspaceId` / `paiQuotaId` 引用。
- 在 PAI 未配置或调用失败时提供真实诊断，避免用静态 mock 掩盖外部集成风险。
- 保持 `resource` 原型页面的信息架构，让平台管理员仍能按“集群总览 / GPU 节点 / 资源池 / 存储”查看资源状态，但语义明确为 PAI 同步视图。

### Source References

- Business docs:
  - `docs/business/bizdocs/01-业务场景清单.md` RES-001/002/003。
  - `docs/business/bizdocs/02-04-业务流程-平台运营.md` 计算资源、存储中心、镜像管理流程。
  - `docs/business/bizdocs/03-04-系统功能-平台管理.md` FUNC-RES-001~039。
  - `docs/business/api/01-API接口规范.md` 资源域端点草案与统一 envelope。
- Prototype:
  - `docs/prototype/SMP工业AI平台-原型v2.html` / page key `resource`。
  - `docs/prototype/SMP工业AI平台-原型v2-compiled.html`。
- Planning evidence:
  - `reports/planning/deep-interview.md`
  - `reports/planning/prd.md`
  - `reports/planning/test-spec.md`
- External docs to verify in contract/build:
  - 阿里云 PAI Resource Quota / AIWorkspace / DLC 资源引用官方文档；具体 API、SDK、Region、Endpoint、RAM 权限保持 `TODO_CONFIRM_PAI_*`。

## 2. 范围

### In Scope

- PAI 连接状态与健康诊断：`CONFIGURED`、`UNCONFIGURED`、`AUTH_FAILED`、`UNAVAILABLE`、`RATE_LIMITED`、`STALE`。
- PAI 连接配置摘要：Region、Endpoint、WorkspaceId、QuotaId、ResourceGroupId、凭证模式与脱敏 secret ref。
- 组织/BU/项目到 PAI Workspace / Quota / Resource Group 的资源绑定。
- PAI 资源同步快照：总量/用量、GPU/NPU/CPU/内存/存储摘要、lastSyncAt、stale、diagnostic、paiRequestId、traceId。
- 手动同步接口：未配置返回真实 `UNCONFIGURED`；仅配置为显式 `SANDBOX` 测试替身时返回受控快照；真实 SDK/adapter 未接入时返回 `PAI_CLIENT_NOT_CONFIGURED`，失败不覆盖最近成功快照。
- `resource` 页面真实 API 接入：总览卡、Tab、同步按钮、诊断、未配置引导、绑定列表。
- 权限、审计、错误码和测试覆盖。

### Out of Scope

- 不自建 Kubernetes/GPU/NPU/CPU/存储资源调度系统。
- 不在 SMP 本地注册物理服务器、GPU 卡、NPU 卡或驱动版本作为权威事实源。
- 不实现训练任务、Pipeline 调度、推理服务部署、批量推理、边端下发或镜像生命周期。
- 不保存明文 AccessKey/Secret；不猜测真实 PAI Region、Workspace、Quota、RAM Role、VPC、Endpoint。
- 不用前端静态假数据伪造 PAI 同步成功。

## 3. 技术分析

### Backend

- Module/API:
  - `PlatformPaiResourceController`
  - `PaiResourceService`
  - `PaiResourceClient` / `DefaultPaiResourceClient`
  - `/api/v1/platform/pai-resources/status`
  - `/api/v1/platform/pai-resources/overview`
  - `/api/v1/platform/pai-resources/workspaces`
  - `/api/v1/platform/pai-resources/nodes`
  - `/api/v1/platform/pai-resources/pools`
  - `/api/v1/platform/pai-resources/storage`
  - `/api/v1/platform/pai-resources/sync`
  - `/api/v1/platform/pai-resources/bindings/{bindingId}`
  - `/api/v1/platform/pai-resources/references?organizationId=...`
- Domain objects:
  - `PaiConnectionConfig`
  - `PaiResourceBinding`
  - `PaiResourceSnapshot`
  - `PaiSyncLog`
  - `PaiResourceReference`
- Business rules:
  - `UNCONFIGURED` 必须真实返回，不能伪造成功。
  - PAI 调用失败保留最近成功快照并标记 stale。
  - SUPER_ADMIN 可全局配置；BU_ADMIN 只能访问本 BU 子树。
  - 失效绑定阻断后续资源引用。

### Frontend

- Prototype page key: `resource`
- Pages/components:
  - `ResourceManagementPage`
  - 复用 `platformApi`、`apiClient`、`sessionStore`、`AppNavigation`
- States/interactions:
  - 未配置 PAI 引导。
  - 总览同步状态、stale 诊断、手动同步按钮。
  - `集群总览`、`GPU 节点`、`资源池`、`存储` Tab 保留原型语义。
  - 无权限显示既有 403 页面。

### AI Adapter / Integration

- 本 feature 不强制引入 `ai-adapter`。
- Contract 决策：当前实现采用后端 `PaiResourceClient` seam；真实 PAI SDK/HTTP client 在后续环境确认后接入。
- External system placeholders:
  - `TODO_CONFIRM_PAI_REGION`
  - `TODO_CONFIRM_PAI_ENDPOINT`
  - `TODO_CONFIRM_PAI_WORKSPACE_ID`
  - `TODO_CONFIRM_PAI_QUOTA_ID`
  - `TODO_CONFIRM_PAI_RAM_ROLE_ARN`
  - `TODO_CONFIRM_PAI_ACCESS_KEY_STRATEGY`
  - `TODO_CONFIRM_PAI_VPC_NETWORK`

### Database

- Tables:
  - `platform_pai_connection`
  - `platform_pai_resource_binding`
  - `platform_pai_resource_snapshot`
  - `platform_pai_sync_log`
- Migrations:
  - `backend/smp-app/src/main/resources/db/migration/V4__platform_pai_resource.sql`

## Reuse Plan

- Existing backend services/components:
  - `PlatformIdentityService.requirePrincipal(...)`
  - `PlatformIdentityService.requirePermission(...)`
  - F006 platform audit pattern via `platform_audit_log`
  - F007 `platform_tenant` 组织树 / BU 子树边界
  - `PlatformResponses.ok(...)` 与统一 envelope / traceId
  - `PlatformError` / `PlatformException`
- Existing SQL / data:
  - `platform_tenant`
  - `platform_permission`
  - `platform_role_permission`
  - `platform_audit_log`
  - F007 配置/敏感值 seam，避免明文 secret。
- Existing frontend seams:
  - `frontend/src/features/foundation/apiClient.ts`
  - `frontend/src/features/platform/platformApi.ts`
  - `frontend/src/features/platform/sessionStore.ts`
  - `frontend/src/components/AppNavigation.tsx` 的 `resource` page key
  - 既有 Ant Design 页面结构与测试基座。
- Existing test fixtures:
  - 后端 Spring Boot random-port HTTP 测试模式。
  - 前端 Vitest mock `apiClient` 模式。
  - Playwright `frontend/e2e/helpers.ts` API route mock 模式。
- New seams allowed only because no existing seam can represent PAI external resource references:
  - `PaiResourceClient` 用于隔离 PAI SDK/HTTP 调用和错误映射。
  - `platform_pai_*` 表用于保存连接摘要、资源绑定、同步快照和同步日志；不得作为本地物理调度事实源。

## 5. Acceptance Criteria

- [ ] AC-01: `resource` 页面保留原型标题、Tab、卡片和用量展示语义，并显示 PAI 连接/同步状态。
- [ ] AC-02: PAI 未配置时后端返回 `UNCONFIGURED` 与 `TODO_CONFIRM_PAI_*`，前端显示未配置引导且不展示假数据。
- [ ] AC-03: SUPER_ADMIN 可更新 PAI 连接配置和 Workspace/Quota 映射，敏感字段不回显并写审计。
- [ ] AC-04: BU_ADMIN 只能查看/维护本 BU 授权范围内的 PAI 映射，跨 BU 操作返回 403 并写审计。
- [ ] AC-05: 手动同步 PAI 资源成功后保存同步快照、lastSyncAt、usage summary、PAI requestId/traceId。
- [ ] AC-06: PAI 调用失败、超时、限流、鉴权失败时返回明确错误，不覆盖最近成功快照，并标记 stale。
- [ ] AC-07: 后续训练/推理资源引用 seam 能按组织返回 `resourceBindingId`、`paiWorkspaceId`、`paiQuotaId`；失效映射阻断引用。
- [ ] AC-08: 所有配置变更、映射变更、同步触发、失败诊断和跨 BU 拒绝均可在审计日志查询。
- [ ] AC-09: F008 不创建本地物理节点/芯片/调度事实源，不实现训练/推理/镜像生命周期。
- [ ] AC-10: Contract 阶段完成 PAI 官方接口核验，并记录 Java SDK vs `ai-adapter` 调用路径决策。

## 6. Definition of Done

- [ ] plan.md 已批准。
- [ ] contract.md 已冻结或实现态。
- [ ] test-plan.md 引用全部 AC-xx。
- [ ] 复用审查已完成。
- [ ] 权限、审计和 MUST 规则有验证证据。
- [ ] 后端测试含 `TASK-pai-resource-integration` 与 AC 追踪。
- [ ] 前端单测/E2E 含 `TASK-pai-resource-integration` 与 AC 追踪。
- [ ] 代码审查报告为 PASS / PASS_WITH_COMMENTS。
- [ ] QA 报告为 PASS。
- [ ] 质量门禁通过或记录等价 CI 证据。

## 7. 风险与问题

- PAI 官方 API 细节、账号、Workspace、Quota、RAM Role 尚未确认；当前以 seam + `TODO_CONFIRM_PAI_*` 实现，真实联调需后续环境补齐。
- PAI 资源概念与原型节点级字段不完全一致；前端必须展示“PAI 同步/PAI Quota/Resource Group”说明。
- 若真实 SDK 需要新增依赖，必须另行在 contract/ADR 中说明，不在本轮擅自引入。
