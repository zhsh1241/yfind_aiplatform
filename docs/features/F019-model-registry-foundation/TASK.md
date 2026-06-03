# Task: 模型中心与模型版本基础

## Metadata
- Feature: F019-model-registry-foundation
- ID: TASK-model-registry-foundation
- Status: draft
- Owner: codex
- Created: 2026-06-03
- Updated: 2026-06-03
- 前置：同目录 `plan.md` 已于 2026-06-03 获用户批准，可进入实现。

## 1. 需求摘要
### User Story
作为模型训练工程师或 BU 管理员，我想要在模型中心中纳管模型、模型版本、模型文件、权限和生命周期，以便后续开发环境、训练任务、模型评估、工程化和推理部署都引用同一套模型版本事实源。

### Business Value
- 为模型开发域建立统一模型注册中心，避免训练、评估、工程化、推理模块重复定义模型版本。
- 支撑预训练模型选择和训练产物发布。
- 固化模型文件、权限、跨 BU 共享、发布准入和状态机规则。
- 确保模型文件复用平台 MinIO / `platform_file_object` 治理，并记录审计。

### Source References
- Business docs:
  - `docs/business/bizdocs/02-02-业务流程-模型开发与训练.md`
  - `docs/business/bizdocs/03-02-系统功能-模型开发.md`
  - `docs/business/domain/02-领域对象-模型域.md`
  - `docs/business/rules/02-模型开发规则.md`
  - `docs/business/api/01-API接口规范.md`
- Prototype:
  - `docs/prototype/SMP工业AI平台-原型v2.html`
  - page key: `hub` / `train` / `exp` / `eval`
  - screenshots: `screen-hub.png`、`screen-train.png`、`screen-exp.png`、`screen-eval.png`、`light-train.png`

## 2. 范围
### In Scope
- [ ] 模型中心列表、详情、关键词搜索与按标签/框架/任务类型/scope/状态筛选。
- [ ] 模型创建与元数据维护：名称、描述、framework、taskType、inputFormat、outputFormat、runtimeRequirements、tags、owner、scope。
- [ ] 模型版本创建、版本号唯一性、版本详情、版本历史与当前版本。
- [ ] 模型版本绑定 `platform_file_object` / MinIO 对象；一期支持 `.pt`、`.pth`、`.onnx`、`.zip`，最大 2GB。
- [ ] 模型版本生命周期状态机：`Development → Testing → Production → Deprecated`。
- [ ] 未评估版本禁止发布 `Production`；管理员可导入外部评估证明。
- [ ] 活跃推理引用版本禁止删除，并返回阻断原因和引用摘要。
- [ ] 模型 scope：`PLATFORM` / `BU` / `PRIVATE`；跨 BU 访问采用单级审批（owner 或 owner 所属 BU 管理员）。
- [ ] 预训练模型选择器只展示有权限且可用的模型版本。
- [ ] 模型下载使用 10 分钟 MinIO 预签名 URL，并记录下载审计。
- [ ] 关键操作与规则阻断写入审计。
- [ ] 页面移除原型说明性质元素，只保留真实业务数据、空状态和错误状态。

### Out of Scope
- 训练任务调度、资源申请、训练日志、TensorBoard。
- Notebook / VSCode / SSH 开发环境。
- 真实模型评估执行、多维评估报告、混淆矩阵。
- 量化、剪枝、蒸馏、格式转换、边端推送。
- 推理服务部署、边端部署、流量治理、服务回滚。
- 真实 MLflow、KServe、Argo Workflows、外部模型仓库或企业模型市场集成。
- 自动解析 `.zip` 中训练代码或执行任意模型代码。

## 3. 技术分析
### Backend
- Module/API:
  - `GET /api/v1/models`
  - `POST /api/v1/models`
  - `GET /api/v1/models/{modelId}`
  - `PATCH /api/v1/models/{modelId}`
  - `GET /api/v1/models/{modelId}/versions`
  - `POST /api/v1/models/{modelId}/versions`
  - `GET /api/v1/models/{modelId}/versions/{versionId}`
  - `POST /api/v1/models/{modelId}/versions/{versionId}/transition`
  - `DELETE /api/v1/models/{modelId}/versions/{versionId}`
  - `POST /api/v1/models/{modelId}/access-requests`
  - `PUT /api/v1/model-access-requests/{requestId}/approve`
  - `PUT /api/v1/model-access-requests/{requestId}/reject`
  - `POST /api/v1/models/{modelId}/versions/{versionId}/download-url`
- Domain objects:
  - `Model`、`ModelVersion`、`ModelAccessRequest`、`ModelAccessGrant`、`PlatformFileObject`、`PlatformAuditEvent`
- Business rules:
  - MDL-003：存在活跃推理部署的模型版本不得删除。
  - MDL-004：跨 BU 模型共享须经模型 owner 或 owner 所属 BU 管理员审批。
  - MDL-006：模型必须通过评估或管理员导入外部评估证明后方可发布 Production。
  - MDL-009：模型版本状态机不得跳跃或逆向。

### Frontend
- Prototype page key:
  - `hub` 模型中心；`train` / `exp` / `eval` 中预训练模型选择 seam。
