# Task: 本地图片上传创建数据集

## Metadata
- Feature: F015-local-dataset-upload
- ID: TASK-local-dataset-upload
- Status: completed
- Owner: codex
- Created: 2026-05-22
- Updated: 2026-05-22
- 前置：同目录 `plan.md` 已人审批准；`reports/planning/deep-interview.md`、`prd.md`、`test-spec.md` 已归档；`check-build-feature-prereqs` 已通过。

## 1. 需求摘要
### User Story
作为数据标注工程师或数据管理员，我想要在没有可用数据源时直接上传图片创建数据集，以便快速开始平台内的数据管理与后续标注流程。

### Business Value
- 消除“创建数据集时数据源下拉为空白”的阻断体验。
- 对齐业务文档中“支持本地数据集直接导入”的正式要求。
- 保持平台对数据集、版本、权限、审计和血缘的统一治理。
- 让本地上传创建的数据集继续兼容 F012 标注任务入口与 F014 标注结果导出链路。

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
- Planning evidence:
  - `docs/features/F015-local-dataset-upload/reports/planning/deep-interview.md`
  - `docs/features/F015-local-dataset-upload/reports/planning/prd.md`
  - `docs/features/F015-local-dataset-upload/reports/planning/test-spec.md`

## 2. 范围
### In Scope
- [x] 数据集创建方式支持 `数据源导入 / 本地上传图片` 双入口
- [x] 无可用数据源时显示空态与本地上传 CTA，并允许切回“去创建数据源”
- [x] 新增 upload session API 与状态管理
- [x] 支持多图与 zip 上传，并生成 `platform_file_object`
- [x] 本地上传文件在 commit 后创建 dataset/version/file/lineage 绑定
- [x] 上传过程提供阶段进度反馈与失败诊断
- [x] 内容安全前置与高风险拦截 / 安全待处理状态
- [x] 上传生成的数据集兼容后续标注任务入口与 F014 导出链路

### Out of Scope
- 直接在 Label Studio 绕过平台建任务
- 文本/结构化/3D/CAD 等其他数据类型上传
- 超大文件断点续传、客户端切片与离线断点恢复
- 已标注数据集导入解析与转换
- 模型训练、对象存储生产化优化与大规模导出优化

## 3. 技术分析
### Backend
- Module/API:
  - `POST /api/v1/dataset-upload-sessions`
  - `POST /api/v1/dataset-upload-sessions/{sessionId}/files`
  - `GET /api/v1/dataset-upload-sessions/{sessionId}`
  - `POST /api/v1/dataset-upload-sessions/{sessionId}/commit`
- Domain objects:
  - `DatasetUploadSession`
  - `DatasetUploadSessionFile`
  - `Dataset` / `DatasetVersion` / `DatasetFile` / `DataLineage`
  - `PlatformFileObject`
- Business rules:
  - DAT-002 / DAT-005 / DAT-009 / DAT-012
- Backend implementation note:
  - 复用 `DataManagementController` / `DataManagementService` / `DataDtos`，避免平行 data domain service。

### Frontend
- Prototype page key:
  - `up`, `ds`, `dsdetail`
- Pages/components:
  - `DatasetUploadPage`
  - `DatasetManagementPage`
  - `DatasetDetailPage`
- States/interactions:
  - `creationMode` 切换
  - upload session 轮询
  - progress alert / progress overlay 语义
  - empty state / diagnostics

### AI Adapter / Integration
- Adapter endpoint:
  - 本 feature 不新增 AI adapter 作为主上传入口
- External system placeholders:
  - `TODO_CONFIRM_CONTENT_SAFETY_ENDPOINT`
  - `TODO_CONFIRM_LOCAL_UPLOAD_OBJECT_KEY_STRATEGY`

### Database
- Tables:
  - `dataset_upload_session`
  - `dataset_upload_session_file`
  - 复用 `dataset`、`dataset_version`、`dataset_file`、`platform_file_object`
- Migrations:
  - `backend/smp-app/src/main/resources/db/migration/V11__dataset_local_upload.sql`
  - `backend/smp-app/src/main/resources/db/migration/V12__content_safety_config_definition.sql`

## Reuse Plan
- Existing reference seams to reuse:
  - `docs/business/`, `docs/prototype/`
- Existing service/scaffold seams to reuse:
  - `backend` F009/F007/F006 既有 seam
  - `DataManagementController` / `DataManagementService` / `DataDtos`
  - `platform_file_object` 与相关下载、hash/size 校验逻辑
  - `frontend/src/features/data/DataPages.tsx`
  - `frontend/src/features/platform/platformApi.ts`
  - `frontend/src/App.test.tsx` 与 `frontend/e2e/helpers.ts` 测试基座
  - `tools/ai-scaffold/`
- New seams allowed only if existing seams cannot be reused, because:
  - 当前 F009 仅支持“绑定已有 FileObject”的用户不可见 seam，不能承载真实本地上传体验。
  - upload session 需要独立状态、进度、失败诊断和 commit 生命周期，现有 dataset/version 模型不直接表达这些过程态。

## 5. Acceptance Criteria
- [x] AC-01: 当当前租户无可用数据源时，数据集创建页显示空态与“直接上传图片”入口，而不是空白来源数据源下拉。
- [x] AC-02: 用户可通过本地上传模式上传多张图片或 zip，并成功创建 upload session。
- [x] AC-03: 上传文件可生成 `platform_file_object`，并在 commit 后绑定到数据集版本。
- [x] AC-04: 未通过内容安全检测的文件不得进入最终可用版本，且页面展示明确诊断。
- [x] AC-05: 上传成功后的数据集可在详情页查看文件与版本，并继续发起标注任务。
- [x] AC-06: 上传、失败、跨 BU 拒绝、内容安全拦截等关键动作均记录审计日志。

## 6. Definition of Done
- [x] plan.md 已批准。
- [x] contract.md 已冻结。
- [x] test-plan.md 引用全部 AC-xx。
- [x] 复用审查已完成。
- [x] 权限、审计和 MUST 规则有验证证据。
- [x] code review 报告、QA 报告、integration-check 报告已归档。
- [x] 质量门禁通过或记录等价 CI 证据。

## 7. 风险与问题
- 内容安全服务真实生产参数仍待确认，当前仅通过受控 endpoint seam 与 `TODO_CONFIRM_*` 占位承接。
- 上传大小/数量阈值已具备错误码与基础拦截，但最终生产阈值仍待配置冻结。
- worktree 基于独立 feature 分支推进，合并时需注意只提交 F015 相关文件与必要公共 seam。
