# 验证记录：视频抽帧输出数据集名称乱码修复

## 已执行

- `mvn -pl smp-app "-Dtest=VisualPreprocessPipelineControllerTest#videoPipelineRunFallsBackToReadableOutputDatasetNameWhenPipelineNameIsMojibake" test`
  - 结果：通过
  - 目的：验证乱码 Pipeline 名称下，抽帧输出数据集回退为源视频数据集可读名称。

- `mvn -pl smp-app "-Dtest=VisualPreprocessPipelineControllerTest#videoPipelineRunFallsBackToReadableOutputDatasetNameWhenPipelineNameIsMojibake,VisualPreprocessPipelineControllerTest#videoPipelineRunCreatesPendingResultThenManualActivateForAnnotation" test`
  - 结果：通过
  - 目的：验证新回归用例与既有视频抽帧确认/激活/标注来源链路兼容。

## 结论

修复已覆盖用户反馈的“新建的视频抽帧的数据集名字全是乱码”问题。输出数据集命名在检测到 Pipeline 名称不可读时，会使用源视频数据集名称生成“抽帧结果”。
