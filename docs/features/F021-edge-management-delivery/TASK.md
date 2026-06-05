# Task: 边端服务器与模型下发

## Metadata
- Feature: F021-edge-management-delivery
- ID: TASK-edge-management-delivery
- Status: in-progress
- Owner: codex
- Created: 2026-06-05
- Updated: 2026-06-05
- 前置：同目录 `plan.md` 已由用户于 2026-06-05 批准；`check-build-feature-prereqs` 已通过。

## 1. 需求摘要
### User Story
作为模型应用工程师 / 边端应用 owner，我希望平台能纳管边端服务器，并将已通过评估且进入 Production 的模型版本安全下发到边端服务器，以便满足低延迟本地推理场景，同时保证 owner 授权、文件完整性校验和审计可追溯。

### Business Value
- 补齐一期推理域中边端模型下发闭环。
- 将 F019/F020 模型版本与评估门禁真正延伸到边端生产部署。
- 避免未经授权或文件篡改的模型进入边端生产服务器。

### Source References
- Business docs: `docs/business/bizdocs/02-03-业务流程-模型部署与推理.md`、`docs/business/bizdocs/03-03-系统功能-模型部署.md`
- Domain docs: `docs/business/domain/05-领域对象-推理域.md`
- Rules: `docs/business/rules/03-推理部署规则.md` (`INF-003`, `INF-008`)
- Open questions: `docs/business/open-questions.md` (`ARC-02`, `ARC-03`, `BIZ-05`, `SCO-02`)
- Prototype: `docs/prototype/SMP工业AI平台-原型v2.html` page key `edge`，`screen-hub.png` 下发入口参考

## 2. 范围
### In Scope
- [x] 边端服务器注册、列表、详情、编辑、停用。
- [x] 心跳/在线状态更新与资源摘要记录。
- [x] 基于 Production 模型版本创建边端下发申请。
- [x] owner 授权/拒绝；未授权禁止执行。
- [x] 下发执行 seam、状态机、完整性校验、失败阻断、回滚记录 seam。
- [x] 权限、跨 BU 隔离与审计事件。
- [x] 前端 `/edge` 页面真实 API 接入与 E2E 覆盖。

### Out of Scope
- 不实现中心端在线推理服务、KServe、A/B 流量、批量推理。
- 不实现真实边端 Agent、mTLS 证书分发、远程诊断、升级或边端应用开发。
- 不新增训练任务、MLflow、Argo、Kubeflow 编排。

## 3. 技术分析
### Backend
- Module/API: `backend/smp-app/src/main/java/com/yf/smp/app/platform/EdgeManagementController.java`、`EdgeManagementService.java`、`EdgeManagementDtos.java`
- Domain objects: `EdgeServer`、`EdgeDeployment`、`EdgeDeploymentApproval`，复用 `model_registry_model` / `model_registry_version` / `platform_file_object` / `platform_audit_log`
- Migration: `backend/smp-app/src/main/resources/db/migration/V26__edge_management_delivery.sql`

### Frontend
- Prototype page key: `edge`
- Pages/components: `frontend/src/features/edge/EdgeManagementPage.tsx`
- States/interactions: server list, detail drawer, register form, deployment request, approve/reject, execute, integrity verify, rollback, empty/error states.

### External Seams
- `TODO_CONFIRM_EDGE_AGENT_PROTOCOL`
- `TODO_CONFIRM_EDGE_MTLS_CERT_ROTATION`
- `TODO_CONFIRM_EDGE_APPROVAL_INTEGRATION`
- `TODO_CONFIRM_EDGE_ROLLBACK_COMMAND`
- `MANUAL_AGENT_SEAM`

## Reuse Plan
- 复用 `ModelRegistryService` 与 `model_registry_version` 作为模型版本事实源，不新增平行模型版本表。
- 复用 F020 Production 前评估门禁结果；F021 只接受已经处于 `PRODUCTION` 的版本。
- 复用 `platform_file_object` / `ObjectStorageService` 的文件对象与 hash 元数据；完整性校验不得信任前端任意 hash。
- 复用 `PlatformIdentityService`、组织/BU 作用域、权限检查与审计日志。
- 复用前端 `platformApi`、统一 envelope、Ant Design shell、TanStack Query、`edge` 导航 key。
- 复用现有 MockMvc / Vitest / Playwright 测试基座。
- 不复用旧删库遗留实现；不复制模型、文件、用户、组织、审计的平行实现。

## 5. Acceptance Criteria
- [ ] AC-01: 用户可注册边端服务器并记录位置、BU/组织、负责人、Agent 版本、硬件摘要和初始状态。
- [ ] AC-02: 用户可通过心跳接口更新在线状态；停用边端不可作为下发目标。
- [ ] AC-03: 用户只能为 `PRODUCTION` 且可见的模型版本创建边端下发申请。
- [ ] AC-04: 下发申请必须经边端应用 owner 授权；未授权时不得执行。
- [ ] AC-05: 授权后可进入执行状态机并记录传输、验证、部署结果。
- [ ] AC-06: 模型文件 hash 完整性校验失败时任务失败、阻断部署并记录 retry/diagnostic。
- [ ] AC-07: 用户可查询下发历史、回滚记录与失败原因。
- [ ] AC-08: 跨 BU 无授权用户不可查看或操作边端服务器、下发任务和模型 artifact。
- [ ] AC-09: 注册、心跳、申请、审批、执行、校验失败、部署成功、回滚均记录审计。
- [ ] AC-10: 前端 `/edge` 使用真实 API 展示列表、详情、注册、下发、审批/执行、空状态和错误状态，不出现原型说明性 mock 文案。

## 6. Definition of Done
- [x] plan.md 已批准。
- [ ] contract.md 已冻结。
- [ ] test-plan.md 引用全部 AC-xx。
- [ ] 后端 TDD、前端单测、E2E、联调、代码审查、QA 均有证据。
- [ ] 复用审查已完成：确认复用 F019/F020 模型版本、平台文件 hash、身份/组织/权限/审计、前端 platformApi 与测试基座，不新增平行事实源。
- [ ] `check-task-traceability` / `verify-contract` / quality gate 通过或记录等价 CI 证据。

## 7. 风险与问题
- 真实边端 Agent / mTLS / 外部工单审批未确认，本期以 explicit seam 保留。
- 若 F019 模型文件 hash 字段不足，需在 contract 中明确 trusted hash 来源或补齐平台文件对象复用。
