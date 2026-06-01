# Bug Fix Report

## Bug Information
- ID: BUG-20260601-segmentation-export-images
- Title: 图像分割训练包 zip 缺少原图片
- Severity: Major

## Analysis
- Root Cause: 非 YOLO zip 导出路径没有写入样本图片，导致 `packageIncludesImages=true` 与包内容不一致。
- Affected Files:
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/AnnotationService.java`
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/VisualPreprocessPipelineControllerTest.java`
- Related Features: 标注任务发布与训练包导出。

## Solution
- Approach: 复用已审核样本读取逻辑，在 `SEGMENTATION_MASK_MANIFEST` 等 zip 导出中写入原图片副本。
- Changes Made:
  - `AnnotationService.java`: 非 YOLO zip 分支新增 `writeApprovedImages()`，并根据 `sample_key` 保留图片扩展名。
  - `VisualPreprocessPipelineControllerTest.java`: 新增真实抽帧分割标注导出回归测试，校验 zip 图片存在且 hash 匹配源文件。

## Testing
- [x] 复现测试已添加
- [x] 单元/集成测试通过
- [x] 回归测试通过

## Contract Change
- [x] 不涉及契约变更

## Verification
- [x] Bug 已修复
- [x] 无已知副作用
- [x] 文档已更新

## Evidence
- `mvn -pl smp-app -Dtest=VisualPreprocessPipelineControllerTest#segmentationMaskExportIncludesOriginalImagesFromPreprocessedDataset test`：通过。
- `mvn -pl smp-app -Dtest=VisualPreprocessPipelineControllerTest test`：通过，8 tests / 0 failures / 0 errors。

## Notes
- 修复不会 retroactively 修改已经生成过的旧导出包；用户需要重新点击“生成训练包”下载新的 zip。
