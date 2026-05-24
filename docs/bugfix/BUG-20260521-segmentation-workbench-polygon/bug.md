# Bugfix Template

## Metadata
- Bug ID: BUG-20260521-segmentation-workbench-polygon
- Title: 图片分割任务在原生标注工作台中仍按框标注实现
- Status: fixed
- Created: 2026-05-21
- Owner: Codex

## Symptom
- 用户创建了 `IMAGE_SEGMENTATION` 图片分割标注任务后，进入原生标注工作台看到的仍是“矩形框/椭圆框/框选保存”的交互。
- 保存的 `annotationJson` 结构也是 `boxes`，与图片分割任务语义不一致。

## Expected vs Actual
- 预期：图片分割任务应以多边形区域或 mask 为核心进行标注，至少支持 polygon 点选并保存 `polygons` 点集。
- 实际：前端工作台虽然在模板层声明了 `POLYGON`，但原生工作台仍以 `boxes` 为核心状态与保存结构，只是把部分 polygon 展示伪装成框的变体。

## Root Cause
- `AnnotationWorkbenchPage` 的编辑器状态、历史快照、保存 payload、AI 预标注和右侧属性面板全部围绕 `boxes` 建模。
- `IMAGE_SEGMENTATION` 缺少独立的 `polygons` 数据结构与 scene-aware 渲染/保存逻辑。
- 工作台读取 `taskId` 时优先依赖 `window.location.search`，在测试/路由上下文中不够稳健。

## Fix Plan
- 为工作台补充 `AnnotationPolygon` 与 `polygons` 历史快照结构。
- `IMAGE_SEGMENTATION` 场景改为 polygon 点选/闭合交互，并保存为 `annotationJson.polygons`。
- 为 polygon 补充顶点级编辑：选中、拖拽、删除单个顶点，并限制最少保留 3 个顶点。
- `IMAGE_TAGGING` 保持 box 工作流不变。
- 更新回归测试，验证分割任务不再以 box 作为主编辑模型，且支持顶点编辑。

## Verification
- 前端单测通过，覆盖分割工作台 polygon 渲染与入口链路。
- 前端 lint 通过（仅保留既有 warning）。

## Regression Risk
- 中：改动集中在原生标注工作台状态机与场景分支，但未改后端契约；需继续观察真实拖拽、双击闭合与连续顶点编辑体验。
