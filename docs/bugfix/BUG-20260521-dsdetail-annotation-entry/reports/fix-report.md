# Bug Fix Report

## Bug Information
- ID: BUG-20260521-dsdetail-annotation-entry
- Title: 数据集详情页缺少进入标注工作台入口
- Severity: Major

## Analysis
- Root Cause: 数据集详情页任务表未提供进入工作台按钮；标注工作台也未支持按 taskId 直达。
- Affected Files: `frontend/src/features/data/DataPages.tsx`, `frontend/src/App.test.tsx`
- Related Features: F012 标注集成、F014 数据集标注任务导出

## Solution
- Approach: 采用最小前端修复，补任务行入口并让工作台优先消费 route state / query `taskId`。
- Changes Made:
  - `frontend/src/features/data/DataPages.tsx`: 数据集详情页任务表新增“进入标注”按钮；工作台支持按指定 `taskId` 打开。
  - `frontend/src/App.test.tsx`: 补充数据集标注候选/任务 mock，并新增从 `/dsdetail` 进入 `/annwork` 的回归测试。

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
- 2026-05-21 执行 `npm --prefix frontend run test:ci -- App.test.tsx`
- 2026-05-21 执行 `npm --prefix frontend run lint`
- 2026-05-21 执行 `npm --prefix frontend run build`
- 结果：测试 `11 passed`；lint 无 error（存在既有 warning：`AppNavigation.tsx` 的 `react-refresh/only-export-components`）；build 成功

## Known Gaps
- 未执行浏览器手工点击验证。
- 未执行 Playwright E2E。
