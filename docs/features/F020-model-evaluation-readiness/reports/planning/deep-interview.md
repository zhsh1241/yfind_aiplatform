> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-model-evaluation-readiness.md`
> Interview transcript: `.omx/interviews/model-evaluation-readiness-20260604T143150Z.md`

# Deep Interview Spec: 模型评估结果与发布门禁

## Metadata
- Feature: `F020-model-evaluation-readiness`
- Slug: `model-evaluation-readiness`
- Profile: standard
- Context type: brownfield
- Rounds: 5
- Final ambiguity: 0.16
- Threshold: 0.20
- Context snapshot: `.omx/context/model-evaluation-readiness-20260604T143150Z.md`
- Transcript: `.omx/interviews/model-evaluation-readiness-20260604T143150Z.md`

## Clarity Breakdown

| Dimension | Score | Evidence |
|---|---:|---|
| Intent | 0.94 | F019 的评估准入 seam 需要真实评估事实源。 |
| Outcome | 0.90 | 产出评估记录、报告、版本对比、发布门禁联动。 |
| Scope | 0.86 | 明确纳入结果登记/导入与门禁；排除真实执行器集成。 |
| Constraints | 0.82 | 必须复用 F019 / 数据集 / 平台权限审计；不写实现。 |
| Success | 0.86 | MDL-006 阻断与 PASSED 放行可测试。 |
| Context | 0.88 | 业务、规则、原型与 F019 契约均已定位。 |

## Intent

F020 的意图是把模型评估从原型/占位能力提升为模型版本发布链路中的可审计事实源：模型版本只有存在符合阈值且状态为 `PASSED` 的评估记录时，才允许发布到 `PRODUCTION`。

## Desired Outcome

1. 建立 `EvaluationRun` / `EvaluationMetric` / `EvaluationReport` 的规划边界。
2. 支持评估指标配置、结果导入/登记、报告查询和版本对比。
3. 将 F019 的 `ModelVersion.evaluationStatus` 从临时 seam 连接到 F020 评估记录。
4. 固化 `MDL-006` 发布门禁，未评估/未通过版本不能进入 Production。
5. 前端 `eval` 页面展示真实评估任务、报告和对比，不保留原型说明文案。

## In Scope

- 模型版本评估任务创建/登记：选择 `modelVersionId`、验证数据集、任务类型、指标与通过阈值。
- 评估任务状态机与结果导入：支持手工/外部系统导入结果，预留真实 executor seam。
- 多维评估报告：整体指标、分类/检测/分割/NLP/时序指标摘要、PR 曲线数据、混淆矩阵数据、错误案例摘要 seam。
- 模型版本对比：同一模型或多个版本的核心指标横向对比。
- 评测数据集下载控制：权限、审计、下载策略 seam。
- F019 发布门禁联动：`Transition(PRODUCTION)` 查询 F020 `PASSED` 评估记录。
- 权限与审计：评估创建、结果导入、通过/失败判定、报告查看、下载控制、发布阻断。
- 前端 `eval` 页面、报告详情、对比视图和从模型详情跳转评估入口。

## Out of Scope / Non-goals

- 不实现真实训练任务、训练日志、TensorBoard 或训练调度。
- 不实现真实 MLflow、Argo Workflows、KServe 或模型推理执行引擎接入。
- 不实现模型工程化量化/剪枝/蒸馏/格式转换。
- 不实现推理服务部署、边端推送或 A/B 流量治理。
- 不重复定义模型、模型版本、文件对象、数据集、用户组织或审计表。
- 不长期使用纯前端 mock 充当评估事实源。

## Decision Boundaries

- 允许在 contract 阶段新增评估域表：`model_evaluation_run`、`model_evaluation_metric`、`model_evaluation_report_artifact`（最终命名由 contract 冻结）。
- 允许把真实执行器抽象为 `EvaluationExecutor` seam；一期可只实现外部结果导入/登记。
- 通过标准由评估任务配置保存；默认阈值和任务类型指标模板保留 `TODO_CONFIRM_EVALUATION_THRESHOLD_POLICY`。
- 验证数据集独立性按“必须不等于训练集”规划，复杂数据血缘泄露判定保留 `TODO_CONFIRM_EVALUATION_DATA_LEAKAGE_POLICY`。
- 下载控制策略先规划权限与审计，真实签名 URL/后端中转策略保留 `TODO_CONFIRM_EVALUATION_DATASET_DOWNLOAD_POLICY`。

## Constraints

- 必须复用 F019 `Model` / `ModelVersion` 和 Production 状态机，不得创建平行模型版本状态机。
- 必须复用数据集域的 dataset/version 权限 seam。
- 必须复用平台 RBAC、组织、审计事件和统一 API envelope。
- `plan.md` 必须保持 draft，待人审批准后才能进入 `/build-feature`。

## Testable Acceptance Criteria Seeds

- AC-01: 可为指定模型版本创建评估任务，缺少模型版本、验证数据集或指标配置时拒绝。
- AC-02: 可导入评估结果并按阈值自动判定 `PASSED` / `FAILED`。
- AC-03: 未通过评估或无评估记录的版本发布 Production 被 `MDL-006` 阻断。
- AC-04: 有 `PASSED` 评估记录的版本可通过发布门禁。
- AC-05: 报告详情展示核心指标、PR 曲线数据、混淆矩阵数据和错误案例摘要 seam。
- AC-06: 可对比同一模型多个版本的指标并标记最佳值。
- AC-07: 无权限用户不可查看跨 BU 评估报告或下载评测数据集。
- AC-08: 关键写操作、报告查看、下载和发布阻断记录审计。
- AC-09: 前端 `eval` 页面使用真实 API 状态，不出现原型说明性 mock 文案。

## Pressure-pass Findings

原始风险是“F020 如果不做真实推理执行，是否会虚假满足模型评估执行”。本规格将一期限定为评估任务事实源与结果导入/门禁，不宣称真实执行引擎完成；真实执行通过 seam 预留。

## Brownfield Evidence vs Inference

- Evidence: `FUNC-MODEL-011`～`015`、`MODEL-002`、`MDL-006`、F019 contract 的 evaluation seam。
- Inference: F020 应作为 F019 后续，因为 F019 Production 发布规则已经依赖评估记录。
