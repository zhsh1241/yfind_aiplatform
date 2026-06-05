# Task: 模型评估结果与发布门禁

## Metadata
- Feature: F020-model-evaluation-readiness
- ID: TASK-model-evaluation-readiness
- Status: in-progress
- Owner: codex
- Created: 2026-06-04
- Updated: 2026-06-05
- 前置：同目录 `plan.md` 已由用户于 2026-06-05 批准；`check-build-feature-prereqs` 已通过。

## 1. 需求摘要
### User Story
作为模型训练工程师 / BU 管理员，我想为模型版本登记评估任务、导入评估结果并在发布 Production 前自动校验评估通过记录，以便满足 `MDL-006`“模型必须通过评估后方可发布”的业务规则。

### Business Value
- 将 F019 `ModelVersion.evaluationStatus` 临时 seam 升级为正式 `EvaluationRun` 事实源。
- 避免未评估或评估失败模型进入 Production，降低工业 AI 模型上线风险。
- 为后续 MLflow / Argo / AI adapter 真实评估执行器保留可扩展接口，不在一期猜测外部实现。

### Source References
- Business docs: `docs/business/bizdocs/02-02-业务流程-模型开发与训练.md`、`docs/business/bizdocs/03-02-系统功能-模型开发.md`
- Domain docs: `docs/business/domain/02-领域对象-模型域.md`
- Rules: `docs/business/rules/02-模型开发规则.md` (`MDL-006`, `MDL-009`)
- API: `docs/business/api/01-API接口规范.md`
- Prototype: `docs/prototype/SMP工业AI平台-原型v2.html` page key `eval`、`docs/prototype/screen-eval.png`、`docs/prototype/light-eval.png`

## 2. 范围
### In Scope
- [x] 创建模型评估任务，记录模型版本、验证数据集版本、任务类型、指标阈值、执行器类型。
- [x] 导入评估结果并按阈值自动判定 `PASSED` / `FAILED`。
- [x] 查询评估列表、评估详情、模型版本评估记录和多版本指标对比。
- [x] 报告 artifact 下载 URL seam，保留权限与审计。
- [x] F019 `Production` 发布门禁改为查询 F020 `PASSED` 评估记录。
- [x] 前端 `/eval` 使用真实 API 展示列表、详情、结果导入、版本对比、空状态和错误状态。
- [x] 后端测试、前端单测与 Playwright E2E 追溯 AC。

### Out of Scope
- 不实现真实推理评估执行器、MLflow、Argo、KServe 或 AI adapter 编排。
- 不重新实现模型注册中心、模型版本状态机、数据集权限体系或文件对象存储。
- 不新增图表依赖；报告曲线/混淆矩阵用现有 Ant Design 组件展示。

## 3. 技术分析
### Backend
- Module/API: `backend/smp-app/src/main/java/com/yf/smp/app/platform/ModelEvaluationController.java`、`ModelEvaluationService.java`、`ModelEvaluationDtos.java`
- Domain objects: `EvaluationRun`、`EvaluationMetric`、`EvaluationReportArtifact`，复用 `model_registry_model` / `model_registry_version` / `dataset` / `dataset_version` / `platform_file_object`
- Business rules: `MDL-006` 发布门禁、`MDL-009` 模型版本状态机仍由 F019 控制；F020 只提供评估准入事实。

### Frontend
- Prototype page key: `eval`
- Pages/components: `frontend/src/features/model-evaluation/ModelEvaluationPage.tsx`，路由由 `frontend/src/App.tsx` 接入 `/eval`
- States/interactions: 列表筛选、详情抽屉、创建评估、导入结果、版本对比、artifact 下载提示。

### AI Adapter / Integration
- Adapter endpoint: 本期不调用；仅用 `executorType` / `externalRunId` / `diagnostic` 保留 `EvaluationExecutor` seam。
- External system placeholders: `TODO_CONFIRM_EVALUATION_EXECUTOR`、`TODO_CONFIRM_EVALUATION_THRESHOLD_POLICY`、`TODO_CONFIRM_EVALUATION_DATASET_DOWNLOAD_POLICY`。

