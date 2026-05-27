# 测试计划：数据集名称乱码兜底

## 回归用例

1. **数据集列表/详情名称兜底**
   - 插入一个名称为 `乱码数据集A` 的 ACTIVE 数据集。
   - 请求 `/api/v1/datasets` 和 `/api/v1/datasets/{id}`。
   - 断言返回名称不包含 `乱码`，且使用稳定兜底名称。

2. **标注候选/标准画像同步兜底**
   - 对同一个乱码数据集请求 annotation candidate 与 data standard profile。
   - 断言 `datasetName` 不再暴露乱码。

## 验证命令

```powershell
mvn -pl smp-app "-Dtest=DataManagementControllerTest#datasetResponsesFallbackUnreadableNames" test
node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration
```
