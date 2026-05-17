> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-pai-resource-integration.md`

﻿# Test Spec: F008 阿里云 PAI 资源集成控制面

## 1. Test Strategy

F008 测试必须证明 SMP 只作为 PAI 资源集成控制面工作：权限/审计/组织映射在 SMP，真实资源事实来自 PAI 或明确的测试替身；未配置和失败状态必须真实呈现，不允许前端或后端 mock 成功。

测试覆盖 happy path、权限失败、外部 PAI 失败、状态降级、审计行为、原型一致性和后续资源引用 seam。

## 2. Backend Test Matrix

| Area | Case | Expected |
|---|---|---|
| Config | PAI Region/Endpoint/Workspace/Quota 未配置 | UNCONFIGURED，响应含 TODO_CONFIRM_PAI_* 诊断，不调用外部 PAI |
| Config | 保存 PAI 配置含明文 secret | 拒绝或转为 secret reference；响应不回显明文；写审计 |
| Config | SUPER_ADMIN 更新连接配置 | 成功，敏感字段脱敏，写 PAI_CONFIG_UPDATED 审计 |
| Mapping | SUPER_ADMIN 绑定 BU/项目到 PAI Workspace/Quota | 成功，状态 ACTIVE/NEEDS_REVIEW，写 PAI_BINDING_UPDATED 审计 |
| Mapping | BU_ADMIN 更新其他 BU 映射 | 403，写跨 BU 访问审计 |
| Mapping | 映射引用不存在的 PAI Quota | 保存阻断或标记 PAI_NOT_FOUND，写 WARNING 审计 |
| Sync | 手动同步成功 | 保存 snapshot、lastSyncAt、usageSummary、PAI requestId/traceId，写审计 |
| Sync | PAI 鉴权失败 | 返回 PAI_AUTH_FAILED，不覆盖成功快照，标记 stale，写审计 |
| Sync | PAI 超时/限流 | 返回 PAI_UNAVAILABLE / PAI_RATE_LIMITED，记录诊断和耗时 |
| Snapshot | 读取资源总览 | 按 Principal 范围过滤组织/BU；返回统一 envelope |
| Reference | 后续资源引用查询 ACTIVE binding | 返回 esourceBindingId、paiWorkspaceId、paiQuotaId 等引用字段 |
| Reference | binding DISABLED/PAI_NOT_FOUND | 阻断引用，返回业务错误并写审计 |
| Audit | 配置/映射/同步/拒绝 | 审计日志可按事件、actor、tenant、traceId 查询 |

## 3. Frontend Test Matrix

| Page | Case | Expected |
|---|---|---|
| resource | 未配置 PAI | 页面显示 PAI 未配置/待确认引导，Tab 结构仍存在，不展示假数据 |
| resource | 同步成功快照 | 总览卡展示 Workspace/Quota/GPU/NPU/CPU/存储摘要和 lastSyncAt |
| resource | 同步失败且有旧快照 | 显示 stale 标记、失败诊断和最近成功数据 |
| resource | 集群总览 Tab | 保留进度条/用量卡语义，说明数据来自 PAI 同步 |
| resource | GPU 节点 Tab | 展示 PAI 等价资源单元；无节点字段时展示 Quota/资源组摘要空态 |
| resource | 资源池 Tab | 展示 PAI Quota/Resource Group 绑定和用量，支持授权范围过滤 |
| resource | 存储 Tab | 展示 PAI/OSS 存储摘要；不重复 F007 文件元数据能力 |
| resource | 手动同步按钮 | loading/success/failure 状态清晰，失败可诊断 |
| Navigation | menu 权限 | menu:resource 控制可见性；无权限访问显示 403/未授权状态 |
| Security UI | 敏感配置 | 只显示 masked/ref，不显示 secret 明文 |

## 4. Integration / E2E

- 登录 admin → 进入资源管理 → 未配置 PAI 时看到 UNCONFIGURED 与 TODO 引导。
- 登录 admin → 保存 PAI 连接/映射测试配置（使用测试替身或受控沙箱）→ 触发同步 → 总览卡更新。
- 登录 BU admin → 查看本 BU 资源映射成功 → 尝试查看其他 BU 映射返回 403 → 审计出现拒绝事件。
- 模拟 PAI 401/403/timeout/rate limit → 页面和 API 返回明确诊断，不显示同步成功。
- 禁用某 resource binding → 后续资源引用 seam 返回阻断错误。

## 5. Contract Verification Requirements

- contract 阶段必须列出 PAI 官方接口核验来源：Resource Quota、AIWorkspace、DLC/训练任务资源引用相关文档。
- 若选择 Java SDK：测试需隔离 SDK client，避免单元测试真实访问公网。
- 若选择 i-adapter：测试需覆盖 adapter contract、超时、错误映射和 traceId 透传。
- 所有 PAI response fixture 必须标注来源与脱敏策略。

## 6. Gate Commands

Planning stage:

`powershell
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F008-pai-resource-integration --stage deep-interview
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F008-pai-resource-integration --stage ralplan
node tools/ai-scaffold/dist/cli.js check-plan-approved docs/features/F008-pai-resource-integration
`

After approved build:

`powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F008-pai-resource-integration
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F008-pai-resource-integration --skip-backend-integration
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F008-pai-resource-integration --skip-backend-integration --run-e2e
`

## 7. Known Verification Risks

- PAI 沙箱账号、Workspace、Quota、RAM 权限、Region 未确认；本地测试需使用受控 test double 覆盖错误映射，真实联调待环境确认。
- PAI 资源概念与原型节点列表不完全一致；QA 需要记录字段映射和视觉差异。
- F007 配置/组织 seam 若变化，F008 需要同步调整测试 fixture 和权限边界。