### Database
- Tables: `model_evaluation_run`、`model_evaluation_metric`、`model_evaluation_report_artifact`
- Migrations: `backend/smp-app/src/main/resources/db/migration/V25__model_evaluation_readiness.sql`
- Feature SQL archive: `docs/features/F020-model-evaluation-readiness/sql/model_evaluation_readiness.sql`

## Reuse Plan
- 复用 `backend/smp-app/.../ModelRegistryService.java`、`ModelRegistryDtos.java`、`ModelRegistryController.java` 中的 F019 模型与版本事实源，不新增平行模型表。
- 复用 `model_registry_model`、`model_registry_version`、`model_access_grant`、`dataset`、`dataset_version`、`platform_file_object`、`platform_audit_log` SQL 表。
- 复用平台统一 envelope：`PlatformResponses` / `ApiResponse` / `/api/v1`，复用 `PlatformIdentityService` 权限校验。
- 复用前端 `apiClient`、`platformApi`、`AppNavigation`、Ant Design shell、TanStack Query 模式。
- 复用 F019 测试基座 `ModelRegistryControllerTest` 的登录、文件、模型、版本 seed 思路，新建 F020 专属测试并用 `TASK-model-evaluation-readiness` 标记。
- 不复用旧删库遗留实现；不把 `evaluationProof` 扩展为长期绕过通道，外部证明进入 imported evaluation run。

## 5. Acceptance Criteria
- [ ] AC-01: 用户可为指定模型版本创建评估任务，记录验证数据集版本、任务类型、指标配置和通过阈值。
- [ ] AC-02: 缺少模型版本、无权限模型版本、未发布/无权限数据集或非法阈值时创建失败。
- [ ] AC-03: 用户可导入评估结果，系统按阈值自动判定 `PASSED` / `FAILED` 并保存指标快照。
- [ ] AC-04: 导入结果缺少必需指标或终态重复导入时被拒绝。
- [ ] AC-05: F019 Production 发布门禁查询 F020 `PASSED` 评估记录；无记录或 `FAILED` 时阻断。
- [ ] AC-06: 存在 `PASSED` 评估记录时，模型版本可继续执行 Production 状态流转。
- [ ] AC-07: 报告详情展示核心指标、PR 曲线数据、混淆矩阵数据和错误案例摘要 seam。
- [ ] AC-08: 用户可对比同一模型多个版本的指标，并标记最佳值。
- [ ] AC-09: 评测数据集或报告 artifact 下载遵守权限与审计规则。
- [ ] AC-10: 跨 BU 无授权用户不可查看评估报告或对比不可见版本。
- [ ] AC-11: 评估创建、结果导入、通过/失败、报告查看、artifact 下载、发布阻断均记录审计。
- [ ] AC-12: 前端 `eval` 页面通过真实 API 展示列表、详情、对比、空状态和错误状态，不出现原型说明性 mock 文案。

## 6. Definition of Done
- [x] plan.md 已批准。
- [ ] contract.md 已冻结或实现态。
- [ ] test-plan.md 引用全部 AC-xx。
- [ ] 复用审查已完成。
- [ ] 权限、审计和 MUST 规则有验证证据。
- [ ] `check-task-traceability` / `verify-contract` / quality gate 通过或记录等价 CI 证据。

## 7. 风险与问题
- `TODO_CONFIRM_EVALUATION_THRESHOLD_POLICY` 未确认，当前只按显式阈值做数值比较，不猜测默认阈值。
- `TODO_CONFIRM_EVALUATION_EXECUTOR` 未确认，当前仅支持导入结果。
- `TODO_CONFIRM_EVALUATION_DATA_LEAKAGE_POLICY` 未确认，当前仅记录 datasetVersionId，不做复杂血缘泄露判断。
