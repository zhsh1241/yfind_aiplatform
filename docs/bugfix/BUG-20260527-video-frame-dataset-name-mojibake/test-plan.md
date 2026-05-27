# 测试计划：视频抽帧输出数据集名称乱码修复

## 回归用例

1. **乱码 Pipeline 名称兜底**
   - 新建一个视觉预处理 Pipeline，名称模拟为 `乱码视频抽帧Pipeline`。
   - 基于 `DATASET-WELD-VIDEO-001` 执行沙箱运行。
   - 断言输出数据集名称为可读的 `焊缝视频巡检数据集 抽帧结果`。

2. **既有抽帧链路不回退为乱码**
   - 保持 `PIPE-VIDEO-PREP` 抽帧运行生成 PREPROCESSED / IMAGE。
   - 断言预览、确认、激活和标注来源链路仍正常。

## 验证命令

```powershell
mvn -pl smp-app "-Dtest=VisualPreprocessPipelineControllerTest#videoPipelineRunFallsBackToReadableOutputDatasetNameWhenPipelineNameIsMojibake,VisualPreprocessPipelineControllerTest#videoPipelineRunCreatesPendingResultThenManualActivateForAnnotation" test
node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration
```
