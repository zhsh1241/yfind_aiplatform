---
feature: F021-edge-management-delivery
title: 边端服务器与模型下发
plan_status: approved
approved_at: 2026-06-05
owner: codex
created_at: 2026-06-05
updated_at: 2026-06-05
---

# Plan: 边端服务器与模型下发

## 1. 背景与目标

### 业务来源
- `docs/business/bizdocs/02-03-业务流程-模型部署与推理.md`：INF-002 边端服务器管理与模型下发流程。
- `docs/business/bizdocs/03-03-系统功能-模型部署.md`：FUNC-INF-020~024 边端注册、纳管、模型下发、服务验证、连接状态监控。
- `docs/business/domain/05-领域对象-推理域.md`：EdgeServer / EdgeDeployment 聚合与状态机。
- `docs/business/rules/03-推理部署规则.md`：INF-003 边端下发须经 owner 授权；INF-008 下发须验证文件完整性。
- `docs/business/open-questions.md`：ARC-02、ARC-03、BIZ-05、SCO-02 已明确一期边界。

### 原型来源
- `docs/prototype/SMP工业AI平台-原型v2.html` 与 compiled demo 中 page key `edge`。
- `docs/prototype/screen-hub.png` 作为模型市场下发入口参考；`edge` 页面以编译原型为准。

### 目标结果
在 F019 模型注册与 F020 模型评估门禁之后，交付一期推理域边端闭环：平台可纳管边端服务器、发起 Production 模型版本下发申请、经 owner 授权后进入执行/验证状态机，按模型 artifact hash 完整性校验决定部署成功或失败，并在前端 `/edge` 页面展示真实状态与审计可追溯信息。

## 2. 范围

### In Scope
- 边端服务器注册、编辑、停用、详情与列表筛选。
- 边端心跳/在线状态更新与硬件资源摘要记录。
- 基于 F019 `PRODUCTION` 模型版本创建边端下发申请。
- 边端应用 owner 授权/拒绝；未授权不得执行下发。
- 下发状态机：`REQUESTED -> APPROVED|REJECTED -> QUEUED -> TRANSFERRING -> VERIFYING -> DEPLOYED|FAILED|ROLLED_BACK|CANCELLED`。
- SHA-256 完整性校验；hash 不一致时阻断部署、记录失败与 retry seam。
- 下发历史、回滚记录、失败原因、diagnostic 与审计事件查询。
- 前端 `/edge` 页面真实 API 接入：边端列表、详情抽屉、注册表单、下发申请、审批/执行动作、空状态和错误状态。
- Playwright E2E 覆盖 `/edge` 主链路。

### Out of Scope / Non-goals
- 不实现中心端在线推理服务、KServe、A/B 流量、批量推理或模型服务网关。
- 不实现真实边端 Agent、mTLS 证书分发、文件传输通道、远程故障诊断、系统升级或边端应用开发。
- 不新增训练任务、开发环境、MLflow/Argo/Kubeflow 编排。
- 不新增平行模型版本、文件、用户、组织或审计事实源。
- 不用 mock 成功掩盖未接入的 Agent/传输能力；未确认项必须以 `TODO_CONFIRM_*` diagnostic 透明呈现。

## Reuse Strategy

### Must Reuse
- 业务与规则事实源：`docs/business/bizdocs/02-03-业务流程-模型部署与推理.md`、`03-03-系统功能-模型部署.md`、`domain/05-领域对象-推理域.md`、`rules/03-推理部署规则.md`。
- 模型事实源：复用 F019 `ModelRegistryService`、`model_registry_model`、`model_registry_version` 与模型 owner/跨 BU 授权规则；只允许 `PRODUCTION` 模型版本下发。
- 评估门禁事实：复用 F020 产出的 Production 前评估门禁结果，不在 F021 重复定义评估记录。
- 文件与 hash：复用 `platform_file_object` / `ObjectStorageService` 中可信 artifact/hash 元数据；不得信任前端任意输入的 hash。
- 身份、权限与审计：复用 `PlatformIdentityService`、组织/BU 作用域、平台审计日志和统一错误处理。
- 前端基座：复用 `platformApi`、统一 envelope、Ant Design shell、TanStack Query、`AppNavigation` 中 `edge` 导航 key。
- 测试基座：复用现有 controller test 的认证/组织/模型/file seed 模式、Vitest/RTL 与 Playwright 登录 helper。

### Duplication Rejected
- 拒绝复制旧已删除 backend/frontend 实现。
- 拒绝新增 `edge_model_version` 等与 F019 模型版本冲突的平行模型表。
- 拒绝新增独立用户/组织/审批/审计体系。
- 拒绝把真实 Agent 传输硬编码为自动成功 mock；只能保留 explicit seam 与 diagnostic。

### Approved New Seams
- 新增 SQL 表：`edge_server`、`edge_deployment`、`edge_deployment_approval`（必要时可扩展 event projection）。
- 新增后端：`EdgeManagementController`、`EdgeManagementService`、`EdgeManagementDtos`。
- 新增前端：`frontend/src/features/edge/EdgeManagementPage.tsx`、对应单测与 `frontend/e2e/edge-management-delivery.spec.ts`。
- 新增 diagnostic：`TODO_CONFIRM_EDGE_AGENT_PROTOCOL`、`TODO_CONFIRM_EDGE_MTLS_CERT_ROTATION`、`TODO_CONFIRM_EDGE_APPROVAL_INTEGRATION`、`MANUAL_AGENT_SEAM`。

