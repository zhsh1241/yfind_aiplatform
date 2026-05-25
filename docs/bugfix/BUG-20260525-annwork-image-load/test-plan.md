# Bugfix Test Plan

## Scope
- 标注工作台 work-items 加载与图片显示链路。

## Reproduction
- 使用真实任务 `ANN-2B4A708CA1` 打开 `/annwork?taskId=ANN-2B4A708CA1`。
- 确认 `/api/v1/annotation/tasks/{taskId}/work-items` 返回旧数组结构时，页面仍能显示样本。

## Regression Cases
| ID | Scenario | Expected |
|---|---|---|
| BT-01 | work-items 返回分页对象 | 工作台正常显示样本 |
| BT-02 | work-items 返回旧数组 | 工作台仍能显示样本 |
| BT-03 | 指定真实任务 ANN-2B4A708CA1 | 页面能看到样本图片，不再空白 |

## Evidence
- 待补充
