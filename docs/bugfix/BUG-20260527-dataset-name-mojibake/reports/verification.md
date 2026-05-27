# 验证记录：数据集名称与元数据乱码兜底

## 验证时间

- 2026-05-27

## 命令与结果

| 命令 | 结果 |
| --- | --- |
| `mvn -pl smp-app "-Dtest=DataManagementControllerTest#datasetResponsesFallbackUnreadableNames" test`（在 `backend/` 下执行，13:54） | 通过：1 个回归测试通过 |
| `mvn -pl smp-app "-Dtest=DataManagementControllerTest#datasetResponsesFallbackUnreadableNames" test`（在 `backend/` 下执行，14:00） | 通过：1 个回归测试通过 |
| `node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration`（13:55） | 通过：后端 68 tests、AI adapter 4 tests、前端 lint/test/build 均通过；仅保留既有 lint/build warning |
| `node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration`（14:01 最终复跑） | 通过：后端 68 tests、AI adapter 4 tests、前端 lint/test/build 均通过；仅保留既有 lint/build warning |
| 登录后请求 `http://127.0.0.1:5173/api/v1/datasets/DATASET-5737D154DD` | 通过：`name` 返回 `视频数据集-D154DD`，`tags` 仅返回 `["MP4"]`，`description` 返回系统兜底说明，响应不再包含 `????` |

## 覆盖范围

- 数据集列表与详情 `name`。
- 数据集详情 `tags`：过滤 `????` 等不可读标签，保留可读标签；全部不可读时补充类型兜底标签。
- 数据集详情 `description`：不可读时返回系统兜底说明。
- 标注候选 `datasetName`。
- 数据标准画像 `datasetName`。
- 数据标准任务源/输出数据集名称。
- 数据集访问申请中的 `datasetName`。
- 标注源数据集与标注任务 `sourceDatasetName`。

## 结论

历史或异常写入的不可读数据集名称、标签和描述不再直接透出到主要 API 响应；当无法恢复原始可读名称时，使用 `{类型标签}数据集-{datasetId 尾号}` 或系统兜底说明稳定展示。历史库中的原始坏值暂不迁移。
