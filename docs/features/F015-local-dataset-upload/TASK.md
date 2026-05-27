# Task: 本地图片/视频上传创建数据集

## Metadata
- Feature: F015-local-dataset-upload
- ID: TASK-local-dataset-upload
- Status: draft
- Owner: codex
- Created: 2026-05-22
- Updated: 2026-05-22
- 前置：同目录 `plan.md` 必须已人审批准后才可进入实现。

## 1. 需求摘要
### User Story
作为数据标注工程师或数据管理员，我想要在没有可用数据源时直接上传图片或 mp4/mov/avi 视频创建数据集，以便快速开始平台内的数据管理，并让视频原始数据进入后续抽帧预处理与标注准备链路。

### Business Value
- 消除“创建数据集时数据源下拉为空白”的阻断体验。
- 对齐业务文档中“支持本地数据集直接导入”的正式要求。
- 保持平台对数据集、版本、权限、审计和血缘的统一治理。

### Source References
- Business docs:
  - `docs/business/bizdocs/01-业务场景清单.md`
  - `docs/business/bizdocs/02-01-业务流程-数据管理.md`
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md`
  - `docs/business/rules/01-数据管理规则.md`
  - `docs/business/问题记录.md`
- Prototype:
  - `docs/prototype/SMP工业AI平台-原型v2.html`
  - page key: `up`, `ds`, `dsdetail`, `ann`

## 2. 范围
### In Scope
- [ ] 数据集创建方式支持 `数据源导入 / 本地上传文件` 双入口
- [ ] 无可用数据源时显示空态与本地上传 CTA
- [ ] 新增 upload session API 与状态管理
- [ ] 支持多图/zip 与 mp4/mov/avi 视频上传并生成 `platform_file_object`
- [ ] commit 后创建 dataset/version/file/lineage 绑定
- [ ] 上传过程进度反馈与失败诊断
- [ ] 内容安全前置与高风险拦截
- [ ] 图片上传生成的数据集兼容后续标注任务入口；视频上传生成 `AUDIO_VIDEO` 原始数据集并提示需先抽帧为 `IMAGE` 再标注

### Out of Scope
- 直接在 Label Studio 绕过平台建任务
- 文本/结构化/3D/CAD 等其他数据类型上传；除 mp4/mov/avi 外的视频容器/编码深度解析
- 超大文件断点续传与客户端切片
- 已标注数据集导入解析与转换
- 模型训练或对象存储生产化优化

## 3. 技术分析
### Backend
- Module/API:
  - `POST /api/v1/dataset-upload-sessions`（`dataType=IMAGE|AUDIO_VIDEO`，入参 `VIDEO` 归一为 `AUDIO_VIDEO`）
  - `POST /api/v1/dataset-upload-sessions/{sessionId}/files`
  - `GET /api/v1/dataset-upload-sessions/{sessionId}`
  - `POST /api/v1/dataset-upload-sessions/{sessionId}/commit`
- Domain objects:
  - `DatasetUploadSession`（新增）
  - `Dataset` / `DatasetVersion` / `DatasetFile` / `DataLineage`（复用）
  - `PlatformFileObject`（复用）
- Business rules:
  - DAT-002 / DAT-005 / DAT-009 / DAT-012

### Frontend
- Prototype page key:
  - `up`, `ds`, `dsdetail`
- Pages/components:
  - `DatasetUploadPage`
  - `DatasetManagementPage`（入口语义保持）
  - `DatasetDetailPage`（后续标注兼容）
- States/interactions:
  - `creationMode` 切换
  - upload session 轮询
  - progress overlay
  - empty state / diagnostics

### AI Adapter / Integration
- Adapter endpoint:
  - 本 feature 不新增 AI adapter 作为主上传入口
- External system placeholders:
  - `TODO_CONFIRM_SECURITY_SCAN_SYNC_OR_ASYNC`
  - `TODO_CONFIRM_LOCAL_UPLOAD_OBJECT_KEY_STRATEGY`

### Database
- Tables:
  - `dataset_upload_session`
  - `dataset_upload_session_file`（可选）
  - 复用 `dataset`、`dataset_version`、`dataset_file`、`platform_file_object`
- Migrations:
  - 新增 F015 对应 Flyway migration（编号待实现阶段确定）

## Reuse Plan
- Existing reference seams to reuse:
  - `docs/business/`, `docs/prototype/`
- Existing service/scaffold seams to reuse:
  - `backend` F009/F007/F006 既有 seam
  - `frontend/src/features/data/DataPages.tsx`
  - `frontend/src/features/platform/platformApi.ts`
  - `tools/ai-scaffold/`
- New seams allowed only if existing seams cannot be reused, because:
  - 当前 F009 仅支持“绑定已有 FileObject”的用户不可见 seam，不能承载真实本地上传体验。


### Video Upload Extension (2026-05-26)
- `LOCAL_UPLOAD` 创建新数据集时支持 `dataType=AUDIO_VIDEO`（前端展示为“视频”）。
- 支持文件：`.mp4`、`.mov`、`.avi`；后端仍是最终 allowlist 与大小阈值裁决者。
- 视频文件进入 `RAW/AUDIO_VIDEO` 数据集版本、`platform_file_object`、`dataset_file` 和 `LOCAL_UPLOAD` lineage。
- 视频原始数据集不直接进入图片标注任务；需经 F017 视频抽帧 Pipeline 输出 `IMAGE` 数据集后再标注。

## 5. Acceptance Criteria
- [ ] AC-01: 当当前租户无可用数据源时，数据集创建页显示空态与“直接上传文件”入口，而不是空白来源数据源下拉。
- [ ] AC-02: 用户可通过本地上传模式上传多张图片、zip 或 mp4/mov/avi 视频，并成功创建 upload session。
- [ ] AC-03: 上传文件可生成 `platform_file_object`，并在 commit 后绑定到数据集版本。
- [ ] AC-04: 未通过内容安全检测的文件不得进入最终可用版本，且页面展示明确诊断。
- [ ] AC-05: 上传成功后的图片数据集可在详情页查看文件与版本并继续发起标注任务；视频数据集可在详情页查看视频文件与版本，但直接标注入口被阻断并提示先抽帧。
- [ ] AC-06: 上传、失败、跨 BU 拒绝、内容安全拦截等关键动作均记录审计日志。

## 6. Definition of Done
- [ ] plan.md 已批准。
- [ ] contract.md 已冻结或实现态。
- [ ] test-plan.md 引用全部 AC-xx。
- [ ] 复用审查已完成。
- [ ] 权限、审计和 MUST 规则有验证证据。
- [ ] 质量门禁通过或记录等价 CI 证据。

## 7. 风险与问题
- zip 解包与安全检测实现边界复杂。
- session commit 是否同步完成版本创建待 contract 冻结。
- 上传大小阈值已固化为单文件 100MB、zip 500MB；上传数量阈值仍由现有批处理策略控制。
- 内容安全不可用时的用户提示与状态表达需要统一。
