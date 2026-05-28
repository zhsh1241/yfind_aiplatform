# 测试计划：Pipeline 调试模式与预处理产物格式修复

## 回归用例

1. **调试运行节点监控**
   - 以 `triggerMode=DEBUG` 运行 `PIPE-VIDEO-PREP`。
   - 断言响应 `debugMode=true`，`nodeRuns` 至少包含读取数据集与抽帧节点。
   - 断言节点日志包含步骤序号、输入、输出、状态和调试采样摘要。

2. **预处理输出不再打包 zip**
   - 调试运行后读取输出数据集详情。
   - 断言 `previewStatus=PREVIEWABLE`。
   - 断言绑定文件 `contentType` 全部为 `image/*`，`objectKey` 不以 `.zip` 结尾。

3. **既有视频抽帧确认/激活链路回归**
   - 运行 `videoPipelineRunCreatesPendingResultThenManualActivateForAnnotation`。
   - 确认 `PENDING_CONFIRMATION -> CONFIRMED -> ACTIVE` 后可创建标注任务。

## 验证命令

```powershell
mvn -pl smp-app "-Dtest=VisualPreprocessPipelineControllerTest#debugRunShowsNodeProgressAndCreatesUsableImageFilesInsteadOfZip,VisualPreprocessPipelineControllerTest#videoPipelineRunCreatesPendingResultThenManualActivateForAnnotation" test
npm --prefix frontend run build
```