## 4. 技术方案要点

### 后端
- API 使用 `/api/v1`、统一 `ApiResponse<T>` envelope、Bearer Token 与平台 traceId。
- API 草案：
  - `GET/POST /api/v1/edge-servers`
  - `GET/PATCH /api/v1/edge-servers/{edgeServerId}`
  - `POST /api/v1/edge-servers/{edgeServerId}/heartbeat`
  - `GET/POST /api/v1/edge-deployments`
  - `GET /api/v1/edge-deployments/{deploymentId}`
  - `POST /api/v1/edge-deployments/{deploymentId}/approvals:approve|reject`
  - `POST /api/v1/edge-deployments/{deploymentId}/actions:execute|verify-integrity|rollback`
- 状态机由 service 层强制：未授权不得 execute，非 Production 模型不得 request，停用 server 不得 request，终态不可重复执行。
- hash 校验使用平台侧可信 artifact hash 与边端回传/录入 hash 比对；失败写入 `FAILED` 与 retry diagnostic。
- SQL migration 在 build 阶段冻结到 `backend/smp-app/src/main/resources/db/migration/`，并归档到本 feature `sql/`。

### 前端
- `/edge` 接入真实 API，不使用说明性 mock。
- 页面结构：边端状态概览、服务器列表、详情抽屉、注册/编辑表单、下发申请表单、审批/执行/校验动作、下发历史、失败 diagnostic。
- 状态标签与按钮权限基于后端返回 permission flags 或当前状态禁用。
- E2E 通过 route intercept 验证真实 API 路径与主链路。

### 数据、权限与审计
- 领域对象：`EdgeServer`、`EdgeDeployment`、`EdgeDeploymentApproval`、`ModelVersion`、`PlatformFileObject`、`PlatformAuditEvent`。
- MUST 规则：INF-003、INF-008、仅 Production 模型版本可下发、跨 BU 不泄露。
- 权限：`edge:server:read/write`、`edge:deployment:read/request/approve/execute`。
- 审计事件：`EDGE_SERVER_REGISTERED`、`EDGE_SERVER_HEARTBEAT_RECEIVED`、`EDGE_DEPLOYMENT_REQUESTED`、`EDGE_DEPLOYMENT_APPROVED`、`EDGE_DEPLOYMENT_REJECTED`、`EDGE_DEPLOYMENT_EXECUTION_STARTED`、`EDGE_DEPLOYMENT_INTEGRITY_PASSED`、`EDGE_DEPLOYMENT_INTEGRITY_FAILED`、`EDGE_DEPLOYMENT_DEPLOYED`、`EDGE_DEPLOYMENT_ROLLED_BACK`、`EDGE_ACCESS_DENIED`。

## 5. 验收项草案（后续 TASK.md 转为稳定 AC）
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

## 6. 风险与依赖
- `TODO_CONFIRM_EDGE_AGENT_PROTOCOL`：真实边端 Agent 协议与回调格式未确认；本期只做可替换 seam。
- `TODO_CONFIRM_EDGE_MTLS_CERT_ROTATION`：mTLS 证书签发和轮换未确认；不得猜测实现。
- `TODO_CONFIRM_EDGE_APPROVAL_INTEGRATION`：是否接入外部工单系统未确认；本期平台内审批持久化。
- `TODO_CONFIRM_EDGE_ROLLBACK_COMMAND`：真实回滚命令和边端运行时未确认；本期记录回滚状态 seam。
- 模型 artifact hash 字段需在 build 阶段核查 F019/F020 现状；若缺少可信 hash，需要在 contract 中明确限制或补齐文件对象字段复用。

## 7. 规划证据归档
- Deep Interview: `docs/features/F021-edge-management-delivery/reports/planning/deep-interview.md`
- PRD: `docs/features/F021-edge-management-delivery/reports/planning/prd.md`
- Test Spec: `docs/features/F021-edge-management-delivery/reports/planning/test-spec.md`
- Runtime spec: `.omx/specs/deep-interview-edge-management-delivery.md`
- Runtime PRD/Test Spec: `.omx/plans/prd-edge-management-delivery.md`、`.omx/plans/test-spec-edge-management-delivery.md`

## 8. 后续交付流程
1. 人审本 `plan.md`。
2. 批准后人工将 frontmatter 改为：`plan_status: approved`，并填写 `approved_at: YYYY-MM-DD`。
3. 执行：`node tools/ai-scaffold/dist/cli.js check-plan-approved docs/features/F021-edge-management-delivery`。
4. 再执行 `/build-feature docs/features/F021-edge-management-delivery`，由 build-feature 串行产出 `TASK.md`、`contract.md`、`test-plan.md`、后端、前端、联调、code review、QA 和门禁证据。

## 9. 审批记录
- Reviewer: 待人审
- Decision: 待批准

