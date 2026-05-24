---
feature: F009-data-source-dataset-management
title: 数据源与数据集管理基础能力
plan_status: approved
approved_at: 2026-05-18
owner: codex
created_at: 2026-05-18
updated_at: 2026-05-20
---

# Plan: 数据源与数据集管理基础能力

## 1. 背景与目标

F006 已完成身份、权限、BU 边界与审计底座；F007 已完成组织、配置、文件元数据、通知/API Key 等平台治理 seam；F008 已将资源域收敛为阿里云 PAI 资源集成控制面。下一步需要启动 DATA 域的第一个生产级业务入口：**数据源与数据集管理基础能力**。

当前平台的 `datasrc`、`ds`、`up`、`dsdetail`、`portal`、`lineage` 等页面在原型中已有明确结构，但工程实现仍缺少统一的数据源、数据集版本、文件绑定、权限授权、血缘与后续引用事实源。没有 F009，后续标注、Pipeline、训练、评估、推理都无法稳定引用数据资产，也无法落地 DAT-001、DAT-005、DAT-006、DAT-011、DAT-012 等 DATA 域 MUST 规则。

- 业务来源：
  - `docs/business/bizdocs/02-01-业务流程-数据管理.md`
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md`
  - `docs/business/domain/01-领域对象-数据域.md`
  - `docs/business/rules/01-数据管理规则.md`
  - `docs/business/api/01-API接口规范.md`
- 原型来源：
  - `docs/prototype/SMP工业AI平台-原型v2.html`
  - `docs/prototype/SMP工业AI平台-原型v2-compiled.html`
  - `docs/prototype/screen-datasets.png`
  - `docs/prototype/screen-dsdetail.png`
  - `docs/prototype/screen-upload.png`
  - 页面 key：`datasrc`、`ds`、`up`、`dsdetail`、`portal`、`lineage`
- 规划证据：
  - `reports/planning/deep-interview.md`
  - `reports/planning/prd.md`
  - `reports/planning/test-spec.md`

## 2. Intent / Desired Outcome

### Intent

建立 DATA 域统一事实源，让数据源接入、数据集创建、文件登记、版本发布、权限授权、血缘追踪与后续任务引用形成可审计、可授权、可扩展的基础闭环。F009 不是完整数据工程平台，而是后续标注、Pipeline、训练、评估、推理可复用的数据资产底座。

### Desired Outcome

F009 完成后，平台应具备：

1. `datasrc` 数据源管理页面接入真实 API，支持数据源列表、新建、连接测试、激活/禁用、详情/编辑、同步任务 seam 和状态诊断；本轮需求收敛为“导入 / 接口”两类数据集接入方式。
2. `ds` 数据集管理页面接入真实 API，支持统计卡、分类 Tab、搜索/筛选、分页、权限/状态 badge、版本抽屉、批量操作入口。
3. `up` 新建数据集/上传向导复用 F007 文件元数据 seam，支持数据集元数据、文件初始化、完成登记、hash/size 校验和版本草稿生成。
4. `dsdetail` 数据集详情展示概览、版本、文件、权限、血缘摘要、样例预览和不可预览退化状态。
5. 后端提供 DATA 域 API、SQL、权限码、错误码、审计事件和 `DatasetReference` seam，供后续 F010+ 功能引用 `datasetId` / `versionId`。
6. 未确认外部数据源、对象存储、内容安全服务参数保留 `TODO_CONFIRM_*`，以 `UNCONFIGURED` / 诊断状态真实表达，不用假成功替代核心能力。

## 3. 范围

### In Scope

#### 3.1 数据源管理

- 数据集接入方式：`IMPORT`、`API`。
- 数据内容类型：`IMAGE`（图片）、`AUDIO_VIDEO`（影音）。
- 数据源/接入配置摘要：名称、接入方式、接口 Endpoint 或导入批次、凭据模式、`secretRef`、共享范围、描述。
- 敏感字段脱敏：密码、AccessKey、Token、连接串 secret 不回显。
- 连接测试：记录 `lastTestAt`、`diagnosticCode`、`diagnosticMessage`、`latencyMs`、`traceId`。
- DAT-001：连接测试未通过的数据源不得激活，不得被后续同步任务或数据集导入引用。
- 数据源状态：`INACTIVE`、`TESTING`、`ACTIVE`、`FAILED`、`DISABLED`、`UNCONFIGURED`。

#### 3.2 数据源同步任务 seam

- 支持保存同步任务配置：接口数据源、目标数据集、调度方式、采集范围、状态、最近执行结果。
- 支持手动触发、暂停、删除的 API seam。
- 不实现生产级采集调度器，不真实联调 DB/OSS/Kafka/OPC-UA 等专用连接器；未配置 connector 返回 `UNCONFIGURED`。本地 sandbox connector 仅保留 `IMPORT` / `API` 的一次性导入快照，用于联调和验收。

#### 3.3 数据集管理

- 数据集创建、查询、详情、更新、归档、回收。
- 数据集字段：名称、类型、数据内容类型、接入方式、当前版本、状态、访问级别、标签、recordCount、sizeBytes、owner、tenantId、projectId。
- 查询能力：关键词、类型、状态、访问级别、标签、创建时间、大小范围、分页。
- 分类 Tab：全部数据集、原始数据、预处理后、已标注。
- 数据集类型：`RAW`、`PREPROCESSED`、`ANNOTATED`、`AUGMENTED`；F009 主要创建 `RAW`，其余类型作为后续产物 seam。
- 数据内容类型仅考虑 `IMAGE` 与 `AUDIO_VIDEO`；文本、结构化、多模态等其他类型暂不纳入本阶段。

#### 3.4 上传与文件引用

- 复用 F007 `platform_file_object` 的 object key、初始化、完成登记、hash/size 校验、下载 URL seam。
- 新增 `dataset_file` 或等价绑定，关联 `datasetId`、`versionId` 与 `fileId`。
- 文件角色：原始文件、样例文件、元数据文件、标注文件、派生产物。
- 标注文件作为后续 F012 标注任务完成后的强制产物，由 `ANNOTATED` 数据集版本绑定。
- hash/size 校验失败不得进入可发布版本。
- 对象存储未配置时展示 `TODO_CONFIRM_MINIO_*` / `UNCONFIGURED`，不伪造上传到真实对象存储成功。

#### 3.5 版本状态机

- 版本状态：`DRAFT`、`SECURITY_PENDING`、`READY`、`PUBLISHED`、`ARCHIVED`、`FAILED`。
- DAT-005：已发布版本内容、文件绑定和核心元数据不可修改/删除；如需变更必须新建版本。
- 数据集当前版本只能指向符合规则的 `READY` / `PUBLISHED` 版本。

#### 3.6 权限、访问申请与 BU 隔离

- 访问级别：`PUBLIC`、`TEAM`、`PRIVATE`、`RESTRICTED`。
- 数据集级查看与版本级下载分层授权。
- DAT-006：受限数据集下载/使用必须存在有效授权，授权具备 `expiresAt`。
- F009 建最小 `dataset_access_request` / `dataset_access_grant` seam；完整门户审批体验、通知和排行榜留后续 F011。
- DAT-012：列表、详情、下载默认限定当前 BU；跨 BU 无授权查询不暴露资源存在性。

#### 3.7 血缘与后续引用 seam

- 记录最小血缘：数据源 → 数据集 → 版本。
- 为后续 Pipeline、标注、增强、训练、模型版本追加转换节点留出 `lineageId` / `sourceType` / `transformType`。
- 提供 `DatasetReference` seam：只允许后续任务引用授权、可用、未归档、未删除的数据集版本。
- DAT-011：删除/回收数据集前检查训练、模型、标注、Pipeline 等后续引用 seam，存在引用时阻断。

#### 3.8 审计

- 数据源创建、更新、测试、激活、禁用、同步任务创建/触发/失败。
- 数据集创建、更新、发布、归档、回收、删除阻断。
- 文件绑定、hash/size 校验失败、下载 URL 请求。
- 访问申请、审批/授权、授权过期、跨 BU 拒绝。

### Out of Scope / Non-goals

- 不实现完整 Pipeline 编辑器、算子执行、格式转换、内容清洗、数据增强执行。
- 不实现标注任务、标注工作台、标注审核、AI 预标注或标注质量检查完整业务。
- 不实现数据资产门户完整推荐、排行榜、复杂审批中心和通知闭环；仅提供搜索/申请/授权 seam。
- 不实现真实 DB/OSS/Kafka/OPC-UA 等专用 connector 生产联调；本阶段仅保留导入与接口接入，生产参数继续以 `TODO_CONFIRM_*` 留痕。
- 不实现真实分片上传、对象存储签名、MinIO/OSS/KMS 生产接入。
- 不实现训练任务、模型版本、推理服务的真实引用业务，只提供后续引用检查 seam。
- 不复制原型 JSX 或已删除旧 backend/frontend 代码作为生产实现。

## 4. Decision Boundaries

Codex 可在 `/build-feature` 中直接决定：

- 后端 DATA 包结构、Controller/Service/DTO 命名、SQL 表名和测试组织。
- 数据源、数据集、版本、血缘、授权状态枚举的实现命名。
- 以 F007 `platform_file_object` 作为数据集文件事实 seam，不新增平行文件对象事实源。
- 前端组件拆分方式，例如 `DataSourceManagementPage`、`DatasetManagementPage`、`DatasetUploadPage`、`DatasetDetailPage`。
- 本地 dev/test connector 使用受控 seam 返回 `UNCONFIGURED` / `SANDBOX`，但不得伪造生产联通。

必须保留待确认或后续 contract 冻结：

- 真实接口接入 Host、网络、账号、凭据、VPC、白名单等协议细节。
- 真实对象存储/MinIO/OSS endpoint、bucket、KMS、签名策略和分片上传协议。
- 内容安全检测服务供应商、API、风险等级阈值和人工处置队列。
- 门户完整审批工单、通知闭环和跨 BU 数据共享最终组织规则。

## 5. Exception Scenarios

- 数据源连接测试失败：保持 `INACTIVE` / `FAILED`，不得激活，返回明确诊断并写审计。
- 数据源凭据明文回显：拒绝；响应只返回脱敏摘要或 `secretRef`。
- 外部 API connector 未配置：返回 `UNCONFIGURED` 与 `TODO_CONFIRM_*`，前端显示未配置引导。
- 文件 hash/size 与初始化元数据不一致：复用 F007 逻辑标记失败，阻断版本发布。
- 内容安全服务未配置：不得伪造通过；数据集可处于 `SECURITY_PENDING` / `NEEDS_REVIEW` 或阻断发布，contract 阶段冻结。
- 已发布版本被修改/删除：返回 409/422，提示新建版本，写审计。
- 删除数据集但存在训练/模型/标注引用：通过引用检查 seam 阻断删除。
- 跨 BU 查询或下载无授权数据集：查询返回 404，授权过期下载返回 403，写审计。
- 受限数据集无有效授权：返回 `DATASET_ACCESS_REQUIRED`，前端引导申请。

## Reuse Strategy

### Must Reuse

- F006 身份、权限与审计：
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformIdentityService.java`
  - `PlatformPrincipal`、session/filter/security 配置
  - `platform_user`、`platform_role`、`platform_permission`、`platform_user_role`、`platform_session`、`platform_audit_log`
