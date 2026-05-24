> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-dataset-annotation-task-export.md`
> Interview transcript: `.omx/interviews/dataset-annotation-task-export-20260521T005436Z.md`

# Deep Interview Spec: dataset-annotation-task-export

## Metadata

- Feature slug: dataset-annotation-task-export
- Feature directory: docs/features/F014-dataset-annotation-task-export/
- Profile: standard
- Rounds: 6
- Final ambiguity: 0.18
- Threshold: 0.20
- Context type: brownfield
- Context snapshot: $contextPath
- Interview transcript: $interviewPath

## Clarity Breakdown

| Dimension | Score | Gap / rationale |
| --- | ---: | --- |
| Intent | 0.93 | 用户明确要从数据集创建标注任务，并在标注完成后下载训练格式文件。 |
| Outcome | 0.90 | 端到端结果为数据集入口、一对多标注任务、完成后多格式导出下载。 |
| Scope | 0.86 | 范围收敛到复用 F009/F012/F013；不重做标注工具。 |
| Constraints | 0.82 | 业务规则、技术基线、复用边界明确；格式清单仍需 TODO_CONFIRM。 |
| Success criteria | 0.86 | 可定义创建、列表、导出、下载、权限、失败路径验收。 |
| Context | 0.88 | 已发现现有 Annotation/Dataset/File/Label Studio 基座。 |

## Intent

让数据集成为标注任务创建的自然入口，并让标注成果以训练任务可直接消费的格式交付，补齐“数据集 → 多个标注任务 → 审核/质检 → 标注文件 → 多训练格式导出下载”的闭环。

## Desired Outcome

- 数据管理员可从数据集列表/详情选择一个 ACTIVE 图片数据集，创建多个标注任务。
- 每个标注任务固定源数据集版本、标签模板、标注场景、样本范围和标注员/审核员配置。
- 数据集详情可展示该数据集派生出的多个标注任务及状态、进度、输出标注数据集/标注文件。
- 标注完成且质量检查通过后，系统可为任务或输出 ANNOTATED 数据集生成多种训练格式导出产物。
- 用户可下载已生成格式文件；未配置下载 URL 或对象存储时显示明确诊断，不伪造成功。

## In Scope

- 数据集入口创建标注任务：数据集列表/详情增加“创建标注任务”动作，预填 sourceDatasetId/sourceVersionId。
- 一对多标注任务关系：同一数据集版本可创建多个任务；按场景、模板、样本范围、批次区分。
- 数据集详情标注任务 Tab：展示任务列表、状态、进度、质量、输出数据集、导出状态。
- 训练格式导出 registry：COCO、YOLO、Label Studio JSON、SMP JSONL、Mask Manifest 作为规划 P0/P1 候选。
- 导出任务与文件对象：生成格式包后保存为 platform_file_object，并以 TRAINING_EXPORT 或等价角色绑定。
- 下载：复用 platform:file:download / data:dataset:download 和 FileObject download-url seam。
- 权限、BU 隔离、审计、失败诊断。

## Out-of-Scope / Non-goals

- 不重做 F012 标注任务、模板、工作台、审核、质量检查、发布 ANNOTATED 数据集。
- 不替代 F013 Label Studio 联通，不在前端直接调用 Label Studio 或暴露 token。
- 不新增与 F009 平行的数据集、文件、血缘、下载模型。
- 不实现真实对象存储打包引擎的生产优化；大规模导出阈值和异步策略保留配置/TODO。
- 不覆盖文本、音频、视频逐帧、CAD、3D、多模态等新标注类型。
- 不实现模型训练任务创建；只提供训练格式文件和后续训练可引用 seam。

## Decision Boundaries

Codex 可自主决定：

- 新增 API 命名，例如 /api/v1/datasets/{datasetId}/annotation-tasks、/api/v1/annotation/tasks/{taskId}/exports。
- DTO、状态枚举、导出任务表/字段、格式 registry 实现方式。
- 前端数据集详情 Tab、任务列表操作、导出弹窗、下载按钮交互。
- 测试 fixture、E2E mock 和诊断码。

必须保留待确认：

- TODO_CONFIRM_TRAINING_EXPORT_FORMATS（仅限已确认清单外格式；本期已确认 SMP_JSONL / LABEL_STUDIO_JSON / COCO_DETECTION / YOLO_DETECTION / VOC_DETECTION）
- TODO_CONFIRM_EXPORT_PACKAGE_STRUCTURE（已确认包内含图片副本；目录/文件命名实现阶段固化）
- TODO_CONFIRM_EXPORT_ASYNC_THRESHOLD（已确认超过 200 MB 异步导出）
- TODO_CONFIRM_MINIO_BUCKET / 预签名 URL 策略（当前生产按测试环境 Docker MinIO/`smp-datasets`，真实 TLS/KMS/签名策略不硬编码）
- TODO_CONFIRM_EXPORT_RETENTION_DAYS（已确认 3 个月）

## Constraints

- 使用 docs/business/ 与 docs/prototype/ 为事实来源。
- 复用 F009/F012/F013 与平台权限审计能力。
- 标注任务必须引用 ACTIVE 数据集（DAT-009）。
- 发布/导出正式训练格式前必须通过质量检查并生成标注文件（DAT-010、DAT-013）。
- 平台多租户隔离、BU 管理边界和高危审计必须满足 PLT-001、PLT-009、PLT-011。

## Testable Acceptance Criteria

- AC-DI-01: 从 ACTIVE 图片数据集详情发起创建标注任务时，表单预填数据集和当前版本；同一数据集可创建至少两个不同标注任务。
- AC-DI-02: 非 ACTIVE、非图片或无权限数据集不能创建任务，并给出业务诊断。
- AC-DI-03: 数据集详情展示“标注任务/导出”视图，能看到同源任务状态、进度、质量和输出。
- AC-DI-04: COMPLETED 且质量通过的任务可请求 COCO/YOLO/SMP JSONL/Label Studio JSON 等格式导出；未完成任务拒绝正式导出。
- AC-DI-05: 导出产物保存为平台文件对象并可通过下载 URL seam 获取；未配置对象存储/下载 URL 时显示 TODO_CONFIRM_* 诊断。
- AC-DI-06: 导出敏感数据、跨 BU 拒绝、权限不足和导出失败均写审计。

## Assumptions Exposed + Resolutions

- Assumption: “多种训练格式”可以先做有限格式集合。Resolution: 规划 format registry，P0/P1 支持已确认清单：SMP_JSONL、LABEL_STUDIO_JSON、COCO_DETECTION、YOLO_DETECTION、VOC_DETECTION；其他格式待确认。
- Assumption: 导出应在标注完成后发生。Resolution: 正式导出必须要求完成+质量通过+标注文件存在；草稿仅可预览诊断。
- Assumption: 一个数据集多个任务不会互相覆盖。Resolution: 每个任务固定 source version 与 sample scope。

## Pressure-pass Findings

- 重新审视“一对多任务”后发现必须固定源版本，防止数据集更新导致标注任务不可复现。
- 重新审视“多种格式”后收敛为 registry，而不是无限硬编码格式。
- 重新审视“下载”后明确复用平台 FileObject 下载 seam，不新建下载系统。

## Brownfield Evidence vs Inference Notes

Evidence:

- F012 已存在 AnnotationController、AnnotationService、AnnotationDtos 和 /api/v1/annotation API。
- F012 publishDataset 已生成 ANNOTATED 数据集、ANNOTATION_RESULT 文件对象和血缘。
- F009/F003 已存在 platform_file_object 与 ileDownloadUrl 前端调用。
- 业务规则明确 DAT-009、DAT-010、DAT-013、PLT-001、PLT-011。

Inference:

- 训练格式导出应作为标注发布后的派生产物，绑定到任务或标注数据集版本；具体 DB 结构在 ralplan 中确定。
