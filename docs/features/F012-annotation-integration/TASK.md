# Task: 标注任务、标注审核与 Label Studio 适配

## Metadata
- Feature: F012-annotation-integration
- ID: TASK-annotation-integration
- Status: approved-for-build
- Owner: codex
- Created: 2026-05-19
- Updated: 2026-05-20
- 前置：同目录 `plan.md` 已由用户会话指令“批准，进入F012开发”批准；`check-build-feature-prereqs` 已通过。

## 1. 需求摘要

### User Story
作为 BU 数据管理员、数据标注工程师和审核工程师，我想在 `标注任务`、`标注工作台` 与 `标注审核` 中完成标签模板、图片打标/图片分割任务创建、任务分配、标注提交、审核通过/驳回、Label Studio 状态检测、标注文件生成和标注数据集发布，以便把 DATA 域从数据集/Pipeline 延伸到可审计、可复用的标注闭环。

### Business Value
- 补齐 DATA 域 DATA-003 数据标注流程和 DATA-006 标注数据集管理流程，形成从 ACTIVE 源数据集到 `ANNOTATED` 数据集的闭环。
- 明确标注范围为图片打标和图片分割，避免继续扩展到文本、音频、视频逐帧或多模态标注。
- 标注任务完成后必须产生对应标注文件并保存，确保标注结果可导出、可追溯、可复用。
- 保持原型 `/ann`、`/annwork`、`/annreview`、`/dsdetail`、`/lineage` 信息架构和主文案语义，减少前端交互偏差。
- 为后续真实 Label Studio、AI 预标注服务、模型训练消费标注数据集提供清晰 seam，同时用 `TODO_CONFIRM_*` 防止伪造外部系统事实。
- 将 DAT-003、DAT-004、DAT-009、DAT-010、DAT-012 与 PLT-001/011 等 MUST 规则固化为后端校验、前端提示和测试证据。