- F007 组织、配置与文件元数据：
  - `platform_tenant`、组织树、BU/PROJECT 上下文
  - `platform_file_object`、文件 init/complete/download、hash/size 校验、object key seam
  - 配置继承、敏感配置脱敏、通知/API Key seam
- F008 资源引用经验：
  - 后续训练/Pipeline/推理只引用 seam，不在各功能复制资源或数据事实源。
- 统一后端基线：
  - `backend/smp-common/src/main/java/com/yf/smp/common/api/ApiResponse.java`
  - `TraceIdFilter`、`PlatformResponses`、`PlatformException`、Flyway、JdbcTemplate/JPA、OpenAPI。
- 前端基线：
  - `frontend/src/features/foundation/apiClient.ts`
  - `frontend/src/features/platform/sessionStore.ts`
  - `frontend/src/components/AppNavigation.tsx` 的 `datasrc`、`ds`、`portal`、`lineage` 页面 key
  - React / Ant Design / TanStack Query 测试与页面模式。
- 测试与门禁：
  - 后端 Spring Boot HTTP/JUnit 测试基座
  - `frontend/src/App.test.tsx`、`frontend/e2e/helpers.ts`
  - `tools/ai-scaffold` 的 `check-build-feature-prereqs`、`verify-contract`、`check-task-traceability`、`gate`。

