# F006 模型仓库 MVP SQL 迁移说明

## 状态

本轮不执行真实数据库迁移。模型仓库 MVP 使用内存数据，后续生产化时再引入正式表结构。

## 后续建议表

- `model_registry`：模型主表，记录 modelKey、名称、领域、owner、描述。
- `model_version`：版本表，记录 versionKey、trainingJobKey、artifactUri、checksum、status、approvalStatus、deployable。
- `model_metric`：模型评测指标，如 accuracy、latency、modelSize、throughput。
- `model_approval_event`：审批事件，记录 approve/reject/archive、操作者、原因、时间。

## 待确认

- `TODO_CONFIRM_MODEL_ARTIFACT_URI`
- `TODO_CONFIRM_MODEL_EVAL_POLICY`
- `TODO_CONFIRM_MODEL_APPROVAL_POLICY`
- `TODO_CONFIRM_MLFLOW_ENDPOINT`