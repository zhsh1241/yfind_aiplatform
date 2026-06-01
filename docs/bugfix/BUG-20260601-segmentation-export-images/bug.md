# Bugfix: 分割训练包缺少原图片

## Metadata
- Bug ID: BUG-20260601-segmentation-export-images
- Title: 图像分割训练包 zip 缺少原图片
- Status: fixed
- Created: 2026-06-01
- Owner: Codex

## Symptom
- 用户在“测试数据集”的图像分割标注任务中生成并下载训练包后，zip 内只有 `manifest.json` 与 `annotations/labels.jsonl`，没有原始图片文件。
- 导出接口返回的 `packageIncludesImages=true` 与实际包内容不一致，训练包不可直接用于后续训练准备。

## Expected vs Actual
- Expected: `SEGMENTATION_MASK_MANIFEST` 导出的 zip 应为自包含训练包，包含标注清单与 `images/` 下的原图片副本。
- Actual: 非 YOLO zip 导出路径只写入 manifest 与 labels，没有写入图片。

## Root Cause
- `AnnotationService.zipExportPayload()` 中只有 `YOLO_DETECTION` 分支调用了样本图片读取与 zip 写入逻辑。
- `SEGMENTATION_MASK_MANIFEST` 走通用非 YOLO 分支，该分支没有复用已审核样本图片写入逻辑，导致包内容与 `packageIncludesImages=true` 不一致。

## Fix Plan
- 在非 YOLO zip 导出路径写入已审核样本图片副本。
- 分割格式使用 `images/frame-0001.<ext>` 目录结构，其他 zip 格式保留 `images/train/` 结构。
- 从 `annotation_work_item.sample_key` 提取原始扩展名，避免 JPEG/PNG 等图片类型被固定改成 `.jpg`。
- 增加端到端回归测试：真实视频预处理抽帧 -> 分割标注 -> 发布数据集 -> 导出训练包 -> 校验 zip 含原图且 hash 匹配源抽帧图片。

## Verification
- `mvn -pl smp-app -Dtest=VisualPreprocessPipelineControllerTest#segmentationMaskExportIncludesOriginalImagesFromPreprocessedDataset test`
- `mvn -pl smp-app -Dtest=VisualPreprocessPipelineControllerTest test`

## Regression Risk
- 中等：复用了 YOLO 样本读取逻辑，影响 zip 类导出包体积与内容，但不改变数据库 schema、配置或前端契约。
- 已通过既有 YOLO 导出相关测试所在的 `VisualPreprocessPipelineControllerTest` 全量回归。
