# Task: 数据集发起标注任务与训练格式导出

## Metadata
- Feature: F014-dataset-annotation-task-export
- ID: TASK-dataset-annotation-task-export
- Status: in-progress
- Owner: codex
- Created: 2026-05-21
- Updated: 2026-05-21
- 前置：同目录 `plan.md` 已人审批准；`check-build-feature-prereqs` 已通过。

## 1. 需求摘要
### User Story
作为数据管理员/模型训练工程师，我想从 ACTIVE 图片数据集发起多个标注任务，并在标注完成后导出 COCO/YOLO/VOC/Mask/JSONL 等训练包，以便训练任务可复现地消费标注结果。

### Business Value
- 减少手工选择数据集版本和转换训练格式的错误。
- 让标注结果通过平台文件对象、权限和审计闭环交付。
- 为后续模型训练任务挂载已标注数据集建立稳定契约。

### Source References
- `docs/business/bizdocs/03-01-系统功能-数据管理.md` FUNC-DATA-020/025/042/047。
- `docs/business/bizdocs/05-03-系统功能-通知与文件管理.md` 标注产物导出 COCO/YOLO/VOC/自定义 JSON。
- `docs/business/domain/01-领域对象-数据域.md` Dataset / DatasetVersion / AnnotationTask。
- `docs/business/rules/01-数据管理规则.md` DAT-009 / DAT-010 / DAT-013。
- `docs/business/rules/05-平台与权限规则.md` PLT-001 / PLT-005 / PLT-011。
- `docs/prototype/SMP工业AI平台-原型v2.html` `ds` / `dsdetail` / `ann` / `annreview`。
- `reports/planning/open-question-confirmation-2026-05-21.md` 最新确认项。

## 2. 范围
### In Scope
- [ ] AC-01 数据集详情可查询标注候选状态，并从 ACTIVE IMAGE 数据集创建标注任务。
- [ ] AC-02 同一数据集版本允许多个标注任务，数据集详情展示同源任务与导出摘要。
- [ ] AC-03 非 ACTIVE、非 IMAGE、跨 BU、权限不足场景拒绝并审计。
- [ ] AC-04 标注任务未完成、质量失败或缺少 `ANNOTATION_RESULT` 时拒绝训练格式导出。
- [ ] AC-05 完成且质量通过后可生成 `SMP_JSONL` 导出并保存为 `platform_file_object`。
- [ ] AC-06 `LABEL_STUDIO_JSON`、`COCO_DETECTION`、`YOLO_DETECTION`、`VOC_DETECTION`、`SEGMENTATION_MASK_MANIFEST` 按场景校验，导出包包含图片副本。
- [ ] AC-07 超过 200 MB 的导出记录为异步状态；导出文件保留 3 个月。
- [ ] AC-08 下载复用 FileObject download-url seam；未配置时显示诊断，不伪造 URL。
- [ ] AC-09 导出请求/生成/失败/下载/未授权/跨租户拒绝有审计。
- [ ] AC-10 前端在数据集详情提供“标注任务/训练导出”视图与创建/导出/下载操作。

### Out of Scope
- 不重做 F012 标注工作台、审核和标注数据集发布。
- 不直连 Label Studio 导出 API；`LABEL_STUDIO_JSON` 复用 F013 已导入结果 seam。
- 不实现真实对象存储上传内容流、KMS/TLS/签名策略；继续通过平台 FileObject seam 表达。
- 不实现模型训练任务创建或调度。

## 3. 技术分析
### Backend
- Module/API: `AnnotationController`、`DataManagementController`、`AnnotationService`、`DataManagementService`。
- Domain objects: `annotation_task`、`annotation_dataset_publication`、新增 `annotation_training_export`、`platform_file_object`。
- Business rules: DAT-009、DAT-010、DAT-013、PLT-001、PLT-005、PLT-011。

### Frontend
- Prototype page key: `ds`、`dsdetail`、`ann`。
- Pages/components: `DatasetDetailPage` 新增标注任务/训练导出 Tab；`AnnotationTasksPage` 支持已有 API 入口。
- States/interactions: 候选诊断、同源任务表、导出格式选择、导出状态、下载诊断。

### AI Adapter / Integration
- Adapter endpoint: 无新增；Label Studio JSON 只复用 F013 导入结果。
- External system placeholders: MinIO 生产基线按 Docker `smp-datasets`；TLS/KMS/签名有效期仍不硬编码。

### Database
- Tables: 新增 `annotation_training_export`。
- Migrations: `V14__dataset_annotation_task_export.sql`。

## Reuse Plan
- 复用 F009：`dataset`、`dataset_version`、`dataset_file`、`data_lineage`、`data:dataset:download`、数据集 BU 隔离与文件绑定。
- 复用 F012：`annotation_task`、`annotation_work_item`、`annotation_dataset_publication`、质量检查、`ANNOTATION_RESULT` 文件。
- 复用 F013：Label Studio result/import seam，不新增前端直连 Label Studio。
- 复用 F003/F006：`platform_file_object`、`platform:file:download`、`platform_audit_log`、权限服务。
- 复用前端：`DataPages.tsx`、`platformApi.ts`、TanStack Query、Ant Design、Playwright helpers。
- 新增 seam 原因：多训练格式导出需要记录 format/options/status/diagnostic/fileId/expiresAt，现有 `dataset_file` 不足以表达导出生命周期。

## 5. Acceptance Criteria
- [ ] AC-01: ACTIVE 图片数据集详情可发起创建标注任务，向导预填数据集和当前版本。
- [ ] AC-02: 同一数据集版本可创建多个不同标注任务，详情页展示全部同源任务且输出互不覆盖。
- [ ] AC-03: 非 ACTIVE、非图片、无权限或跨 BU 数据集不能创建任务，并显示诊断/审计。
- [ ] AC-04: 未完成、质量失败或缺少标注文件的任务不能生成正式训练格式导出。
- [ ] AC-05: 完成且质量通过的任务可生成 `SMP_JSONL` 导出，并保存为平台文件对象。
- [ ] AC-06: COCO/YOLO/VOC/Label Studio/Mask 按场景校验适用性，包内包含图片副本。
- [ ] AC-07: 导出超过 200 MB 时异步处理，导出文件保留 3 个月。
- [ ] AC-08: 导出产物下载复用 FileObject download-url；未配置下载时显示 `TODO_CONFIRM_*`。
- [ ] AC-09: 导出请求、生成、失败、下载、未授权、跨租户拒绝均有审计。
- [ ] AC-10: 前端数据集详情、导出弹窗和下载状态保持原型 IA 与 Ant Design 风格。

## 6. Definition of Done
- [x] plan.md 已批准。
- [ ] contract.md 已冻结或实现态。
- [ ] test-plan.md 引用全部 AC-xx。
- [ ] 复用审查已完成。
- [ ] 权限、审计和 MUST 规则有验证证据。
- [ ] 质量门禁通过或记录等价 CI 证据。

## 7. 风险与问题
- 真实 MinIO 签名/TLS/KMS 未接入：实现继续返回 download-url seam 诊断，不暴露对象存储路径。
- Mask PNG 编码未最终锁定：先以 manifest + metadata 记录诊断。
- 大包复制图片会增大存储压力：超过 200 MB 异步，保留期 3 个月。
