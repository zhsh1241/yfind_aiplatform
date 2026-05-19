> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-annotation-integration.md`

﻿# PRD：F012 标注任务、标注审核与 Label Studio 适配

## 1. 元信息

- Feature：`F012-annotation-integration`
- Feature 目录：`docs/features/F012-annotation-integration`
- 状态：RALPLAN 规划产物，供 `plan.md` 草案引用；不是实现批准文件
- 日期：2026-05-19
- 业务域：DATA 数据管理
- 原型页面：`ann`、`annreview`、`annwork`、`dsdetail`、`lineage`
- 上游依赖：F006 平台身份/权限/审计、F009 数据源/数据集/文件/血缘、F010 标准化任务、F011 Pipeline/算子市场
- 规划依据：`.omx/specs/deep-interview-annotation-integration.md` 与本轮 RALPLAN 收敛

## 2. 背景与问题

F009/F010/F011 已打通 DATA 域从数据源、数据集、标准化到 Pipeline 控制面的闭环，但原型与业务文档中的数据标注闭环仍未形成正式功能：标注任务管理、标签模板、标注员工作台、审核流、AI 预标注 seam、Label Studio 对接 seam、标注结果生成 `ANNOTATED` 数据集和 `ANNOTATION` 血缘。

业务流程要求数据预处理完成后进入标注阶段，任务创建时选择标注场景、标签模板、标注人员和是否启用审核；标注提交后若启用审核则由审核工程师通过/驳回，否则直接进入标注数据集生成。标注数据集发布前必须做完整性、格式和覆盖率检查。

本功能目标是补齐 DATA 域标注闭环，同时遵守现有技术基线和“未知外部参数用 `TODO_CONFIRM_*` 明示”的约束，不用 mock/假接口替代核心平台业务能力。

## 3. 业务来源与原型来源

### 3.1 业务来源

- `docs/business/bizdocs/02-01-业务流程-数据管理.md`
  - DATA-003 数据标注流程：创建任务、配置标签模板、分配人员、执行标注、提交结果、审核、生成标注数据集。
  - DATA-006 标注数据集管理流程：导入标注结果、关联场景、质量检查、生成版本、发布激活。
- `docs/business/bizdocs/03-01-系统功能-数据管理.md`
  - FUNC-DATA-020 标注任务总览。
  - FUNC-DATA-021 标注场景管理。
  - FUNC-DATA-022 在线预标注。
  - FUNC-DATA-023 离线预标注。
  - FUNC-DATA-024 标签模板管理。
  - FUNC-DATA-025 标注任务创建。
  - FUNC-DATA-026 标注审核。
  - FUNC-DATA-028 标注数量统计。
  - FUNC-DATA-042 标注数据集管理。
  - FUNC-DATA-095 标注场景卡片画廊。
- `docs/business/domain/01-领域对象-数据域.md`
  - `AnnotationTask`、`LabelTemplate`、`Dataset` 聚合根。
- `docs/business/rules/01-数据管理规则.md`
  - DAT-003、DAT-004、DAT-009、DAT-010、DAT-011、DAT-012。
- `docs/business/rules/05-平台与权限规则.md`
  - PLT-001、PLT-005、PLT-009、PLT-011、PLT-014。

### 3.2 原型来源

- `docs/prototype/SMP工业AI平台-原型v2.html`
  - `/ann`：标题“标注任务管理”、任务 Tab（全部任务/进行中/待开始/已完成）、标签模板按钮、新建标注任务向导、AI 预标注配置、任务列表、进度、标注员、质量评分、操作入口。
  - `/annwork`：标注工作台入口，承载标注任务查看、标注、提交。
  - `/annreview`：标注审核入口，承载待审核结果、通过/驳回。
  - `/dsdetail`：数据集详情中的标注数据集、版本和“查看标注任务”。
  - `/lineage`：血缘拓扑和时间轴中的标注任务节点、标注图像集和 `ann` 类型事件。

## 4. 用户与权限角色

- `SUPER_ADMIN`：可查看和管理所有租户内授权范围的标注配置，执行高危管理操作。
- `BU_ADMIN`：在本 BU 子树内创建/管理标注任务、分配人员、处理任务异常和审核配置。
- `DATA_ANNOTATOR` / 数据标注工程师：查看被分配任务、执行标注、提交标注结果，不得审核自己提交的结果。
- `DATA_REVIEWER` / 审核工程师：查看待审核结果，执行通过/驳回，必须与提交人不同。
- `MODEL_TRAINER`：只读使用已发布 `ANNOTATED` 数据集，不参与 F012 标注流实现。

所有查询和操作必须按 `tenantId`/BU 隔离；跨 BU 访问须显式授权并审计。

## 5. Intent / Desired Outcome

F012 意图是把原型中的标注管理、标注工作台和审核页从静态占位推进为可验收的生产级控制面：

1. 管理员能在 `/ann` 查看标注任务总览、统计、Tab 筛选和任务列表。
2. 管理员能基于 ACTIVE 数据集创建标注任务，选择场景、已发布标签模板、是否启用审核、AI 预标注 seam、Label Studio seam 和标注人员。
3. 标签模板可创建、维护、发布、归档，并能生成 Label Studio 兼容的 label config XML/JSON seam。
4. 标注员能在 `/annwork` 查看被分配任务、样本、预标注结果和 Label Studio 外链/嵌入配置 seam，提交标注结果。
5. 审核工程师能在 `/annreview` 审核结果，通过或驳回，且不得审核自己提交的结果。
6. 任务完成后可生成 `ANNOTATED` 数据集、版本、结果文件和 `ANNOTATION` 血缘，并在数据集详情/血缘页可见。
7. Label Studio 对接以 adapter seam 落地，外部 URL/token/workspace/storage 未确认时显示 `UNCONFIGURED`/`TODO_CONFIRM_*`，不假装生产对接成功。

## 6. In Scope

### 6.1 标注任务管理 `/ann`

- 任务总览统计：总任务、进行中、待审核、已完成、逾期/风险、平均质量分。
- Tab：全部任务、进行中、待开始、待审核、已完成，可按原型语义扩展“已驳回/草稿”。
- 任务表格字段：任务名称、标注类型/场景、源数据集、进度、标注员、质量评分、截止时间、状态、操作。
- 新建标注任务向导：选择 ACTIVE 数据集、标注场景、标签模板、是否启用 AI 预标注、审核流程、Label Studio 项目策略、分配标注员、截止时间。
- 状态流转：`DRAFT` → `ASSIGNED`/`IN_PROGRESS` → `PENDING_REVIEW` → `APPROVED`/`REJECTED` → `COMPLETED`，以及 `CANCELLED`/`PAUSED`。

### 6.2 标签模板管理

- 标签模板 CRUD、标签层级维护、发布/归档。
- 仅 `PUBLISHED` 模板可用于任务创建。
- 支持 `IMAGE_CLASSIFICATION`、`OBJECT_DETECTION`、`SEMANTIC_SEGMENTATION`、`TEXT_LABELING`、`AUDIO_LABELING`、`VIDEO_LABELING`、`MULTI_MODAL` 的场景枚举与模板类型。
- 生成 Label Studio label config seam；本期保留字段和预览/校验，不引入新 SDK。

### 6.3 标注工作台 `/annwork`

- 展示任务详情、源数据集、样本队列、当前样本、标签模板、预标注建议、完成进度。
- 支持提交标注结果、保存草稿、批量提交。
- Label Studio adapter seam：返回 project/task/launchUrl/configStatus；未配置时前端明确展示“外部标注工具未配置”。
- AI 预标注 seam：任务创建时记录模型来源、阈值、状态、预测摘要；真实模型来源保留 `TODO_CONFIRM_PRELABEL_MODEL_SOURCE`。

### 6.4 标注审核 `/annreview`

- 待审核列表、任务/样本维度筛选、标注员、提交时间、质量指标。
- 审核通过/驳回；驳回必须填写原因并回到标注环节。
- 强制 DAT-004：审核人不得等于提交标注结果的 annotatorId。

### 6.5 标注数据集生成

- 任务达到完成条件后执行质量检查：完整性、格式、覆盖率。
- 通过后生成 `dataset_type=ANNOTATED` 数据集、`dataset_version`、结果 `platform_file_object`/`dataset_file`。
- 写入 `data_lineage`，`transform_type=ANNOTATION`，从源数据集版本或任务指向标注数据集版本。
- 在 `/dsdetail` 和 `/lineage` 显示标注任务/标注数据集关系。

### 6.6 权限、审计与告警 seam

- 新增标注相关权限、菜单权限和角色绑定。
- 对任务创建、分配、提交、审核、驳回、完成、生成数据集、Label Studio 同步失败、跨 BU 拒绝等行为写审计。
- 高危或跨租户操作按 PLT-011 写 CRITICAL 审计并保留告警 seam。
- PLT-014 停用账号时，标注任务/审核任务应可被扫描并提示重新分配。

## 7. Out of Scope / Non-goals

- 不部署生产 Label Studio，不猜测生产 URL/token/workspace/storage。
- 不新增 `label-studio-sdk` 或其他新依赖；adapter seam 使用 JDK `HttpClient` 或内部接口抽象即可。
- 不实现完整 Label Studio ML Backend 或真实 AI 预标注模型。
- 不实现模型训练、模型市场、推理消费标注数据集；这些只使用 F012 输出作为后续输入。
- 不重写 F009 数据集/文件/血缘、F006 权限审计、F011 Pipeline。
- 不复制原型 JSX；仅保持信息架构、页面 key、主文案和视觉语义。
- 不处理所有 CAD/视频/音频复杂标注工具细节；本期以控制面、样本队列和 adapter seam 为主。

## 8. Decision Boundaries

### Codex 可自主决定

- 数据库表、DTO、Controller、Service 的命名和字段细节，只要映射 `AnnotationTask`、`LabelTemplate`、`Dataset` 并遵守现有 REST v1/ApiResponse 规范。
- 是否新增 `AnnotationController`/`AnnotationService`/`AnnotationDtos`，建议新增独立 seam，避免继续扩大 `DataManagementService`。
- Label Studio adapter 接口边界、配置状态枚举、失败码和未配置展示语义。
- 前端组件拆分、TanStack Query key、E2E mock 数据结构和页面状态组织。
- seed 样例数据与测试 fixture，只要不替代核心业务校验。

### 必须保留为待确认

- `TODO_CONFIRM_LABEL_STUDIO_BASE_URL`
- `TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET`
- `TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY`
- `TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY`
- `TODO_CONFIRM_PRELABEL_MODEL_SOURCE`
- `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`

## 9. Exception Scenarios

- 未选择 ACTIVE 数据集：拒绝创建任务，提示“所选数据集状态不可用，请先激活数据集”。
- 未配置已发布标签模板：拒绝任务分配/启动，提示“任务尚未配置标签模板，请先完成标签体系定义”。
- 标注员为空或被停用：拒绝分配或提示重新分配。
- 审核人等于标注提交人：拒绝审核并提示“不允许审核自己提交的标注结果”。
- 覆盖率低于阈值、格式校验失败或存在未标注样本：阻断标注数据集发布，展示失败项。
- Label Studio 未配置或同步失败：任务可保持平台内控制面状态，但外部 launch/sync 操作返回 `UNCONFIGURED`/`SYNC_FAILED`，不得假装成功。
- AI 预标注模型来源未配置：预标注状态为 `UNCONFIGURED`，可创建人工标注任务但不生成预测。
- 跨 BU 数据集/任务访问：返回不可见或 403，并写审计。
- 已完成任务被再次提交/审核：拒绝状态机非法流转。
- 已被训练/模型引用的标注数据集删除：沿用 DAT-011 引用检查。

## 10. 技术方案要点

### 10.1 后端模块

建议新增：

- `AnnotationController`
- `AnnotationService`
- `AnnotationDtos`
- `LabelStudioAnnotationAdapter`（接口）
- `HttpLabelStudioAnnotationAdapter` 或 `Noop/UnconfiguredLabelStudioAnnotationAdapter`
- 复用 `PlatformIdentityService`、`DataManagementService` 中的数据集/文件/血缘能力，必要时抽出窄接口。

### 10.2 API 草案

任务与总览：

- `GET /api/v1/annotation/overview`
- `GET /api/v1/annotation/tasks`
- `POST /api/v1/annotation/tasks`
- `GET /api/v1/annotation/tasks/{taskId}`
- `POST /api/v1/annotation/tasks/{taskId}/assign`
- `POST /api/v1/annotation/tasks/{taskId}/start`
- `POST /api/v1/annotation/tasks/{taskId}/pause`
- `POST /api/v1/annotation/tasks/{taskId}/cancel`

标签模板：

- `GET /api/v1/annotation/label-templates`
- `POST /api/v1/annotation/label-templates`
- `PUT /api/v1/annotation/label-templates/{templateId}`
- `POST /api/v1/annotation/label-templates/{templateId}/publish`
- `POST /api/v1/annotation/label-templates/{templateId}/archive`
- `GET /api/v1/annotation/label-templates/{templateId}/label-studio-config`

工作台与结果：

- `GET /api/v1/annotation/tasks/{taskId}/work-items`
- `POST /api/v1/annotation/work-items/{workItemId}/draft`
- `POST /api/v1/annotation/work-items/{workItemId}/submit`
- `POST /api/v1/annotation/tasks/{taskId}/submit-for-review`

审核与数据集生成：

- `GET /api/v1/annotation/review-items`
- `POST /api/v1/annotation/review-items/{reviewItemId}/approve`
- `POST /api/v1/annotation/review-items/{reviewItemId}/reject`
- `POST /api/v1/annotation/tasks/{taskId}/quality-check`
- `POST /api/v1/annotation/tasks/{taskId}/publish-dataset`

Label Studio seam：

- `GET /api/v1/annotation/tasks/{taskId}/label-studio/status`
- `POST /api/v1/annotation/tasks/{taskId}/label-studio/sync-project`
- `POST /api/v1/annotation/work-items/{workItemId}/label-studio/sync-task`
- `POST /api/v1/annotation/tasks/{taskId}/label-studio/import-results`

### 10.3 数据模型草案

新增 Flyway `V9__annotation_integration.sql`，建议表：

- `annotation_label_template`
  - `template_id`、`tenant_id`、`name`、`scene`、`label_type`、`label_schema_json`、`label_studio_config_xml`、`status`、`created_by`、`created_at`、`updated_at`。
- `annotation_task`
  - `task_id`、`tenant_id`、`project_id`、`source_dataset_id`、`source_version_id`、`template_id`、`name`、`scene`、`status`、`review_enabled`、`prelabel_enabled`、`label_studio_enabled`、`total_count`、`annotated_count`、`reviewed_count`、`quality_score`、`deadline`、`created_by`、`created_at`、`updated_at`。
- `annotation_assignment`
  - `assignment_id`、`task_id`、`assignee_id`、`role`、`status`、`assigned_by`、`assigned_at`。
- `annotation_work_item`
  - `work_item_id`、`task_id`、`sample_file_id`/`sample_key`、`annotator_id`、`status`、`prediction_json`、`annotation_json`、`submitted_at`、`updated_at`。
- `annotation_review_item`
  - `review_item_id`、`work_item_id`、`task_id`、`annotator_id`、`reviewer_id`、`status`、`review_comment`、`reviewed_at`。
- `annotation_dataset_publication`
  - `publication_id`、`task_id`、`output_dataset_id`、`output_version_id`、`quality_status`、`coverage_rate`、`format_status`、`diagnostic_code`、`diagnostic_message`、`published_by`、`published_at`。
- `annotation_external_binding`
  - `binding_id`、`task_id`、`provider`、`external_project_id`、`external_url`、`config_status`、`last_sync_status`、`last_sync_at`、`diagnostic_code`、`diagnostic_message`。

### 10.4 状态机草案

标注任务：

- `DRAFT`
- `ASSIGNED`
- `IN_PROGRESS`
- `PENDING_REVIEW`
- `REJECTED`
- `APPROVED`
- `COMPLETED`
- `PAUSED`
- `CANCELLED`

工作项：

- `PENDING`
- `DRAFT`
- `SUBMITTED`
- `REVIEW_PENDING`
- `APPROVED`
- `REJECTED`

模板：

- `DRAFT`
- `PUBLISHED`
- `ARCHIVED`

Label Studio 配置：

- `UNCONFIGURED`
- `READY`
- `SYNCED`
- `SYNC_FAILED`

预标注：

- `DISABLED`
- `UNCONFIGURED`
- `QUEUED`
- `COMPLETED`
- `FAILED`

### 10.5 前端方案

- 在 `frontend/src/features/data/DataPages.tsx` 或拆分后的 data feature 中补齐：
  - `AnnotationTasksPage` 对应 `/ann`。
  - `AnnotationWorkbenchPage` 对应 `/annwork`。
  - `AnnotationReviewPage` 对应 `/annreview`。
  - `LabelTemplateDrawer/Modal`。
  - `AnnotationTaskWizard`。
  - `LabelStudioStatusBanner`。
- 在 `frontend/src/features/platform/platformApi.ts` 增加 annotation DTO 与 API client。
- 保持原型文案与布局语义：`标注任务管理`、`标签模板`、`新建标注任务`、任务 Tab、进度/标注员/质量评分/截止/状态/操作。
- E2E 增加 `frontend/e2e/annotation-integration.spec.ts`，mock 必须覆盖权限失败、DAT-004、Label Studio 未配置和数据集生成。

### 10.6 Label Studio 官方约束映射

基于已查阅官方资料：

- Label Studio API 通常需要 Token/API key 认证，项目和任务 API 以 project/task ID 为核心；因此 F012 只保存 `secretRef`，不保存明文 token。
- 项目创建包含 label config；因此标签模板需要能导出 Label Studio label config seam。
- 任务创建使用与项目 label config 匹配的 `data` payload；因此 work item 需要保存样本数据映射。
- 导出有 UI/API/console/snapshot 等路径且大规模导出有超时/规模风险；因此 F012 的导入/导出格式保留 `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`，并以后台任务/结果文件 seam 设计。

参考：

- https://labelstud.io/guide/api.html
- https://api.labelstud.io/api-reference/api-reference/projects/create
- https://api.labelstud.io/api-reference/api-reference/tasks/create
- https://labelstud.io/guide/export.html

## 11. 复用策略

### Must Reuse

- F006：`PlatformIdentityService`、`platform_permission`、`platform_role_permission`、`platform_audit_log`、统一 `ApiResponse`、会话/角色/租户上下文。
- F009：`dataset`、`dataset_version`、`dataset_file`、`data_lineage`、`platform_file_object`、数据集权限/访问/引用规则。
- F010：标准化任务输出的 `PREPROCESSED` 数据集可作为 F012 源数据集，不新增独立预处理模型。
- F011：Pipeline/Operator 中的 dataset 输出和血缘模式；若后续将标注作为 Pipeline 算子，应复用 operator catalog seam。
- 前端：React 19、Ant Design 6、TanStack Query、`AppNavigation`、`platformApi.ts`、既有 data feature 布局和 E2E helper/mock。
- 脚手架：`tools/ai-scaffold` 规划归档、前置门禁和 gate。

### Duplication Rejected

- 不新增与 F009 平行的数据集、文件、血缘、访问授权模型。
- 不新增与 F006 平行的用户、角色、权限、审计模型。
- 不复制原型 JSX，不恢复旧 backend/frontend 实现。
- 不引入 Label Studio SDK 或前端标注画布依赖来绕开 adapter seam。
- 不用前端 mock 结果替代后端状态机、规则校验和数据集生成。

### Approved New Seams

- Annotation 控制平面表/API：现有系统尚无任务、模板、分配、工作项、审核项和发布记录模型。
- Label Studio adapter seam：外部系统参数未知，但必须保留可配置、可检测、可失败的集成边界。
- AI 预标注 seam：业务要求在线/离线预标注，但模型来源未确认，本期只落平台内状态和预测结果接口边界。

## 12. 权限与审计

### 权限草案

- `menu:ann`
- `menu:annreview`
- `menu:annwork`
- `data:annotation:read`
- `data:annotation:write`
- `data:annotation:assign`
- `data:annotation:submit`
- `data:annotation:review`
- `data:annotation:publish`
- `data:annotation:admin`
- `data:label-template:read`
- `data:label-template:write`
- `data:label-template:publish`

### 审计事件草案

- `ANNOTATION_TEMPLATE_CREATED`
- `ANNOTATION_TEMPLATE_PUBLISHED`
- `ANNOTATION_TASK_CREATED`
- `ANNOTATION_TASK_ASSIGNED`
- `ANNOTATION_TASK_STARTED`
- `ANNOTATION_RESULT_SUBMITTED`
- `ANNOTATION_REVIEW_APPROVED`
- `ANNOTATION_REVIEW_REJECTED`
- `ANNOTATION_QUALITY_CHECK_FAILED`
- `ANNOTATION_DATASET_PUBLISHED`
- `ANNOTATION_LABEL_STUDIO_SYNC_FAILED`
- `ANNOTATION_CROSS_TENANT_DENIED`

## 13. 验收草案

- AC-01：`/ann` 按原型展示标注任务管理、统计、任务 Tab、任务列表、标签模板和新建标注任务入口。
- AC-02：创建标注任务时只能选择 ACTIVE 数据集和 PUBLISHED 标签模板；违反 DAT-009/DAT-003 时后端拒绝并前端提示。
- AC-03：标签模板可维护、发布并生成 Label Studio label config seam。
- AC-04：`/annwork` 可查看分配任务、样本队列、预标注摘要、Label Studio 配置状态，并提交标注结果。
- AC-05：`/annreview` 可审核通过/驳回标注结果；审核自己提交的结果被 DAT-004 阻断。
- AC-06：Label Studio adapter 在未配置外部参数时返回 `UNCONFIGURED`/`TODO_CONFIRM_*`，配置失败和同步失败可见且审计。
- AC-07：任务完成并质量检查通过后生成 `ANNOTATED` 数据集、版本、结果文件和 `ANNOTATION` 血缘；质量检查失败时阻断发布。
- AC-08：权限不足、跨 BU 访问、非法状态流转、被停用用户任务处理均有可测失败路径与审计证据。

## 14. 开放问题

- `TODO_CONFIRM_LABEL_STUDIO_BASE_URL`：生产 Label Studio 地址。
- `TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET`：Token secretRef 命名与密钥管理位置。
- `TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY`：项目/租户到 workspace/project 的映射策略。
- `TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY`：对象存储、任务 data payload、导入导出文件路径策略。
- `TODO_CONFIRM_PRELABEL_MODEL_SOURCE`：在线/离线预标注模型来源、服务协议和权限。
- `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`：COCO、YOLO、Pascal VOC、JSONL、Label Studio JSON 等正式支持清单。

## 15. 计划结论

F012 应作为独立 DATA 域功能推进，先完成正式 `plan.md` 并保持 `plan_status: draft`。待人工批准后，`/build-feature` 阶段再产出 `TASK.md`、`contract.md`、`test-plan.md`、SQL、后端、前端、E2E 与质量门禁证据。
