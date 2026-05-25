# Bugfix Test Plan

## Scope
- 标注工作台快捷键与样本切换保存链路。

## Reproduction
- 进入 `/annwork`，创建/选中标注后切换标签，确认既有标注不会被隐式改类。
- 在当前样本新增标注后按 `Space` 切到下一张，确认先触发保存再切样本。

## Regression Cases
| ID | Scenario | Expected |
|---|---|---|
| BT-01 | 数字键/标签面板切换类别 | 仅切换活动类别，不改既有标注 |
| BT-02 | 创建两个标注并切换类别 | 前一个标注保留原类别，新标注使用新类别 |
| BT-03 | Space/ArrowRight 切样本 | 当前样本有未保存修改时先自动保存 |
| BT-04 | ArrowLeft/点击缩略图切样本 | 与 Space 一致，先保存后切换 |
| BT-05 | Ctrl+Z / Ctrl+Y / Delete / D / Enter | 维持既有快捷键能力不回归 |

## Evidence
- `npx vitest run --testTimeout=15000 src/App.test.tsx` ✅
- `npm run build` ✅
