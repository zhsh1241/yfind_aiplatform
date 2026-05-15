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