### Duplication Rejected

- 不复制 F007 文件对象表、object key、下载 URL 和 hash/size 校验逻辑。
- 不新增与 `platform_tenant` 平行冲突的 BU/项目事实源。
- 不在前端保留静态假数据作为“真实 API 已接入”。
- 不在 `ai-adapter/` 复制数据源/数据集元数据、权限或审计逻辑。
- 不把外部 connector 成功写死在测试或生产代码中。
- 不复制原型 JSX 或已删除旧 backend/frontend 作为实现。

### Approved New Seams

- `DataSourceController` / `DataSourceService` / `DataSourceDtos`：当前仓库没有数据源事实模型。
- `DatasetController` / `DatasetService` / `DatasetDtos`：当前仓库没有数据集、版本、血缘、访问授权事实模型。
- `DataSourceConnectionTester` / `DataSourceClient` seam：隔离导入与 API 接入配置，便于未配置诊断与后续真实接入。
- `DatasetReferenceService` seam：供后续标注、Pipeline、训练、模型和推理引用有效数据集版本。
- `dataset_*` / `data_source_*` Flyway 表：承载 DATA 域事实源，不与 F006/F007 平台表冲突。
- 前端 DATA 页面组件：替换 `PrototypePage` 占位，但保持原型信息架构和文案语义。

