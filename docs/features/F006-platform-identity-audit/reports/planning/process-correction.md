# F006 规划流程纠偏记录

> 日期：2026-05-16
> 状态：纠偏中，当前 `plan.md` 不得作为已合规批准计划进入 `/build-feature`

## 1. 问题

F006 `platform-identity-audit` 初始规划过程中，直接复用了历史 `.omx` 中 `identity-org-permission` 相关产物，并为当前 feature 手工生成/归档了规划文件。该做法虽然内容方向与 F006 高度相关，但没有严格证明已针对当前准确 slug `platform-identity-audit` 重新执行完整 `$deep-interview` 与 `$ralplan` 流程。

因此，当前 F006 的 `plan.md` 只能视为草稿材料，不得进入实现阶段。

## 2. 违反的流程要求

- `/plan-feature` 阶段必须先针对当前 feature slug 真实执行 `$deep-interview`。
- `$deep-interview` 完成后必须再执行 `$ralplan`。
- 规划证据必须由 `archive-planning-artifacts` 从当前 slug 对应的 `.omx/specs` 与 `.omx/plans` 归档。
- 其他 slug 的历史产物只能作为参考输入，不得改名冒充当前 feature 的执行结果。

## 3. 立即约束

- 保持 `docs/features/F006-platform-identity-audit/plan.md` 为 `plan_status: draft`。
- 不创建 `TASK.md`、`contract.md`、`test-plan.md`。
- 不启动后端/前端实现。
- 不运行 `/build-feature`。

## 4. 正确恢复步骤

1. 清点并保留当前草稿作为参考材料。
2. 针对 `F006-platform-identity-audit` 重新执行 `$deep-interview`，重点确认：
   - F006 是否仅覆盖 `login`、`usermgmt`、`perm`；
   - `org`、`sys` 是否留给 F007；
   - 审计查询入口在 F006 的最小可交付范围；
   - 原型一致性验收粒度。
3. 归档当前 slug 的 deep-interview 产物：
   ```powershell
   node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F006-platform-identity-audit --stage deep-interview
   ```
4. 基于 deep-interview 结果执行 `$ralplan`。
5. 归档 ralplan 产物：
   ```powershell
   node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F006-platform-identity-audit --stage ralplan
   ```
6. 根据新产物重写 `plan.md`，仍保持 `plan_status: draft`，等待人审。
7. 人审批准后再运行：
   ```powershell
   node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F006-platform-identity-audit
   ```

## 5. 防复发规则

已在 `docs/features/README.md` 与 `AGENTS.md` 中补充强制门禁：不得复用/改名其他 slug 的 `.omx` 产物冒充当前 feature 的 `$deep-interview` / `$ralplan`；进入 `/build-feature` 前必须通过 `check-build-feature-prereqs`。
