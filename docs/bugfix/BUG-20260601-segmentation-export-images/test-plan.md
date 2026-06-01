# Bugfix Test Plan: 分割训练包包含原图片

## Scope
- 后端标注训练包导出逻辑。
- 重点验证 `SEGMENTATION_MASK_MANIFEST` zip 包是否包含原图副本。
- 不修改数据库配置、Docker 配置或本地运行数据。

## Reproduction
1. 使用真实视频预处理 pipeline 生成抽帧图片数据集。
2. 基于输出数据集创建 `IMAGE_SEGMENTATION` 标注任务。
3. 提交分割 polygon 标注并让 work items 达到 `APPROVED`。
4. 发布标注数据集。
5. 导出 `SEGMENTATION_MASK_MANIFEST` 并下载 zip。
6. 解压检查是否存在 `images/frame-0001.jpg` 等原图文件。

## Regression Cases
| ID | Scenario | Expected |
|---|---|---|
| BT-01 | 分割标注任务导出 `SEGMENTATION_MASK_MANIFEST` | zip 包包含 `manifest.json`、`annotations/labels.jsonl`、`images/frame-0001.jpg` |
| BT-02 | zip 中图片内容完整性 | `images/frame-0001.jpg` 的 SHA256 命中源抽帧图片 SHA256 集合 |
| BT-03 | 既有真实视频预处理与 YOLO 导出回归 | `VisualPreprocessPipelineControllerTest` 全量通过 |

## Evidence
- 2026-06-01: `mvn -pl smp-app -Dtest=VisualPreprocessPipelineControllerTest#segmentationMaskExportIncludesOriginalImagesFromPreprocessedDataset test` 通过。
- 2026-06-01: `mvn -pl smp-app -Dtest=VisualPreprocessPipelineControllerTest test` 通过，8 tests / 0 failures / 0 errors。