## 7. 技术方案要点

### Backend

- 新增 DATA 域包，例如 `com.yf.smp.app.data`。
- API 草案：
  - `GET /api/v1/data-sources`
  - `POST /api/v1/data-sources`
  - `GET /api/v1/data-sources/{sourceId}`
  - `PUT /api/v1/data-sources/{sourceId}`
  - `POST /api/v1/data-sources/{sourceId}/test`
  - `POST /api/v1/data-sources/{sourceId}/activate`
  - `POST /api/v1/data-sources/{sourceId}/disable`
  - `GET /api/v1/data-source-sync-tasks`
  - `POST /api/v1/data-source-sync-tasks`
  - `POST /api/v1/data-source-sync-tasks/{taskId}/run`
  - `GET /api/v1/datasets`
  - `POST /api/v1/datasets`
  - `GET /api/v1/datasets/{datasetId}`
  - `PUT /api/v1/datasets/{datasetId}`
  - `POST /api/v1/datasets/{datasetId}/versions`
  - `POST /api/v1/datasets/{datasetId}/versions/{versionId}/files`
  - `POST /api/v1/datasets/{datasetId}/versions/{versionId}/publish`
  - `POST /api/v1/datasets/{datasetId}/archive`
  - `DELETE /api/v1/datasets/{datasetId}`
  - `GET /api/v1/datasets/{datasetId}/lineage`
  - `GET /api/v1/datasets/{datasetId}/access`
  - `POST /api/v1/datasets/{datasetId}/access-requests`
  - `PUT /api/v1/dataset-access-requests/{requestId}/approve`
  - `PUT /api/v1/dataset-access-requests/{requestId}/reject`
  - `GET /api/v1/dataset-references?datasetId=&versionId=`
