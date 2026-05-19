# F011 原型对比报告

- **Feature**: `F011-pipeline-editor-operator-marketplace`
- **报告时间**: 2026-05-18 23:50（Asia/Shanghai）
- **结论**: PASS_WITH_NOTES

F011 对齐 `docs/prototype/SMP工业AI平台-原型v2.html` 的 `pipeline`、`opmarket`、`dsdetail`、`lineage` 页面语义，补齐 F010 明确未覆盖的完整 Pipeline 编辑器画布、运行历史、版本快照、全局变量和算子市场。

| 原型模块 | F011 对齐结果 |
| --- | --- |
| Pipeline 顶部工具栏 | 已实现 Pipeline 选择、添加算子、保存、保存快照、沙箱运行。 |
| 算子库/添加算子 | 已实现左侧算子库与抽屉式添加；支持搜索和卡片选择。 |
| DAG 画布 | 已实现 SVG 连线、节点卡片、选择和拖拽移动；非专业图库。 |
| 节点配置 | 已实现参数 JSON 编辑、状态、算子阶段和校验反馈。 |
| 运行历史 | 已展示 run 表，后端生成 run/node_run。 |
| 版本快照 | 已支持保存快照和恢复草稿。 |
| 全局变量 | 已展示 literal/env/secret 变量和 masked 值。 |
| 算子广场 | 已实现分类、搜索、详情、schema、Before/After、使用统计。 |
| 自定义算子 | 已实现 HTTP 自定义算子创建、提交审核、审核通过/驳回 seam。 |
| 数据血缘 | 沙箱运行成功后写入输出数据集与 `PIPELINE` 血缘。 |

## 说明

F011 未承诺 1:1 复刻专业 DAG 编辑器图库能力；当前实现遵守“不新增依赖”约束，以轻量 SVG/HTML 满足原型级可用闭环。真实调度、136+ 正式算子目录、外部 HTTP 生产调用和高级画布体验均作为后续独立能力处理。
