# Test Spec: F022 dashboard-alert-report

## 1. Test Strategy

F022 是跨域聚合功能，测试重点是：聚合口径、权限隔离、告警状态机、报表导出 seam、统一错误 envelope、前端四入口主链路。测试应优先用后端集成测试锁定 API 契约，再用 Vitest/E2E 覆盖页面展示和交互。

## 2. Backend Integration Tests

建议新增：`OperationsControllerTest`。

### P0 Cases

1. Dashboard overview
   - 超级管理员获取全局数据/模型/资源/边端/告警/任务指标。
   - BU 管理员仅获取本 BU 指标。
   - 无权限返回 `40304`。
2. Dashboard todos / activities
   - 返回边端审批、模型访问申请、告警、失败任务。
   - 跨 BU 待办不可见。
3. Scheduler tasks
   - 支持 type/status/bu/date filters。
   - 失败任务包含 diagnosticCode/diagnosticMessage。
   - AI assistant seam 返回 `TODO_CONFIRM_SCHEDULER_AI_ASSISTANT`。
4. Alerts
   - list/detail 支持 severity/status/source filters。
   - acknowledge: `OPEN -> ACKNOWLEDGED`，写审计。
   - resolve: `OPEN|ACKNOWLEDGED -> RESOLVED`，写审计。
   - `RESOLVED` 重复处理返回 `40971`。
5. Alert rules/channels
   - 创建规则校验 metric/severity/threshold。
   - 通知渠道不回显 secret；未配置外部 provider 返回 seam diagnostic。
6. Reports
   - overview 按 reportType 返回指标。
   - 不支持类型返回 `42271`。
   - export request 创建 `operation_report_export`，写审计，可查询状态。
7. Error envelope
   - 非法分页/日期/枚举返回 `40000`。
   - 不存在 alert/export 返回 `40400`。

## 3. Frontend Unit Tests

建议新增：`frontend/src/features/operations/OperationsPage.test.tsx`。

- Dashboard renders hero, summary cards, todos, activities.
- Scheduler filters task list and shows assistant seam.
- Alert center opens detail drawer and triggers acknowledge/resolve API.
- Report center switches report type, applies filters and creates export request.
- Buttons hidden/disabled when session lacks required permission.
- Error envelope displays traceId/message.
- All pages use visible console style landmarks consistent with model center.

## 4. E2E Tests

新增：`frontend/e2e/dashboard-alert-report.spec.ts`。

Coverage:
- Login as admin.
- Open 工作台, assert total cards / todos / activities.
- Open 调度中心, filter failed tasks, view assistant suggestion seam.
- Open 告警中心, filter CRITICAL, open detail, acknowledge, resolve.
- Open 报表中心, filter BU/date, request export, assert status.
- Verify no “原型说明/占位页面” text remains on these four routes.

## 5. Traceability Matrix

| AC | Backend | Frontend Unit | E2E |
|---|---|---|---|
| AC-01 | overview global/BU tests | Dashboard summary | Dashboard route |
| AC-02 | todos/activities tests | Todo list | Dashboard route |
| AC-03 | scheduler filters | Scheduler table | Scheduler route |
| AC-04 | assistant seam | Assistant panel | Scheduler route |
| AC-05 | alert state tests | Alert actions | Alert route |
| AC-06 | rule/channel tests | Config seam | Alert route |
| AC-07 | report query tests | Report tabs/filter | Report route |
| AC-08 | export tests | Export action | Report route |
| AC-09 | permission tests | hidden buttons | optional no-permission route |
| AC-10 | audit assertions | n/a | n/a |
| AC-11 | n/a | style smoke | all routes |

## 6. Gates

- `mvn -f backend/pom.xml -pl smp-app -Dtest=OperationsControllerTest test`
- `npm exec vitest run src/features/operations/OperationsPage.test.tsx`
- `npm exec playwright test e2e/dashboard-alert-report.spec.ts`
- `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F022-dashboard-alert-report --run-e2e`
