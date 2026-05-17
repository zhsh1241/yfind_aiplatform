> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-pai-resource-integration.md`
> Interview transcript: `.omx/interviews/pai-resource-integration-20260517T124348Z.md`

﻿# Deep Interview Spec: F008 pai-resource-integration

## Metadata

- Feature: F008-pai-resource-integration
- Slug: pai-resource-integration
- Profile: standard
- Context type: brownfield
- Final ambiguity: 0.18
- Threshold: 0.20
- Context snapshot: $contextPath
- Interview transcript: $interviewPath

## Intent

将原资源域从 SMP 自建集群/节点/资源池/调度配额，收敛为阿里云 PAI 资源集成控制面。SMP 负责组织、权限、审计、连接配置、资源映射、同步展示和后续训练/推理引用；实际 GPU/NPU/CPU/存储资源、资源配额与调度执行以阿里云 PAI 为权威事实源。

## Desired Outcome

F008 完成规划后，后续 build 应能交付：

1. esource 页面在保持原型“资源管理”信息架构的前提下，展示 PAI 连接状态、Workspace / Quota / 资源用量 / 同步诊断 / 组织映射。
2. 后端提供 PaiResourceClient / PaiResourceService / 资源 Controller seam，调用 PAI 官方 API 或经批准的适配层，不伪造资源成功状态。
3. SMP 维护组织/BU/项目到 PAI Workspace / Quota / Resource Group 的映射，后续 F012/F018/F019 可引用 PAI 资源 ID。
4. 所有配置变更、同步触发、跨 BU 查看和失败诊断都复用 F006 的认证、权限和审计；组织上下文和配置项复用 F007。
5. 未配置或外部参数未知时返回 UNCONFIGURED / TODO_CONFIRM_*，而不是 mock 成功。

## In Scope

- PAI 连接配置：Region、Endpoint、WorkspaceId、QuotaId、RAM Role / AccessKey strategy、超时、同步周期、健康检查；未知参数使用 TODO_CONFIRM_PAI_*。
- 组织映射：集团/BU/项目到 PAI Workspace、Quota、Resource Group 或等价 PAI 资源标识的映射；映射变更审计。
- PAI 资源只读同步：Workspace、Quota、资源总量/已用/可用、GPU/NPU/CPU/内存/存储摘要、资源池/队列/节点或 PAI 等价对象、最近同步时间、同步状态和诊断。
- 资源引用 seam：为训练、Pipeline、推理、报表留下可引用的 paiWorkspaceId、paiQuotaId、paiResourceId、esourceBindingId。
- 后端 API：读取资源概览、触发同步、查看映射、更新映射/配置、读取同步诊断和 PAI 未配置状态。
- 前端 resource 页面：保留“集群总览 / GPU 节点 / 资源池 / 存储”Tab 语义，可将标签或说明调整为 PAI 映射语义；显示真实状态、错误和未配置空态。
- 权限与审计：新增 menu:resource、platform:pai-resource:* 权限码；配置更新/同步触发/跨 BU 查看/失败重试均写审计。
- 官方文档核验：contract 阶段必须继续核对阿里云 PAI Resource Quota、AIWorkspace、DLC/训练任务资源引用相关 API。

## Out-of-Scope / Non-goals

- 不自建 Kubernetes/GPU/NPU/CPU/存储资源调度系统。
- 不在 SMP 本地注册物理服务器、GPU 卡、NPU 卡或驱动版本作为权威事实源。
- 不本地创建真实资源池、节点分配、队列抢占、芯片共享/独占调度策略。
- 不实现训练任务、Pipeline 调度、推理服务部署或边端下发；仅提供后续引用 PAI 资源的 seam。
- 不实现镜像仓库导入/构建/生命周期；如 PAI 镜像能力需要展示，先作为后续 feature 或只读 seam。
- 不保存明文 AccessKey；不猜测 PAI 账号、Region、Workspace、Quota、VPC、网络和 RAM 权限。
- 不用静态 mock 数据伪造 PAI 同步成功。

## Decision Boundaries

- 可以把原 /clusters、/resource-pools、/ai-chips、/storage-pools 草案映射为 SMP 的 PAI 资源视图 API，但 contract 必须明确字段来源于 PAI 同步快照或实时调用。
- 可以新增本地表保存 PAI 连接配置（脱敏）、组织映射、同步快照、同步日志和资源引用；不得把它们当作物理资源事实源。
- 可以通过后端 Java SDK/HTTP Client 直连 PAI，或通过 i-adapter 封装 PAI；最终方案在 contract 阶段按依赖、部署和安全审查冻结。
- 可以保留原型 Tab 和资源用量卡，但必须在文案/空态中说明“PAI 同步/PAI Quota”。
- 可以在 PAI 未配置时展示演示占位 UI 的结构，但数据状态必须是 UNCONFIGURED，不能显示假在线。

## Constraints

- 复用 F006 PlatformIdentityService、PlatformPrincipal、权限和审计。
- 复用 F007 platform_tenant / 组织树 / 配置 registry / API Key 或敏感配置 seam。
- API 使用 /api/v1、统一 envelope、traceId 和一致错误码。
- 所有正式文档中文；代码标识符/API 字段可英文。
- 未确认外部事实使用 TODO_CONFIRM_*。
- 本 planning 阶段不写业务实现代码、正式 TASK.md、contract.md、	est-plan.md 正文。

## Exception Scenarios

- PAI 未配置 Region/Endpoint/Workspace/Quota/RAM：资源页面返回 UNCONFIGURED，显示待配置诊断，不阻断其他平台页面。
- PAI 调用失败、限流、超时、鉴权失败：返回 PAI_UNAVAILABLE / PAI_AUTH_FAILED / PAI_RATE_LIMITED 等可诊断错误，保留最近一次成功快照并标注 stale。
- BU_ADMIN 查看或更新其他 BU 的 PAI 映射：403，并写跨 BU 访问审计。
- 组织映射的 PAI Workspace/Quota 与集团上限不一致：阻断保存或标记 NEEDS_REVIEW，写审计。
- 同步过程中 PAI 删除/禁用 Workspace 或 Quota：本地映射进入 PAI_NOT_FOUND / DISABLED 诊断状态，后续训练/推理引用必须阻断。
- 配置包含明文 AccessKey/Secret：拒绝保存或仅通过安全配置 seam 存储脱敏/引用，不在响应中回显。

## Testable Acceptance Criteria Draft

- AC-01 esource 页面保留原型标题、Tab、资源卡和用量展示语义，并显示 PAI 连接/同步状态。
- AC-02 后端可读取 PAI 连接配置与组织映射；未配置时返回 UNCONFIGURED 和 TODO_CONFIRM_PAI_*。
- AC-03 SUPER_ADMIN 可更新 PAI Workspace/Quota 映射并写 CRITICAL/WARNING 审计；BU_ADMIN 只能查看/维护本 BU 授权范围。
- AC-04 手动同步 PAI 资源成功后保存同步快照、lastSyncAt、resource usage summary 与诊断信息。
- AC-05 PAI 调用失败/超时/鉴权失败时不伪造成功，返回明确错误并保留 stale 快照标记。
- AC-06 后续训练/推理资源引用 seam 能按组织返回 paiWorkspaceId / paiQuotaId / esourceBindingId，禁用/失效映射阻断引用。
- AC-07 所有配置变更、同步触发、跨 BU 拒绝和失败诊断均可在审计日志查询。
- AC-08 不创建本地物理节点/芯片调度事实源，不实现训练/推理/镜像生命周期。

## Assumptions Exposed + Resolutions

- Assumption: 业务文档中“节点/资源池/配额”必须由 SMP 自建。Resolution: 用户明确 PAI 为资源事实源，SMP 只调用接口；因此本地只保存映射、快照和审计。
- Assumption: 原型的 GPU 节点列表要求真实主机纳管。Resolution: 保留 UI 语义，但数据来源改为 PAI 同步等价对象；无等价对象时展示 PAI Quota/Resource Group 摘要。
- Assumption: F008 可直接猜测 PAI 账号参数。Resolution: 所有外部参数必须 TODO_CONFIRM_PAI_*。

## Pressure-pass Findings

压力问题聚焦“原型/业务文档要求资源纳管”与“用户要求只调用 PAI”的冲突。结论：以用户最新决策为准，将原型资源概念映射到 PAI 工作空间/配额/用量视图；SMP 不成为调度事实源。

## Technical Context Findings

- Existing roadmap names F008 as esource-inventory-quota; this plan intentionally renames scope to pai-resource-integration.
- docs/business/api/01-API接口规范.md resource endpoints can be preserved as conceptual contract inputs but must be reinterpreted through PAI integration.
- Prototype Resource component has tabs 集群总览、GPU 节点、资源池、存储 and summary cards for cluster nodes, GPU total/usage, storage; build should keep IA while changing source semantics.
- F006/F007 provide required platform governance seams.

## Handoff

Proceed to $ralplan using this spec as the requirements source of truth. Do not implement directly in this planning stage.
