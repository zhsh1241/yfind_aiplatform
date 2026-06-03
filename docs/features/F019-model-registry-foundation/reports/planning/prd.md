> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage all`.
> Source: `.omx/plans/prd-model-registry-foundation.md`

# PRD: F019 模型中心与模型版本基础

## 1. 背景

模型开发域包含调优、评估、模型管理、工程化、开发环境与训练任务。现阶段若直接实现训练或开发环境，会缺少统一模型版本事实源，导致预训练模型选择、训练产物发布、评估准入、推理部署引用和文件治理出现重复模型定义。

F019 聚焦模型管理基础能力，对齐 `MODEL-003` 与 `FUNC-MODEL-020`~`FUNC-MODEL-026`，先建立模型注册中心、模型版本、模型文件绑定、元数据、权限与生命周期。

## 2. 目标用户

- 模型训练工程师：查找预训练模型、上传/纳管训练产物、管理版本。
- BU 级子管理员：管理团队模型可见性、审批跨 BU 共享。
- 超级管理员：维护平台级预训练模型、查看审计与全局模型资产。
- 后续训练/开发/评估/推理模块：通过 API 引用模型版本。

## 3. 用户故事

### US-01 模型检索与预训练选择
作为模型训练工程师，我需要按关键词、标签、框架、任务类型、scope、状态筛选可用模型，以便快速选择合适的预训练模型或已有版本。

### US-02 模型导入与版本创建
作为模型训练工程师，我需要从本地上传或训练中心发布 seam 纳管模型文件，并创建模型版本，以便后续评估、开发环境挂载和推理部署引用。

### US-03 模型元数据维护
作为模型 owner，我需要维护 framework、taskType、输入输出格式、运行时要求、指标摘要、标签和说明，以便模型可以被检索、理解和正确使用。

### US-04 生命周期状态流转
作为模型 owner 或模型管理员，我需要按 Development → Testing → Production → Deprecated 管理版本状态，以便模型质量和使用链路可控。

### US-05 权限与跨 BU 共享
作为 BU 管理员，我需要区分平台模型、团队/BU 模型、私有模型，并对跨 BU 共享进行审批，以便保护模型资产与合规边界。

### US-06 文件与审计治理
作为平台管理员，我需要模型文件绑定平台文件对象并记录关键操作审计，以便追踪文件来源、访问、版本变化与异常阻断。

## 4. 功能范围

### 必须实现

- 模型列表、详情、搜索筛选。
- 模型创建/更新基础元数据。
- 模型版本创建、详情、版本列表。
- 版本绑定 `platform_file_object` / MinIO 对象。
- 生命周期状态流转与非法流转阻断。
- 发布前评估通过检查 seam。
- 删除前活跃推理引用检查 seam。
- scope 与权限检查：PLATFORM / BU / PRIVATE。
- 跨 BU 访问申请/审批的最小 seam（真实审批流可后续扩展，但不得绕过 MDL-004）。
- 审计事件记录。
- 前端模型中心页面和预训练模型选择器基础能力。

### 不在本期实现

- 训练任务执行、资源申请、日志监控。
- 开发环境容器生命周期。
- 真实模型评估执行、报告生成。
- 工程化优化、格式转换、边端推送。
- 推理服务部署与流量治理。
- 真实外部 MLflow/KServe/模型仓库集成。

## 5. 领域模型草案

### Model

- `modelId`
- `name`
- `description`
- `framework`
- `taskType`
- `inputFormat`
- `outputFormat`
- `tags`
- `scope`: PLATFORM / BU / PRIVATE
- `ownerUserId`
- `ownerOrgId`
- `tenantId`
- `currentVersionId`
- `createdAt` / `updatedAt`

### ModelVersion

- `versionId`
- `modelId`
- `versionNo`
- `fileObjectId`
- `filePath` / `storageBucket` / `storageKey`（由文件对象派生或快照）
- `fileSize`
- `checksum`
- `runtimeRequirements`
- `metricsSummary`
- `evaluationStatus`: NONE / PASSED / FAILED / IMPORTED_PROOF
- `evaluationRecordId`
- `status`: DEVELOPMENT / TESTING / PRODUCTION / DEPRECATED
- `createdBy`
- `createdAt`

### ModelAccessGrant / SharingRequest seam

- `requestId` / `grantId`
- `modelId` / `versionId` 可选
- `requesterOrgId`
- `ownerOrgId`
- `permission`: VIEW / DOWNLOAD / USE_FOR_TRAINING / DEPLOY
- `status`: PENDING / APPROVED / REJECTED / EXPIRED
- `expiresAt`

## 6. API 草案

遵循 `/api/v1` 与统一响应 envelope。

- `GET /api/v1/models`
  - 支持 `keyword`、`tag`、`framework`、`taskType`、`scope`、`status`、`page`、`pageSize`。
- `POST /api/v1/models`
  - 创建模型元数据。
- `GET /api/v1/models/{modelId}`
  - 获取模型详情、当前版本摘要、权限摘要。
- `PATCH /api/v1/models/{modelId}`
  - 更新元数据、标签、描述、scope 变更申请 seam。
- `GET /api/v1/models/{modelId}/versions`
  - 获取版本列表。
- `POST /api/v1/models/{modelId}/versions`
  - 创建版本并绑定文件对象。
- `GET /api/v1/models/{modelId}/versions/{versionId}`
  - 获取版本详情。
- `POST /api/v1/models/{modelId}/versions/{versionId}/transition`
  - 状态流转。
- `DELETE /api/v1/models/{modelId}/versions/{versionId}`
  - 删除版本，需检查 MDL-003。
- `POST /api/v1/models/{modelId}/access-requests`
  - 跨 BU 访问申请。
- `PUT /api/v1/model-access-requests/{requestId}/approve|reject`
  - 审批 seam。

## 7. 业务规则映射

- MDL-003：删除版本前查询活跃推理部署引用；存在则阻断。
- MDL-004：跨 BU 访问或 scope 变更为跨 BU 可见时需要 owner/BU 管理员授权。
- MDL-006：发布到 Production 前必须有 `evaluationStatus = PASSED` 或受控导入证明。
- MDL-009：状态机合法转换矩阵：Development → Testing；Testing → Production 或 Deprecated；Production → Deprecated。

## 8. 前端信息架构

复用原型模型中心页面，不新增无关一级菜单。

- 模型中心列表：搜索框、筛选器、scope/status 标签、版本摘要、操作入口。
- 模型详情：基础信息、版本列表、文件信息、指标摘要、权限、审计记录。
- 新建/导入模型：元数据表单、文件选择/上传、scope 设置。
- 版本状态操作：按权限展示 Testing / Production / Deprecated 操作，并显示规则阻断原因。
- 预训练模型选择器：被后续训练/开发页面复用，只展示有权限且状态可用的版本。

## 9. 审计事件草案

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

## 10. 风险与依赖

- 评估能力未实现前，MDL-006 只能通过 seam 和导入证明表达，需避免用户误以为已具备真实评估。
- 推理部署引用检查依赖推理域后续表或占位查询 seam。
- 模型文件安全扫描、格式白名单和大小限制仍待确认。
- 跨 BU 审批级别待确认。
- 预训练模型种子清单来源待确认。

## 11. RALPLAN-DR Summary

### Principles

1. 模型版本是模型开发域和推理域的统一事实源。
2. 文件治理复用平台文件对象，不新增平行存储模型。
3. MUST 规则优先于原型便捷交互。
4. F019 保持基础能力边界，不提前实现训练/评估/工程化。

### Decision Drivers

1. 后续训练、开发、评估、推理都依赖可引用模型版本。
2. MDL-003/004/006/009 必须在基础层固化。
3. 现有平台已具备文件对象、RBAC、审计、MinIO 等可复用 seam。

### Alternatives Considered

- 先做训练任务：拒绝。训练输出仍需模型版本注册，先做训练会复制版本和文件治理。
- 先做开发环境：拒绝。开发环境挂载模型需要模型选择器和版本权限。
- 只做前端原型：拒绝。用户要进入可执行平台功能规划，必须建立后端契约与规则门禁。

## 12. Consensus Verdict

- Planner: APPROVE，F019 范围合理且是模型域后续 feature 的前置依赖。
- Architect: APPROVE，模型/版本/文件/权限/审计边界清晰；评估与推理依赖通过 seam 表达。
- Critic: APPROVE，验收项可测试；风险和非目标明确；未确认外部事实保留 TODO_CONFIRM。
