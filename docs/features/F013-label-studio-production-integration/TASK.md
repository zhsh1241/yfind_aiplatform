# Task: Label Studio 生产化联通

## Metadata
- Feature: F013-label-studio-production-integration
- ID: TASK-label-studio-production-integration
- Status: approved
- Owner: codex
- Created: 2026-05-19
- Updated: 2026-05-19
- 前置：同目录 `plan.md` 已人审批准，可进入实现。

## 1. 需求摘要
### User Story
作为 BU 管理员/数据标注工程师，我想要将 SMP 标注任务、工作项与 Label Studio 项目和任务真实联通，以便使用外部专业标注工具完成标注，并将结果安全回流到 SMP 审核、质量检查和标注数据集发布链路。

### Business Value
- 将 F012 的 `UNCONFIGURED` seam 推进为可配置、可诊断、可审计、可本地验证的真实集成。
- 保留 SMP 对权限、BU 隔离、审核、质量检查、数据集版本与血缘的控制权。
- 降低生产接入风险：凭据不泄露，失败不伪造成成功，未知生产参数继续显式 `TODO_CONFIRM_*`。

### Source References
- Business docs: `docs/business/bizdocs/02-01-业务流程-数据管理.md` DATA-003/DATA-006；`docs/business/bizdocs/03-01-系统功能-数据管理.md` FUNC-DATA-020/024/025/026/042/047。
- Rules: `docs/business/rules/01-数据管理规则.md` DAT-003/004/009/010/012；`docs/business/rules/05-平台与权限规则.md` PLT-001/011/014。
- Prototype: `docs/prototype/SMP工业AI平台-原型v2.html` page keys `ann`、`annwork`、`annreview`。
- Prior feature: `docs/features/F012-annotation-integration/`。
- Planning evidence: `reports/planning/deep-interview.md`、`reports/planning/prd.md`、`reports/planning/test-spec.md`。

## 2. 范围
### In Scope
- [x] 配置驱动 `HttpLabelStudioAnnotationAdapter`，保留未配置 fallback。
- [x] `sync-project` 真实创建/复用 Label Studio project 并持久化 external project id / launch URL / 诊断状态。
- [x] `sync-task` 真实创建/复用 Label Studio task 并保存 work item 级 external task 映射。
- [x] `import-results` 导入 JSON annotation，回写 SMP work item，并沿用 F012 审核与发布链路。
- [x] 认证、网络、schema、结果未完成等失败诊断与审计。
- [x] token/API key 防泄露：不入库、不入响应、不入前端、不入日志。
- [x] 前端 `/ann`、`/annwork`、`/annreview` 展示配置/同步/打开入口/失败诊断。
- [x] 本地 Docker / fake server 可验证路径和 E2E 覆盖。

### Out of Scope
- 生产 Label Studio 集群运维、备份、高可用、升级。
- 企业 SSO / SCIM / Label Studio 用户组同步。
- Label Studio ML Backend、真实 AI 预标注模型。
- 前端内嵌完整 Label Studio iframe 或自研标注画布。
- 复杂视频/CAD/3D 专用标注格式全量映射。
- 训练任务消费标注数据集。

## 3. 技术分析
### Backend
- Module/API: 复用 `/api/v1/annotation/tasks/{taskId}/label-studio/*` 和 `/work-items/{workItemId}/label-studio/sync-task`。
- Domain objects: `AnnotationTask`、`LabelTemplate`、`AnnotationWorkItem`、`AnnotationExternalBinding`、新增 work item external task binding。
- Business rules: DAT-003/004/009/010/012、PLT-001/011/014；Label Studio 不绕过 SMP 权限、审核和发布。

### Frontend
- Prototype page key: `ann`、`annwork`、`annreview`。
- Pages/components: `AnnotationTasksPage`、`AnnotationWorkbenchPage`、`AnnotationReviewPage`；可抽取 Label Studio 状态/操作组件。
- States/interactions: `UNCONFIGURED`、`CONFIGURED`、`PROJECT_SYNCED`、`TASK_SYNCED`、`RESULT_IMPORTED`、`AUTH_FAILED`、`SYNC_FAILED`、`RESULT_NOT_READY`。

### AI Adapter / Integration
- Adapter endpoint: Label Studio HTTP API（project create、task import/create、result export/import）。
- External system placeholders: `TODO_CONFIRM_LABEL_STUDIO_BASE_URL`、`TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET`、`TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY`、`TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY`、`TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`。

### Database
- Tables: 复用 `annotation_external_binding`，新增 `annotation_external_task_binding`。
- Migrations: 新增 `V10__label_studio_production_integration.sql`。

## Reuse Plan
- Existing reference seams to reuse: `docs/business/`、`docs/prototype/`、F012 规划/契约/测试计划。
- Existing service/scaffold seams to reuse: `AnnotationController`、`AnnotationService`、`LabelStudioAnnotationAdapter`、`AnnotationDtos`、F006 `PlatformIdentityService`/审计、F009 dataset/file/lineage、`tools/ai-scaffold`。
- Existing frontend seams to reuse: `DataPages.tsx` 中 annotation pages、`platformApi.ts` API client、Playwright 配置。
- Existing deploy seams to reuse: `deploy/local/docker-compose.yml` 的 `label-studio` 服务和 `.env.example`。
- New seams allowed only if existing seams cannot be reused, because: F012 只有未配置 adapter，无法表达 HTTP 调用、secret 解析、work item 级 external task id、结果转换与幂等状态；因此允许新增 HTTP adapter、properties、secret resolver、payload/result mapper 和 external task binding。

## 5. Acceptance Criteria
- [ ] AC-01: 配置缺失时返回 `UNCONFIGURED`/`TODO_CONFIRM_*`，不尝试外部调用。
- [ ] AC-02: 配置有效时 `sync-project` 真实创建或复用 Label Studio project，保存 external project id 与 launch URL。
- [ ] AC-03: `sync-task` 真实创建或复用 Label Studio task，保存 work item 与 external task id 映射，重复调用幂等。
- [ ] AC-04: `import-results` 可导入 JSON annotation，回写 SMP work item，并继续 F012 审核/质检/发布流程。
- [ ] AC-05: 认证失败、网络失败、schema 失败、结果未完成均返回不同诊断码并写审计。
- [ ] AC-06: token 明文不入库、不入响应、不入前端、不入日志。
- [ ] AC-07: 前端展示 project/task 同步状态、打开入口、失败诊断，并保持原型 IA。
- [ ] AC-08: 本地 Docker Label Studio sandbox 或 fake server 有可复现验证证据。
- [ ] AC-09: 通过 feature prereq、后端测试、前端测试/E2E 和 scaffold gate。

## 6. Definition of Done
- [x] plan.md 已批准。
- [ ] contract.md 已冻结或实现态。
- [ ] test-plan.md 引用全部 AC-xx。
- [ ] 复用审查已完成。
- [ ] 权限、审计和 MUST 规则有验证证据。
- [ ] 质量门禁通过或记录等价 CI 证据。

## 7. 风险与问题
- 生产 Label Studio URL/token/storage 策略仍需确认，本期以配置和本地 sandbox 验证承接。
- Label Studio API 版本差异可能导致 project/task/export 失败，需要 adapter 诊断与测试替身隔离。
- 样本文件可访问性依赖 storage policy，未配置时必须返回诊断而非成功。
