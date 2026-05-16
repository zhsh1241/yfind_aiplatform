# Features

本目录用于正式功能交付包：`F{nnn}-{slug}`。

后续功能编号与拆解清单见 `docs/features/FEATURE_BREAKDOWN.md`。该清单保留 `F003`～`F020` 编号，并作为创建正式 feature 目录前的准备索引。

当前旧功能包已清空。后续每个功能必须基于 `docs/business/` 与 `docs/prototype/` 重新规划，并包含：

- `plan.md`：方案与范围，必须 `plan_status: approved` 后才可实现。
- `TASK.md`：需求、范围、AC-xx、复用/新增边界。
- `contract.md`：API/事件/权限/审计契约，状态需 frozen/implemented。
- `test-plan.md`：P0/P1/P2 测试与 AC 追溯。
- `reports/`：规划、联调、代码评审、QA、验证证据。
- `sql/`：数据库变更或 migration notes。

模板文件位于本目录根部；创建功能可使用：

```powershell
node tools/ai-scaffold/dist/cli.js init-feature --slug <slug> --title "<中文标题>"
```

## 强制流程门禁（不得绕过）

后续每个业务 feature 必须先完成 **真实的 `/plan-feature` 流程**，再进入 `/build-feature`。该流程不是“补文档”，而是功能开发的准入门禁。

### 1. 规划阶段顺序

1. 解析并创建/复用 `docs/features/F{nnn}-{slug}/`。
2. 针对当前 feature 的 **准确 slug** 执行 `$deep-interview`，并生成：
   - `.omx/specs/deep-interview-{slug}.md`
   - `.omx/interviews/*{slug}*.md`
3. 立即执行归档：
   ```powershell
   node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F{nnn}-{slug} --stage deep-interview
   ```
4. 基于该 deep-interview 产物执行 `$ralplan`，并生成：
   - `.omx/plans/prd-{slug}.md`
   - `.omx/plans/test-spec-{slug}.md`
5. 立即执行归档：
   ```powershell
   node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F{nnn}-{slug} --stage ralplan
   ```
6. 最后才能起草或更新 `plan.md`，且初始必须为：
   ```yaml
   plan_status: draft
   approved_at: ""
   ```

### 2. 禁止行为

- 禁止仅复用其他 slug 的 `.omx` 产物后改名，冒充当前 feature 的 `$deep-interview` / `$ralplan`。
- 禁止手工编写 `reports/planning/*.md` 来替代 `archive-planning-artifacts` 归档动作。
- 禁止在缺少 `.omx/specs/deep-interview-{slug}.md`、`.omx/plans/prd-{slug}.md`、`.omx/plans/test-spec-{slug}.md` 时进入 `/build-feature`。
- 禁止在 `plan_status: approved` 前编写业务实现代码、冻结契约或启动后端/前端开发。
- 禁止把原型页面长期停留在 mock/假接口；未知外部系统只能用 `TODO_CONFIRM_*`，核心业务流程必须由真实后端接口支撑。

### 3. 开发准入检查

进入 `/build-feature` 前必须执行并通过：

```powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F{nnn}-{slug}
```

通过条件包括：

- `plan.md` 已由人审改为 `plan_status: approved` 且 `approved_at` 非空。
- `reports/planning/deep-interview.md`、`prd.md`、`test-spec.md` 已归档。
- `.omx/specs/deep-interview-{slug}.md`、`.omx/plans/prd-{slug}.md`、`.omx/plans/test-spec-{slug}.md` 存在且 slug 与功能目录一致。

### 4. 原型一致性硬约束

所有涉及前端页面的 feature 必须在 `plan.md`、`TASK.md`、`contract.md` 或 `test-plan.md` 中明确列出对应原型页面 key 与截图资产。实现和 QA 必须对照：

- `docs/prototype/SMP工业AI平台-原型v2.html`
- `docs/prototype/SMP工业AI平台-原型v2-compiled.html`
- `docs/prototype/*.png`

除非 `plan.md` 明确批准，否则不得改变原型的信息架构、主文案、页面 key、核心布局、表格列、Tab、弹窗与主交互。