- 错误码草案：
  - `DATA_SOURCE_TEST_FAILED`
  - `DATA_SOURCE_UNCONFIGURED`
  - `DATA_SOURCE_NOT_ACTIVE`
  - `DATA_SOURCE_SECRET_NOT_ALLOWED`
  - `DATASET_VERSION_IMMUTABLE`
  - `DATASET_ACCESS_REQUIRED`
  - `DATASET_ACCESS_EXPIRED`
  - `DATASET_CROSS_BU_NOT_FOUND`
  - `DATASET_REFERENCED`
  - `DATASET_FILE_HASH_MISMATCH`
  - `DATASET_SECURITY_PENDING`
  - `DATASET_CONTENT_SAFETY_UNCONFIGURED`

### Database

计划新增 Flyway migration，例如 `V5__data_source_dataset.sql`，表草案：

- `data_source`
- `data_source_test_log`
- `data_source_sync_task`
- `dataset`
- `dataset_version`
- `dataset_file`
- `data_lineage`
- `dataset_access_request`
- `dataset_access_grant`
- 可选 `dataset_reference_guard` / 引用检查视图或 service seam

### Frontend

- 新增或更新：
  - `frontend/src/features/data/DataSourceManagementPage.tsx`
  - `frontend/src/features/data/DatasetManagementPage.tsx`
  - `frontend/src/features/data/DatasetUploadPage.tsx`
  - `frontend/src/features/data/DatasetDetailPage.tsx`
  - `frontend/src/features/data/dataApi.ts`
- `App.tsx` 将 `datasrc`、`ds`、`up`、`dsdetail` 路由接入真实页面；`portal`、`lineage` 可在 F009 先接最小只读 seam 或保留明确后续说明。
- 页面必须保留原型核心结构：
  - `datasrc`：数据源列表 / 同步任务 2 Tab、数据源卡片、测试连接、详情/编辑抽屉、新建数据源弹窗。
  - `ds`：统计卡、分类 Tab、类型筛选、搜索、高级筛选、表格、版本抽屉、批量选择。
  - `up`：三步向导、文件拖拽/列表、预览确认、进度覆盖层。
  - `dsdetail`：概览、文件元数据、版本历史、血缘、权限、样例预览等主要信息结构。

### AI Adapter / Integration

- F009 不新增 `ai-adapter/` endpoint。
- 外部 connector 通过后端 seam 表达，真实 DB/OSS/Kafka/OPC-UA/API 连接后续按 contract/外部参数逐步实现。
- 内容安全服务仅冻结状态/诊断/阻断策略，不接真实第三方 API。

## 8. 数据、权限与审计

### 领域对象

- `DataSource`
- `DataSourceTestLog`
- `DataSourceSyncTask`
- `Dataset`
- `DatasetVersion`
- `DatasetFile`
- `AnnotationArtifactFile`（作为 `DatasetFile` 的标注文件角色，不新增平行文件事实源）
- `DataLineage`
- `DatasetAccessRequest`
- `DatasetAccessGrant`
- `DatasetReference`

### MUST 规则

- DAT-001：数据源连接测试必须通过方可激活。
- DAT-002：内容安全检测为数据入平台强制前置步骤；真实服务未配置时不得伪造通过。
- DAT-005：已发布的数据集版本不得修改，变更须新建版本。
- DAT-006：受限数据集访问须经审批，授权具有有效期。
- DAT-011：数据集删除前须检查是否存在关联训练任务/模型版本引用。
- DAT-012：数据集访问遵循 BU 数据隔离，跨 BU 访问须授权。

### 权限码草案

- `menu:datasrc`
- `menu:ds`
- `menu:portal`
- `menu:lineage`
- `data:source:read`
- `data:source:write`
- `data:source:test`
- `data:source:activate`
- `data:sync-task:read`
- `data:sync-task:write`
- `data:dataset:read`
- `data:dataset:write`
- `data:dataset:publish`
- `data:dataset:delete`
- `data:dataset:download`
- `data:dataset:grant`
- `data:dataset:access-request:review`
- `data:lineage:read`

