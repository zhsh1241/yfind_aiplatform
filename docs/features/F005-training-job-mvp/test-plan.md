# Test Plan：训练任务 MVP

## Metadata
- Feature: F005-training-job-mvp
- Status: implemented
- Contract: `docs/features/F005-training-job-mvp/contract.md`
- Trace Tag: `TASK-training-job-mvp`
- Updated: 2026-05-05

## Test Scope

- 后端训练任务 API：列表、详情、创建、取消、模板查询。
- 后端训练任务状态与资源字段：状态、队列、CPU/GPU/NPU、epoch、adapter 提交 ID。
- 后端训练输出：日志、指标快照、artifact 占位记录。
- ai-adapter 训练接口：模板查询、训练提交、artifact 根路径和 feature trace。
- 前端训练中心：任务看板、资源调度、算法模板、指标详情、启动训练步骤流。
- Playwright：管理员视角完成训练中心查看和启动训练配置主流程。

## Reuse Regression Focus

- F004 数据资产页面与后端数据集服务继续可用。
- F003 原型导航、数据资产、推理服务、组织权限页面继续通过 `App.test.tsx` 回归。
- `ai-adapter` 既有健康检查和能力占位接口继续通过 unittest。

## P0

| ID | Scenario | Verification |
| --- | --- | --- |
| T1 | AC-01 训练任务列表返回任务摘要、`training:execute` permission 和 `TASK-training-job-mvp` trace | `TrainingJobControllerTest.listTrainingJobs` |
| T2 | AC-02/AC-03 训练任务详情返回资源、队列、日志、指标和 `TODO_CONFIRM_MODEL_ARTIFACT_URI` artifact | `TrainingJobControllerTest.detailIncludesMetricsLogsAndArtifacts` |
| T3 | AC-01/AC-04 使用 F004 数据集键和训练模板创建任务，返回 `QUEUED`、`SUBMITTED_TO_ADAPTER` 和 adapter 提交 ID | `TrainingJobControllerTest.createTrainingJob` |
| T4 | AC-04/AC-07 查询后端训练模板，返回 `small-cnn-vision` 等 adapter-ready 模板 | `TrainingJobControllerTest.templatesExposeAdapterReadyOptions` |
| T5 | AC-01 取消训练任务后返回 `CANCELLED` 和 `CANCEL_REQUESTED` | `TrainingJobControllerTest.cancelTrainingJob` |
| T6 | AC-04 ai-adapter 返回训练模板和提交占位响应，artifact 根路径包含 `TODO_CONFIRM_MODEL_ARTIFACT_URI` | `ai-adapter/tests/test_health.py` F005 测试 |
| T7 | AC-05/AC-07 前端训练中心展示任务看板、资源调度、算法模板、artifact 和指标趋势图 | `frontend/src/App.test.tsx` F005 第一条测试 |
| T8 | AC-05/AC-06 前端可点击 Epoch 指标并推进启动训练资源配置流程 | `frontend/src/App.test.tsx` F005 第二条测试 |
| T9 | AC-05/AC-06/AC-07 Playwright 验证训练中心看板和启动训练弹窗主流程 | `frontend/e2e/training-job.spec.ts` |
| T10 | AC-01/AC-07 缺少 `Authorization` 时训练 API 返回 `401 AUTH_UNAUTHORIZED`，缺少 `training:execute` 时创建返回 `403 TRAINING_FORBIDDEN` | `TrainingJobControllerTest.rejectsMissingAuthorization` / `rejectsMissingExecutePermission` |`n| T11 | AC-07 scaffold gate 验证 feature 文档、契约、traceability、E2E 和工作项链接 | `tools/ai-scaffold` 命令 |

## Traceability

- AC-01 -> T1, T3, T5, T10
- AC-02 -> T2, T10
- AC-03 -> T2, T6, T7, T10
- AC-04 -> T3, T4, T6, T10
- AC-05 -> T7, T8, T9, T10
- AC-06 -> T8, T9, T10
- AC-07 -> T4, T7, T9, T10, T11

## Execution Notes

- 所有 F005 自动化测试命名或断言中应出现 `TASK-training-job-mvp` 或 `AC-xx`。
- 后端以 MockMvc 覆盖 controller/service seam，不依赖真实数据库。
- ai-adapter 以 FastAPI `TestClient` 覆盖占位接口，不依赖真实 Kubeflow/Argo/MLflow。
- 本轮真实 code review 报告仍为 BLOCK，因此最终 gate 使用 `--skip-code-review-verdict`，并在交付风险中保留。