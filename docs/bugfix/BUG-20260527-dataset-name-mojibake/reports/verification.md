# 验证记录：数据集名称乱码兜底

## 验证时间

- 2026-05-27

## 命令与结果

| 命令 | 结果 |
| --- | --- |
| `mvn -pl smp-app "-Dtest=DataManagementControllerTest#datasetResponsesFallbackUnreadableNames" test`（在 `backend/` 下执行） | 通过：1 个回归测试通过 |
| `node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration` | 通过：后端 68 tests、AI adapter 4 tests、前端 lint/test/build 均通过；仅保留既有 lint/build warning |

## 覆盖范围

- 数据集列表与详情 `name`。
- 标注候选 `datasetName`。
- 数据标准画像 `datasetName`。
- 数据标准任务源/输出数据集名称。
- 数据集访问申请中的 `datasetName`。
- 标注源数据集与标注任务 `sourceDatasetName`。

## 结论

历史或异常写入的不可读数据集名称不再直接透出到主要 API 响应；当无法恢复原始可读名称时，使用 `{类型标签}数据集-{datasetId 尾号}` 稳定兜底。
