> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-model-evaluation-readiness.md`

# RALPLAN Test Spec: 模型评估结果与发布门禁

## Metadata
- Feature: `F020-model-evaluation-readiness`
- Slug: `model-evaluation-readiness`
- Source PRD: `.omx/plans/prd-model-evaluation-readiness.md`
- Created: 20260604T144313Z

## Test Principles

- 测试必须证明 MDL-006：无 PASSED 评估记录不能发布 Production。
- 测试必须证明 F020 复用 F019 模型版本，不创建平行模型事实源。
- 所有权限、审计和状态机错误必须有 P0/P1 覆盖。
- 前端 `eval` 不允许依赖静态 mock 作为验收依据。

## Acceptance Criteria Draft

| AC | Description | Priority |
|---|---|---|
| AC-01 | 可为指定模型版本创建评估任务，记录验证数据集、指标配置和通过阈值。 | P0 |
| AC-02 | 缺少模型版本、无权限模型版本、未激活/无权限数据集或非法阈值时创建失败。 | P0 |
| AC-03 | 可导入评估结果，系统按阈值自动判定 PASSED/FAILED 并保存指标快照。 | P0 |
| AC-04 | 结果缺少必需指标或终态重复导入时拒绝。 | P0 |
| AC-05 | F019 Production 发布门禁查询 F020 PASSED 评估记录；无记录或 FAILED 时阻断。 | P0 |
| AC-06 | 存在 PASSED 评估记录时，模型版本可继续执行 Production 状态流转。 | P0 |
| AC-07 | 报告详情展示指标摘要、PR 曲线数据、混淆矩阵数据和错误案例摘要 seam。 | P1 |
| AC-08 | 可对比同一模型多个版本指标，并对最佳值高亮/标记。 | P1 |
| AC-09 | 评测数据集/报告 artifact 下载遵守权限与审计。 | P1 |
| AC-10 | 跨 BU 无授权用户不可查看评估报告或对比不可见版本。 | P0 |
| AC-11 | 评估创建、结果导入、通过/失败、报告查看、下载、发布阻断均记录审计。 | P0 |
| AC-12 | 前端 `eval` 页面通过真实 API 展示列表、详情、对比、空状态和错误状态。 | P1 |

## Backend Unit Tests

- `EvaluationRunServiceTest`
  - create run success with active dataset and accessible model version。
  - reject missing metric config / invalid threshold。
  - reject inaccessible model version。
  - reject inactive dataset。
  - import results => PASSED when all required thresholds satisfied。
  - import results => FAILED when threshold not satisfied。
  - reject duplicate import on terminal run。
- `ModelVersionProductionGateTest`
  - no evaluation => `MODEL_EVALUATION_REQUIRED`。
  - latest FAILED only => blocked。
  - PASSED evaluation exists => gate passed。
  - imported external proof from F019 should be represented as imported evaluation run or migration seam, not bypass.
- `EvaluationPermissionServiceTest`
  - same BU allowed。
  - cross BU no grant denied。
  - platform admin allowed。
- `EvaluationAuditServiceTest`
  - audit event emitted on create/import/report/download/gate blocked。

## Backend API / Integration Tests

- `POST /api/v1/model-evaluations` happy path。
- `POST /api/v1/model-evaluations/{id}/results:import` PASSED/FAILED paths。
- `GET /api/v1/model-evaluations/{id}` returns report payload。
- `GET /api/v1/models/{modelId}/versions:compare-evaluations` compares only visible versions。
- F019 transition endpoint with F020 gate。

## Frontend Tests

- Vitest/RTL:
  - evaluation list renders API data。
  - create evaluation validates required fields。
  - report detail renders metrics, PR curve placeholder data and confusion matrix table/chart。
  - compare view marks best metric。
  - permission/gate errors show business message。
- Playwright:
  - navigate to `eval` page。
  - create/import evaluation result fixture。
  - verify Production publish blocked before PASSED and allowed after PASSED（可通过 API fixture/seam）。

## Non-functional / Rule Tests

- RBAC: report and artifact cannot leak cross BU model/dataset existence。
- Audit: traceId propagated to audit details。
- Data integrity: each evaluation run references immutable datasetVersionId and modelVersionId。
- Idempotency: result import terminal protection prevents overwriting passed records without explicit new run。

## Test Data Requirements

- Model `MODEL-EVAL-001` with versions `v1.0` and `v1.1` from F019 seed/test fixture。
- Active dataset version `DS-EVAL-ACTIVE-V1`。
- Inactive dataset version for negative test。
- Same BU user, cross BU user, BU admin, super admin。
- Metrics fixtures:
  - classification: Accuracy, Precision, Recall, F1, ROC-AUC。
  - detection: mAP50, IoU。
  - PR curve JSON fixture。
  - confusion matrix JSON fixture。

## Gate Commands

- `node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F020-model-evaluation-readiness`
- Backend tests after implementation。
- Frontend tests after implementation。
- `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F020-model-evaluation-readiness --skip-backend-integration`
- If frontend behavior changed: add `--run-e2e`。

## Known Gaps

- Real executor integration is out of scope; tests should verify executor seam and imported results, not real model inference。
- Default threshold policy remains `TODO_CONFIRM_EVALUATION_THRESHOLD_POLICY`。
- Dataset leakage detection beyond direct train/eval equality remains seam only。
