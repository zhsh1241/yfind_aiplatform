---
feature: F019-model-registry-foundation
title: 模型中心与模型版本基础
plan_status: approved
approved_at: "2026-06-03"
owner: codex
created_at: 2026-06-02
updated_at: 2026-06-03
---

# Plan: 模型中心与模型版本基础

## 1. 背景与目标

用户已确认模型开发域下一步先从“模型中心与模型版本基础”开始，而不是直接进入开发环境、训练任务、模型评估或模型工程化。原因是这些后续模块都依赖统一的模型与模型版本事实源：预训练模型选择、训练产物发布、评估准入、工程化输入、推理部署引用、文件治理和权限控制都必须基于同一套模型注册中心能力。

业务来源：

- `docs/business/bizdocs/02-02-业务流程-模型开发与训练.md`：`MODEL-003` 模型管理流程，覆盖训练中心发布、本地模型上传、元数据、平台/团队模型、版本管理。
- `docs/business/bizdocs/03-02-系统功能-模型开发.md`：`FUNC-MODEL-001` 预训练模型选择，以及 `FUNC-MODEL-020`~`FUNC-MODEL-026` 模型导入、scope、权限、版本、元数据、检索和生命周期。
- `docs/business/domain/02-领域对象-模型域.md`：`Model` / `ModelVersion` 聚合根与版本状态、文件、指标、运行时要求。
- `docs/business/rules/02-模型开发规则.md`：`MDL-003`、`MDL-004`、`MDL-006`、`MDL-009`。
- `docs/business/api/01-API接口规范.md`：`/api/v1/models`、`/api/v1/models/{id}`、`/api/v1/models/{id}/versions` 等模型域 API 占位。

原型来源：

- `docs/prototype/SMP工业AI平台-原型v2.html`
- `docs/prototype/screen-hub.png`
- `docs/prototype/screen-exp.png`
- `docs/prototype/screen-train.png`
- `docs/prototype/screen-eval.png`
- `docs/prototype/light-train.png`

