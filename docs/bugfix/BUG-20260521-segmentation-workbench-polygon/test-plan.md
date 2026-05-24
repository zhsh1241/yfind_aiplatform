# 测试计划

## 目标
验证图片分割任务在原生标注工作台中采用 polygon 区域而非 box 作为主交互模型。

## 用例
1. 进入普通图片打标任务工作台，确认仍可正常进入和显示样本队列。
2. 进入图片分割任务工作台，确认出现：
   - `开始多边形 P`
   - `完成多边形 Enter`
   - `当前分割区域属性`
3. 确认图片分割任务右侧属性区域显示 `annotation-polygon-count`，且不再显示 `annotation-box-count`。
4. 选中分割区域顶点后，确认右侧显示当前顶点编号/坐标，并可删除单个顶点。
5. 当 polygon 仅剩 3 个顶点时，继续删除应被阻止，区域仍保持合法多边形。
4. 回归确认：
   - `/ann` 任务列表仍可进入工作台
   - `ASSIGNED` 任务仍能自动开始后进入工作台
   - `/dsdetail` 模板过滤仍正常

## 验证命令
- `npm --prefix frontend run test:ci -- App.test.tsx`
- `npm --prefix frontend run lint`

## 风险关注
- 当前实现为 polygon 点选闭合/顶点编辑，不是 brush/mask；属于图片分割的最小可用实现。
- 顶点拖拽交互已实现，但本轮自动化主要覆盖选点/删点，真实浏览器中的 pointer drag 仍建议补 E2E。
