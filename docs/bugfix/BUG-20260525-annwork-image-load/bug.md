# Bugfix

## Metadata
- Bug ID: BUG-20260525-annwork-image-load
- Title: 标注工作台 work-items 旧数组响应导致图片无法加载
- Status: in_progress
- Created: 2026-05-25
- Owner: Codex

## Symptom
- 打开 `http://127.0.0.1:5173/annwork?taskId=ANN-2B4A708CA1` 时，页面进入标注工作台但样本图片无法显示。
- 真实接口 `/api/v1/annotation/tasks/ANN-2B4A708CA1/work-items?page=1&pageSize=20` 返回 `data: AnnotationWorkItem[]`，而前端按分页对象 `data.items` 读取。

## Expected vs Actual
- Expected: 标注工作台能读取 work-items，并显示缩略图与当前样本图片。
- Actual: work-items 被解析为空，导致样本队列与图片区域缺失实际文件内容。

## Root Cause
- 前端 `dataApi.annotationWorkItems` 假设接口恒为分页对象。
- 真实联调环境仍存在旧形态数组响应，导致工作台状态构建失败。

## Fix Plan
- 前端对 `annotationWorkItems` 增加数组/分页双形态兼容归一化。
- 增加回归测试，覆盖旧数组响应下工作台仍能显示样本。

## Verification
- 待补充

## Regression Risk
- 风险较低，仅限 `annotationWorkItems` 响应归一化。
