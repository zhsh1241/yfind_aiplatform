# 测试计划：数据集名称与元数据乱码兜底

## 回归用例

1. **数据集列表/详情名称兜底**
   - 插入一个名称为 `???????????` 的 ACTIVE 数据集。
   - 请求 `/api/v1/datasets` 和 `/api/v1/datasets/{id}`。
   - 断言返回名称不包含问号替代型乱码，且使用稳定兜底名称。

2. **数据集详情标签与描述兜底**
   - 同一数据集写入 `tags = "????,图片"` 与包含多段 `????` 的描述。
   - 请求 `/api/v1/datasets/{id}`。
   - 断言 `tags` 过滤不可读标签并保留可读标签；`description` 不再透出 `????`。

3. **标注候选/标准画像同步兜底**
   - 对同一个乱码数据集请求 annotation candidate 与 data standard profile。
   - 断言 `datasetName` 不再暴露问号替代型乱码。

4. **关联列表兜底**
   - 请求数据标准任务、数据集访问申请、标注源数据集与标注任务列表。
   - 断言关联接口中的数据集展示名使用同一稳定兜底规则。

## 验证命令

```powershell
mvn -pl smp-app "-Dtest=DataManagementControllerTest#datasetResponsesFallbackUnreadableNames" test
node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration
```
