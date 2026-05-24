# 测试计划

## 目标
验证 `/ann` 页面新建标注任务弹窗不会再静默选中错误数据集，并明确告知数据集范围。

## 用例
1. 打开 `/ann` 页面，进入“＋ 新建标注任务”弹窗。
2. 校验提示文案出现：仅展示可用于创建标注任务的 ACTIVE 图片数据集。
3. 校验“创建任务”按钮初始禁用，必须先选择数据集与模板。
4. 选择指定数据集后，自动带出该数据集的 `currentVersionId`。
5. 选择模板后，“创建任务”按钮可用。
6. 回归校验已有 `/dsdetail` 场景模板过滤测试仍通过。

## 验证命令
- `npm --prefix frontend run test:ci -- App.test.tsx`
- `npm --prefix frontend run lint`

## 风险关注
- Ant Design Select 在测试环境中的交互与真实浏览器略有差异，需依赖现有单元测试操作方式。
- lint 仍有既有 warning：`AppNavigation.tsx` 的 `react-refresh/only-export-components`，与本次修复无关。
