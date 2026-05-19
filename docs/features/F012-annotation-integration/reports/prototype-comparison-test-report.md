# F012 原型对比报告

- **Feature**: `F012-annotation-integration`
- **报告时间**: 2026-05-19（Asia/Shanghai）
- **结论**: PASS_WITH_NOTES
- **原型来源**: `docs/prototype/SMP工业AI平台-原型v2.html`，页面 key：`ann`、`annwork`、`annreview`、`dsdetail`、`lineage`。

## 1. 对比矩阵

| 原型模块 | 原型能力 | F012 对齐结果 | 结论 |
| --- | --- | --- | --- |
| `ann` 页面标题 | 标注任务管理 | 已实现 `标注任务管理` 标题和业务副标题。 | PASS |
| `ann` 统计/任务列表 | 总览卡、任务 Tab、任务列表、状态/进度/质量评分 | 已实现全部任务、进行中、待审核、标签模板统计；任务 Tab 与表格字段齐备。 | PASS |
| `ann` 标签模板 | 标签模板入口、模板列表、配置语义 | 已实现标签模板抽屉、模板创建发布和 Label Studio config seam。 | PASS |
| `ann` 新建任务 | 选择数据集、配置模板、分派审核 | 已实现新建任务表单，后端强制 ACTIVE 数据集、PUBLISHED 模板和 DAT-004。 | PASS_WITH_NOTES：分派人员本期使用既有 seed 用户。 |
| `annwork` 工作台 | 样本队列、预标注、保存草稿、提交审核 | 已实现任务详情、样本队列、AI 预标注标签、草稿保存与提交审核。 | PASS |
| `annwork` 外部工具 | Label Studio 状态/同步 | 已实现未配置 Alert、同步 task seam 和 `TODO_CONFIRM_*` 诊断。 | PASS_WITH_NOTES：不嵌入真实 Label Studio iframe。 |
| `annreview` 审核 | 审核队列、通过、驳回、防自审 | 已实现审核列表、通过/驳回、驳回原因、DAT-004 文案与后端校验。 | PASS |
| `annreview` 发布 | 质量检查、发布标注数据集 | 已实现质量检查和发布按钮；后端发布 `ANNOTATED` 数据集。 | PASS |
| `dsdetail`/`lineage` | 标注结果与血缘可追溯 | 后端发布后写入 dataset/version/file 和 `ANNOTATION` lineage；前端现有数据集详情/血缘 seam 可消费。 | PASS_WITH_NOTES：F012 E2E 主要覆盖发布 API 响应，后端测试覆盖 lineage 查询。 |

## 2. 原型一致性说明

- 保留数据管理菜单下 `标注任务`、`标注工作台`、`标注审核` 的页面结构与中文文案语义。
- 未把原型页面降级为静态占位，三页均由 `/api/v1/annotation/*` 数据驱动。
- 未复制原型 JSX；按当前 React/Ant Design 6 工程模式重建。
- 未新增完整标注画布依赖；本期验收范围为平台控制面和外部工具 seam。

## 3. 非阻塞差异

- 真实 Label Studio 项目跳转、token、workspace、存储策略未知，保留 `TODO_CONFIRM_*` 并显示 `UNCONFIGURED`。
- AI 预标注仅展示配置与预测摘要，不调用真实模型服务。
- 像素级布局与专业标注画布不是 F012 目标；后续如需 1:1 标注绘制体验，应单独规划视觉/交互迭代。

## 4. 结论

F012 满足原型信息架构、页面结构、核心文案与主流程语义要求；差异均为已批准的外部系统/复杂画布边界，不阻塞交付。
