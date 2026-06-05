# F021 规划交接说明：边端服务器与模型下发

## 状态
- Feature: `F021-edge-management-delivery`
- 当前阶段：规划完成，等待人审批准
- 日期：2026-06-05
- 当前 `plan.md` 状态：`plan_status: draft`

## 已完成规划产物
- `docs/features/F021-edge-management-delivery/plan.md`
- `docs/features/F021-edge-management-delivery/reports/planning/deep-interview.md`
- `docs/features/F021-edge-management-delivery/reports/planning/prd.md`
- `docs/features/F021-edge-management-delivery/reports/planning/test-spec.md`
- `.omx/specs/deep-interview-edge-management-delivery.md`
- `.omx/plans/prd-edge-management-delivery.md`
- `.omx/plans/test-spec-edge-management-delivery.md`

## 人审重点
1. 确认 F021 是否按当前路线图作为 F020 后的下一功能推进。
2. 确认本期只做边端控制面与模型下发事实源，不实现真实 Agent/mTLS/传输协议。
3. 确认 `TODO_CONFIRM_EDGE_AGENT_PROTOCOL`、`TODO_CONFIRM_EDGE_MTLS_CERT_ROTATION`、`TODO_CONFIRM_EDGE_APPROVAL_INTEGRATION`、`TODO_CONFIRM_EDGE_ROLLBACK_COMMAND` 继续作为外部未确认项保留。
4. 确认必须复用 F019 模型版本事实源、F020 Production 门禁、平台文件 hash、平台身份/组织/审计，不新增平行事实源。
5. 确认 `/edge` 前端页面必须接入真实 API 并新增 Playwright E2E。

## 批准操作（人工执行）
审查通过后，将 `docs/features/F021-edge-management-delivery/plan.md` frontmatter 改为：

```yaml
plan_status: approved
approved_at: YYYY-MM-DD
```

然后运行：

```powershell
node tools/ai-scaffold/dist/cli.js check-plan-approved docs/features/F021-edge-management-delivery
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F021-edge-management-delivery
```

两者通过后，才能进入：

```powershell
/build-feature docs/features/F021-edge-management-delivery
```

## build-feature 预期首批输出
- `TASK.md`：将 plan 中 AC 草案转为稳定 AC-01~AC-10，并补充复用方案。
- `contract.md`：冻结 API、SQL、状态机、错误码、权限和审计事件。
- `test-plan.md`：覆盖 P0 权限、状态机、hash 校验、审计、前端真实 API 与 E2E。
- 后端 TDD：`EdgeManagementControllerTest` 先行。
- 前端：`EdgeManagementPage`、单测、`edge-management-delivery.spec.ts`。

## 当前阻塞说明
当前不能写 F021 业务实现代码，因为仓库硬门禁要求 `plan_status: approved` 且 `approved_at` 已填写。任何实现、契约或测试计划应在 `/build-feature` 门禁通过后再开始。