### 审计事件草案

- `DATA_SOURCE_CREATED`
- `DATA_SOURCE_UPDATED`
- `DATA_SOURCE_TEST_REQUESTED`
- `DATA_SOURCE_TEST_SUCCEEDED`
- `DATA_SOURCE_TEST_FAILED`
- `DATA_SOURCE_ACTIVATED`
- `DATA_SOURCE_DISABLED`
- `DATA_SYNC_TASK_CREATED`
- `DATA_SYNC_TASK_RUN_REQUESTED`
- `DATA_SYNC_TASK_UNCONFIGURED`
- `DATASET_CREATED`
- `DATASET_UPDATED`
- `DATASET_VERSION_CREATED`
- `DATASET_VERSION_PUBLISHED`
- `DATASET_VERSION_IMMUTABLE_REJECTED`
- `DATASET_FILE_ATTACHED`
- `DATASET_FILE_HASH_MISMATCH`
- `DATASET_ARCHIVED`
- `DATASET_DELETE_BLOCKED`
- `DATASET_ACCESS_REQUESTED`
- `DATASET_ACCESS_APPROVED`
- `DATASET_ACCESS_REJECTED`
- `DATASET_CROSS_BU_ACCESS_DENIED`
- `DATASET_DOWNLOAD_REQUESTED`
- `DATASET_REFERENCE_REQUESTED`
- `DATASET_REFERENCE_BLOCKED`

## 9. 后续验收项草案

- AC-01：`datasrc` 页面接入真实 API，支持数据源列表、新建、连接测试、激活/禁用、详情/编辑和状态诊断；连接测试未通过不可激活。
- AC-02：数据源敏感连接字段不回显，未配置真实 connector 时返回 `UNCONFIGURED` / `TODO_CONFIRM_*`，不展示假成功。
- AC-03：`ds` 页面接入真实 API，支持数据集统计、分类 Tab、搜索/筛选、分页、权限/状态 badge、批量选择和版本抽屉。
- AC-04：`up` 上传向导复用 F007 文件元数据 seam，完成数据集创建、文件初始化/完成登记、hash/size 校验和版本草稿生成。
- AC-05：数据集版本状态机生效，已发布版本不可修改或删除，变更必须新建版本。
- AC-06：`dsdetail` 展示数据集概览、版本、文件、权限、血缘摘要和样例预览；非图片/不可预览文件显示真实退化状态。
- AC-07：受限数据集访问申请与有效期授权 seam 生效；无授权访问受限下载返回 `DATASET_ACCESS_REQUIRED` 或 403。
- AC-08：数据集查询、详情、下载遵循 BU 隔离；跨 BU 无授权不暴露资源存在性。
- AC-09：数据源、数据集、版本、文件、授权、删除、跨 BU 拒绝等关键事件均写审计。
- AC-10：F009 不实现完整 Pipeline、标注、数据增强、生产采集调度和真实外部 connector；仅提供后续引用 seam。
- AC-11：`IMPORT` 与 `API` 在本地 sandbox connector 下可通过导入/同步任务生成图片或影音数据集版本、文件、血缘和审计；生产 connector 未配置仍不得伪造成功。
- AC-12：数据集内容类型仅允许图片或影音；其他类型在需求和前端入口中暂不展示，后端契约保留明确拒绝或未支持诊断。
- AC-13：后续标注产生的标注文件可作为 `dataset_file` 的 `ANNOTATION_RESULT` 角色绑定到 `ANNOTATED` 数据集版本，F009 不实现标注流程但需保留文件角色与血缘 seam。

## 10. 验证策略

后续 `/build-feature` 阶段测试计划应覆盖：

