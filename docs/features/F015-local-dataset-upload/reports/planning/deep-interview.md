> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-local-dataset-upload.md`
> Interview transcript: `.omx/interviews/local-dataset-upload-20260522T000000Z.md`

# Deep Interview Spec: local-dataset-upload

## Metadata

- Feature slug: local-dataset-upload
- Feature directory: docs/features/F015-local-dataset-upload/
- Profile: standard
- Rounds: 6
- Final ambiguity: 0.14
- Threshold: 0.20
- Context type: brownfield
- Context snapshot: .omx/context/local-dataset-upload-20260522T000000Z.md
- Interview transcript: .omx/interviews/local-dataset-upload-20260522T000000Z.md

## Clarity Breakdown

| Dimension | Score | Gap / rationale |
| --- | ---: | --- |
| Intent | 0.95 | 用户明确反馈数据源空白体验缺陷，并提出直接上传图片诉求。 |
| Outcome | 0.92 | 目标清晰：双路径创建数据集，本地上传进入平台治理链路。 |
| Scope | 0.87 | 已收敛到图片/zip、本地上传 session、空态与版本绑定。 |
| Constraints | 0.84 | 内容安全、BU 隔离、FileObject 复用明确；生产上传阈值待确认。 |
| Success criteria | 0.88 | 可定义上传、进度、文件绑定、标注入口、失败路径验收。 |
| Context | 0.91 | 已有 F009/F012/F013/F014 基座，可直接复用。 |

## Intent

补齐“本地图片上传创建数据集”正式入口，修复当前只能选择数据源且无可用源时空白的产品缺口，同时保持平台作为数据、权限、版本、审计和血缘的唯一事实源。

## Desired Outcome

- 新建数据集时支持两条路径：`DATA_SOURCE_IMPORT` 与 `LOCAL_UPLOAD`。
- 当无可用数据源时，页面默认引导本地上传，而不是显示空白下拉。
- 用户可上传多张图片或 zip 包，系统创建 `RAW` 图片数据集与版本，并自动生成/绑定 `platform_file_object`。
- 上传数据在进入可用版本前必须执行内容安全检测。
- 上传成功后的数据集可继续创建标注任务，并保持与 Label Studio/F014 导出链路兼容。

## In Scope

- `DatasetUploadPage` 创建方式切换：数据源导入 / 本地上传图片。
- 无可用数据源空态、提示文案、CTA。
- 上传 session API 与前端进度轮询。
- 本地上传图片/zip，创建平台文件对象并绑定数据集版本。
- `LOCAL_UPLOAD` 血缘表示与 `sourceId=null` 的兼容处理。
- 内容安全前置、失败诊断、审计。
- 数据集详情后续创建标注任务链路兼容验证。

## Out-of-Scope / Non-goals

- 不直接在 Label Studio 上传图片并绕过平台数据集层。
- 不实现文本/结构化/3D/CAD 等其他数据类型上传。
- 不实现超大文件断点续传、客户端切片、专用压缩格式解析。
- 不实现已标注数据集导入解析与格式转换。
- 不实现训练任务、模型发布或对象存储生产优化。

## Decision Boundaries

Codex 可自主决定：

- `creationMode` 枚举命名与前端交互形式。
- upload session API path、状态枚举、轮询机制。
- `LOCAL_UPLOAD` 的血缘实现（如 `sourceType=LOCAL_UPLOAD` / `sourceId=sessionId`）。
- zip 支持范围和前端上传列表展示方式。

必须保留待确认：

- `TODO_CONFIRM_UPLOAD_MAX_FILES`
- `TODO_CONFIRM_UPLOAD_MAX_ZIP_SIZE_MB`
- `TODO_CONFIRM_LOCAL_UPLOAD_OBJECT_KEY_STRATEGY`
- `TODO_CONFIRM_SECURITY_SCAN_SYNC_OR_ASYNC`
- 生产对象存储/KMS/TLS/预签名 URL 细节

## Constraints

- 业务与原型事实源：`docs/business/`、`docs/prototype/`。
- DAT-002：上传数据必须进行内容安全检测。
- DAT-005：已发布版本不可变。
- DAT-009：标注任务只能使用已激活数据集。
- DAT-012：BU 隔离与跨 BU 授权约束必须生效。
- 复用 F007 FileObject seam 与 F009 dataset/version seam，不新增平行文件模型。

## Testable Acceptance Criteria

- AC-DI-01：无可用数据源时，数据集创建页显示空态与“直接上传图片”入口，不再出现空白下拉体验。
- AC-DI-02：用户可上传多张图片或 zip，系统创建 RAW 图片数据集草稿与文件对象绑定。
- AC-DI-03：上传过程可展示阶段进度（校验/上传/安全检测/版本创建）。
- AC-DI-04：未通过内容安全检测的文件不得进入最终可用版本，并给出诊断。
- AC-DI-05：上传成功后的数据集可在详情页查看文件与版本，并继续发起标注任务。
- AC-DI-06：上传、失败、拒绝、跨 BU 拒绝均写审计。

## Assumptions Exposed + Resolutions

- Assumption: 直接上传图片应该像 Label Studio 那样直接开始标注。 Resolution: 平台仍先生成数据集/版本，Label Studio 只作为标注执行工具。
- Assumption: `sourceId` 一定必填。 Resolution: 本地上传模式下允许 `sourceId` 为空，血缘由 `LOCAL_UPLOAD`/session 表示。
- Assumption: 当前“文件登记 seam”可视为最终上传体验。 Resolution: 不足，需要真实用户可见的本地上传流程。

## Pressure-pass Findings

- 若继续维持“仅来源数据源”入口，则与业务文档“支持本地数据集直接导入”矛盾。
- 若直接导入 Label Studio 会破坏平台的数据治理、版本与审计闭环。
- 最小可行方案是上传 session + FileObject 复用，而不是推翻 F009。

## Brownfield Evidence vs Inference Notes

Evidence:
- `docs/business/bizdocs/01-业务场景清单.md` 明确支持本地数据集直接导入。
- `docs/business/原型页面完成度清单.md` 已定义数据集上传向导与上传进度。
- `frontend/src/features/data/DataPages.tsx` 当前 `DatasetUploadPage` 仅提供 sourceId 选择与 file object 绑定 seam。
- `frontend/src/features/platform/platformApi.ts` 中 `createDataset` 的 `sourceId` 为可选。

Inference:
- 需要新增 upload session 以承载 multipart/zip 上传，而不是继续让用户先去创建 FileObject。
