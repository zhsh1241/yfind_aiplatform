# Bug Fix Report

## Bug Information
- ID: BUG-20260521-segmentation-workbench-polygon
- Title: 图片分割任务原生工作台错误使用框标注
- Severity: Major

## Analysis
- Root Cause: 工作台内部编辑状态长期只支持 `boxes`，虽然模板层把 `IMAGE_SEGMENTATION` 定义为 `POLYGON`，但原生工作台没有真正区分 `IMAGE_TAGGING` 与 `IMAGE_SEGMENTATION` 的交互与保存结构。
- Affected Files: `frontend/src/features/data/DataPages.tsx`, `frontend/src/App.test.tsx`
- Related Features: F012 标注集成、F014 数据集标注任务导出

## Solution
- Approach: 保持 box 场景不变，在工作台增加 scene-aware 状态机；对 `IMAGE_SEGMENTATION` 使用 polygon 数据结构、polygon 保存 payload、polygon 属性面板，并补上顶点选中/拖拽/删除的最小可用编辑闭环。
- Changes Made:
  - `frontend/src/features/data/DataPages.tsx`: 增加 `AnnotationPolygon`、`polygons` 历史快照、按 scene 解析/保存 `annotationJson`、图片分割 polygon 工作流与点选闭合按钮。
  - `frontend/src/features/data/DataPages.tsx`: 修正工作台通过 `react-router location.search` 读取 `taskId`，避免路由上下文不一致。
  - `frontend/src/features/data/DataPages.tsx`: 增加 polygon 顶点选中、删除按钮、Delete 键行为、顶点属性展示与 pointer 拖拽更新。
  - `frontend/src/App.test.tsx`: 增加分割工作台回归测试，验证 polygon 控件、顶点删除与最小顶点保护。

## Testing
- [x] 复现测试已添加
- [x] 单元测试通过
- [ ] 集成测试通过
- [x] 回归测试通过

## Contract Change
- [x] 不涉及契约变更
- [ ] 契约已更新: N/A

## Verification
- [x] Bug 已修复
- [x] 无副作用
- [x] 文档已更新

## Evidence
- 2026-05-21 执行：`npm --prefix frontend run test:ci -- App.test.tsx`
- 2026-05-21 执行：`npm --prefix frontend run lint`

## Known Gaps
- 当前为 polygon 点选/顶点编辑实现，不含 brush/mask。
- 尚未支持 polygon 洞编辑、多区域批量操作，也未执行 Playwright E2E；顶点拖拽主要做了组件级验证，真实浏览器拖拽建议后续补端到端回归。
- lint 仍有既有 warning：`frontend/src/components/AppNavigation.tsx` 的 `react-refresh/only-export-components`，与本次修复无关。
