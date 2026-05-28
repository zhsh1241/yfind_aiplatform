# Bug：Pipeline 调试模式与预处理数据集产物不可用

- Bug ID：BUG-20260528-pipeline-debug-preprocessed-output
- 标题：Pipeline 编辑器缺少调试中间步骤监控，视频预处理输出数据集以 zip 打包导致不可用于后续标注
- 严重级别：Major
- 反馈来源：用户提出“pipeline编辑器是否可以增加调试模式，监控中间步骤是否成功执行，还有产出的预处理数据集无法使用，不应该打包成zip”。

## 预期行为

- Pipeline 编辑器支持调试模式运行，并能看到每个中间节点是否成功、耗时、输入/输出摘要。
- 视频抽帧类视觉预处理输出应创建 `PREPROCESSED / IMAGE` 数据集，并绑定 `image/*` 文件，数据集详情页应可预览并可在确认/激活后进入标注链路。
- 不应把抽帧结果作为单个 `application/zip` 产物绑定到图片型数据集。

## 实际行为

- 后端虽记录了 `pipeline_run_node`，但前端没有明确调试模式入口与步骤监控面板。
- 视频抽帧输出数据集 `data_type=IMAGE`，但绑定文件为 `output.zip` / `application/zip`，导致数据集详情页预览状态退化为 `UNSUPPORTED`，后续“图片数据集”语义不一致。

## 根因

`PipelineService#createOutputDataset` 在 `videoFrameMode=true` 时仍生成 `output.zip` 且 content type 为 `application/zip`；前端运行入口固定 `triggerMode=MANUAL`，没有向用户暴露调试模式，也没有在运行历史里便捷查看节点级运行详情。

## 影响范围

- 后端：Pipeline 运行、预处理数据集文件绑定、运行详情 DTO。
- 前端：`/pipeline` 编辑器运行入口、运行详情抽屉与历史记录操作。