规划证据归档：

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`

## Intent

本 feature 的意图是把模型开发域的公共资产层先稳定下来：所有后续训练、开发、评估、工程化和推理能力，都必须引用同一个模型与模型版本事实源，而不是各自维护平行模型定义。

目标结果：

1. 建立模型中心列表、详情、搜索筛选与预训练模型选择基础。
2. 建立模型元数据与模型版本管理，版本绑定平台文件对象和 MinIO 存储对象。
3. 固化模型版本生命周期状态机：`Development → Testing → Production → Deprecated`。
4. 固化模型权限边界：平台模型、BU/团队模型、私有模型、跨 BU 访问授权 seam。
5. 固化 `MDL-003`、`MDL-004`、`MDL-006`、`MDL-009` 的规则门禁与测试方向。
6. 为后续 F020 开发环境、F021 训练任务、F022 模型评估、F023 模型工程化提供可复用模型版本事实源。

## 2. 范围

### In Scope

- 模型列表、详情、关键词搜索与筛选。
- 筛选维度：标签、框架、任务类型、scope、生命周期状态、owner/BU。
- 预训练模型选择器的基础数据来源，供后续训练/开发页面复用。
- 模型创建与基础元数据维护：名称、描述、framework、taskType、inputFormat、outputFormat、runtimeRequirements、tags、owner、scope。
- 模型导入 seam：本地上传 / 训练中心发布。F019 固化模型与版本纳管，不实现训练任务本身。
- 模型版本创建、版本号唯一性、版本详情、版本历史与当前版本。
- 模型版本绑定 `platform_file_object` / MinIO 对象，不新增平行模型文件表。
- 生命周期状态流转：`Development → Testing → Production → Deprecated`。
- 发布前评估通过检查 seam，遵守 `MDL-006`。
- 删除前活跃推理引用检查 seam，遵守 `MDL-003`。
- 模型 scope 与权限：`PLATFORM` / `BU` / `PRIVATE`。
- 跨 BU 访问申请/审批 seam，遵守 `MDL-004`。
- 审计记录：模型创建、更新、版本创建、文件绑定、状态变更、发布阻断、删除阻断、访问申请、审批、查看/下载。
- 前端模型中心页面、模型详情、创建/导入模型表单、版本状态操作与预训练模型选择器。

### Out of Scope / Non-goals

- 不实现训练任务调度、资源申请、训练日志、TensorBoard 或训练任务生命周期。
- 不实现 Notebook / VSCode / SSH 开发环境。
- 不实现真实模型评估执行、多维评估报告或混淆矩阵。
- 不实现量化、剪枝、蒸馏、格式转换、边端推送等工程化能力。
- 不实现推理服务部署、边端部署、流量治理、服务回滚。
- 不接入真实 MLflow、KServe、Argo Workflows、外部模型仓库或企业模型市场。
- 不用 mock 模型绕过权限、版本、文件对象和审计治理。
- 不猜测生产模型格式白名单、大小限制、安全扫描策略、跨 BU 审批级别或预训练模型授权来源。

## 3. Decision Boundaries

- **状态机口径**：以规则文档 `MDL-009` 的 `Development → Testing → Production → Deprecated` 为准；领域对象文档中的 `DRAFT / RELEASED / ARCHIVED` 在 contract 阶段做兼容映射，不反向削弱 MUST 规则。
- **评估准入**：F019 不实现真实评估任务，但发布到 `Production` 必须检查评估通过 seam；后续 F022 接管真实评估记录生成。
- **推理引用检查**：F019 不实现推理部署，但删除版本必须预留活跃推理引用查询 seam；后续推理域接入真实引用数据。
- **文件治理**：模型版本文件必须复用 `platform_file_object` 和 MinIO；不得新增独立“模型文件资产表”绕过平台存储治理。
- **权限边界**：模型可见性由 scope、owner、组织/BU 与授权记录共同决定；跨 BU 访问不得因为列表或详情接口泄露敏感模型存在性。
- **预训练模型种子**：可规划内置种子数据，但来源、授权和真实文件保留 `TODO_CONFIRM_PRETRAINED_MODEL_SOURCE`。
- **外部事实**：模型格式、文件大小、安全扫描、跨 BU 审批层级、模型来源授权均保持 `TODO_CONFIRM_*`，不得用猜测替代。

## 4. 技术方案要点

### Backend

- 新增模型域应用服务，围绕 `Model` 与 `ModelVersion` 聚合实现：
  - 模型创建 / 更新 / 查询 / 筛选。
  - 版本创建 / 查询 / 状态流转 / 删除。
  - scope 权限检查与跨 BU 授权 seam。
  - 文件对象绑定与校验。
  - 审计事件记录。
- API 草案：
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
  - `PUT /api/v1/model-access-requests/{requestId}/approve|reject`
- 错误码草案：
  - `MODEL_VERSION_CONFLICT`
  - `MODEL_VERSION_TRANSITION_INVALID`
  - `MODEL_EVALUATION_REQUIRED`
  - `MODEL_VERSION_IN_USE`
  - `MODEL_ACCESS_REQUIRED`
  - `MODEL_SCOPE_APPROVAL_REQUIRED`
  - `MODEL_FILE_OBJECT_NOT_FOUND`
  - `MODEL_FILE_OBJECT_UNREADABLE`
  - `MODEL_PERMISSION_DENIED`

### Frontend

- 复用原型模型中心信息架构，不新增无关一级菜单。
- 模型中心列表：搜索框、标签/框架/任务类型/scope/状态筛选、分页、当前版本摘要、可用操作。
- 模型详情：元数据、版本历史、文件信息、指标摘要、权限摘要、审计记录。
- 创建/导入模型：基础元数据、scope、标签、文件对象选择/上传、版本号。
- 版本状态操作：仅展示当前状态合法后继动作；后端阻断时展示具体业务原因。
- 预训练模型选择器：封装为后续训练、开发环境使用的可复用组件，只展示用户有权限且可用的模型版本。
- 移除原型说明性质文案，页面只展示真实业务交互与数据状态。

### Data / SQL

- 规划新增或扩展表：
  - `model_registry_model`
  - `model_registry_version`
  - `model_access_request` / `model_access_grant`
  - 必要的模型标签关联表或 JSON seam（由 contract 决定）。
- 必须引用现有：
  - `platform_file_object`
  - 平台用户/组织/角色表
  - 平台审计事件表
- 对 `modelId + versionNo` 建唯一约束。
- 对 `tenantId`、`ownerOrgId`、`scope`、`framework`、`taskType`、`status` 建查询索引。
- SQL 必须归档到 `docs/features/F019-model-registry-foundation/sql/`。

### Integration Seams

- **训练中心 seam**：训练任务完成后可调用模型版本创建 API 发布产物；F019 不实现训练任务。
- **模型评估 seam**：F022 写入评估记录或更新版本评估摘要；F019 只校验发布准入。
- **模型工程化 seam**：F023 以源版本创建优化任务，并输出新模型版本。
- **推理部署 seam**：推理域引用 `modelVersionId`，删除版本时提供引用检查。
- **文件对象 seam**：模型版本通过 `fileObjectId` 绑定 MinIO 对象。

## Reuse Strategy

### Must Reuse

- `docs/business/` 中模型域业务流程、系统功能、领域对象和规则文档。
- `docs/prototype/` 中模型中心、训练、实验、评估相关原型页面与信息架构。
- 后端 Spring Boot 4 / Java 21 多模块工程与统一 API envelope、traceId、错误处理模式。
- 平台 RBAC、组织/用户、审计事件基础能力。
- `platform_file_object` 与 MinIO 存储；模型版本不得自建平行文件存储。
- 前端 React / Ant Design 管理台 shell、API client、路由与测试基座。
- `tools/ai-scaffold` feature artifact / prereq / gate 工作流。

### Duplication Rejected

- 不复制已删除旧 backend/frontend 实现。
- 不为模型文件新建与 `platform_file_object` 平行的数据表和存储路径。
- 不在训练、评估、工程化模块中重复定义模型版本状态机。
- 不新增独立“预训练模型”实体替代通用 `Model` / `ModelVersion`；预训练模型应通过元数据、scope 与标签表达。
- 不用纯前端 mock 模型绕过后端权限与审计。

### Approved New Seams

- 新增模型注册中心领域表和服务。
- 新增模型访问授权/申请 seam。
- 新增模型版本状态机服务。
- 新增模型选择器前端组件 seam，供后续训练/开发环境复用。
- 新增评估准入与推理引用检查 seam，等待后续 F022/推理域接入真实数据。

## 6. 权限、规则与审计

### 领域对象

- `Model`
- `ModelVersion`
- `ModelAccessRequest`
- `ModelAccessGrant`
- `PlatformFileObject`
- `PlatformAuditEvent`

### MUST 规则

- `MDL-003`：存在活跃推理部署的模型版本不得删除。
- `MDL-004`：跨 BU 模型共享须经 BU 管理员或 owner 授权。
- `MDL-006`：模型版本必须通过评估后方可发布到模型注册中心 / Production。
- `MDL-009`：模型版本状态机须按既定顺序流转，不得跳跃或逆向。

### 权限

- 创建模型：模型训练工程师、BU 管理员、超级管理员。
- 创建版本：模型 owner、授权维护者、管理员。
- 发布 Production：模型 owner 或管理员，且满足评估准入。
- 查看/下载/用于训练/用于部署：按 scope、组织、授权记录和角色权限判定。
- 跨 BU 访问：必须存在有效授权或审批通过记录。

### 审计事件草案

- `MODEL_CREATED`
- `MODEL_UPDATED`
- `MODEL_VERSION_CREATED`
- `MODEL_VERSION_FILE_BOUND`
- `MODEL_VERSION_TRANSITIONED`
- `MODEL_VERSION_PUBLISH_BLOCKED`
- `MODEL_VERSION_DELETE_BLOCKED`
- `MODEL_VERSION_DELETED`
- `MODEL_SCOPE_CHANGE_REQUESTED`
- `MODEL_ACCESS_REQUESTED`
- `MODEL_ACCESS_APPROVED`
- `MODEL_ACCESS_REJECTED`
- `MODEL_VIEWED`
- `MODEL_DOWNLOADED`

## 7. Exception Scenarios

- 模型名称为空、framework/taskType/inputFormat/outputFormat 缺失：创建拒绝。
- 同一模型下版本号重复：返回 409。
- 文件对象不存在、跨租户、MinIO 对象不可读或 checksum 不匹配：版本创建拒绝。
- `Development` 直接流转 `Production`：拒绝并提示必须先进入 `Testing`。
- 无评估通过记录发布 `Production`：拒绝并提示先执行模型评估。
- 已有活跃推理部署引用的版本删除：拒绝并返回引用摘要。
- 跨 BU 用户无授权查看、下载、用于训练或部署模型：返回 403 或不泄露存在性。
- scope 变更为跨 BU 可见但审批未通过：变更不生效。
- 模型版本处于 `Deprecated`：不得被预训练模型选择器作为可用版本展示。
- 模型列表筛选无结果：展示真实空状态，不展示原型说明文案。

## 8. 风险与依赖

- 真实模型评估尚未实现，F019 必须避免把导入证明误表达为真实评估能力。
- 推理部署引用检查依赖后续推理域真实引用数据；本期只能规划接口/查询 seam。
- 模型文件安全扫描、格式白名单、单文件大小、压缩包结构仍待确认：`TODO_CONFIRM_MODEL_FILE_POLICY`。
- 跨 BU 审批是单级 BU 管理员还是双级审批仍待确认：`TODO_CONFIRM_MODEL_CROSS_BU_APPROVAL_LEVEL`。
- 平台内置预训练模型来源、授权与初始清单仍待确认：`TODO_CONFIRM_PRETRAINED_MODEL_SOURCE`。
- 如果已有平台文件对象表字段不足以表达模型 artifact 元数据，需要 contract 阶段明确最小扩展，避免把存储治理拆散。

## 9. 开放问题

- `TODO_CONFIRM_MODEL_FILE_POLICY`：允许哪些模型文件格式、最大大小、是否要求压缩包结构、是否需要安全扫描？
- `TODO_CONFIRM_PRETRAINED_MODEL_SOURCE`：平台内置预训练模型来自供应商、开源模型、内部训练产物还是人工导入？授权如何记录？
- `TODO_CONFIRM_MODEL_CROSS_BU_APPROVAL_LEVEL`：跨 BU 共享审批是 owner、BU 管理员单级，还是 owner + 对方 BU 双级？
- `TODO_CONFIRM_MODEL_EVALUATION_PROOF_POLICY`：在 F022 前，是否允许导入外部评估证明作为 `PASSED` 的临时依据？需要谁批准？
- `TODO_CONFIRM_MODEL_DOWNLOAD_POLICY`：模型文件下载是否允许直链、短期签名 URL，还是必须后端中转？

## 10. 已确认口径

- 模型格式一期支持 `.pt`、`.pth`、`.onnx`、`.zip`，单文件最大 2GB。
- `.zip` 允许作为模型包上传，但一期不自动解析训练代码。
- 模型文件安全扫描预留状态字段，一期不强制真实扫描。
- 平台内置预训练模型一期使用真实 MinIO 文件对象，来源标记为 `PLATFORM_BUILT_IN`，不伪造供应商或授权信息。
- 跨 BU 共享一期采用单级审批：模型 owner 或 owner 所属 BU 管理员审批。
- 未评估版本不能发布 `Production`；管理员可导入外部评估证明作为临时发布依据。
- 模型下载使用后端生成的 10 分钟 MinIO 预签名 URL，并记录下载审计；前端不暴露 MinIO 账号密码。

## 11. 验收项草案（后续 TASK.md 固化）

- AC-01：用户可在模型中心按关键词、标签、框架、任务类型、scope、状态筛选模型列表，并分页展示真实结果。
- AC-02：用户可创建模型并维护元数据；缺少必填元数据时前后端均拒绝。
- AC-03：用户可为模型创建版本，版本号同模型内唯一，并绑定 `platform_file_object`。
- AC-04：模型详情展示基础元数据、版本历史、文件信息、指标摘要、权限摘要和审计记录。
- AC-05：版本状态只能按 `Development → Testing → Production → Deprecated` 合法流转，非法跳转被阻断。
- AC-06：未通过评估或无合法评估证明的版本不能发布为 `Production`。
- AC-07：存在活跃推理引用的版本不能删除，并展示阻断原因和引用摘要。
- AC-08：平台模型、BU 模型、私有模型按权限可见；跨 BU 无授权访问被阻断。
- AC-09：跨 BU 访问申请/审批 seam 可记录状态，审批通过前 scope 变更或访问授权不生效。
- AC-10：预训练模型选择器只展示用户有权限且状态可用的模型版本。
- AC-11：关键写操作与规则阻断均记录审计事件。
- AC-12：页面不出现原型说明性质元素，空状态/错误状态均展示业务化文案。

## 12. 交付方案

1. `/build-feature` Phase 1：基于本 plan 创建 `TASK.md`，固化 AC-xx 与任务拆分。
2. 契约设计：冻结 API、DTO、错误码、权限、审计事件、状态机、SQL 表结构。
3. 测试设计：覆盖 happy path、权限失败、状态机错误、审计、MDL MUST 规则和前端 E2E。
4. 后端实现：模型/版本服务、文件对象绑定、状态机、权限、审计、规则阻断。
5. 前端实现：模型中心列表、详情、创建/导入、版本操作、模型选择器。
6. Review + QA：重点审查文件治理复用、权限边界、跨 BU 泄露、评估准入与推理引用 seam。
7. 门禁：
   - `node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F019-model-registry-foundation`
   - `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F019-model-registry-foundation --skip-backend-integration`
   - 前端行为变更后追加 `--run-e2e`。

## 13. 审批记录

- Reviewer: 待人审
- Decision: 当前为 `plan_status: approved`。未经人工改为 `approved` 并填写 `approved_at` 前，不得进入 `/build-feature` 或编写业务实现代码。


