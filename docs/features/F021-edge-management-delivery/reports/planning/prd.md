> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-edge-management-delivery.md`

# PRD: F021-edge-management-delivery

## Metadata
- Feature: F021-edge-management-delivery
- Title: 边端服务器与模型下发
- Date: 2026-06-05
- Source spec: `.omx/specs/deep-interview-edge-management-delivery.md`
- Consensus mode: RALPLAN-DR short
- Verdict: APPROVE for plan drafting

## Problem
F019/F020 已经形成模型版本与评估发布门禁，但平台仍缺少一期推理域最高优先级的边端控制面。业务要求在延锋内网边端服务器上快速下发 Production 模型版本，同时满足 owner 授权、完整性校验、失败阻断和审计。没有该能力时，模型市场中的生产模型无法进入边端生产闭环。

## Goals
1. 建立边端服务器注册、纳管、停用、心跳与状态事实源。
2. 建立边端模型下发申请、授权、执行、验证、部署结果与历史事实源。
3. 强制执行 INF-003：下发到边端生产服务器必须经边端应用 owner 授权。
4. 强制执行 INF-008：模型文件下发后必须进行 SHA-256 完整性校验，失败时阻断部署。
5. 前端 `/edge` 页面按原型信息架构接入真实 API，支持边端列表、详情、注册、下发申请、审批/执行和状态反馈。
6. 为真实边端 Agent、mTLS、传输协议保留 explicit seam，不用 mock 成功替代外部系统。

## Users
- 模型应用工程师：选择 Production 模型版本并发起边端下发。
- 边端应用 owner / BU 管理员：审批边端生产服务器模型变更。
- 平台运维：纳管边端服务器、查看心跳/部署状态、处理失败与回滚。
- 审计/安全管理员：追踪下发授权、执行、完整性校验和跨 BU 访问。

## Functional Requirements
### FR-01 Edge Server Registry
- 创建、更新、停用边端服务器。
- 字段包括 `edgeServerId`、名称、位置、组织/BU、owner、IP/hostname、Agent 版本、硬件摘要、状态、lastHeartbeatAt、diagnostic。
- 停用服务器不可作为新下发目标。

### FR-02 Heartbeat and Status
- 支持边端心跳上报/模拟 API，更新 online/offline/stale 状态与资源摘要。
- 不实现远程监控与故障诊断；只保留近期状态与最后心跳。

### FR-03 Deployment Request
- 用户选择边端服务器、模型、模型版本、下发策略（立即/定时 seam）、回滚目标 seam、备注创建下发申请。
- 仅允许 F019 中状态为 `PRODUCTION` 且当前用户可见/已授权的模型版本。
- 必须绑定模型版本 artifact/fileObject/hash 事实源。

### FR-04 Owner Approval
- 未授权下发申请进入 `REQUESTED/PENDING_APPROVAL`，不得执行。
- owner 可 `APPROVE` 或 `REJECT`，拒绝后终止。
- 审批系统集成保留 `TODO_CONFIRM_EDGE_APPROVAL_INTEGRATION` seam，本期在平台内持久化审批动作。

### FR-05 Deployment Execution Seam
- 授权后执行状态机：`APPROVED -> QUEUED -> TRANSFERRING -> VERIFYING -> DEPLOYED|FAILED`。
- 真实 Agent 传输协议未确认时，执行接口返回 diagnostic：`MANUAL_AGENT_SEAM` / `TODO_CONFIRM_EDGE_AGENT_PROTOCOL`。
- 仍需持久化执行时间、操作者、目标版本、artifact、状态、错误原因和重试计数。

### FR-06 Integrity Verification and Rollback
- VERIFYING 阶段比较平台侧 trusted SHA-256 与边端回传/录入 receivedSha256。
- 不一致则 `FAILED`，阻断部署，并记录 `EDGE_DEPLOYMENT_INTEGRITY_FAILED` 审计。
- 支持记录 rollback target 与 `ROLLED_BACK` 状态 seam，不实现真实回滚命令。

### FR-07 Query and History
- 支持边端列表、详情、按服务器/模型/状态查询部署历史、查看审计摘要与失败原因。
- 详情展示当前部署、历史部署、最后心跳和 diagnostic。

### FR-08 Frontend Edge Page
- `/edge` 页面使用真实 `/api/v1/edge-*` API。
- 保留原型导航 key `edge`，展示边端服务器卡片/表格、状态标签、详情抽屉、注册表单、下发申请表单、审批/执行按钮、空状态、错误状态。
- 不出现“原型占位/模拟数据”类文案。

## Non-goals
- 不实现 KServe、中心端在线推理服务、A/B 流量、批量推理。
- 不实现真实边端 Agent、mTLS 证书分发、文件传输、远程故障诊断、系统升级或边端应用开发。
- 不新增模型版本平行事实源，不绕过 F019/F020 生产状态与评估门禁。

## Domain Model
- `EdgeServer`: edge server aggregate root.
- `EdgeDeployment`: model delivery/deployment aggregate, linked to `EdgeServer`, `model_registry_model`, `model_registry_version`, file object/artifact.
- `EdgeDeploymentApproval`: owner approval record.
- `EdgeDeploymentEvent`: status transition / audit projection seam if needed.

## API Draft
- `GET /api/v1/edge-servers`
- `POST /api/v1/edge-servers`
- `GET /api/v1/edge-servers/{edgeServerId}`
- `PATCH /api/v1/edge-servers/{edgeServerId}`
- `POST /api/v1/edge-servers/{edgeServerId}/heartbeat`
- `POST /api/v1/edge-deployments`
- `GET /api/v1/edge-deployments?edgeServerId=&modelId=&status=`
- `GET /api/v1/edge-deployments/{deploymentId}`
- `POST /api/v1/edge-deployments/{deploymentId}/approvals:approve`
- `POST /api/v1/edge-deployments/{deploymentId}/approvals:reject`
- `POST /api/v1/edge-deployments/{deploymentId}/actions:execute`
- `POST /api/v1/edge-deployments/{deploymentId}/actions:verify-integrity`
- `POST /api/v1/edge-deployments/{deploymentId}/actions:rollback`

## Permissions and Audit
### Permissions
- `edge:server:read`, `edge:server:write`, `edge:deployment:read`, `edge:deployment:request`, `edge:deployment:approve`, `edge:deployment:execute`.
- 跨 BU 默认不可见；模型 owner 授权与边端 owner 授权均需校验。

### Audit Events
- `EDGE_SERVER_REGISTERED`, `EDGE_SERVER_UPDATED`, `EDGE_SERVER_DECOMMISSIONED`, `EDGE_SERVER_HEARTBEAT_RECEIVED`
- `EDGE_DEPLOYMENT_REQUESTED`, `EDGE_DEPLOYMENT_APPROVED`, `EDGE_DEPLOYMENT_REJECTED`, `EDGE_DEPLOYMENT_EXECUTION_STARTED`
- `EDGE_DEPLOYMENT_INTEGRITY_PASSED`, `EDGE_DEPLOYMENT_INTEGRITY_FAILED`, `EDGE_DEPLOYMENT_DEPLOYED`, `EDGE_DEPLOYMENT_FAILED`, `EDGE_DEPLOYMENT_ROLLED_BACK`, `EDGE_ACCESS_DENIED`

## Reuse Strategy
### Must Reuse
- `ModelRegistryService` / `model_registry_model` / `model_registry_version`：模型与版本事实源，Production 状态校验。
- F020 evaluation readiness：不重复评估事实，只信任已经 Production 的版本。
- `platform_file_object` / `ObjectStorageService`：模型 artifact/fileObject/hash 事实源。
- `PlatformIdentityService` / 组织、角色、审计日志：权限、跨 BU 隔离和审计。
- `PaiResourceService`：资源摘要/资源池信息可作为展示参考，不作为边端本地硬件事实源。
- 前端 `platformApi`、统一 envelope、Ant Design shell、TanStack Query、导航 key `edge`。

### Duplication Rejected
- 不复制旧已删除实现。
- 不新增平行模型、文件、用户、组织、审计表。
- 不把真实 Agent 成功状态硬编码为 mock 成功。

### Approved New Seams
- 新增 `edge_server`、`edge_deployment`、`edge_deployment_approval` SQL。
- 新增 `EdgeManagementController/Service/Dtos`。
- 新增 `frontend/src/features/edge/EdgeManagementPage.tsx` 与测试。

## RALPLAN-DR Summary
### Principles
1. 真实持久化业务事实，不用外部 mock 替代状态机。
2. 复用模型/文件/权限/审计事实源，避免平行域模型。
3. 未确认外部 Agent/mTLS 明确标注 seam。
4. 前端保持原型信息架构并接入真实 API。
5. 权限和完整性校验优先于交互便利。

### Decision Drivers
1. INF-003/INF-008 是生产规则硬约束。
2. 当前仓库已有 F019/F020 模型发布事实源，可支撑边端下发。
3. 外部 Agent 协议未确认，必须保持可替换 seam。

### Viable Options
- Option A: 控制面 + 手动 Agent seam（Chosen）
  - Pros: 可生产化持久化状态、权限、审计；不猜测外部协议；本期可验收。
  - Cons: 不自动完成真实传输。
- Option B: 直接实现 Agent HTTP 推送协议
  - Pros: 自动化程度高。
  - Cons: 协议、证书、网络、命令格式未确认，易锁死错误集成。
- Option C: 仅前端占位
  - Pros: 快。
  - Cons: 违反生产可用要求与用户长期指令，Rejected。

## Risks
- 真实 Agent/mTLS 未确认：用 `TODO_CONFIRM_*` diagnostic 和 contract seam 缓解。
- 模型 artifact hash 源字段不足：build 阶段需核查 F019 SQL，必要时只复用可信 file object hash 字段。
- owner 授权边界可能跨模型 owner 与边端 owner：contract 需明确双重授权与错误码。
- E2E 涉及新 `/edge` 页面：必须新增 Playwright 覆盖。

## Open Questions
- `TODO_CONFIRM_EDGE_AGENT_PROTOCOL`: Agent 传输协议、回调/上报格式。
- `TODO_CONFIRM_EDGE_MTLS_CERT_ROTATION`: mTLS 证书签发与轮换。
- `TODO_CONFIRM_EDGE_APPROVAL_INTEGRATION`: 是否接入外部工单系统。
- `TODO_CONFIRM_EDGE_ROLLBACK_COMMAND`: 真实边端回滚命令与运行时约束。

## Follow-up Staffing Guidance
- `contract-architect`: 冻结 API、状态机、错误码、权限、审计和 SQL contract。
- `test-designer`: 覆盖 P0 权限/状态机/hash/审计与 E2E 主链路。
- `backend-tdd-engineer`: 先写后端 controller/service tests，再实现 SQL/API/service。
- `frontend-engineer`: 后端完成后接入 `/edge` 页面与单测/E2E。
- `integration-checker`, `code-reviewer`, `qa-tester`: 串行复验。
