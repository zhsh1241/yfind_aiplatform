> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-pai-resource-integration.md`

﻿# PRD: F008 阿里云 PAI 资源集成控制面

## 1. Problem Statement

路线图原 F008 esource-inventory-quota 假设 SMP 自建或纳管集群、节点、GPU/NPU、资源池、配额和存储池。但用户已明确所有资源相关能力放在阿里云 PAI 平台，SMP 只调用相关接口。若继续按本地资源事实源设计，会与目标架构冲突，并在后续训练、推理、Pipeline 中重复建设调度能力。

F008 需要把资源域定位为“PAI 资源集成控制面”：SMP 负责组织映射、权限审计、连接配置、同步快照、只读展示和后续资源引用；PAI 负责真实资源、配额和调度执行。

## 2. Goals

1. 建立 PAI 连接配置与健康诊断 seam，支持未配置、调用失败、同步成功等真实状态。
2. 建立组织/BU/项目到 PAI Workspace / Quota / Resource Group 的映射，供后续训练/推理引用。
3. 同步并展示 PAI 资源概览、Quota 用量、GPU/NPU/CPU/内存/存储摘要和最近同步状态。
4. 将原型 esource 页面从静态资源管理改为真实 PAI 同步视图，同时保持信息架构和主要视觉语义。
5. 复用 F006/F007 的身份、权限、审计、组织与配置 seam，避免重复实现平台治理能力。

## 3. Personas / Users

- 超级管理员：配置 PAI 连接、集团级 Workspace/Quota 映射、同步周期和诊断策略。
- BU 管理员：查看本 BU 的 PAI 资源配额/用量，维护被授权范围内的项目映射或查看同步诊断。
- 模型训练/推理工程师：在后续任务中选择或引用已授权的 PAI 资源绑定。
- 平台运维：排查 PAI 鉴权、限流、超时、Quota 失效和同步失败。
- 审计/安全人员：查看资源配置变更、跨 BU 拒绝、同步触发与失败审计。

## 4. Functional Scope

### 4.1 PAI Connection & Configuration

- 配置字段草案：egionId、endpoint、workspaceId、quotaId、esourceGroupId、credentialMode、amRoleArn、ccessKeyRef、syncIntervalSeconds、	imeoutMillis、enabled。
- 未确认项：TODO_CONFIRM_PAI_REGION、TODO_CONFIRM_PAI_ENDPOINT、TODO_CONFIRM_PAI_WORKSPACE_ID、TODO_CONFIRM_PAI_QUOTA_ID、TODO_CONFIRM_PAI_RAM_ROLE_ARN、TODO_CONFIRM_PAI_ACCESS_KEY_STRATEGY、TODO_CONFIRM_PAI_VPC_NETWORK。
- 敏感字段不得明文回显；优先复用 F007 配置/敏感配置 seam。
- 健康检查返回：CONFIGURED / UNCONFIGURED / AUTH_FAILED / UNAVAILABLE / RATE_LIMITED / STALE。

### 4.2 Organization to PAI Mapping

- 本地保存 organizationId / 	enantId / uId / projectId 到 PAI workspaceId、quotaId、esourceGroupId 或官方等价对象的映射。
- 映射支持状态：ACTIVE、DISABLED、PAI_NOT_FOUND、NEEDS_REVIEW、UNCONFIGURED。
- 映射变更必须审计，并受 SUPER_ADMIN / BU_ADMIN 子树权限控制。
- 后续 feature 只引用映射 ID 或 PAI resource reference，不直接拼接外部参数。

### 4.3 PAI Resource Synchronization

- 同步对象草案：Workspace、Quota、Quota usage、Resource Group / queue / node 等 PAI 可获得资源摘要。
- 本地保存同步快照：lastSyncAt、sourceVersion、status、diagnosticCode、diagnosticMessage、usageSummaryJson、awRef（必要时脱敏）。
- 支持手动同步与计划同步 seam；本 feature 至少交付手动同步与最近快照读取，计划任务可在 contract 中按复杂度裁剪。
- 调用失败时不得覆盖最近成功快照，必须标记 stale 与失败原因。

### 4.4 Resource View API

API 草案在 build contract 冻结，建议方向：

- GET /api/v1/platform/pai-resources/status：连接状态、配置摘要、最近同步。
- GET /api/v1/platform/pai-resources/overview：资源总览卡片、Quota 用量、组织范围。
- GET /api/v1/platform/pai-resources/workspaces：Workspace / Quota / 绑定列表。
- GET /api/v1/platform/pai-resources/nodes：PAI 等价节点/资源单元只读列表；无等价对象时返回 Quota/资源组摘要。
- GET /api/v1/platform/pai-resources/pools：PAI Quota/Resource Group 视图。
- GET /api/v1/platform/pai-resources/storage：PAI/OSS 相关存储用量摘要；若 F007 文件/对象存储已覆盖，需只读引用，不重复实现。
- POST /api/v1/platform/pai-resources/sync：触发同步。
- PUT /api/v1/platform/pai-resources/bindings/{id}：更新组织映射。

### 4.5 Frontend Resource Page

- 保留页面 key：esource；标题“资源管理”。
- 保留或轻量调整副标题：从“集群节点 · GPU资源池 · 存储配置 · 实时利用率监控”升级为“PAI 工作空间 · 资源配额 · GPU/NPU 用量 · 同步诊断”。
- 保留 Tab 语义：集群总览、GPU 节点、资源池、存储，但数据来源标注为 PAI 同步；必要时在 Tab 内说明“PAI Quota/Resource Group 映射”。
- 显示：连接状态卡、最近同步、Workspace/Quota、GPU/NPU/CPU/存储用量、BU 映射、同步按钮、失败诊断和未配置引导。
- 不硬编码静态成功数据；可用契约 fixture 做测试，但联调必须连真实后端测试 seam。

## 5. Non-Functional Requirements

- 安全：不得保存明文 AccessKey；敏感配置脱敏；跨 BU 默认拒绝。
- 审计：配置变更、映射变更、手动同步、同步失败、跨 BU 拒绝记录审计。
- 可观测：同步请求记录 traceId、耗时、PAI requestId（如官方返回）、错误码。
- 可靠性：PAI 调用失败保留最近成功快照并标记 stale；页面可降级展示。
- 可扩展：后续 F012/F018/F019 通过资源绑定引用 PAI，不重复实现资源查找。
- 原型一致：资源页结构、Tab 和关键卡片布局保持原型语义；偏离需记录在 QA 报告。

## 6. Reuse / Architecture Decision

- Reuse F006:
  - PlatformIdentityService / PlatformPrincipal / 权限校验 / 审计日志。
  - platform_audit_log 写入模式和 401/403 语义。
- Reuse F007:
  - platform_tenant / 组织树 / BU/项目边界。
  - 配置 registry / 敏感配置 / API Key 或 secret reference seam。
  - 文件/对象存储元数据能力，避免在 F008 重复存储中心实现。
- Reuse F003/F004:
  - 统一 ApiResponse、traceId、异常处理、Flyway、OpenAPI。
  - 前端 piClient、platformApi、sessionStore、AppNavigation page key。
- New seams:
  - PaiResourceClient：封装 PAI API 调用与错误映射。
  - PaiResourceService：组织映射、同步快照、权限审计协调。
  - PlatformPaiResourceController：资源页 API。
  - platform_pai_connection / platform_pai_resource_binding / platform_pai_resource_snapshot / platform_pai_sync_log（表名 contract 冻结）。

## 7. Alternatives Considered

1. **继续自建资源库存/节点调度**：拒绝。用户明确资源在阿里云 PAI，SMP 只调用接口；自建会重复建设并制造双事实源。
2. **只在前端展示 PAI 控制台链接**：拒绝。无法满足原型资源用量、权限审计、后续训练/推理资源引用需求。
3. **把所有 PAI 调用放入 ai-adapter**：暂不冻结。可作为候选，但需评估 Java 后端直接 SDK 调用 vs adapter 的部署、安全和依赖成本。
4. **保存完整 PAI raw response 作为业务事实**：谨慎。可保存必要脱敏 rawRef 便于诊断，但业务 API 应输出稳定 DTO，避免上游字段漂移影响前端。

## 8. Risks

- PAI API 具体接口、SDK 版本、地域 Endpoint、权限策略未确认：contract 阶段必须查官方文档并用 TODO_CONFIRM_* 留口。
- PAI 的资源概念与原型“GPU 节点/资源池/存储”不完全等价：需要在 DTO 中明确映射和空态。
- 外部账号不可用会阻塞真实联调：必须覆盖 UNCONFIGURED 与失败诊断，不能 mock 成功。
- F007 配置/组织 seam 如尚未稳定，F008 build 可能依赖其接口调整：需先跑 F006/F007 回归。
- 安全风险：AccessKey/RAM Role/跨 BU 映射错误会造成资源越权，需强化权限、审计和脱敏测试。

## 9. Suggested Build Phases

1. Contract/TASK/test-plan freeze：冻结 PAI DTO、错误码、权限、审计、SQL、外部 TODO。
2. Official docs verification：核对 PAI Resource Quota、AIWorkspace、DLC/资源引用 API；决定 Java SDK vs adapter。
3. Backend tests first：未配置、配置脱敏、映射权限、同步成功/失败、stale 快照、审计。
4. Backend implementation：migration、client seam、service、controller、OpenAPI、审计。
5. Frontend integration：resource 页面接入 API，保留原型结构和 PAI 状态说明。
6. QA/gate：联调 401/403、UNCONFIGURED、失败诊断、同步快照、原型一致性和质量门禁。

## 10. Critic Verdict

APPROVE for planning draft. Conditions before build: plan.md 必须经批准；contract.md 必须明确 PAI 官方接口核验结论、凭证策略、资源概念映射、未配置降级和不自建调度边界。
