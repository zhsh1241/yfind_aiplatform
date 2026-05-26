# Bugfix Test Plan

## Scope
- Pipeline 编辑器画布布局、节点拖拽、节点删除、保存与视频预处理运行链路。

## Reproduction
- 打开 `/pipeline`，确认右侧算子库与节点配置上下堆叠显示。
- 在画布中拖拽节点，确认位置即时更新。
- 删除一个中间节点并保存，确认节点数减少、关联边同步移除、保存成功。
- 对视频数据集运行一次视觉预处理，确认输出为待确认 PREPROCESSED 图片数据集，并可确认/激活进入标注来源。

## Regression Cases
| ID | Scenario | Expected |
|---|---|---|
| BT-01 | 右侧 sidebar 显示 | 算子库与节点配置稳定显示，无重叠挤压 |
| BT-02 | 节点 pointer 拖拽 | 节点位置更新，画布可继续选择与编辑 |
| BT-03 | 删除中间节点 | 节点数减少，关联 edges 同步裁剪 |
| BT-04 | 删除后保存 | 保存请求提交最新 nodes/edges，后端返回成功 |
| BT-05 | 视频数据集运行 | 使用 `DATASET-WELD-VIDEO-001` 运行成功，输出 `IMAGE` 型 `PREPROCESSED` |
| BT-06 | 确认并激活预处理结果 | 状态从 `PENDING_CONFIRMATION -> CONFIRMED -> ACTIVE`，可进入标注来源 |

## Evidence
- `npm --prefix frontend run test:ci -- src/features/data/DataPages.test.tsx` ✅
- `npm --prefix frontend run build` ✅
- `npm --prefix frontend run e2e -- pipeline-editor-operator-marketplace.spec.ts` ✅
- 真实 API 验证结果见 `reports/real-video-dataset-verification.md` ✅
