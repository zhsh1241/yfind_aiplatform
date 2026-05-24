# Bug 说明：数据集详情页缺少进入标注工作台入口

## 基本信息

- Bug ID：BUG-20260521-dsdetail-annotation-entry
- 标题：`/dsdetail` 已存在标注任务时无法直接进入标注工作台
- 严重级别：Major
- 发现日期：2026-05-21
- 影响范围：数据集详情页、标注工作台路由进入体验、F012/F014 标注协同链路

## 复现步骤

1. 打开 `http://127.0.0.1:5173/dsdetail`。
2. 进入“标注任务/训练导出”页签。
3. 页面已展示该数据集已有标注任务。
4. 观察任务行操作区。

## 实际行为

用户只能看到“生成训练包”，没有“进入标注”或等价入口，无法从数据集详情页直达已有标注任务的工作台。

## 预期行为

对于已创建标注任务的数据集，用户应能在任务行直接点击“进入标注”，并跳转到对应任务的 `/annwork` 工作台。

## 根因分析

- `DatasetDetailPage` 已请求 `datasetAnnotationTasks(datasetId)`，但任务表格只渲染了导出按钮，没有进入工作台入口。
- `AnnotationWorkbenchPage` 默认只取 `/api/v1/annotation/tasks?status=IN_PROGRESS` 返回的第一条任务，未消费路由传入的 `taskId`，因此即使别处加了跳转，也无法稳定打开指定任务。

## 修复方案

- 在 `DatasetDetailPage` 的标注任务表新增“进入标注”按钮。
- 点击后跳转 `/annwork?taskId={taskId}`，并同时通过 route state 传递 `taskId`。
- 在 `AnnotationWorkbenchPage` 中优先读取 route state / query string 的 `taskId`，作为工作台详情查询目标。
- 在任务切换时重置工作台选中样本与同步态，避免沿用上一个任务的 UI 状态。

## 契约变更

不涉及后端接口变更；仅增强前端已有 API 消费与路由状态传递。