### Source References
- Business docs:
  - `docs/business/bizdocs/02-01-业务流程-数据管理.md`：DATA-003、DATA-006。
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md`：FUNC-DATA-020、021、022、023、024、025、026、028、042、095。
  - `docs/business/domain/01-领域对象-数据域.md`：`AnnotationTask`、`LabelTemplate`、`Dataset`。
  - `docs/business/rules/01-数据管理规则.md`：DAT-003、DAT-004、DAT-009、DAT-010、DAT-011、DAT-012。
  - `docs/business/rules/05-平台与权限规则.md`：PLT-001、PLT-005、PLT-009、PLT-011、PLT-014。
- Prototype:
  - `docs/prototype/SMP工业AI平台-原型v2.html`：page key `ann`、`annwork`、`annreview`、`dsdetail`、`lineage`。
- Planning evidence:
  - `docs/features/F012-annotation-integration/plan.md`
  - `docs/features/F012-annotation-integration/reports/planning/deep-interview.md`
  - `docs/features/F012-annotation-integration/reports/planning/prd.md`
  - `docs/features/F012-annotation-integration/reports/planning/test-spec.md`

## 2. 范围

### In Scope
- [x] `/ann` 标注任务管理：统计卡、任务 Tab、任务表格、标签模板入口、新建标注任务向导。
- [x] 标签模板管理：CRUD/列表、发布/归档、场景与标签 schema、Label Studio label config seam。
- [x] 任务创建：只能选择 ACTIVE 数据集和 PUBLISHED 标签模板，支持审核开关、AI 预标注开关、Label Studio 开关、标注员分配和截止时间。
- [ ] 任务创建范围调整：只能选择 ACTIVE 图片数据集和 PUBLISHED 标签模板；影音数据集本阶段不允许创建图片打标/图片分割任务。
- [x] `/annwork` 标注工作台：任务详情、样本队列、预标注摘要、Label Studio 未配置/同步状态、保存草稿、提交标注结果。
- [ ] `/annwork` 标注场景调整：提交结果限定为图片打标或图片分割。
- [x] `/annreview` 标注审核：待审核队列、通过、驳回、驳回原因、DAT-004 自审阻断。
- [x] 标注数据集发布：质量检查、覆盖率/格式/完整性诊断，生成 `ANNOTATED` 数据集、版本、结果文件和 `ANNOTATION` 血缘。
- [ ] 标注文件保存：任务完成且质量检查通过后必须生成并保存标注文件，作为 `ANNOTATION_RESULT` 绑定到 `ANNOTATED` 数据集版本。
- [x] Label Studio adapter seam：未配置时返回 `UNCONFIGURED` 与 `TODO_CONFIRM_*`，同步失败可见并审计，凭据仅 `secretRef`。
- [x] 权限、BU 隔离和审计：菜单权限、标注操作权限、跨 BU 拒绝、关键操作审计。
- [x] 前后端契约一致、E2E 覆盖总览、创建、工作台、审核、未配置、发布和血缘。

### Out of Scope
- 不部署真实生产 Label Studio，不猜测生产 URL/token/workspace/storage。
- 不新增 `label-studio-sdk`、前端标注画布库或其他新依赖。
- 不实现完整 Label Studio ML Backend 或真实 AI 预标注模型。
- 不实现模型训练、模型市场或推理消费标注数据集。
- 不重写 F009/F010/F011 已有数据集、标准化、Pipeline、权限、审计模型。
- 不复制原型 JSX，不恢复旧已删除实现。
- 不覆盖 CAD、复杂视频/音频逐帧、文本或多模态标注工具细节；本期以图片打标/图片分割控制面与 adapter seam 为验收范围。

## 3. 技术分析

### Backend
- Module/API:
  - 新增 `AnnotationController`、`AnnotationService`、`AnnotationDtos`。
  - 新增 `LabelStudioAnnotationAdapter` 与 `UnconfiguredLabelStudioAnnotationAdapter`。
  - 新增 `/api/v1/annotation/*` 端点覆盖 overview/tasks/templates/work-items/review-items/publish/label-studio。
- Domain objects:
  - `annotation_label_template`
  - `annotation_task`
  - `annotation_assignment`
  - `annotation_work_item`
  - `annotation_review_item`
  - `annotation_dataset_publication`
  - `annotation_external_binding`
- Business rules:
  - DAT-003：标注任务必须配置 PUBLISHED 标签模板。
  - DAT-004：标注工程师不得审核自己提交的标注结果。
  - DAT-009：标注任务只能引用 ACTIVE 数据集。
  - DAT-010：发布标注数据集前必须通过质量检查。
  - DAT-012 / PLT-001：所有查询与操作按 tenantId/BU 隔离。
  - PLT-011：跨租户、高危发布和同步失败写审计。

### Frontend
- Prototype page key:
  - `ann`、`annwork`、`annreview`，并联动 `dsdetail`、`lineage`。
- Pages/components:
  - `AnnotationTasksPage`
  - `AnnotationWorkbenchPage`
  - `AnnotationReviewPage`
  - `AnnotationTaskWizard`
  - `LabelTemplateDrawer`
  - `LabelStudioStatusBanner`
- States/interactions:
  - React + TanStack Query + Ant Design。
  - 新建任务三步向导：选择数据集、标注配置、分配团队。
  - 工作台支持保存草稿/提交；审核页支持通过/驳回。
  - Label Studio 未配置以 Alert/Banner 显示，不能误导用户为同步成功。

### AI Adapter / Integration
- Adapter endpoint:
  - 本期不调用 `ai-adapter/`；只在后端保存预标注配置、状态和预测摘要 seam。
- External system placeholders:
  - `TODO_CONFIRM_LABEL_STUDIO_BASE_URL`
  - `TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET`
  - `TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY`
  - `TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY`
  - `TODO_CONFIRM_PRELABEL_MODEL_SOURCE`
  - `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`

### Database
- Tables:
  - `annotation_label_template`、`annotation_task`、`annotation_assignment`、`annotation_work_item`、`annotation_review_item`、`annotation_dataset_publication`、`annotation_external_binding`。
  - 复用 `dataset`、`dataset_version`、`dataset_file`、`platform_file_object`、`data_lineage`、`platform_permission`、`platform_role_permission`、`platform_audit_log`。
- Migrations:
  - 新增 `backend/smp-app/src/main/resources/db/migration/V9__annotation_integration.sql`。
- SQL artifacts:
  - 记录于 `docs/features/F012-annotation-integration/sql/annotation-integration.sql`。

## Reuse Plan

### Existing reference seams to reuse
- `docs/business/`：流程、功能 ID、领域对象、DAT/PLT MUST 规则。
- `docs/prototype/SMP工业AI平台-原型v2.html`：`ann`、`annwork`、`annreview`、`dsdetail`、`lineage` 页面结构、文案和操作语义。
- `docs/features/F009-*`、`F010-*`、`F011-*`：数据集、标准化、Pipeline 输出与血缘实现经验。

### Existing service/scaffold seams to reuse
- F006：`PlatformIdentityService.requirePermission`、`PlatformPrincipal`、`platform_permission`、`platform_role_permission`、`platform_audit_log`、统一 `ApiResponse`。
- F009：`dataset`、`dataset_version`、`dataset_file`、`data_lineage`、`platform_file_object`、数据集访问/引用/删除规则。
- F010：`PREPROCESSED` 数据集作为标注源数据集，不新增平行预处理模型。
- F011：数据集输出与血缘写入模式；未来标注作为 Pipeline 算子时复用 `operator_catalog` seam。
- Frontend：`AppNavigation`、`DataPages.tsx` 数据域页面组织、`platformApi.ts` API client、E2E `helpers.ts`。
- Quality gates：`tools/ai-scaffold` 的 prereq、traceability、contract、gate、code-review verdict 检查。

### New seams allowed only if existing seams cannot be reused, because
- 新增 Annotation 控制面表/API：现有 F009/F010/F011 没有标注任务、模板、工作项、审核项、发布记录模型。
- 新增 Label Studio adapter seam：业务要求外部标注工具适配，但生产参数未知，必须用可失败、可诊断、可审计的边界承接。
- 新增 AI 预标注 seam：业务要求在线/离线预标注，但真实模型来源未确认，本期只落状态与预测结果接口边界。
- 新增标注文件生成 seam：业务要求任务完成后保存标注文件，需复用 F009 `platform_file_object` / `dataset_file`，不得只保存在标注工作项表中。

### Duplication explicitly rejected
- 不新增与 F009 平行的数据集/版本/文件/血缘表。
- 不新增与 F006 平行的用户/角色/权限/审计表。
- 不新增 Label Studio SDK 或前端画布依赖。
- 不复制原型 JSX 或旧实现。
- 不以 E2E/mock 代替后端核心规则。

## 5. Acceptance Criteria
- [ ] AC-01: `/ann` 按原型展示标注任务管理、统计、任务 Tab、任务列表、标签模板和新建标注任务入口。
- [ ] AC-02: 创建标注任务时只能选择 ACTIVE 图片数据集和 PUBLISHED 标签模板；违反 DAT-009/DAT-003 或选择非图片数据集时后端拒绝并前端提示。
- [ ] AC-03: 标签模板可维护、发布并生成 Label Studio label config seam。
- [ ] AC-04: `/annwork` 可查看分配任务、图片样本队列、预标注摘要、Label Studio 配置状态，并提交图片打标或图片分割结果。
- [ ] AC-05: `/annreview` 可审核通过/驳回标注结果；审核自己提交的结果被 DAT-004 阻断。
- [ ] AC-06: Label Studio adapter 在未配置外部参数时返回 `UNCONFIGURED`/`TODO_CONFIRM_*`，配置失败和同步失败可见且审计。
- [ ] AC-07: 任务完成并质量检查通过后必须生成并保存标注文件，再生成 `ANNOTATED` 数据集、版本、结果文件绑定和 `ANNOTATION` 血缘；质量检查或标注文件生成失败时阻断发布。
- [ ] AC-08: 权限不足、跨 BU 访问、非法状态流转、被停用用户任务处理均有可测失败路径与审计证据。
- [ ] AC-09: 标注场景仅支持图片打标与图片分割；影音、文本、音频、视频逐帧或多模态标注不进入本阶段验收范围。

## 6. Definition of Done
- [ ] plan.md 已批准。
- [ ] contract.md 已冻结。
- [ ] test-plan.md 引用全部 AC-xx。
- [ ] 复用审查已完成。
- [ ] 权限、审计和 DAT/PLT MUST 规则有验证证据。
- [ ] 后端测试、前端 lint/build/unit/E2E、ai-scaffold gate 通过或记录等价 CI 证据。
- [ ] code review 报告和 QA 报告已归档。

## 7. 风险与问题
- Label Studio 生产参数未知：所有外部参数保留 `TODO_CONFIRM_*`，adapter 返回 `UNCONFIGURED`，不假装成功。
- AI 预标注模型来源未知：本期只保存配置与状态，可转人工标注。
- 标注工作台完整画布复杂：F012 调整为只实现图片打标/图片分割控制面、样本队列、提交/审核、标注文件和外部工具 seam，复杂视频/音频/多模态标注工具后续另行规划。

## 8. 需求调整记录

- 2026-05-20：用户确认“标注主要是图片打标或者图片分割；使用数据集做标注任务后应该产生对应的标注文件保存”。本 TASK 先记录文档调整，代码实现待用户确认后再改。
- 标注数据集生成耦合 F009：必须复用现有 dataset/file/lineage 表，避免平行模型。
- DAT-004/DAT-010 若只在前端校验会有合规风险：必须后端强制校验并有测试覆盖。
