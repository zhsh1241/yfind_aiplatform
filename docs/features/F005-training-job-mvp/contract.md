# Feature Contract：训练任务 MVP

## Metadata
- Feature: F005-training-job-mvp
- Version: v1
- Status: implemented
- Owner: contract-architect
- Created: 2026-05-05
- Updated: 2026-05-05
- Trace Tag: TASK-training-job-mvp

## Requirement Summary
- User goal: 算法工程师可以基于已批准数据集版本发起训练任务，并查看状态、资源、日志、指标与 artifact。
- Business value: 串联数据资产与后续模型仓库/推理服务，形成工业 AI 小模型训练主链路。

## Scope

### In Scope
- 训练任务列表、详情、创建、取消。
- 训练模板查询。
- 资源参数：CPU、GPU、NPU、epoch、accelerator。
- 日志、指标快照、artifact 占位 URI。
- ai-adapter 训练模板与提交占位接口。
- 前端训练任务看板和启动训练步骤流。

### Out of Scope
- 真实 Kubeflow / Argo / MLflow 接入。
- 真实对象存储 artifact 写入。
- 数据库长期持久化迁移。
- 生产级多租户权限策略。

## Reuse & Compatibility
- 复用 `backend/` Spring Boot API 与 MockMvc 测试基座。
- 复用 F004 `DatasetService.detail()` 作为训练数据集键校验入口。
- 复用 `ai-adapter` FastAPI router 注册方式。
- 复用 `frontend/` React + Ant Design 原型布局、`TrainingPage`、`TrainingModal` 和 `App.test.tsx` 测试入口。

## API Contract

### GET `/api/training-jobs`
返回 `TrainingJobListResponse`，包含 `items` 与 `featureTrace=TASK-training-job-mvp`。

### GET `/api/training-jobs/{jobKey}`
返回 `TrainingJobDetailResponse`：`jobKey`、`name`、`datasetKey`、`datasetVersionKey`、`templateKey`、`status`、`accelerator`、`cpuCores`、`gpuCount`、`npuCount`、`maxEpochs`、`queueStatus`、`adapterSubmissionId`、`metrics`、`artifacts`、`logs`、`featureTrace`。

### POST `/api/training-jobs`
请求 `TrainingJobCreateRequest`：`name`、`datasetKey`、`datasetVersionKey`、`templateKey`、`accelerator`、`cpuCores`、`gpuCount`、`npuCount`、`maxEpochs`。返回 `TrainingJobActionResponse`，MVP 默认 `status=QUEUED`、`queueStatus=SUBMITTED_TO_ADAPTER`、`adapterSubmissionId=adapter-sim-*`。

### POST `/api/training-jobs/{jobKey}/cancel`
返回 `status=CANCELLED` 与 `queueStatus=CANCEL_REQUESTED`。

### GET `/api/training-jobs/templates`
返回 `TrainingTemplateSummary[]`。

## ai-adapter Contract

- `GET /internal/training/templates`：返回训练模板列表。
- `POST /internal/training/submit`：返回 `submission_id=adapter-sim-{job_key}`、`status=accepted`、`queue=TODO_CONFIRM_WORKFLOW_ENGINE_QUEUE`、`artifact_root=TODO_CONFIRM_MODEL_ARTIFACT_URI/{job_key}`、`feature=TASK-training-job-mvp`。

## Permission & Audit Trace

训练 API 当前要求 `Authorization: Bearer LOCAL_DEV_TOKEN`。未携带或 token 不匹配返回 `401 AUTH_UNAUTHORIZED`；携带 `X-Platform-Permissions` 时必须包含端点所需权限，否则返回 `403 TRAINING_FORBIDDEN`；未携带权限头时按本地开发管理员权限集合解析，仅用于 MVP/测试环境。权限映射：列表、详情、模板需要 `training:read`；创建需要 `training:execute`；取消需要 `training:manage`。后续生产版应替换为 F002 统一认证主体与审计拦截。

## Acceptance Mapping

| AC | Contract Evidence |
| --- | --- |
| AC-01 | `/api/training-jobs`、详情、创建、cancel API |
| AC-02 | `TrainingJobDetailResponse` 资源与状态字段 |
| AC-03 | `metrics`、`artifacts`、`logs`、`TODO_CONFIRM_MODEL_ARTIFACT_URI` |
| AC-04 | `/internal/training/templates`、`/internal/training/submit` |
| AC-05 | 前端训练中心列表、模板、资源、图表、artifact 展示 |
| AC-06 | 启动训练步骤流和指标详情交互 |
| AC-07 | 文档、测试计划、SQL notes、验证报告和 gate 命令 |

## Open Production Decisions

- `TODO_CONFIRM_MODEL_ARTIFACT_URI` 的真实根路径和访问策略。
- `TODO_CONFIRM_WORKFLOW_ENGINE_QUEUE` 的真实队列、工作流引擎和重试策略。
- 权限键拆分与审计落表策略。
- 训练任务数据库表、状态机与幂等键设计。