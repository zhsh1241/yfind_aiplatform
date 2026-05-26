# Bugfix

## Metadata
- Bug ID: BUG-20260526-pipeline-editor-delete-and-canvas
- Title: Pipeline 编辑器右侧布局异常、节点不可拖拽且不支持删除
- Status: fixed
- Created: 2026-05-26
- Owner: Codex

## Symptom
- 编辑器画布右侧算子库/配置区显示异常，布局挤压导致可读性差。
- 画布节点在浏览器中无法正常拖拽移动。
- 画布节点缺少删除能力，无法完成 DAG 精简与重排。

## Expected vs Actual
- Expected: 画布位于左侧，右侧稳定显示算子库与节点配置；节点可拖拽、可删除，删除后边关系同步更新并可正常保存运行。
- Actual: 右侧区域显示异常；原 `draggable/onDragEnd` 在现有实现下不生效；删除节点缺失且边不会随节点变更同步裁剪。

## Root Cause
- 编辑器三栏布局不适配现有页面宽度，算子库与配置面板争抢空间。
- 节点拖拽依赖原生 drag end，但按钮节点在当前 DOM/样式结构下未形成可用拖拽反馈。
- Pipeline 草稿态只维护了 `nodes`，未维护可编辑 `edges`，因此无法安全删除节点并同步清理关联边。

## Fix Plan
- 将编辑器改为“左侧画布 + 右侧 sidebar（算子库 + 节点配置）”两列布局。
- 节点拖拽改为 pointer events 驱动，并兼容 jsdom pointer capture 能力缺失场景。
- 新增 `draftEdges`，删除节点时同时裁剪关联边；保存时提交当前草稿 nodes/edges。
- 运行时样本数据集改为当前 pipeline 绑定的数据集，确保视频预处理链路使用真实视频数据集。

## Verification
- `npm --prefix frontend run test:ci -- src/features/data/DataPages.test.tsx`
- `npm --prefix frontend run build`
- `npm --prefix frontend run e2e -- pipeline-editor-operator-marketplace.spec.ts`
- 真实后端 API 验证：`PIPE-VIDEO-PREP` 对 `DATASET-WELD-VIDEO-001 / DVER-WELD-VIDEO-001` 完成删除后保存、运行、确认、激活

## Regression Risk
- 风险集中在 Pipeline 编辑器前端草稿态与 DAG 保存行为。
- 已控制为最小改动：未新增依赖，仅补齐边状态、删除动作和拖拽事件。
