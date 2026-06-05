# Test Plan: F022 工作台、调度中心、告警中心与报表中心运营闭环

## 1. Backend
- `OperationsControllerTest`
  - AC-01/AC-09：admin 可看全局，BU 用户只看自身租户，跨 BU 明细不可见。
  - AC-02：工作台待办包含 OPEN 告警、PENDING 边端审批、FAILED/VERIFYING 任务。
  - AC-03：调度任务列表支持 `taskType/status` 过滤，队列摘要正确。
  - AC-04：调度助手返回 `TODO_CONFIRM_SCHEDULER_AI_ASSISTANT` seam 并写审计。
  - AC-05/AC-10：告警确认、关闭状态机和审计事件正确。
  - AC-06：告警规则含 `TODO_CONFIRM_OBSERVABILITY_PROVIDER` 与 `TODO_CONFIRM_NOTIFICATION_CHANNEL`。
  - AC-07/AC-08/AC-10：报表明细与导出请求生成 `PENDING` 记录、masked 下载 seam 和审计。
  - 异常：非法分页/枚举 40000、重复处理 40971、非法报表 42271、不可见告警 40400/40304。

## 2. Frontend Unit / Component
- `OperationsPages.test.tsx`
  - AC-01/AC-02：工作台渲染 summary、todo、activity 且非占位。
  - AC-03/AC-04：调度中心筛选任务并触发助手诊断。
  - AC-05/AC-06：告警中心打开详情、确认/关闭、显示规则 seam。
  - AC-07/AC-08：报表中心切换报表、提交导出并展示导出记录。
  - AC-11：四页均出现统一 hero、summary、catalog 关键内容。

## 3. E2E
- `frontend/e2e/dashboard-alert-report.spec.ts`
  - 登录后依次访问 `工作台`、`调度中心`、`告警中心`、`报表中心`。
  - 验证每页 `TASK-dashboard-alert-report` 与关键业务内容。
  - 告警中心执行确认或关闭主链路。
  - 报表中心触发导出请求。

## 4. Gates
- `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F022-dashboard-alert-report`
- `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F022-dashboard-alert-report`
- `mvn -f backend/pom.xml -pl smp-app -Dtest=OperationsControllerTest test`
- `npm --prefix frontend test -- OperationsPages.test.tsx`
- `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F022-dashboard-alert-report --skip-backend-integration`
- 本地条件允许时执行 `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F022-dashboard-alert-report --run-e2e`。
