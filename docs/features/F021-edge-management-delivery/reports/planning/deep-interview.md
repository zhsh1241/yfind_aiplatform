> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-edge-management-delivery.md`
> Interview transcript: `.omx/interviews/edge-management-delivery-20260605T040121Z.md`

# Deep Interview Spec: F021 edge-management-delivery

## Metadata
- Feature: F021-edge-management-delivery
- Profile: standard
- Type: brownfield
- Final ambiguity: 0.16
- Threshold: 0.20
- Context snapshot: `.omx/context/edge-management-delivery-20260605T040121Z.md`
- Interview transcript: `.omx/interviews/edge-management-delivery-20260605T040121Z.md`

## Intent
在模型注册（F019）与模型评估发布门禁（F020）之后，补齐一期推理域中优先级最高的边端服务器纳管与模型下发闭环，使平台能把已 Production 的模型版本下发到延锋内网边端服务器，并具备授权、状态、完整性校验和审计证据。

## Desired Outcome
- `docs/features/F021-edge-management-delivery/plan.md` 明确边端服务器注册、纳管、模型下发申请、owner 授权、下发执行 seam、完整性校验、前端 `edge` 页面与质量验证路径。
- 后续 `/build-feature` 可产出 TASK/contract/test-plan、后端 API/SQL/测试、前端页面/E2E 和联调/QA 报告。

## In Scope
- 边端服务器注册、编辑、停用、详情、心跳/在线状态记录。
- 边端硬件/位置/BU/负责人/Agent 版本/资源摘要等元数据。
- 选择 F019/F020 后已进入 `PRODUCTION` 的模型版本创建边端下发申请。
- 边端应用 owner 授权后方可执行下发（INF-003）。
- 下发任务状态机：`REQUESTED -> APPROVED|REJECTED -> QUEUED -> TRANSFERRING -> VERIFYING -> DEPLOYED|FAILED|ROLLED_BACK|CANCELLED`。
- 模型文件 hash / artifact 元数据完整性校验，失败时阻断启动并记录 retry seam（INF-008）。
- 下发历史、回滚记录、下载/传输 diagnostic、审计事件。
- 前端 `/edge` 页面接入真实 API：服务器列表、详情抽屉、注册表单、下发申请、审批/执行动作、状态/错误/空状态。

## Out-of-Scope / Non-goals
- 不实现中心端在线推理服务、KServe、流量灰度或 A/B。
- 不实现真实边端 Agent、mTLS 证书分发、文件传输、远程故障诊断、系统升级、边端应用开发。
- 不新增训练任务或开发环境能力。
- 不绕过模型 owner 授权，不允许非 Production 模型版本执行下发。

## Decision Boundaries
- Codex 可自行设计 REST API、DTO、SQL 表、状态机错误码、前端 Ant Design 交互与测试策略。
- Codex 可使用 `TODO_CONFIRM_EDGE_AGENT_PROTOCOL`、`TODO_CONFIRM_EDGE_MTLS_CERT_ROTATION`、`MANUAL_AGENT_SEAM` 等 diagnostic 保留真实边端通道。
- Codex 不可猜测外部审批系统、证书体系、Agent 上报协议或边端运行时命令格式。

## Constraints
- 必须复用 `ModelRegistryService` / `model_registry_version` 作为模型版本事实源，不能新增平行模型版本表。
- 必须复用对象存储文件元数据与 hash 字段，不能用前端输入的 hash 作为可信事实源。
- 必须复用平台权限/组织/审计基础，跨 BU 不可泄露边端和模型信息。
- 必须保持原型 `edge` 信息架构；没有独立截图时以编译原型 `edge` 页面和 `screen-hub.png` 下发入口为视觉参考。

## Testable Acceptance Criteria (Planning-Level)
- AC-01: 可注册边端服务器并记录位置、BU/组织、负责人、Agent 版本、硬件摘要和初始状态。
- AC-02: 可接收/模拟心跳更新在线状态；停用边端不可作为下发目标。
- AC-03: 仅 `PRODUCTION` 模型版本可创建边端下发申请，非 Production 或不可见模型被拒绝。
- AC-04: 下发申请必须经边端应用 owner 授权；未授权时仅生成申请/待审批，不执行。
- AC-05: 授权后可进入执行状态机并记录传输/验证/部署结果。
- AC-06: 模型文件 hash 完整性校验失败时任务失败、阻断部署并记录 retry/diagnostic。
- AC-07: 支持下发历史、回滚记录与失败原因查询。
- AC-08: 跨 BU 无授权用户不可查看或操作边端服务器、下发任务和模型 artifact。
- AC-09: 注册、心跳、申请、审批、执行、校验失败、部署成功、回滚均记录审计。
- AC-10: 前端 `/edge` 使用真实 API 展示列表、详情、注册、下发、审批/执行、空状态和错误状态。

## Assumptions Exposed + Resolutions
- Assumption: 没有真实 Agent 会导致功能不可用。Resolution: 业务状态、授权、hash 校验、审计与下发记录必须真实持久化；外部传输用 explicit seam，不用 mock 数据冒充成功。
- Assumption: 边端下发需要 VPN/专线。Resolution: ARC-02 已解决，边端在延锋内网，无需 VPN/专线。
- Assumption: 中心端推理必须先做。Resolution: SCO-02 已解决，中心端推理二期，边端管理一期。

## Pressure-pass Findings
范围被压缩为“边端控制面 + 下发事实源 + Agent seam”，拒绝把 KServe、中心端推理、远程诊断和真实 Agent 混入本期，避免范围膨胀且保持生产可替换 seam。

## Brownfield Evidence vs Inference Notes
- Evidence: `docs/business/rules/03-推理部署规则.md` INF-003/INF-008 是硬规则。
- Evidence: `docs/business/open-questions.md` ARC-02/ARC-03/BIZ-05/SCO-02 已给出边界。
- Evidence: 后端已有模型注册、模型评估、对象存储、PAI 资源、身份/审计服务。
- Inference: F021 编号是当前仓库 NEXT_FEATURE_NUMBER 后续编号；功能内容对应路线图中尚未正式创建的 `edge-management-delivery`。

## Handoff
Next required skill: `$ralplan` using this spec, then archive PRD/test-spec into `docs/features/F021-edge-management-delivery/reports/planning/` and draft `plan.md` with `plan_status: draft`.
