# Bugfix Template

## Metadata
- Bug ID: BUG-20260521-annotation-task-dataset-selection-mismatch
- Title: 标注任务创建页数据集选择与数据集查询页不一致且存在静默默认值
- Status: fixed
- Created: 2026-05-21
- Owner: Codex

## Symptom
- 用户在数据集查询页看到的数据集集合，与 `/ann` 页面“＋ 新建标注任务”弹窗中的可选数据集不一致。
- 弹窗会静默默认选中第一个 ACTIVE 图片数据集，容易让用户误以为会沿用刚刚浏览的数据集。

## Expected vs Actual
- 预期：用户能明确知道标注任务创建页只允许选择可标注的数据集，且必须手动确认具体数据集。
- 实际：弹窗默认用 `activeDatasets[0]` 自动带入数据集和版本，导致与数据集查询页上下文产生错觉，出现“看起来选的不是同一个数据集”的体验问题。

## Root Cause
- 数据集查询页与标注任务创建页本身就是两套筛选逻辑：
  - 查询页展示“当前用户可见的数据集总览”；
  - 标注任务创建页只展示 `ACTIVE + IMAGE` 数据集。
- `AnnotationTasksPage` 额外存在静默默认值：`sourceDatasetId = activeDatasets[0]?.datasetId`，在未显式选择时就预填了第一个数据集。

## Fix Plan
- 去掉标注任务创建弹窗的数据集静默默认值，改为必须手动选择。
- 在弹窗中增加范围说明文案，明确“仅 ACTIVE 图片数据集”。
- 数据集选择后自动回填当前版本；模板继续按场景过滤，避免混淆。

## Verification
- 前端单测通过，覆盖“必须显式选择数据集”与版本自动回填。
- 前端 lint 通过（仅保留既有 warning）。

## Regression Risk
- 低：仅影响 `/ann` 页面新建任务弹窗默认值与提示文案，不改变后端接口契约。
