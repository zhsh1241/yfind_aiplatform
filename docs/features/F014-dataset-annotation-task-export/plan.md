---
feature: F014-dataset-annotation-task-export
title: 数据集发起标注任务与训练格式导出
plan_status: approved
approved_at: 2026-05-21
owner: codex
created_at: 2026-05-21
updated_at: 2026-05-21
---

# Plan: 数据集发起标注任务与训练格式导出

## 1. 背景与目标

用户提出：需要通过数据集来创建标注任务，一个数据集可以创建多个标注任务，标注完成后可以下载多种训练的格式文件。

本功能 F014 的目标是在既有 F009 数据集底座、F012 标注任务/审核/标注数据集发布、F013 Label Studio 联通能力之上，补齐“数据集 → 多个标注任务 → 完成/质检 → 多训练格式导出 → 文件下载”的正式闭环。它不是重做标注系统，而是把数据集作为标注任务创建入口，并把标注结果转换为训练可消费的格式产物。

规划证据：

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`
- `reports/planning/open-question-confirmation-2026-05-21.md`

业务来源：

- `docs/business/bizdocs/03-01-系统功能-数据管理.md`：FUNC-DATA-020 标注任务总览、FUNC-DATA-025 标注任务创建、FUNC-DATA-042 标注数据集管理、FUNC-DATA-047 数据集导入/导出。
- `docs/business/domain/01-领域对象-数据域.md`：`AnnotationTask`、`Dataset`、`DatasetVersion`、`LabelTemplate`、`DataLineage`。
- `docs/business/rules/01-数据管理规则.md`：DAT-009 标注任务须使用已激活数据集、DAT-010 标注数据集发布前质量检查、DAT-013 标注任务完成后必须生成并保存标注文件。
- `docs/business/rules/05-平台与权限规则.md`：PLT-001 多租户隔离、PLT-005 审计不可修改、PLT-009 BU 管理员权限边界、PLT-011 高危操作审计。
- `docs/business/api/01-API接口规范.md`：数据集、标注任务、文件下载、权限错误码基础。

原型来源：

- `docs/prototype/SMP工业AI平台-原型v2.html`：`ds` 数据集管理、`dsdetail` 数据集详情、`ann` 标注任务管理、`annwork` 标注工作台、`annreview` 标注审核。
- 关键原型语义：数据集列表/详情、标注任务管理、任务进度、审核、导出/下载、训练监控中挂载数据集。

## 2. Intent / Desired Outcome

### Intent

让数据集成为标注任务创建的自然入口，并让标注完成后的结果以模型训练工程师可直接使用的格式交付，降低选错数据集版本、重复手工转换格式和导出权限绕过的风险。

### Desired Outcome

完成后应支持：

1. 数据管理员从数据集列表或数据集详情选择一个 ACTIVE 图片数据集，创建标注任务。
2. 同一个数据集版本可以创建多个标注任务，不同任务可按标注场景、标签模板、样本范围、批次、标注员和审核策略区分。
3. 数据集详情可以查看该数据集派生出的多个标注任务，包括状态、进度、质量、输出标注数据集和训练格式导出状态。
4. 标注任务完成、审核/质量检查通过，并生成 `ANNOTATION_RESULT` 标注文件后，用户可以请求生成多种训练格式文件。
5. 导出产物保存为平台文件对象，并复用平台下载 URL seam；未配置对象存储或下载 URL 时显示 `TODO_CONFIRM_*` 诊断，不伪造成功。
6. 权限不足、跨 BU、非 ACTIVE 数据集、非图片数据集、未完成任务、质量失败、格式不兼容等均有明确失败路径和审计记录。

## 3. 范围

### 3.1 In Scope

- **数据集入口创建标注任务**
  - 数据集列表和数据集详情增加“创建标注任务”动作。
  - 创建向导预填 `sourceDatasetId`、`sourceVersionId`、数据集名称、数据类型、样本数。
  - 服务端强制校验 DAT-009、数据类型、租户可见性和权限。

- **一数据集多标注任务**
  - 同一 `sourceDatasetId/sourceVersionId` 可创建多个 `annotation_task`。
  - 每个任务固定源数据集版本与样本范围，保障训练可复现。
  - 数据集详情新增“标注任务/训练导出”视图，展示同源任务、状态、进度、质量、输出和导出。

- **训练格式导出**
  - 新增 `AnnotationExportService` 或等价服务 seam。
  - 新增格式 registry / formatter seam。
  - 支持确认格式：`SMP_JSONL`、`LABEL_STUDIO_JSON`、`COCO_DETECTION`、`YOLO_DETECTION`、`VOC_DETECTION`；图片分割保留 `SEGMENTATION_MASK_MANIFEST` P1 seam。
  - 超出已确认清单的生产格式仍保留 `TODO_CONFIRM_TRAINING_EXPORT_FORMATS`；COCO/YOLO/VOC/Mask 导出包已确认包含图片副本，超过 200 MB 异步导出，导出文件保留 3 个月。

- **导出产物与下载**
  - 导出产物保存为 `platform_file_object`。
  - 建议新增 `annotation_training_export` 保存格式、状态、options、fileId、诊断、保留期。
  - 下载复用 `/api/v1/platform/files/{fileId}/download-url`，不直接暴露对象存储路径。

- **权限、租户隔离与审计**
  - 复用 F006/F009/F012 权限与审计。
  - 导出敏感/受限数据、跨租户拒绝、导出失败、下载动作均写审计。

- **前端体验**
  - `DatasetManagementPage`、`DatasetDetailPage`、`AnnotationTasksPage` 增强。
  - 增加导出弹窗、格式状态、诊断和下载按钮。

### 3.2 Out of Scope / Non-goals

- 不重做 F012 标注任务、标签模板、标注工作台、审核、质量检查和 `ANNOTATED` 数据集发布。
- 不替代 F013 Label Studio 生产化联通，不在前端直接调用 Label Studio API，不暴露 token。
- 不新增与 F009 平行的数据集、数据集版本、文件对象、血缘、权限或下载模型。
- 不实现模型训练任务创建、训练调度、训练监控或模型发布。
- 不覆盖文本、音频、视频逐帧、CAD、3D、多模态等新标注类型；本期仍以图片打标/图片分割为主。
- 不实现大规模导出引擎的生产优化；异步阈值、保留期、对象存储策略保留为配置和开放问题。
- 不复制 `docs/prototype/SMP工业AI平台-原型v2.html` JSX，也不恢复旧删除实现。

## 4. Decision Boundaries

Codex 可自主决定：

- API 命名与路径细节，例如：
  - `POST /api/v1/datasets/{datasetId}/annotation-tasks`
  - `GET /api/v1/datasets/{datasetId}/annotation-tasks`
  - `GET /api/v1/annotation/tasks/{taskId}/exports`
  - `POST /api/v1/annotation/tasks/{taskId}/exports`
  - `GET /api/v1/annotation/exports/{exportId}`
- DTO、状态枚举、诊断码、导出记录表结构和索引。
- `AnnotationExportService`、`AnnotationExportFormatter`、format registry 的具体拆分。
- 前端组件拆分、TanStack Query key、E2E mock 和弹窗交互。
- P0/P1 格式优先级，只要未知生产格式不假装成功。

已确认并进入 F014 约束：

- 训练格式清单本期确认支持 `SMP_JSONL`、`LABEL_STUDIO_JSON`、`COCO_DETECTION`、`YOLO_DETECTION`、`VOC_DETECTION`；图片分割保留 `SEGMENTATION_MASK_MANIFEST` P1 seam。超出该清单的格式仍使用 `TODO_CONFIRM_TRAINING_EXPORT_FORMATS`。
- `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS` 中业务要求的 COCO/YOLO/VOC/自定义 JSON，在 F014 内映射为 COCO/YOLO/VOC 与平台规范 `SMP_JSONL`。
- 导出产物必须保存为 `platform_file_object` 并复用 `/api/v1/platform/files/{fileId}/download-url`，不得绕过平台权限审计返回真实对象存储路径。
- 本地实验室 bucket 为 `smp-datasets`，实现不得硬编码，应复用 `storage.bucket` 配置；生产 endpoint/bucket/KMS/签名策略仍按部署配置确认。
- 新增独立权限 `data:annotation:export`，用于生成训练格式导出；下载仍要求 `data:dataset:download` 与 `platform:file:download`。

必须继续保留为待确认：

已进一步确认：

- `TODO_CONFIRM_EXPORT_PACKAGE_STRUCTURE`：COCO/YOLO/VOC/Mask 导出包必须包含图片副本；推荐目录为 `images/`、`annotations/`、`labels/`、`masks/`、`metadata.json`，具体文件名在实现阶段固定。
- `TODO_CONFIRM_EXPORT_ASYNC_THRESHOLD`：超过 200 MB 的导出文件走异步导出；200 MB 及以下可同步生成但 API 状态保持异步兼容。
- `TODO_CONFIRM_EXPORT_RETENTION_DAYS`：导出文件保留 3 个月；若配置系统仅支持天数，使用 90 天近似。
- `TODO_CONFIRM_MINIO_BUCKET`：当前生产环境按测试环境 Docker MinIO 配置执行，bucket 为 `smp-datasets`，实现仍复用 `storage.bucket` 配置。
- `TODO_CONFIRM_DATASET_IMAGE_PUBLIC_ACCESS_POLICY`：推荐并默认采用“自包含导出包（含图片副本）”；训练任务读取导出包，不直接依赖平台在线鉴权或实时预签名 URL。

仍需保留为待确认或实现级固化：

- 超出已确认清单的训练格式。
- 生产 TLS、域名、KMS、真实签名有效期和密钥策略，不写入代码。
- COCO/YOLO/VOC/Mask 的最终目录/文件命名细节。
- 分割 PNG mask 的 palette/类别编码与像素值规范。

## 5. Exception Scenarios

- **非 ACTIVE 数据集**：创建标注任务拒绝，返回 `DATASET_NOT_ACTIVE` 或等价诊断。
- **非图片数据集**：当前阶段不允许创建图片打标/图片分割任务，返回 `ANNOTATION_DATASET_TYPE_UNSUPPORTED`。
- **无权限或跨 BU**：查询不可见或 403/404，写跨租户/未授权审计。
- **同一数据集多任务冲突**：允许多任务，但每个任务必须固定 source version 和 sample scope；不得覆盖他人任务输出。
- **任务未完成**：拒绝正式训练格式导出，返回 `ANNOTATION_EXPORT_NOT_READY`。
- **质量检查失败**：拒绝导出，返回 `ANNOTATION_QUALITY_CHECK_FAILED` 或导出不满足诊断。
- **标注文件缺失**：拒绝导出，返回 `ANNOTATION_ARTIFACT_MISSING`。
- **格式不适用**：例如分割任务请求检测 YOLO 格式，返回 `ANNOTATION_EXPORT_FORMAT_INCOMPATIBLE`。
- **对象存储/下载 URL 未配置**：导出或下载显示 `TODO_CONFIRM_*`，不得返回伪 URL；当前生产基线按测试环境 Docker MinIO/`smp-datasets` 配置执行。
- **导出转换失败**：记录 FAILED 状态、诊断码和审计；允许用户修复后重试。
- **导出过期**：下载被拒绝，提示重新生成。

## 6. 技术方案要点

### 6.1 后端 API 草案

复用 `/api/v1/annotation` 与 `/api/v1/datasets`，避免新增平行业务域：

- `GET /api/v1/datasets/{datasetId}/annotation-candidates`
  - 返回数据集是否可创建标注任务、当前版本、可用模板、不可用原因。
- `GET /api/v1/datasets/{datasetId}/annotation-tasks`
  - 返回同源标注任务和导出摘要。
- `POST /api/v1/datasets/{datasetId}/annotation-tasks`
  - 从数据集入口创建任务，内部复用 F012 创建逻辑。
- `GET /api/v1/annotation/tasks/{taskId}/exports`
  - 查询任务导出记录。
- `POST /api/v1/annotation/tasks/{taskId}/exports`
  - 请求生成训练格式导出。
- `GET /api/v1/annotation/exports/{exportId}`
  - 查询导出详情。
- `GET /api/v1/annotation/exports/{exportId}/download-url`
  - 可选择代理到平台文件下载 URL；更推荐前端拿到 `fileId` 后复用 `platform:file:download`。

### 6.2 后端组件

建议新增：

- `AnnotationExportService`
  - 负责导出 gating、导出记录状态、调用 formatter、创建 FileObject、审计。
- `AnnotationExportFormatRegistry`
  - 根据 `scene`、`format`、`options` 判断是否支持。
- `AnnotationExportFormatter`
  - `SmpJsonlFormatter`
  - `LabelStudioJsonFormatter`
  - `CocoDetectionFormatter`
  - `YoloDetectionFormatter`
  - `SegmentationMaskManifestFormatter`
- `DatasetAnnotationFacade` 或在现有 Dataset/Annotation service 中增加窄方法
  - 负责从 dataset 入口创建任务和查询同源任务。

### 6.3 数据模型草案

新增 Flyway 迁移建议：`V14__dataset_annotation_task_export.sql`。

建议新增表：

```sql
CREATE TABLE annotation_training_export (
  export_id VARCHAR(96) PRIMARY KEY,
  task_id VARCHAR(96) NOT NULL REFERENCES annotation_task(task_id),
  output_dataset_id VARCHAR(96) REFERENCES dataset(dataset_id),
  output_version_id VARCHAR(96) REFERENCES dataset_version(version_id),
  source_annotation_file_id VARCHAR(96) REFERENCES platform_file_object(file_id),
  export_file_id VARCHAR(96) REFERENCES platform_file_object(file_id),
  format VARCHAR(64) NOT NULL,
  format_version VARCHAR(32) NOT NULL DEFAULT '1.0',
  options_json VARCHAR(4000),
  status VARCHAR(32) NOT NULL,
  diagnostic_code VARCHAR(96) NOT NULL,
  diagnostic_message VARCHAR(1000) NOT NULL,
  requested_by VARCHAR(64) NOT NULL REFERENCES platform_user(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  tenant_id VARCHAR(64) NOT NULL REFERENCES platform_tenant(id),
  project_id VARCHAR(64) REFERENCES platform_tenant(id)
);
```

索引建议：

- `(task_id, format, status)`
- `(tenant_id, project_id, status)`
- `(export_file_id)`

也可在 `dataset_file` 绑定 `file_role='TRAINING_EXPORT'`，但仍建议保留 export metadata table 记录 format/options/status/diagnostics。

### 6.4 导出格式策略

| Format | Scope | Status |
| --- | --- | --- |
| `SMP_JSONL` | 平台标准训练样本，每行包含 sample、labels、metadata，可包含图片相对路径 | P0，优先实现，包内包含图片副本 |
| `LABEL_STUDIO_JSON` | 保留 Label Studio 原始 annotation/export JSON | P0/P1，复用 F013，包内包含图片副本 |
| `COCO_DETECTION` | 图片打标/检测框训练 | P1，需类别与 bbox schema 校验，包内包含图片副本 |
| `YOLO_DETECTION` | 图片打标/检测框训练 | P1，需图片尺寸与归一化转换，包内包含图片副本 |
| `VOC_DETECTION` | 图片打标/检测框训练，Pascal VOC XML | P1，业务文档已确认格式清单，包内包含图片副本 |
| `SEGMENTATION_MASK_MANIFEST` | 图片分割训练，mask 清单/包 | P1，包内包含图片副本；PNG mask 编码待实现阶段固化 |

实现阶段不得把未支持格式显示为成功；已确认清单外应返回 `UNSUPPORTED_FORMAT` 或 `TODO_CONFIRM_TRAINING_EXPORT_FORMATS`。

### 6.5 前端方案

- `frontend/src/features/data/DataPages.tsx`
  - `DatasetManagementPage`：数据集操作列增加“创建标注任务”。
  - `DatasetDetailPage`：新增 `标注任务/训练导出` Tab。
  - `AnnotationTasksPage`：支持从 `location.state.datasetId/versionId` 进入时预填创建向导。
  - 新增或拆分 `AnnotationExportDrawer`、`AnnotationExportStatusTag`、`DatasetAnnotationTaskTable`。
- `frontend/src/features/platform/platformApi.ts`
  - 增加 dataset annotation candidates/tasks API。
  - 增加 annotation export DTO 与 API client。
- E2E：新增 `frontend/e2e/dataset-annotation-task-export.spec.ts`。

### 6.6 权限与审计

权限复用：

- `data:annotation:read`
- `data:annotation:write`
- `data:annotation:publish`
- `data:annotation:admin`
- `data:annotation:export`
- `data:dataset:read`
- `data:dataset:download`
- `platform:file:download`

已确认新增：

- `data:annotation:export`：把“发布标注数据集”和“生成训练格式导出”拆开授权；建议授予 BU 管理员和模型训练工程师。

审计事件草案：

- `ANNOTATION_TASK_CREATED_FROM_DATASET`
- `ANNOTATION_EXPORT_REQUESTED`
- `ANNOTATION_EXPORT_GENERATED`
- `ANNOTATION_EXPORT_FAILED`
- `ANNOTATION_EXPORT_DOWNLOADED`
- `ANNOTATION_EXPORT_UNAUTHORIZED`
- `ANNOTATION_EXPORT_CROSS_TENANT_DENIED`
- `ANNOTATION_EXPORT_EXPIRED`

## 复用策略

### 7.1 必须复用

- **F009 数据集底座**：`dataset`、`dataset_version`、`dataset_file`、`data_lineage`、Dataset detail/list API、`data:dataset:download`。
- **F012 标注底座**：`annotation_task`、`annotation_work_item`、`annotation_review_item`、`annotation_dataset_publication`、`AnnotationController`、`AnnotationService`、`AnnotationDtos`、质量检查、`ANNOTATION_RESULT` 文件。
- **F013 Label Studio seam**：`LABEL_STUDIO_JSON` 导出应复用已导入/同步的外部结果，不新增 Label Studio 直连路径。
- **平台文件与下载**：`platform_file_object`、`platform:file:download`、`FileDownloadResponse`、`platformApi.fileDownloadUrl`。
- **平台权限审计**：`PlatformIdentityService`、`platform_permission`、`platform_role_permission`、`platform_audit_log`、租户上下文。
- **前端基座**：React 19、Ant Design 6、TanStack Query、`DataPages.tsx` 既有页面、`platformApi.ts` API client、现有 Playwright helpers。
- **脚手架门禁**：`tools/ai-scaffold` planning/prereq/gate。

### 7.2 明确禁止复制/平行实现

- 不新增第二套 `Dataset`、`DatasetVersion`、`DatasetFile`、`FileObject`、`AuditLog`、`RBAC` 模型。
- 不新增第二套标注任务/审核/发布状态机。
- 不在前端正式生成训练格式文件；前端只请求后端导出和下载。
- 不绕过 `platform_file_object` 直接返回对象存储路径或真实 bucket key。
- 不复制原型 JSX，不恢复旧 deleted backend/frontend 实现。
- 不新增 Label Studio SDK 或训练框架依赖来实现格式转换；优先用内部 formatter 和轻量 JSON/文本生成。

### 7.3 允许新增抽象的原因

- `AnnotationExportService`：现有 F012 只生成平台标注结果文件和 `ANNOTATED` 数据集，不负责多训练格式、导出状态和下载绑定。
- `AnnotationExportFormatter` registry：多格式转换需要隔离扩展，避免把 COCO/YOLO/JSONL/Mask 逻辑硬编码到 `AnnotationService`。
- `annotation_training_export`：需要记录格式、options、status、diagnostics、fileId、expiresAt 和 requestedBy，现有 `dataset_file` 不足以表达导出生命周期。

## 8. 风险与依赖

| 风险/依赖 | 影响 | 处理 |
| --- | --- | --- |
| 已确认清单外格式仍未确认 | 格式可能不符合训练脚本 | 本期支持 `SMP_JSONL`、`LABEL_STUDIO_JSON`、`COCO_DETECTION`、`YOLO_DETECTION`、`VOC_DETECTION`；其他格式保留 `TODO_CONFIRM_TRAINING_EXPORT_FORMATS`，使用 registry 扩展。 |
| COCO/YOLO/VOC/Mask 目录命名细节需固化 | 训练脚本找不到路径或图片 | 已确认包内包含图片副本；实现阶段按 `images/`、`annotations/`、`labels/`、`masks/`、`metadata.json` 固化 fixture。 |
| 大规模导出耗时 | API 超时或内存压力 | 超过 200 MB 走异步；API 状态兼容异步。 |
| 对象存储/下载 URL 未配置 | 无法真实下载 | 复用现有 download-url seam，显示 TODO 诊断，不伪造成功。 |
| 权限绕过导致数据泄露 | 安全事故 | 强制租户过滤、dataset download 权限、FileObject 下载权限和审计。 |
| `AnnotationService` 继续膨胀 | 可维护性下降 | 新增 `AnnotationExportService`，只通过窄接口调用现有服务。 |
| 格式转换错误 | 训练失败 | 单元测试覆盖 schema、bbox 转换、空/坏 annotation、格式不兼容。 |

## 9. 开放问题

- `TODO_CONFIRM_TRAINING_EXPORT_FORMATS`：已确认清单外是否还必须支持其他格式（如分类目录、CSV、自定义 JSON schema 等）？
- COCO/YOLO/VOC/Mask 具体目录/文件命名 fixture：已确认包含图片副本，推荐 `images/`、`annotations/`、`labels/`、`masks/`、`metadata.json`。
- 生产 MinIO TLS、域名、KMS、真实签名有效期和密钥策略：当前按测试环境 Docker MinIO/`smp-datasets` 执行，但敏感部署参数不得写入代码。
- 分割 PNG mask 的 palette/类别编码与像素值规范。

## 10. AC 草案与后续 TASK 对应

| AC | 验收项 | 测试来源 |
| --- | --- | --- |
| AC-01 | ACTIVE 图片数据集详情可发起创建标注任务，创建向导预填数据集和当前版本。 | `reports/planning/test-spec.md` T-P0-01 |
| AC-02 | 同一数据集版本可创建多个不同标注任务，详情页展示全部同源任务且输出互不覆盖。 | T-P0-02 |
| AC-03 | 非 ACTIVE、非图片、无权限或跨 BU 数据集不能创建任务，并显示诊断/审计。 | T-P0-03 / T-P0-08 |
| AC-04 | 未完成、质量失败或缺少标注文件的任务不能生成正式训练格式导出。 | T-P0-04 |
| AC-05 | 完成且质量通过的任务可生成 `SMP_JSONL` 导出，并保存为平台文件对象。 | T-P0-05 |
| AC-06 | `COCO_DETECTION`、`YOLO_DETECTION`、`VOC_DETECTION`、`LABEL_STUDIO_JSON`、`SEGMENTATION_MASK_MANIFEST` 按场景校验适用性，不兼容时拒绝。 | T-P0-06 / T-P1-01 / T-P1-02 |
| AC-07 | 导出产物下载复用 FileObject download-url；未配置下载时显示 `TODO_CONFIRM_*`。 | T-P0-07 |
| AC-08 | 导出请求、生成、失败、下载、未授权、跨租户拒绝均有审计。 | T-P0-08 / T-P0-09 |
| AC-09 | 前端数据集列表/详情、标注任务入口、导出弹窗和下载状态保持原型 IA 与现有 Ant Design 控制台风格。 | Frontend/E2E |

## 11. 验证路径草案

规划阶段已执行/应执行：

```powershell
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F014-dataset-annotation-task-export --stage deep-interview
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F014-dataset-annotation-task-export --stage ralplan
```

计划批准前可做轻量检查：

```powershell
node tools/ai-scaffold/dist/cli.js check-plan-approved docs/features/F014-dataset-annotation-task-export
```

> 当前 `plan_status: approved` 且规划归档完整，上述批准检查应退出码 0。

后续 `/build-feature` 阶段至少执行：

```powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F014-dataset-annotation-task-export
mvn -q -f backend/pom.xml -pl smp-app test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
npm --prefix frontend run e2e -- dataset-annotation-task-export.spec.ts
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F014-dataset-annotation-task-export --run-e2e
```

## 12. 人审说明

本 `plan.md` 已由人审标记为 `plan_status: approved`（`approved_at: 2026-05-21`）。本轮待确认项复核后，可确认项已沉淀到本文和 `reports/planning/open-question-confirmation-2026-05-21.md`；仍未确认项继续以 `TODO_CONFIRM_*` 留痕，不得在实现中猜测生产参数。

已验证：

```powershell
node tools/ai-scaffold/dist/cli.js check-plan-approved docs/features/F014-dataset-annotation-task-export
```

退出码 0 后，才允许进入 `/build-feature` 的 TASK/contract/test-plan 阶段；业务实现仍需先通过 `check-build-feature-prereqs`。

