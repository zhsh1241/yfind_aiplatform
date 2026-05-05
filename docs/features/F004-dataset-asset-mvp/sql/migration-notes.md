# SQL / Migration Notes：数据资产 MVP

## 说明

F004 当前采用“本地事件日志持久化 + 内存回放”的轻量落地方式，在不引入真实数据库迁移的前提下，先解决服务重启后状态丢失问题。本文件同时保留后续数据库化设计方向，供下一阶段落地时复用。

## 当前最小持久化方案

- 事件日志文件：`dataset.storage.event-log`
- 默认位置：`${user.home}/.yfind-aiplatform/dataset-events.jsonl`
- 事件类型：
  - `UPLOAD`
  - `ACCESS_REQUEST_CREATED`
  - `ACCESS_REQUEST_APPROVED`
- 启动时通过事件回放恢复：
  - 数据集与版本
  - 文件 hash 与去重标记
  - 下载申请状态
  - 最新版本下载权限

## 为什么暂不直接引入数据库

- `ai-scaffold.config.json` 中数据库测试名、账号、容器名仍为 `TODO_CONFIRM_*`。
- 当前仓库未确认 PostgreSQL 连接、迁移策略与 CI 数据库环境。
- 为避免凭空假设生产约束，本轮先采用可验证、可迁移的本地事件日志方案。

## 建议表面

- `dataset`
- `dataset_version`
- `dataset_file`
- `dataset_access_request`
- `dataset_processing_job`

## 关键字段建议

### dataset
- `dataset_key`
- `name`
- `owner_name`
- `status`
- `preview_type`
- `can_view_policy`
- `created_at`

### dataset_version
- `version_key`
- `dataset_key`
- `version_no`
- `download_policy`
- `file_count`
- `sample_count`
- `status`
- `created_at`

### dataset_file
- `file_key`
- `dataset_key`
- `version_key`
- `filename`
- `content_type`
- `size_bytes`
- `sha256`
- `preview_url`
- `is_duplicate`

### dataset_access_request
- `request_id`
- `dataset_key`
- `version_key`
- `requester`
- `status`
- `reason`
- `approved_by`
- `approved_at`

### dataset_processing_job
- `job_id`
- `dataset_key`
- `version_key`
- `job_type`
- `status`
- `dedup_strategy`
- `message`
- `created_at`

## 后续数据库化注意事项

- 查看权限与下载权限必须分层建模，避免后续混在一张授权表里难以演进。
- 文件 hash 应保留唯一索引策略扩展点，但首版是否全局唯一需要业务再次确认。
- 若切对象存储，应将物理路径与业务文件元数据解耦。
