> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-data-source-dataset-management.md`

﻿# PRD: F009-data-source-dataset-management

## Metadata

- Feature: F009-data-source-dataset-management
- Title: 数据源与数据集管理基础能力
- Created: 2026-05-18
- Source Spec: .omx/specs/deep-interview-data-source-dataset-management.md
- Planning mode: RALPLAN-DR short consensus
- Status: draft-for-plan

## RALPLAN-DR Summary

### Principles

1. **数据集版本是后续 AI 流程的事实源**：标注、Pipeline、训练、评估和推理后续只能引用稳定的 datasetId / ersionId，不能各自维护平行数据事实。
2. **外部集成真实表达边界**：DB/OSS/Kafka/OPC-UA/内容安全/对象存储未配置时必须返回 UNCONFIGURED / TODO_CONFIRM_*，不得以静态 mock 冒充成功。
3. **优先复用平台底座**：身份、组织、文件元数据、配置、审计必须复用 F006/F007；F009 只新增 DATA 域事实模型。
4. **原型信息架构不可丢失**：datasrc、ds、up、dsdetail 的标题、Tab、表格、抽屉、上传向导语义必须保留。
5. **MUST 规则进入状态机和测试**：DAT-001、DAT-005、DAT-006、DAT-011、DAT-012 不得只写文档，必须在实现阶段有服务端校验和自动化测试。

### Decision Drivers

1. F009 是 DATA 域入口，需为 F010+ 标注/Pipeline/训练提供稳定 seam。
2. 当前已有 F006/F007/F008 平台底座，适合直接落地数据源/数据集，而不是继续做基础设施。
3. 外部数据源和对象存储参数未确认，必须用 seam 与诊断状态解耦。

### Viable Options

| Option | Description | Pros | Cons | Verdict |
|---|---|---|---|---|
| A | 只实现数据集管理，数据源后置 | 交付小 | 后续采集/血缘断层，DAT-001 无法落地 | Rejected |
| B | 数据源 + 数据集 + 上传 + 版本 + 权限 seam | 覆盖 DATA 入口闭环，支撑后续 feature | 范围中等，需要严格裁剪门户/调度 | Chosen |
| C | 一次性实现完整数据管理域 | 看似完整 | 过大，含 Pipeline/标注/增强/门户审批，风险不可控 | Rejected |

## Problem

平台当前已具备身份、组织、配置、文件元数据和资源引用底座，但 DATA 域仍停留在原型/占位状态。没有统一数据源和数据集版本事实源，后续标注、Pipeline、训练、评估、推理无法可靠引用数据，也无法执行 BU 隔离、版本不可变、受限数据集审批、血缘追踪和审计规则。

## Goals

- 让 datasrc 数据源管理页面接入真实 API，支持连接配置摘要、连接测试、激活/禁用、状态诊断和同步任务 seam。
- 让 ds 数据集管理页面接入真实 API，支持统计、分类、搜索、筛选、分页、状态/权限 badge、版本抽屉和批量操作入口。
- 让 up 新建数据集/上传向导复用 F007 文件元数据 seam，实现数据集元数据、文件初始化/完成登记、hash/size 校验和版本草稿生成。
- 让 dsdetail 数据集详情接入真实 API，展示概览、版本、文件、权限、血缘摘要、样例预览和真实退化状态。
- 建立 DATA 域数据库、权限、审计、错误码和后续引用 seam，支撑标注、Pipeline、训练、模型版本和门户申请。

## Users

- 平台超级管理员：管理全局数据源、跨 BU 查看诊断、审计高危操作。
- BU 管理员：管理本 BU 数据源、数据集、成员授权和受限数据审批。
- 数据标注工程师：接入数据源、创建数据集、上传数据、维护元数据和版本。
- 模型训练工程师：搜索可用数据集、查看版本、申请/下载受限数据、引用 ACTIVE 版本。
- 后续业务 feature：通过 DATA seam 引用数据集版本、血缘和权限状态。

## Functional Requirements

### FR-01 数据源管理

- 支持数据源类型：RELATIONAL_DB、FILE、OBJECT_STORAGE、STREAM、TIME_SERIES、INDUSTRIAL_PROTOCOL、API。
- 支持创建/编辑数据源配置摘要：名称、类型、Host/Endpoint、端口、数据库/Bucket/Topic、凭据模式、secretRef、共享范围、描述。
- 敏感字段仅保存/引用脱敏配置，不在 API 响应回显明文。
- 支持连接测试，记录 lastTestAt、diagnosticCode、diagnosticMessage、latencyMs。
- DAT-001：连接测试未通过的数据源不得激活，不得被同步任务/数据集导入引用。
- 支持禁用数据源；禁用后阻断后续新同步/导入引用。

### FR-02 数据源同步任务 seam

- 支持创建同步任务配置：数据源、目标数据集、调度方式、采集范围、状态、最近执行结果。
- 支持手动触发/暂停/删除 seam；生产级调度器不在 F009 实现。
- 未配置真实 connector 时返回 UNCONFIGURED，不创建假成功同步。

### FR-03 数据集管理

- 支持数据集创建、查询、详情、归档/回收。
- 数据集字段包含：名称、类型、数据类型、当前版本、状态、访问级别、标签、recordCount、sizeBytes、owner、tenantId、projectId。
- 列表支持关键词、类型、状态、访问级别、标签、创建时间、大小范围、分页。
- 支持 RAW/PREPROCESSED/ANNOTATED/AUGMENTED 分类 Tab；F009 主要创建 RAW，其他类型可作为后续产物 seam。

### FR-04 上传与文件引用

- 复用 F007 platform_file_object 的 file init / complete / download seam。
- F009 新增 dataset_file 或等价绑定，将数据集版本与 ileId 关联。
- 上传完成必须校验 hash/size；失败不得进入可发布版本。
- 对象存储未配置时显示 TODO_CONFIRM_MINIO_* / UNCONFIGURED，但元数据流程可在 dev/test seam 下验证。

### FR-05 版本状态机

- 支持版本状态：DRAFT、SECURITY_PENDING、READY、PUBLISHED、ARCHIVED、FAILED。
- DAT-005：PUBLISHED 版本内容、文件绑定、核心元数据不可修改/删除；如需变更必须新建版本。
- 数据集当前版本只能指向 PUBLISHED / READY 中符合规则的版本。

### FR-06 权限与访问申请 seam

- 支持访问级别：PUBLIC、TEAM、PRIVATE、RESTRICTED。
- DAT-006：受限数据集下载/使用须有有效授权；授权具备 expiresAt。
- F009 建最小 dataset_access_request / dataset_access_grant seam；完整门户审批体验、通知和排行榜留后续 F011。
- 支持数据集级查看与版本级下载分层授权。

### FR-07 BU 隔离与引用保护

- DAT-012：列表/详情/下载默认限定当前 BU；跨 BU 无授权查询不暴露资源存在性。
- DAT-011：删除/回收数据集前检查活跃训练任务、模型版本、标注任务或后续引用 seam；存在引用时阻断。
- 为后续 feature 提供 DatasetReference seam：仅 ACTIVE/PUBLISHED/授权版本可被引用。

### FR-08 血缘与详情

- 记录最小血缘：数据源 → 数据集 → 版本；后续 Pipeline/标注/增强可追加转换节点。
- dsdetail 显示版本历史、数据集信息、文件清单、权限、血缘摘要、样例预览。
- 图片样例可预览；非图片或对象存储未配置时显示不可预览/未配置真实状态。

### FR-09 审计

- 数据源创建/更新/测试/激活/禁用、同步任务创建/触发/失败。
- 数据集创建/更新/发布/归档/回收/删除阻断。
- 文件绑定、hash/size 校验失败、下载 URL 请求。
- 权限申请、审批/授权、授权过期、跨 BU 拒绝。

## Non-goals

- 完整 Pipeline 执行、算子市场和数据增强任务执行。
- 标注任务、标注工作台、标注审核和 AI 预标注。
- 数据资产门户完整推荐、排行榜、复杂审批中心和通知闭环。
- 真实 DB/OSS/Kafka/OPC-UA connector 生产联调。
- 真实分片上传、对象存储签名、KMS、冷存储生命周期。
- 训练任务、模型版本、推理服务的真实引用业务实现。

## Domain Model Draft

- DataSource: sourceId、	enantId、projectId、
ame、	ype、endpointMasked、connectionConfigMasked、credentialMode、secretRef、status、lastTestAt、diagnosticCode、createdBy。
- DataSourceTestLog: 	estId、sourceId、esult、latencyMs、diagnosticCode、	raceId。
- DataSourceSyncTask: 	askId、sourceId、	argetDatasetId、scheduleMode、status、lastRunAt、lastResult。
- Dataset: datasetId、	enantId、projectId、
ame、	ype、dataType、ccessLevel、status、currentVersionId、	agsJson、ownerId。
- DatasetVersion: ersionId、datasetId、ersionNo、status、ecordCount、sizeBytes、sourceType、createdBy、publishedAt。
- DatasetFile: id、datasetId、ersionId、ileId、ileRole、sample、sortOrder。
- DataLineage: lineageId、sourceType、sourceId、	argetDatasetId、	argetVersionId、	ransformType、metadataJson。
- DatasetAccessRequest: equestId、datasetId、ersionId、pplicantId、status、eason、expiresAt、eviewedBy。
- DatasetAccessGrant: grantId、datasetId、ersionId、subjectType、subjectId、permission、expiresAt、status。

## API Draft

- GET /api/v1/data-sources
- POST /api/v1/data-sources
- GET /api/v1/data-sources/{sourceId}
- PUT /api/v1/data-sources/{sourceId}
- POST /api/v1/data-sources/{sourceId}/test
- POST /api/v1/data-sources/{sourceId}/activate
- POST /api/v1/data-sources/{sourceId}/disable
- GET /api/v1/data-source-sync-tasks
- POST /api/v1/data-source-sync-tasks
- POST /api/v1/data-source-sync-tasks/{taskId}/run
- GET /api/v1/datasets
- POST /api/v1/datasets
- GET /api/v1/datasets/{datasetId}
- PUT /api/v1/datasets/{datasetId}
- POST /api/v1/datasets/{datasetId}/versions
- POST /api/v1/datasets/{datasetId}/versions/{versionId}/files
- POST /api/v1/datasets/{datasetId}/versions/{versionId}/publish
- POST /api/v1/datasets/{datasetId}/archive
- DELETE /api/v1/datasets/{datasetId}
- GET /api/v1/datasets/{datasetId}/lineage
- GET /api/v1/datasets/{datasetId}/access
- POST /api/v1/datasets/{datasetId}/access-requests
- PUT /api/v1/dataset-access-requests/{requestId}/approve
- PUT /api/v1/dataset-access-requests/{requestId}/reject
- GET /api/v1/dataset-references?datasetId=&versionId=

## Permissions Draft

- menu:datasrc
- menu:ds
- menu:portal
- menu:lineage
- data:source:read
- data:source:write
- data:source:test
- data:source:activate
- data:sync-task:read
- data:sync-task:write
- data:dataset:read
- data:dataset:write
- data:dataset:publish
- data:dataset:delete
- data:dataset:download
- data:dataset:grant
- data:dataset:access-request:review
- data:lineage:read

## Error Codes Draft

- DATA_SOURCE_TEST_FAILED
- DATA_SOURCE_UNCONFIGURED
- DATA_SOURCE_NOT_ACTIVE
- DATA_SOURCE_SECRET_NOT_ALLOWED
- DATASET_VERSION_IMMUTABLE
- DATASET_ACCESS_REQUIRED
- DATASET_ACCESS_EXPIRED
- DATASET_CROSS_BU_NOT_FOUND
- DATASET_REFERENCED
- DATASET_FILE_HASH_MISMATCH
- DATASET_SECURITY_PENDING
- DATASET_CONTENT_SAFETY_UNCONFIGURED

## Reuse Strategy

### Must Reuse

- F006: PlatformIdentityService、PlatformPrincipal、RBAC/ABAC、platform_audit_log、session/filter/security。
- F007: platform_tenant、组织树、配置继承、platform_file_object、文件 init/complete/download、通知/API Key seam。
- F008: 后续 PAI 资源引用语义；F009 本身不调度资源。
- Common: ApiResponse、TraceIdFilter、PlatformResponses、PlatformException、Flyway/JdbcTemplate/JPA 基线。
- Frontend: piClient.ts、sessionStore.ts、AppNavigation.tsx 页面 key、Ant Design 组件基线、现有登录/权限守卫。
- Tests: 后端 Spring Boot HTTP 测试基座、Vitest、Playwright helpers、	ools/ai-scaffold feature gates。

### Duplication Rejected

- 不复制 F007 文件对象表和下载 URL 逻辑。
- 不创建与 platform_tenant 平行的 BU/项目事实源。
- 不在前端保留静态假数据作为“真实 API 已接入”。
- 不在 i-adapter 复制数据源/数据集元数据和权限逻辑。
- 不把外部 connector 成功写死在测试或生产代码中。

### Approved New Seams

- 新增 DATA 域 Controller/Service/DTO/SQL，因为当前仓库没有数据源、数据集、版本、血缘、访问授权事实模型。
- 新增 DataSourceClient / ConnectionTester seam 隔离外部 connector。
- 新增 DatasetReferenceService seam 供后续标注、训练、推理引用。
- 新增前端 DATA 页面组件，替换 PrototypePage 占位。

## Success Criteria

- plan.md 明确范围、非目标、复用策略、状态机、API 草案、权限/审计和风险。
- build-feature 前置门禁可找到 deep-interview、prd、test-spec 规划证据。
- 后续实现可证明以下路径：创建数据源 → 连接测试通过 → 激活 → 创建数据集 → 上传/登记文件 → 生成版本 → 发布 → 列表/详情可见 → 权限控制/审计生效。
- 未配置外部 connector、对象存储、内容安全服务时，用户看到真实诊断而非假成功。

## Risks

- F009 范围横跨多个原型页面，必须避免滑入完整门户/标注/Pipeline。
- 真实外部连接不可用，测试必须依赖 seam 与状态诊断，不能联网硬依赖。
- 数据集访问模型若设计不清，会与 F006 权限和 F011 未来门户审批冲突。
- 已发布版本不可变与文件对象软删除需要严格服务端校验。
- 内容安全规则 DAT-002 是 MUST，但真实服务未确认；F009 需要冻结未配置/待处理状态，避免伪造合规。

## ADR

- Decision: F009 采用“数据源 + 数据集 + 上传/版本 + 权限/血缘 seam”的中等范围。
- Drivers: 后续 DATA/MODEL/INFERENCE 依赖稳定数据集版本；F006/F007 已提供平台底座；外部 connector 尚未确认。
- Alternatives considered:
  - 仅做数据集：拒绝，缺少数据源接入与 DAT-001。
  - 完整 DATA 域：拒绝，范围过大且会拖入 Pipeline/标注/增强。
- Why chosen: Option B 能形成可测试、可复用、可扩展的 DATA 入口闭环。
- Consequences: 后续 F010/F011/F012 可分别扩展门户审批、标注、Pipeline；F009 必须把 seam 设计清楚。
- Follow-ups: contract 阶段冻结 SQL/API；build 阶段先写测试；QA 阶段对照原型页面截图和业务 MUST 规则。