- Pages/components:
  - 模型中心列表页。
  - 模型详情页。
  - 创建/导入模型 Modal。
  - 版本创建/状态流转/下载操作。
  - `ModelSelector` 预训练模型选择器组件。
- States/interactions:
  - 搜索筛选、分页、空状态。
  - 权限不足、未评估发布、非法状态流转、文件缺失、删除阻断等错误提示。
  - 下载 URL 生成成功提示与审计。

### AI Adapter / Integration
- Adapter endpoint:
  - 本 feature 不新增 ai-adapter 主链路。
- External system placeholders:
  - 预训练模型来源已确认一期使用 `PLATFORM_BUILT_IN` + 真实 MinIO 文件对象。
  - 安全扫描预留字段，不强制真实扫描。
  - 后续 F022 接真实评估，推理域接真实 active deployment 引用。

### Database
- Tables:
  - 新增 `model_registry_model`
  - 新增 `model_registry_version`
  - 新增 `model_access_request`
  - 新增 `model_access_grant`
  - 复用 `platform_file_object`、平台用户/组织/角色、平台审计表。
- Migrations:
  - 新增 Flyway migration，SQL 归档到 `docs/features/F019-model-registry-foundation/sql/`。

## Reuse Plan
- Existing reference seams to reuse:
  - `docs/business/bizdocs/02-02-业务流程-模型开发与训练.md`
  - `docs/business/bizdocs/03-02-系统功能-模型开发.md`
  - `docs/business/domain/02-领域对象-模型域.md`
  - `docs/business/rules/02-模型开发规则.md`
  - `docs/prototype/SMP工业AI平台-原型v2.html`
- Existing service/scaffold seams to reuse:
  - 后端统一 envelope、traceId、`PlatformError`、`PlatformException`、`GlobalExceptionHandler`。
  - `ObjectStorageService` / MinIO 本地配置与 `platform_file_object` 治理模式。
  - 平台身份、组织、权限和测试用户基座。
  - 审计事件表与审计写入模式。
  - 前端 `apiClient`、Ant Design 管理台 shell、路由和平台 API 类型定义模式。
  - 现有 Vitest/RTL、Playwright E2E helpers、AI scaffold gate。
- New seams allowed only if existing seams cannot be reused, because:
  - 需要新增模型注册中心领域表，现有数据集/文件对象表不能表达模型版本状态机和模型权限。
  - 需要新增模型选择器组件，训练/开发/评估页面后续复用。
  - 需要新增评估准入与推理引用检查 seam，但真实评估和推理由后续 feature 接管。

## 5. Acceptance Criteria
- [ ] AC-01: 用户可在模型中心按关键词、标签、框架、任务类型、scope、状态筛选模型列表，并分页展示真实结果。
- [ ] AC-02: 用户可创建模型并维护元数据；缺少必填元数据时前后端均拒绝。
- [ ] AC-03: 用户可为模型创建版本，版本号同模型内唯一，文件类型仅允许 `.pt`、`.pth`、`.onnx`、`.zip` 且最大 2GB，并绑定 `platform_file_object`。
- [ ] AC-04: 模型详情展示基础元数据、版本历史、文件信息、指标摘要、权限摘要和审计记录。
- [ ] AC-05: 版本状态只能按 `Development → Testing → Production → Deprecated` 合法流转，非法跳转被阻断。
- [ ] AC-06: 未通过评估或无管理员导入外部评估证明的版本不能发布为 `Production`。
- [ ] AC-07: 存在活跃推理引用的版本不能删除，并展示阻断原因和引用摘要。
- [ ] AC-08: 平台模型、BU 模型、私有模型按权限可见；跨 BU 无授权访问被阻断。
- [ ] AC-09: 跨 BU 访问申请/审批 seam 可记录状态，审批通过前 scope 变更或访问授权不生效。
- [ ] AC-10: 预训练模型选择器只展示用户有权限且状态可用的模型版本。
- [ ] AC-11: 下载模型时后端生成 10 分钟 MinIO 预签名 URL，前端不暴露 MinIO 账号密码，并记录下载审计。
- [ ] AC-12: 关键写操作与规则阻断均记录审计事件。
- [ ] AC-13: 页面不出现原型说明性质元素，空状态/错误状态均展示业务化文案。

## 6. Definition of Done
- [ ] plan.md 已批准。
- [ ] contract.md 已冻结或实现态。
- [ ] test-plan.md 引用全部 AC-xx。
- [ ] 复用审查已完成。
- [ ] 权限、审计和 MUST 规则有验证证据。
- [ ] 后端单元/集成测试覆盖 MDL-003/004/006/009。
- [ ] 前端单测和 E2E 覆盖模型中心主链路。
- [ ] 质量门禁通过或记录等价 CI 证据。

## 7. 风险与问题
- 真实评估能力未实现，F019 只能支持管理员导入外部评估证明作为临时准入依据。
- 推理部署引用检查需要后续推理域接入真实数据；本期先实现 seam 和模拟引用测试。
- 安全扫描只预留状态字段，一期不强制真实扫描。
- 平台内置预训练模型必须绑定真实 MinIO 文件对象；若本地对象缺失，需要种子数据补齐。
