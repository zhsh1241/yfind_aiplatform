# Bug Fix Report

## Bug Information

- ID: BUG-20260527-video-frame-dataset-name-mojibake
- Title: 新建的视频抽帧输出数据集名称乱码
- Severity: Major

## Analysis

- Root Cause: Pipeline 运行创建 PREPROCESSED 数据集时直接使用 `pipeline.name() + " 输出"`。当 Pipeline 名称来自历史编码异常或前端异常输入时，输出数据集名称继承乱码。
- Affected Files:
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/PipelineService.java`
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/VisualPreprocessPipelineControllerTest.java`
- Related Features: F017 视觉预处理 Pipeline、视频抽帧输出 IMAGE 数据集。

## Solution

- Approach: 在输出数据集命名处增加不可读文本检测；若 Pipeline 名称不可读，则回退为“源数据集名称 + 抽帧结果/预处理结果”。
- Changes Made:
  - `PipelineService.java`: 新增 `outputDatasetName` 与 `isUnreadableText`，视频抽帧输出命名优先保证可读。
  - `VisualPreprocessPipelineControllerTest.java`: 新增乱码 Pipeline 名称的回归测试。

## Testing

- [x] 复现测试已添加
- [x] 单元/集成测试通过
- [x] 回归测试通过

## Contract Change

- [x] 不涉及 API 契约变更

## Verification

- [x] Bug 已修复
- [x] 无已知副作用
- [x] 文档已更新
