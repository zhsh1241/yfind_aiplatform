> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-dataset-annotation-task-export.md`

# RALPLAN PRD: 数据集发起标注任务与训练格式导出

## 1. RALPLAN-DR Summary

### Principles

1. **Dataset-first, not annotation-system rewrite**: 数据集是入口，F012 仍是标注任务控制面。
2. **Version-pinned reproducibility**: 每个标注任务必须固定 `sourceDatasetId` + `sourceVersionId` + sample scope。
3. **Quality-gated export**: 正式训练格式导出必须继承 DAT-010/DAT-013，不绕过审核、质检和标注文件生成。
4. **FileObject reuse**: 下载必须复用平台文件对象与 download-url seam，不新增平行下载机制。
5. **Format registry over hardcoding sprawl**: 多训练格式以 registry/formatter seam 管理；已确认支持 `SMP_JSONL`、`LABEL_STUDIO_JSON`、`COCO_DETECTION`、`YOLO_DETECTION`、`VOC_DETECTION`，未知生产格式保留 `TODO_CONFIRM_*`。

### Decision Drivers

1. 用户明确要求“通过数据集创建标注任务、一数据集多任务、完成后下载多种训练格式”。
2. 仓库已有 F009 数据集、F012 标注、F013 Label Studio 与平台文件下载能力，必须复用。
3. 标注结果用于训练，对可复现性、格式正确性、权限审计要求高。

### Viable Options

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| A. 在 F012 AnnotationService 上扩展数据集入口与导出 registry | 复用现有任务/审核/发布链路；改动集中；最快闭环 | AnnotationService 可能继续变大，需要拆分 service | **Chosen**，同时要求拆出 `AnnotationExportService`。 |
| B. 新建独立 DatasetAnnotationExport 模块/API | 边界清晰；导出逻辑独立 | 容易复制任务/权限/文件模型；与 F012 状态机重复 | Rejected，违背复用策略。 |
| C. 仅前端从数据集详情跳转到现有标注页并下载 ANNOTATION_RESULT | 改动最小 | 不满足多格式训练文件；缺少导出任务、格式诊断和审计 | Rejected，不满足用户目标。 |

## 2. Product Scope

### Personas

- 数据管理员 / BU 管理员：从数据集详情发起标注任务、跟踪同源任务、管理导出。
- 数据标注管理员：选择标注场景、标签模板、样本范围、人员与审核策略。
- 模型训练工程师：下载 COCO/YOLO/SMP JSONL/Label Studio JSON 等训练格式产物。
- 审核工程师：继续在 F012 审核页完成审核和质量把关。

### User Stories

1. 作为数据管理员，我希望在数据集详情页直接点击“创建标注任务”，系统自动带入当前数据集版本，减少重复选择错误。
2. 作为数据标注管理员，我希望同一个数据集可按不同标签模板/样本范围创建多个标注任务，以支持多业务线或多模型训练目标。
3. 作为模型训练工程师，我希望标注完成后能下载 COCO/YOLO/VOC/JSONL 等训练格式文件，直接交给训练脚本或训练任务使用。
4. 作为平台管理员，我希望所有导出下载受权限、BU 隔离、审计和对象存储配置约束，不能绕过安全规则。

## 3. Functional Requirements

### FR-01 数据集入口创建标注任务

- 数据集列表和详情提供“创建标注任务”动作。
- 仅当数据集 `status=ACTIVE`、`dataType=IMAGE`、用户具备 `data:annotation:write` 与数据集读权限时启用。
- 创建向导预填 `sourceDatasetId`、`sourceVersionId`、数据集名称、数据类型、样本数。
- API 需支持从 dataset 视角创建任务，例如：
  - `GET /api/v1/datasets/{datasetId}/annotation-candidates`
  - `POST /api/v1/datasets/{datasetId}/annotation-tasks`
  - 或复用 `POST /api/v1/annotation/tasks` 并强制传入 pinned version。
- 服务端必须二次校验 DAT-009、数据类型、权限和租户。

### FR-02 一数据集多标注任务

- 同一个 `sourceDatasetId/sourceVersionId` 可创建多个 `annotation_task`。
- 每个任务必须记录：scene、templateId、sampleScopeJson、reviewEnabled、prelabelEnabled、labelStudioEnabled、assignees、deadline。
- 数据集详情新增“标注任务/导出”视图：展示同源任务列表、状态、进度、质量分、输出数据集、导出包状态。
- 不允许以同一 task 覆盖另一 task 的输出；输出数据集和导出包各自独立。

### FR-03 标注完成后的训练格式导出

- 新增 `AnnotationExportService` 或等价 seam，挂在 F012 任务发布之后。
- 导出请求 API 草案：
  - `GET /api/v1/annotation/tasks/{taskId}/exports`
  - `POST /api/v1/annotation/tasks/{taskId}/exports` body: `{ format, options }`
  - `GET /api/v1/annotation/exports/{exportId}`
  - `GET /api/v1/annotation/exports/{exportId}/download-url`
- 支持格式 registry：
  - P0: `SMP_JSONL`（平台规范 JSONL，最稳定）
  - P0: `LABEL_STUDIO_JSON`（保留外部工具结果）
  - P1: `COCO_DETECTION`（图片打标/框类）
  - P1: `YOLO_DETECTION`（图片打标/框类）
  - P1: `VOC_DETECTION`（图片打标/框类，Pascal VOC XML）
  - P1: `SEGMENTATION_MASK_MANIFEST`（图片分割 mask 清单，PNG mask 包结构待确认）
- 已确认清单外格式和包结构以 `TODO_CONFIRM_TRAINING_EXPORT_FORMATS`、`TODO_CONFIRM_EXPORT_PACKAGE_STRUCTURE` 保留，不显示为成功。

### FR-04 导出 gating 与状态

- 正式导出必须满足：
  - `annotation_task.status = COMPLETED` 或等价完成态；
  - 质量检查通过；
  - 存在 `annotation_dataset_publication.annotation_artifact_file_id` 或可追踪的 `ANNOTATION_RESULT` 文件；
  - 用户具备 `data:annotation:export` 权限；下载导出文件时还必须具备 `data:dataset:download` 与 `platform:file:download`；
  - 租户/BU 可见。
- 未完成、质量失败、标注文件缺失、格式不适用时返回可测诊断码，不生成正式文件。
- 导出状态建议：`REQUESTED`、`GENERATING`、`AVAILABLE`、`FAILED`、`EXPIRED`、`UNSUPPORTED_FORMAT`。

### FR-05 文件对象、下载和保留

- 每个导出产物保存为 `platform_file_object`，并通过 `annotation_training_export` 或 `dataset_file(file_role='TRAINING_EXPORT')` 绑定。
- 下载复用 `platformApi.fileDownloadUrl` / `/api/v1/platform/files/{fileId}/download-url`，不得绕过鉴权。
- 导出文件命名建议：`{tenantId}/annotation/{taskId}/exports/{format}/{exportId}.zip|jsonl|json`。
- 默认训练环境图片访问策略：导出包自包含图片副本与标注文件，训练任务只依赖导出包；`metadata.json` 保留源 `fileId/objectKey/sha256` 便于追溯，后续再扩展 MinIO 只读挂载或内网 URL 优化。
- 本地与当前生产基线按测试环境 Docker MinIO 配置执行，bucket 为 `smp-datasets`，实现应复用 `storage.bucket` 配置；超过 200 MB 走异步导出；导出文件保留 3 个月；生产 TLS、KMS、真实预签名有效期和密钥策略仍不写入代码。

### FR-06 权限与审计

- 复用：`data:annotation:read/write/submit/review/publish/admin`、`data:dataset:download`、`platform:file:download`。
- 新增：`data:annotation:export`，用于生成训练格式导出，避免模型训练工程师必须具备标注发布权限。
- 审计事件：
  - `ANNOTATION_TASK_CREATED_FROM_DATASET`
  - `ANNOTATION_EXPORT_REQUESTED`
  - `ANNOTATION_EXPORT_GENERATED`
  - `ANNOTATION_EXPORT_FAILED`
  - `ANNOTATION_EXPORT_DOWNLOADED`
  - `ANNOTATION_EXPORT_UNAUTHORIZED`
  - `ANNOTATION_EXPORT_CROSS_TENANT_DENIED`
- 导出敏感/受限数据按 PLT-011 记录 CRITICAL 或至少 WARNING，失败也应记录。

## 4. Data / API Design

### New or extended tables

Preferred minimal additive table:

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

Alternative if implementation wants no new binding table: use `dataset_file` with role `TRAINING_EXPORT` plus export metadata table for options/status. A metadata table is still recommended for idempotency and diagnostics.

### DTO sketch

```json
{
  "exportId": "AEXP-WELD-Q2-COCO",
  "taskId": "ANN-WELD-Q2",
  "format": "COCO_DETECTION",
  "status": "AVAILABLE",
  "diagnosticCode": "ANNOTATION_EXPORT_READY",
  "diagnosticMessage": "COCO zip 已生成",
  "fileId": "FILE-ANN-EXPORT-001",
  "downloadUrl": null,
  "expiresAt": "2026-06-20T00:00:00Z"
}
```

## 5. Frontend UX Requirements

- `DatasetManagementPage`：表格操作增加“创建标注任务”，仅 eligible 时启用；不可用时 tooltip 展示原因。
- `DatasetDetailPage`：新增 Tab “标注任务/训练导出”。
  - 同源标注任务列表。
  - 每个任务展示“进入标注任务”“质量检查”“生成训练格式”“下载”。
  - 导出弹窗列出支持格式、适用场景、状态、诊断。
- `AnnotationTasksPage`：新建任务向导支持从 dataset state 进入时预填源数据集，不允许误改为非 ACTIVE 数据集。
- `AnnotationReviewPage`：发布成功提示除 ANNOTATED 数据集和标注文件外，可提示“可生成训练格式导出”。
- 下载按钮调用 FileObject download URL seam；未配置时显示“文件下载未配置：TODO_CONFIRM_*”。

## 6. Non-functional Requirements

- 可复现：任务和导出记录必须绑定 source dataset version 与 annotation artifact file。
- 安全：导出/下载需鉴权、租户过滤、受限数据集访问控制、审计。
- 可观测：导出失败需有 diagnosticCode/message；审计可查。
- 性能：超过 200 MB 的导出文件必须异步导出；200 MB 及以下可同步生成小型 sandbox 产物，但 API 状态必须兼容异步。
- 可扩展：新增格式通过 registry/formatter 增加，不修改核心状态机。

## 7. Reuse Strategy

### Must Reuse

- F009 `dataset`、`dataset_version`、`dataset_file`、`data_lineage`、DatasetDetail API 和 `data:dataset:download`。
- F012 `annotation_task`、`annotation_work_item`、`annotation_dataset_publication`、`AnnotationController/Service/Dtos`、质量检查和 `ANNOTATION_RESULT` 文件。
- F013 Label Studio import/result seam；`LABEL_STUDIO_JSON` 应复用已导入原始结果。
- F003/F006 平台 `platform_file_object`、`platform:file:download`、`platform_audit_log`、租户上下文和权限服务。
- 前端 `DataPages.tsx`、`platformApi.ts`、TanStack Query、Ant Design、现有 E2E helper。

### Explicitly forbidden duplication

- 不新增平行 Dataset、FileObject、AuditLog、RBAC、AnnotationTask 模型。
- 不在前端生成训练格式文件作为正式产物。
- 不复制原型 JSX 或旧删除实现。
- 不绕过 FileObject 直接暴露对象存储路径。

### New seams justified

- `AnnotationExportService`：F012 只生成单一标注文件和 ANNOTATED 数据集，未表达多训练格式转换、导出状态、格式诊断和下载绑定。
- `AnnotationExportFormatter` registry：多格式扩展需要隔离，避免在 service 中硬编码格式转换。
- `annotation_training_export`：需要记录格式、状态、options、fileId、保留期和审计追踪。

## 8. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| 已确认清单外格式仍未确认 | 返工或格式不符合训练脚本 | 本期支持 `SMP_JSONL`、`LABEL_STUDIO_JSON`、`COCO_DETECTION`、`YOLO_DETECTION`、`VOC_DETECTION`；其他格式保留 `TODO_CONFIRM_TRAINING_EXPORT_FORMATS`，format registry 可扩展。 |
| 大规模导出耗时/超限 | 请求超时、文件过大 | 超过 200 MB 走异步；API 设计兼容异步。 |
| 格式转换错误 | 训练失败或指标异常 | test-spec 覆盖 COCO/YOLO/JSONL schema 与负例。 |
| 权限绕过 | 敏感数据泄露 | 复用租户过滤、dataset download 权限、FileObject download-url 和审计。 |
| AnnotationService 膨胀 | 可维护性下降 | 拆 `AnnotationExportService` 和 formatter。 |
| 对象存储未配置 | 无法真实下载 | 当前生产按测试环境 Docker MinIO/`smp-datasets` 配置；仍通过 download-url seam 返回诊断，不伪造 URL。 |

## 9. Architect Review

- 方案遵守现有边界：数据集和文件由 F009/F003 管，标注由 F012 管，导出作为派生 seam。
- 最大架构张力是“在 AnnotationService 扩展” vs “新模块独立”。综合复用和耦合，建议新 service 但不新领域根：`AnnotationExportService` 使用 Annotation/Dataset/File 窄接口。
- 强制 source version pinning 是必要条件，否则一数据集多任务会在数据集更新时失去可复现性。
- 下载必须通过 FileObject，不应在 export API 直接返回真实对象存储路径。

## 10. Critic Verdict

APPROVE.

Reasons:

- 范围直接对应用户需求，并与 F009/F012/F013 已有能力衔接。
- 非目标明确，避免重做标注系统。
- 验收可测试，包含权限、状态机、格式、下载和审计失败路径。
- 风险有 TODO_CONFIRM 和 registry 缓解，不阻塞规划阶段。
