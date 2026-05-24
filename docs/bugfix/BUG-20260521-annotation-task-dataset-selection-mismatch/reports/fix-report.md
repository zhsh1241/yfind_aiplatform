# Bug Fix Report

## Bug Information
- ID: BUG-20260521-annotation-task-dataset-selection-mismatch
- Title: 标注任务创建页数据集选择与数据集查询页不一致
- Severity: Major

## Analysis
- Root Cause: `/ann` 页面与数据集查询页使用了不同筛选逻辑，且 `/ann` 新建任务弹窗额外把第一个 ACTIVE 图片数据集作为静默默认值，导致用户误以为系统自动沿用了另一条数据集上下文。
- Affected Files: `frontend/src/features/data/DataPages.tsx`, `frontend/src/App.test.tsx`
- Related Features: F014 数据集标注任务创建/导出

## Solution
- Approach: 保持“仅 ACTIVE 图片数据集可创建标注任务”的业务约束不变，只修复体验问题：去掉静默默认值，要求用户显式选择，并补充范围提示。
- Changes Made:
  - `frontend/src/features/data/DataPages.tsx`: 新建任务弹窗改为必须手选数据集；增加范围说明；选择数据集后自动带出 `currentVersionId`；模板继续按场景过滤；无完整选择时禁用提交。
  - `frontend/src/App.test.tsx`: 增加回归测试，验证初始禁用、显式选集、版本自动回填、完成模板选择后才允许创建。

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
- 未执行真实浏览器 E2E。
- lint 仍有既有 warning：`frontend/src/components/AppNavigation.tsx` 的 `react-refresh/only-export-components`，与本次修复无关。
