# Bugfix

## Metadata
- Bug ID: BUG-20260525-annwork-shortcuts
- Title: 标注工作台快捷键误修改既有标注且切样本未自动保存
- Status: fixed
- Created: 2026-05-25
- Owner: Codex

## Symptom
- 在标注工作台中使用数字快捷键或右侧标签列表切换类别时，会直接改写当前已完成的标注。
- 使用 Space 切换到下一张样本时，当前样本的新增/修改标注不会自动保存。

## Expected vs Actual
- Expected: 标签切换只影响后续新建标注，不应隐式修改既有标注；切换到下一张样本前应自动保存当前未保存的编辑。
- Actual: 既有标注会被误改类；Space 导航会丢失当前样本的未保存改动。

## Root Cause
- `selectClass` 同时承担“切换活动类别”和“修改选中标注类别”两种职责，导致快捷键/面板切类时污染当前已存在标注。
- 样本导航逻辑直接变更 `selectedIndex`，离开当前样本前没有检查 dirty 状态，也没有执行保存。

## Fix Plan
- 将类别切换收敛为仅更新活动类别，不再隐式改写已存在标注。
- 引入离开样本前的自动保存逻辑：存在未保存修改时，Space/箭头/点击切换样本前先静默保存。
- 增加快捷键回归测试，覆盖标签切换与自动保存行为。

## Verification
- `npx vitest run --testTimeout=15000 src/App.test.tsx`
- `npm run build`
- 已新增并通过的回归覆盖：
  - 目标检测快捷键 `W / E / P / 1-4 / Delete / D / Ctrl+Z / Ctrl+Y`
  - 分割任务 `Enter` 完成多边形
  - `Space / ArrowLeft / ArrowRight / 缩略图点击` 切样本前自动保存

## Regression Risk
- 风险集中在标注工作台前端状态管理与快捷键处理。
- 当前为最小改动：未引入新依赖，主要收敛标签切换副作用并统一导航入口。
