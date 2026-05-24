---
feature: F012-annotation-integration
title: 标注任务、标注审核与 Label Studio 适配
plan_status: approved
approved_at: 2026-05-19
owner: codex
created_at: 2026-05-19
updated_at: 2026-05-20
---

# Plan: 标注任务、标注审核与 Label Studio 适配

## 1. 背景与目标

F009/F010/F011 已完成 DATA 域数据源、数据集、文件、血缘、标准化任务、Pipeline 编辑器和算子市场的核心闭环；但业务文档与原型中的“数据标注”链路仍未作为正式功能落地。F012 目标是在现有 DATA/PLATFORM 底座上补齐标注任务、标签模板、标注工作台、标注审核、AI 预标注 seam、Label Studio adapter seam，以及标注完成后生成标注文件、`ANNOTATED` 数据集和 `ANNOTATION` 血缘。2026-05-20 需求调整后，本阶段标注范围收敛为图片打标和图片分割。

规划证据：

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`

业务来源：

- `docs/business/bizdocs/02-01-业务流程-数据管理.md`：DATA-003 数据标注流程、DATA-006 标注数据集管理流程。
- `docs/business/bizdocs/03-01-系统功能-数据管理.md`：FUNC-DATA-020、021、022、023、024、025、026、028、042、095。
- `docs/business/domain/01-领域对象-数据域.md`：`AnnotationTask`、`LabelTemplate`、`Dataset`。
- `docs/business/rules/01-数据管理规则.md`：DAT-003、DAT-004、DAT-009、DAT-010、DAT-011、DAT-012。
- `docs/business/rules/05-平台与权限规则.md`：PLT-001、PLT-005、PLT-009、PLT-011、PLT-014。

原型来源：

- `docs/prototype/SMP工业AI平台-原型v2.html`：`ann`、`annreview`、`annwork`、`dsdetail`、`lineage`。
- 关键原型语义：`标注任务管理`、`标签模板`、`新建标注任务`、任务 Tab（全部任务/进行中/待开始/已完成）、任务列表（标注类型/进度/标注员/质量评分/截止/状态/操作）、AI 预标注配置、审核入口、血缘中的标注任务和标注数据集节点。

目标结果：

- BU 管理员/数据标注管理员可在 `/ann` 管理标注任务、标签模板和分配。
- 数据标注工程师可在 `/annwork` 处理被分配工作项并提交结果。
- 审核工程师可在 `/annreview` 审核通过/驳回，且不能审核自己提交的结果。
- 平台可在质量检查通过后生成并保存标注文件，再生成 `ANNOTATED` 数据集、版本、结果文件绑定和 `ANNOTATION` 血缘。
- Label Studio 与 AI 预标注仅落 adapter seam；未知生产参数保留 `TODO_CONFIRM_*`，不得假装完成外部生产对接。

## 2. Intent / Desired Outcome

本功能意图不是把原型中的标注页面做成静态展示，而是实现可验收的标注控制面：任务、模板、分配、工作项、审核、外部工具状态、预标注状态、质量检查、数据集发布、权限、BU 隔离和审计均由后端契约驱动，前端保持原型信息架构和文案语义。

完成后，典型业务闭环应为：

1. 管理员进入 `/ann` 查看任务总览、统计、Tab 和任务列表。
2. 管理员创建标注任务：选择 ACTIVE 图片数据集、标注场景（图片打标或图片分割）、PUBLISHED 标签模板、审核策略、AI 预标注配置、Label Studio 配置策略、标注员和截止时间。
3. 标注员进入 `/annwork` 查看图片样本队列、标签模板、预标注摘要和 Label Studio 配置状态，提交图片打标或图片分割结果。
4. 若任务启用审核，审核工程师在 `/annreview` 通过/驳回；若不启用审核，则提交结果直接进入完成检查。
5. 任务达到完成条件后运行质量检查；通过后生成并保存标注文件，随后发布 `ANNOTATED` 数据集并写入血缘。
6. `/dsdetail` 与 `/lineage` 能看到标注数据集、标注任务节点和标注事件。

## 3. 范围

### In Scope

- **标注任务管理 `/ann`**
  - 标题、统计卡、任务 Tab、任务列表、状态筛选与操作入口。
  - 新建标注任务向导：选择图片数据集、标注配置、分配团队。
  - 标注场景仅支持图片打标（`IMAGE_TAGGING`）和图片分割（`IMAGE_SEGMENTATION`）。
  - 任务状态机：`DRAFT`、`ASSIGNED`、`IN_PROGRESS`、`PENDING_REVIEW`、`REJECTED`、`APPROVED`、`COMPLETED`、`PAUSED`、`CANCELLED`。

- **标签模板管理**
  - 模板 CRUD、标签层级、发布/归档。
  - `PUBLISHED` 模板才可用于标注任务。
  - 支持按场景生成 Label Studio label config seam。

- **标注工作台 `/annwork`**
  - 任务详情、图片样本队列、标签模板、预标注摘要、Label Studio 状态、草稿保存、提交图片打标/图片分割结果。
  - AI 预标注 seam：保存模型来源、置信度、状态、预测摘要，不实现真实模型服务。

- **标注审核 `/annreview`**
  - 待审核列表、通过/驳回、驳回原因、审核状态更新。
  - 强制 DAT-004：同一标注记录提交人与审核人不得相同。

- **Label Studio adapter seam**
  - 返回 provider、project/task 映射、label config 状态、launch URL、同步状态和诊断。
  - 未配置生产参数时明确返回 `UNCONFIGURED`/`TODO_CONFIRM_*`。
  - 使用 `secretRef`，不得保存明文 token。

- **标注数据集生成**
  - 完整性、格式、覆盖率质量检查。
  - 生成并保存标注文件；标注文件作为 `ANNOTATION_RESULT` 文件角色绑定到 `ANNOTATED` 数据集版本。
  - 生成 `ANNOTATED` 数据集、版本、结果文件绑定和 `ANNOTATION` 血缘。
  - 在数据集详情和血缘页呈现标注结果关系。

- **权限、BU 隔离与审计**
  - 新增菜单和操作权限。
  - 任务创建、分配、提交、审核、驳回、发布、同步失败、跨 BU 拒绝等写审计。
  - 账号停用时可扫描进行中的标注/审核任务并提示处理。

### Out of Scope / Non-goals

- 不部署生产 Label Studio，不猜测 Label Studio URL/token/workspace/storage。
- 不新增 `label-studio-sdk` 或其他新依赖；本期只做 adapter seam。
- 不实现完整 Label Studio ML Backend 或真实 AI 预标注模型。
- 不实现模型训练、模型市场、推理消费标注数据集。
- 不重写 F009 数据集/文件/血缘、F006 权限审计、F011 Pipeline/算子市场。
- 不复制原型 JSX，不恢复旧已删除 backend/frontend 实现。
- 不覆盖 CAD、音频、视频逐帧、文本或多模态标注工具细节；本期仅覆盖图片打标和图片分割。

## 4. Decision Boundaries

Codex 可自主决定：

- 新增 `AnnotationController`、`AnnotationService`、`AnnotationDtos`、`LabelStudioAnnotationAdapter` 等命名和拆分方式。
- Flyway 表结构、DTO 字段、错误码和状态枚举的具体实现，只要映射业务对象并满足规则。
- 前端组件拆分、TanStack Query key、E2E mock 和页面状态管理方式。
- Label Studio adapter 的未配置/失败诊断结构、同步任务边界和 launch URL 呈现方式。
- seed 数据和测试 fixture，只要不替代核心业务规则校验。

需要后续确认并保持 `TODO_CONFIRM_*`：

- `TODO_CONFIRM_LABEL_STUDIO_BASE_URL`
- `TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET`
- `TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY`
- `TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY`
- `TODO_CONFIRM_PRELABEL_MODEL_SOURCE`
- `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`

## 5. Exception Scenarios

- **非 ACTIVE 数据集**：任务创建拒绝，提示“所选数据集状态不可用，请先激活数据集”。
- **未配置 PUBLISHED 标签模板**：任务启动/分配拒绝，提示“任务尚未配置标签模板，请先完成标签体系定义”。
- **标注员为空或账号停用**：分配拒绝或提示重新分配。
- **审核人等于提交人**：审核拒绝，提示“不允许审核自己提交的标注结果”。
- **质量检查失败**：覆盖率不足、格式不符、存在未标注样本时阻断发布并展示失败项。
- **Label Studio 未配置/同步失败**：返回 `UNCONFIGURED`/`SYNC_FAILED`，前端展示诊断，不显示“同步成功”。
- **AI 预标注来源未配置**：预标注状态为 `UNCONFIGURED`，允许转人工标注但不生成预测。
- **非图片数据集创建标注任务**：影音或其他非图片数据集可纳管为数据集，但本阶段不得创建图片打标/图片分割任务。
- **标注文件生成失败**：质量检查或发布阶段阻断 `ANNOTATED` 数据集生成，并提示标注文件未生成或保存失败。
- **跨 BU 访问**：不可见或 403，并写审计。
- **非法状态流转**：已完成任务再次提交/审核、已取消任务发布等均拒绝。
- **已被训练/模型引用的标注数据集删除**：沿用 DAT-011 引用检查。

## 6. 技术方案要点

### 6.1 后端模块与 API 草案

建议新增独立 Annotation 控制面，避免继续膨胀既有 `DataManagementService`：

- `AnnotationController`
- `AnnotationService`
- `AnnotationDtos`
- `LabelStudioAnnotationAdapter`
- `UnconfiguredLabelStudioAnnotationAdapter` / `HttpLabelStudioAnnotationAdapter`

API 草案：

- `GET /api/v1/annotation/overview`
- `GET /api/v1/annotation/tasks`
- `POST /api/v1/annotation/tasks`
- `GET /api/v1/annotation/tasks/{taskId}`
- `POST /api/v1/annotation/tasks/{taskId}/assign`
- `POST /api/v1/annotation/tasks/{taskId}/start`
- `POST /api/v1/annotation/tasks/{taskId}/pause`
- `POST /api/v1/annotation/tasks/{taskId}/cancel`
- `GET /api/v1/annotation/label-templates`
- `POST /api/v1/annotation/label-templates`
- `PUT /api/v1/annotation/label-templates/{templateId}`
- `POST /api/v1/annotation/label-templates/{templateId}/publish`
- `POST /api/v1/annotation/label-templates/{templateId}/archive`
- `GET /api/v1/annotation/label-templates/{templateId}/label-studio-config`
- `GET /api/v1/annotation/tasks/{taskId}/work-items`
- `POST /api/v1/annotation/work-items/{workItemId}/draft`
- `POST /api/v1/annotation/work-items/{workItemId}/submit`
- `GET /api/v1/annotation/review-items`
- `POST /api/v1/annotation/review-items/{reviewItemId}/approve`
- `POST /api/v1/annotation/review-items/{reviewItemId}/reject`
- `POST /api/v1/annotation/tasks/{taskId}/quality-check`
- `POST /api/v1/annotation/tasks/{taskId}/publish-dataset`
- `GET /api/v1/annotation/tasks/{taskId}/label-studio/status`
- `POST /api/v1/annotation/tasks/{taskId}/label-studio/sync-project`
- `POST /api/v1/annotation/work-items/{workItemId}/label-studio/sync-task`
- `POST /api/v1/annotation/tasks/{taskId}/label-studio/import-results`

### 6.2 数据模型草案

新增 Flyway 迁移建议：`V9__annotation_integration.sql`。

建议表：

- `annotation_label_template`：模板、场景、标签 schema、Label Studio config、状态、租户和创建人。
- `annotation_task`：任务主体、源数据集/版本、模板、场景、状态、审核开关、预标注开关、Label Studio 开关、进度、质量分、截止时间。
- `annotation_assignment`：任务与标注员/审核员分配关系。
- `annotation_work_item`：样本、预测、标注草稿/提交结果、标注员和状态。
- `annotation_review_item`：审核项、审核人、状态、意见和时间。
- `annotation_dataset_publication`：标注数据集发布记录、质量检查、覆盖率、标注文件、输出数据集/版本。
- `annotation_external_binding`：Label Studio/外部标注工具绑定、同步状态和诊断。

### 6.3 前端方案

- 在 `frontend/src/features/data/DataPages.tsx` 或 data feature 拆分文件中补齐：
  - `AnnotationTasksPage`：`/ann`。
  - `AnnotationWorkbenchPage`：`/annwork`。
  - `AnnotationReviewPage`：`/annreview`。
  - `AnnotationTaskWizard`。
  - `LabelTemplateDrawer`。
  - `LabelStudioStatusBanner`。
- 在 `frontend/src/features/platform/platformApi.ts` 增加 annotation DTO 与 API client。
- 保持原型文案与页面 key，不私自改变 IA：`标注任务管理`、`标签模板`、`新建标注任务`、Tab、任务表格、AI 预标注、审核入口。
- 新增 `frontend/e2e/annotation-integration.spec.ts`，覆盖总览、创建、工作台、审核、Label Studio 未配置、发布数据集和血缘。

### 6.4 Label Studio 官方约束映射

已查阅 Label Studio 官方 API/导出资料，规划结论：

- API 操作通常需要 Token/API key 和 project/task ID，F012 只能保存 `secretRef`，不得保存明文 token。
- 项目创建需要 label config，标签模板必须具备 label config seam。
- 任务创建使用与项目 label config 匹配的 `data` payload，work item 需要保存样本数据映射。
- 导出存在 UI/API/console/snapshot 等路径且大规模导出有超时/规模风险，因此导入/导出格式保留 `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`。

参考：

- https://labelstud.io/guide/api.html
- https://api.labelstud.io/api-reference/api-reference/projects/create
- https://api.labelstud.io/api-reference/api-reference/tasks/create
- https://labelstud.io/guide/export.html

## Reuse Strategy

### Must Reuse

- **F006 平台权限、BU 隔离和审计**：`PlatformIdentityService`、`platform_permission`、`platform_role_permission`、`platform_audit_log`、统一 `ApiResponse` 和会话/租户上下文。
- **F009 数据集底座**：`dataset`、`dataset_version`、`dataset_file`、`data_lineage`、`platform_file_object`、数据集访问/授权/引用规则，以及 `ANNOTATION_RESULT` 标注文件角色 seam。
- **F010 标准化输出**：`PREPROCESSED` 数据集可作为标注源数据集，不新增平行预处理模型。
- **F011 Pipeline/Operator seam**：复用输出数据集和血缘写法；未来如将标注作为 Pipeline 算子，应复用 operator catalog seam。
- **前端基础**：React 19、Ant Design 6、TanStack Query、Zustand session、`AppNavigation`、`platformApi.ts`、既有 data feature 布局和 E2E helper/mock。
- **脚手架门禁**：`tools/ai-scaffold` 的 planning、prereq、gate 工具。

### Duplication Rejected

- 不新增与 F009 平行的数据集、文件、血缘、访问授权模型。
- 不新增与 F006 平行的用户、角色、权限、审计模型。
- 不复制 `docs/prototype/SMP工业AI平台-原型v2.html` JSX。
- 不恢复旧已删除 backend/frontend 实现。
- 不新增 Label Studio SDK 或前端标注画布依赖来绕开 adapter seam。
- 不用前端 mock 结果替代后端状态机、规则校验和数据集生成。

### Approved New Seams

- 新增 Annotation 控制平面表/API：现有系统没有任务、模板、分配、工作项、审核项和发布记录模型。
- 新增 Label Studio adapter seam：外部工具参数未知，但必须保留可配置、可检测、可失败的集成边界。
- 新增 AI 预标注 seam：业务要求在线/离线预标注，但模型来源未确认，本期只落平台内状态和预测结果接口边界。

## 8. 权限与审计

权限草案：

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

审计事件草案：

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

审计要求：PLT-005 要求审计不可修改；PLT-011 要求高危操作和跨租户操作写 CRITICAL 级审计并保留告警 seam。

## 9. 风险与依赖

| 风险/依赖 | 影响 | 处理 |
| --- | --- | --- |
| Label Studio 生产参数未知 | 无法真实同步项目/任务 | 保留 `TODO_CONFIRM_*`，adapter 返回可测 `UNCONFIGURED`，不假装成功。 |
| AI 预标注模型来源未知 | 无法真实生成预测 | 保存 seam 与状态，允许人工标注闭环继续。 |
| 标注工作台完整画布复杂 | 若实现过重会偏离控制面目标 | 本期重在图片打标/图片分割任务、样本、结果、标注文件和外部工具 seam；复杂视频/音频/多模态画布后续再评估。 |
| DAT-004/DAT-010 校验不足 | 质量和合规风险 | 后端强制自审阻断、覆盖率/格式/完整性检查，E2E 覆盖失败路径。 |
| 与 F009 数据集生成耦合 | 可能引入平行模型 | 必须复用 `dataset`/`dataset_version`/`dataset_file`/`data_lineage`。 |
| `DataManagementService` 已较大 | 可维护性下降 | 新增 Annotation 独立 service/controller，复用窄接口。 |

## 10. 开放问题

- `TODO_CONFIRM_LABEL_STUDIO_BASE_URL`：生产 Label Studio 地址。
- `TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET`：Token secretRef 命名与密钥管理位置。
- `TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY`：租户/项目到 Label Studio workspace/project 的映射策略。
- `TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY`：对象存储、任务 data payload、导入导出路径策略。
- `TODO_CONFIRM_PRELABEL_MODEL_SOURCE`：预标注模型来源、服务协议、鉴权和权限。
- `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`：正式支持的导出格式清单。

## 11. 验收草案（AC）

- **AC-01**：`/ann` 按原型展示标注任务管理、统计、任务 Tab、任务列表、标签模板和新建标注任务入口。
- **AC-02**：创建标注任务时只能选择 ACTIVE 图片数据集和 PUBLISHED 标签模板；违反 DAT-009/DAT-003 或选择非图片数据集时后端拒绝并前端提示。
- **AC-03**：标签模板可维护、发布并生成 Label Studio label config seam。
- **AC-04**：`/annwork` 可查看分配任务、图片样本队列、预标注摘要、Label Studio 配置状态，并提交图片打标或图片分割结果。
- **AC-05**：`/annreview` 可审核通过/驳回标注结果；审核自己提交的结果被 DAT-004 阻断。
- **AC-06**：Label Studio adapter 在未配置外部参数时返回 `UNCONFIGURED`/`TODO_CONFIRM_*`，配置失败和同步失败可见且审计。
- **AC-07**：任务完成并质量检查通过后必须生成并保存标注文件，再生成 `ANNOTATED` 数据集、版本、结果文件绑定和 `ANNOTATION` 血缘；质量检查或标注文件生成失败时阻断发布。
- **AC-08**：权限不足、跨 BU 访问、非法状态流转、被停用用户任务处理均有可测失败路径与审计证据。
- **AC-09**：标注场景仅支持图片打标与图片分割；影音、文本、音频、视频逐帧或多模态标注不进入本阶段验收范围。

## 12. 验证路径

规划阶段已要求：

```powershell
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F012-annotation-integration --stage deep-interview
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F012-annotation-integration --stage ralplan
node tools/ai-scaffold/dist/cli.js scaffold-status
git status --short --branch
```

后续 `/build-feature` 阶段至少执行：

```powershell
$env:JAVA_HOME='C:\java\jdk-25'; $env:Path="$env:JAVA_HOME\bin;$env:Path"
mvn -q -f backend/pom.xml -pl smp-app test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
npm --prefix frontend run e2e
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F012-annotation-integration --run-e2e
```

测试计划草案详见：`reports/planning/test-spec.md`。

## 13. 审批记录

- Reviewer: 待人工审查
- Decision: draft，尚未批准
- 审批说明：本 `plan.md` 当前仅为规划草案。审查通过后，由人工将 frontmatter 修改为：

```yaml
plan_status: approved
approved_at: YYYY-MM-DD
```

然后再运行：

```powershell
node tools/ai-scaffold/dist/cli.js check-plan-approved docs/features/F012-annotation-integration
```

退出码 0 后，才能对同一功能目录执行 `/build-feature`。在批准前不得编写 F012 业务代码、契约或测试计划。

## 14. 2026-05-20 需求调整待确认

- 用户确认标注主要是图片打标或图片分割。
- 用户确认使用数据集做标注任务后应产生对应标注文件保存。
- 本文档已按“先改文档、确认后再改代码”原则更新；代码和已冻结契约待用户确认后再进入 v2 调整。