- 后端：
  - 数据源连接测试、激活门禁、敏感字段脱敏、未配置 connector 诊断；接入方式仅覆盖导入与接口。
  - 数据集 CRUD、列表筛选、版本发布、版本不可变、文件绑定、hash/size 失败。
  - 受限数据集申请/授权/过期、BU 隔离、跨 BU 404/403、删除前引用阻断。
  - 审计查询与 traceId。
- 前端：
  - `datasrc` 页面列表、测试连接、未配置状态、详情/编辑。
  - `ds` 页面统计、筛选、分页、版本抽屉、状态/权限 badge。
  - `up` 三步向导、文件登记、失败提示、创建后跳转。
  - `dsdetail` 概览、版本、文件、权限、血缘、预览退化。
- E2E：
  - 登录 → 数据源管理 → 测试连接 → 激活。
  - 登录 → 新建数据集 → 上传/登记 → 发布版本 → 列表/详情查看。
  - 受限数据集无授权 → 申请 → 审批 seam → 下载/引用状态变化。
- 门禁命令草案：
  ```powershell
  node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F009-data-source-dataset-management
  mvn -f backend/pom.xml verify
  npm --prefix frontend run lint
  npm --prefix frontend run test:ci
  npm --prefix frontend run build
  npm --prefix frontend run e2e
  node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F009-data-source-dataset-management
  node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F009-data-source-dataset-management
  node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F009-data-source-dataset-management --skip-backend-integration --run-e2e
  ```

## 11. 风险与依赖

- F009 覆盖多个页面和聚合，必须防止扩展到完整 Pipeline、标注、增强、门户审批。
- 真实外部数据源不可用时，测试必须依赖 seam 和诊断状态，不能联网硬依赖。
- DAT-002 内容安全是 MUST，但真实内容安全服务未确认；contract 阶段必须冻结 `SECURITY_PENDING` / `UNCONFIGURED` 的阻断行为，避免伪造合规。
- 数据集访问模型若设计不清，会与 F006 RBAC 和后续 F011 数据资产门户审批冲突。
- 已发布版本不可变与文件对象软删除必须严格服务端校验，否则会破坏训练可复现性。
- 原型 `dsdetail` 内容较多，首轮实现需保留信息架构并以真实空态/只读 seam 控制范围。

## 12. 开放问题

- 内容安全服务未配置时，F009 版本发布应阻断到 `SECURITY_PENDING`，还是允许 dev/test sandbox 下通过？建议 contract 阶段冻结为：生产/未配置阻断，显式 sandbox 可通过测试替身。
- `portal` 与 `lineage` 是否在 F009 完整替换占位页，还是仅提供后端 seam 与 `dsdetail` 内联展示？建议 F009 优先接 `dsdetail` 血缘摘要，`portal` 完整体验后续 F011。
- 数据源同步任务是否需要定时调度执行？建议 F009 只保存接口接入配置和手动触发 seam，不接生产调度器。

## 14. 2026-05-20 需求调整待确认

- 用户确认当前数据集主要只有两类：图片、影音；文本、结构化、多模态等其他类型先不考虑。
- 用户确认数据集接入方式只有两类：导入、接口；数据库、对象存储、流、时序、工业协议等专用连接器先不考虑。
- 标注任务完成后必须产生对应标注文件并保存；F009 只保留标注文件角色、文件绑定和血缘 seam，实际标注流程由 F012 调整。
- 本节为文档需求调整，代码尚未同步修改；待用户确认后再进入代码改造。
- 数据集版本发布是否需要强制内容安全检测通过？建议纳入状态机，但真实第三方集成后续确认。

## 13. 审批记录

- Reviewer: 待人审。
- Decision: draft，尚未批准。
- Approval instruction: 审查通过后，人工将 frontmatter 修改为：

```yaml
---
plan_status: approved
approved_at: 2026-05-18
---
```

然后执行：

```powershell
node tools/ai-scaffold/dist/cli.js check-plan-approved docs/features/F009-data-source-dataset-management
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F009-data-source-dataset-management
```

