# SQL / Migration Notes：数据资产 MVP

## 说明

F004 首版以内存型 MVP 服务验证领域边界，不引入真实数据库迁移。本文件记录后续持久化设计方向，供下一阶段数据库落地时复用。

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
