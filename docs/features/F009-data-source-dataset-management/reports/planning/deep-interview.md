> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-data-source-dataset-management.md`
> Interview transcript: `.omx/interviews/data-source-dataset-management-20260518T002742Z.md`

﻿# Deep Interview Spec: F009-data-source-dataset-management

## Metadata

- Feature: F009-data-source-dataset-management
- Profile: standard
- Context type: brownfield
- Created: 20260518T002742Z
- Final ambiguity: 0.16
- Threshold: 0.20
- Context snapshot: $contextPath
- Interview transcript: $interviewPath

## Intent

在 F006 身份权限审计、F007 组织配置文件元数据、F008 PAI 资源引用 seam 完成后，启动 DATA 域第一个业务入口：建立数据源与数据集管理基础能力。F009 的核心意图不是完成整个数据工程平台，而是让后续标注、Pipeline、训练、评估、推理都能围绕统一、可授权、可审计、可追踪的数据集版本开展工作。

## Desired Outcome

F009 规划完成后，应能进入 /build-feature 并交付以下最小生产级闭环：

1. 数据源管理：创建、脱敏配置、连接测试、激活/禁用、状态诊断、团队/BU 共享权限和同步任务 seam。
2. 数据集管理：数据集创建、列表/筛选/搜索、详情、文件引用、版本生成、发布/归档/回收状态机。
3. 上传向导：复用 F007 platform_file_object 进行文件初始化、完成登记、hash/size 校验和下载 URL seam；不伪造真实对象存储联通。
4. 权限与隔离：复用 F006/F007，保证 BU 数据隔离、数据集级可见、版本级下载、受限数据集申请/授权 seam。
5. 血缘与后续引用：为数据源同步、Pipeline、标注、训练、模型版本引用留下 datasetId、ersionId、sourceId、lineageId seam。
6. 前端接入原型页面 key：datasrc、ds、up、dsdetail；portal 与 lineage 可做最小真实数据/只读 seam，不进入完整门户审批。

## In Scope

- DataSource 聚合：类型、连接摘要、凭据引用、状态、连接测试记录、BU/项目范围、共享权限、审计。
- Dataset 聚合：RAW/PREPROCESSED/ANNOTATED/AUGMENTED 类型，TEXT/IMAGE/AUDIO/VIDEO/MULTI_MODAL 数据类型，访问级别，标签，当前版本，状态。
- DatasetVersion：版本号、状态、recordCount、sizeBytes、文件引用、发布/归档，不允许修改已发布版本内容。
- DatasetFile / 文件引用：绑定 F007 platform_file_object.file_id，记录角色（原始文件/样例/元数据/标注文件）、hash/size、contentType。
- DataLineage：从数据源到数据集、从版本到版本、后续 Pipeline/标注/增强输出的最小血缘记录。
- DatasetAccessGrant / AccessRequest seam：公开/团队/私有/受限访问；受限数据集申请和有效期授权可在 F009 建最小后端 seam，复杂门户工作流留后续。
- DataSourceSyncTask seam：保存同步任务配置、状态、最近运行结果；不实现生产级采集调度器。
- 权限码、审计事件、错误码和测试设计。
- 前端真实 API 接入：数据源管理、数据集管理、新建数据集上传向导、数据集详情。

## Out-of-Scope / Non-goals

- 不实现完整 Pipeline 编辑器、算子执行、格式转换、内容清洗、数据增强执行。
- 不实现标注任务、标注工作台、标注审核、AI 预标注或标注质量检查完整业务。
- 不实现数据资产门户完整推荐、审批中心、相似推荐算法和排行榜；仅保留后续可复用的数据集搜索/申请 seam。
- 不实现真实 DB/OSS/Kafka/OPC-UA/REST API connector 生产联调；外部参数均保留 TODO_CONFIRM_*。
- 不实现真实分片上传、对象存储签名、MinIO/OSS/KMS 生产接入；复用 F007 文件元数据 seam 表达 UNCONFIGURED。
- 不实现训练任务、模型版本引用的真实业务，只提供删除前引用检查 seam。
- 不复制原型 JSX 或已删除旧 backend/frontend 代码作为实现。

## Decision Boundaries

Codex 可直接决定：

- 后端 DATA 模块包名、Controller/Service/DTO 命名、SQL 表名草案和测试文件组织。
- 数据源/数据集/版本/血缘/授权状态枚举的实现命名，只要保持业务语义一致。
- 以 F007 platform_file_object 作为数据集文件事实 seam，不新增并行文件对象事实源。
- 前端组件拆分方式，例如 DataSourceManagementPage、DatasetManagementPage、DatasetUploadPage、DatasetDetailPage。
- 本地 dev/test connector 使用受控 seam 返回 UNCONFIGURED / SANDBOX，但不得伪造生产联通。

必须保留待确认或后续 contract 冻结：

- 真实数据源 Host、网络、账号、凭据、VPC、白名单、OPC-UA/Kafka 等协议细节。
- 真实对象存储/MinIO/OSS endpoint、bucket、KMS、签名策略和分片上传协议。
- 内容安全检测服务供应商、API、风险等级阈值和人工处置队列。
- 是否需要门户完整审批工单与通知闭环，以及跨 BU 数据共享最终组织规则。

## Constraints

- 本阶段只做规划，不写业务实现。
- 正式文档、计划、报告、评审说明使用中文。
- 实现阶段必须先通过 check-build-feature-prereqs。
- 未确认外部系统参数必须保留 TODO_CONFIRM_*，不能猜测。
- 所有写操作必须有认证、权限、BU/项目边界、状态机校验和审计。
- 前端必须保持原型的信息架构、页面 key、主标题、核心 Tab/卡片/表格/弹窗语义。

## Exception Scenarios

- 数据源连接测试失败：保持 INACTIVE / FAILED，不得激活，返回明确诊断并写审计。
- 数据源凭据明文回显：禁止；响应只返回脱敏摘要或 secretRef。
- 外部 connector 未配置：返回 UNCONFIGURED 与 TODO_CONFIRM_*，前端显示未配置引导。
- 文件 hash/size 与初始化元数据不一致：复用 F007 逻辑标记失败，阻断版本发布。
- 内容安全服务未配置：不得伪造通过；数据集可处于 SECURITY_PENDING / NEEDS_REVIEW 或阻断发布，contract 阶段冻结。
- 已发布版本被修改/删除：返回 409/422，提示新建版本，写审计。
- 删除数据集但存在训练/模型/标注引用：通过引用检查 seam 阻断删除。
- 跨 BU 查询或下载无授权数据集：查询返回 404，授权过期下载返回 403，写审计。
- 受限数据集无有效授权：返回 DATASET_ACCESS_REQUIRED，前端引导申请。

## Testable Acceptance Criteria

- AC-01：datasrc 页面接入真实 API，支持数据源列表、新建、连接测试、激活/禁用、详情/编辑和状态诊断；连接测试未通过不可激活。
- AC-02：数据源敏感连接字段不回显，未配置真实 connector 时返回 UNCONFIGURED / TODO_CONFIRM_*，不展示假成功。
- AC-03：ds 页面接入真实 API，支持数据集统计、分类 Tab、搜索/筛选、分页、权限/状态 badge、批量选择和版本抽屉。
- AC-04：up 上传向导复用 F007 文件元数据 seam，完成数据集创建、文件初始化/完成登记、hash/size 校验和版本草稿生成。
- AC-05：数据集版本状态机生效，已发布版本不可修改或删除，变更必须新建版本。
- AC-06：dsdetail 展示数据集概览、版本、文件、权限、血缘摘要和样例预览；非图片/不可预览文件显示真实退化状态。
- AC-07：受限数据集访问申请与有效期授权 seam 生效；无授权访问受限下载返回 DATASET_ACCESS_REQUIRED 或 403。
- AC-08：数据集查询、详情、下载遵循 BU 隔离；跨 BU 无授权不暴露资源存在性。
- AC-09：数据源、数据集、版本、文件、授权、删除、跨 BU 拒绝等关键事件均写审计。
- AC-10：F009 不实现完整 Pipeline、标注、数据增强、生产采集调度和真实外部 connector；仅提供后续引用 seam。

## Assumptions Exposed + Resolutions

- Assumption: F009 可以一次性做完整 DATA 域。Resolution: 否，F009 只做数据源与数据集事实源，复杂处理/标注/门户/增强拆后续。
- Assumption: 没有真实外部参数也能显示连接成功。Resolution: 否，必须返回 UNCONFIGURED 或受控 sandbox，不能伪造成功。
- Assumption: F007 文件对象不足以支持数据集。Resolution: F007 作为文件元数据 seam 足够；F009 新增 dataset_file 绑定而非复制文件事实源。
- Assumption: 受限数据集审批必须完整实现门户工单。Resolution: F009 建最小申请/授权 seam，完整门户体验可后续 F011。

## Pressure-pass Findings

经过最小可行范围压力测试，F009 不应牺牲：DAT-001 连接测试激活门禁、DAT-005 版本不可变、DAT-012 BU 隔离、F007 文件 seam 复用、审计与原型页面真实 API 接入。可以裁剪的是真实采集调度、完整内容安全服务、完整门户审批与高级血缘可视化。

## Brownfield Evidence vs Inference Notes

- Evidence: PlatformOrganizationConfigService 已有 platform_file_object 的 init/complete/download、hash/size 校验和审计。
- Evidence: AppNavigation 已有 ds、datasrc、lineage、portal 页面 key，当前除平台页外仍是占位页。
- Evidence: docs/prototype/SMP工业AI平台-原型v2.html 对 datasrc、ds、up、dsdetail 已提供具体 UI 结构。
- Inference: F009 应新增 DATA 模块而不是继续塞入 platform 模块；但可复用 platform 身份、组织、文件和审计 seam。
