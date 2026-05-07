# F005 训练任务 MVP SQL 迁移说明

## 状态

- 本轮不执行真实数据库迁移。
- 原因：F005 目标是训练任务 MVP 骨架与可点击/可测试链路，真实训练状态机、artifact 存储根路径、工作流引擎和权限模型尚未确认。
- 当前实现使用 `TrainingJobService` 内存数据与种子任务，后续生产化时应替换为持久化表。

## 后续建议表

- `training_job`：任务、数据集版本、模板、状态、资源、adapter 提交 ID、创建更新时间。
- `training_metric_snapshot`：任务、epoch、loss、accuracy、记录时间。
- `training_artifact`：任务、artifact 类型、URI、checksum、状态。
- `training_log_entry`：任务、时间、级别、消息。

## 待确认生产参数

- `TODO_CONFIRM_MODEL_ARTIFACT_URI`
- `TODO_CONFIRM_METRICS_URI`
- `TODO_CONFIRM_WORKFLOW_ENGINE_QUEUE`
- 训练权限拆分：`training:read`、`training:create`、`training:cancel`
- 幂等键和重复提交策略