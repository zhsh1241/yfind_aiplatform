---
feature: F022-dashboard-alert-report
status: frozen
frozen_at: 2026-06-05
owner: codex
---

# Contract: F022 工作台、调度中心、告警中心与报表中心运营闭环

## 1. API 统一规则
- Base path: `/api/v1/operations`。
- 所有 JSON 响应使用 `ApiResponse<T>`：`code/message/data/traceId/timestamp`。
- 所有接口必须校验 Bearer token，并复用 `PlatformIdentityService.requirePrincipal`。
- 读权限：`operations:dashboard:read`、`operations:scheduler:read`、`operations:alert:read`、`operations:report:read`。
- 写权限：`operations:alert:handle`、`operations:report:export`。
- 非 SUPER_ADMIN 只能访问自身 `tenantId` 数据；SUPER_ADMIN 可全局汇总并可用 `tenantId` 过滤。

## 2. Endpoints

### Dashboard
- `GET /dashboard/overview?tenantId=&from=&to=` -> `OperationsDashboardOverview`
- `GET /dashboard/todos?type=&status=&page=&pageSize=` -> `PageResponse<OperationsTodo>`
- `GET /dashboard/activities?page=&pageSize=` -> `PageResponse<OperationsActivity>`

### Scheduler
- `GET /scheduler/overview?tenantId=&from=&to=` -> `SchedulerOverview`
- `GET /scheduler/tasks?taskType=&status=&tenantId=&page=&pageSize=` -> `PageResponse<SchedulerTask>`
- `POST /scheduler/assistant:diagnose` body `SchedulerAssistantRequest` -> `SchedulerAssistantResponse`

### Alerts
- `GET /alerts?severity=&status=&sourceType=&tenantId=&page=&pageSize=` -> `PageResponse<OperationAlert>`
- `GET /alerts/{alertId}` -> `OperationAlertDetail`
- `POST /alerts/{alertId}/acknowledge` body `AlertHandleRequest` -> `OperationAlert`
- `POST /alerts/{alertId}/resolve` body `AlertHandleRequest` -> `OperationAlert`
- `GET /alerts/rules` -> `List<OperationAlertRule>`

### Reports
- `GET /reports/overview?tenantId=&from=&to=` -> `OperationsReportOverview`
- `GET /reports/{reportType}?tenantId=&from=&to=` -> `OperationsReportDetail`
- `POST /reports/{reportType}/exports` body `ReportExportRequest` -> `ReportExportRecord`
- `GET /reports/exports?status=&page=&pageSize=` -> `PageResponse<ReportExportRecord>`

## 3. DTO 字段
- `OperationsMetric`: `key/name/value/unit/trend/status`。
- `OperationsDashboardOverview`: `metrics/alertsBySeverity/domainHealth/diagnostic`。
- `OperationsTodo`: `todoId/type/title/priority/status/sourceType/sourceId/tenantId/createdAt/dueAt/actionPath`。
- `OperationsActivity`: `activityId/action/resourceType/resourceId/operatorName/result/riskLevel/occurredAt/detail`。
- `SchedulerTask`: `taskId/taskType/name/status/tenantId/ownerId/startedAt/endedAt/durationMs/diagnostic/sourcePath`。
- `OperationAlert`: `alertId/title/severity/status/sourceType/sourceId/tenantId/ownerUserId/diagnostic/createdAt/acknowledgedAt/resolvedAt`。
- `OperationAlertDetail`: `alert/rule/timeline/relatedResource`。
- `OperationAlertRule`: `ruleId/name/severity/sourceType/conditionExpression/enabled/notificationChannel/status/diagnostic`。
- `OperationsReportDetail`: `reportType/title/filters/metrics/rows/drillDownSeam`。
- `ReportExportRecord`: `exportId/reportType/status/requestedBy/tenantId/format/filtersJson/downloadUrlMasked/diagnostic/requestedAt/completedAt`。

## 4. 状态机与错误码
- 告警状态：`OPEN -> ACKNOWLEDGED -> RESOLVED`。
- `RESOLVED` 告警再次确认或关闭返回 `40971`。
- 不存在或不可见告警返回 `40400`。
- 非法 reportType 返回 `42271`。
- 外部 provider 未配置时使用 `TODO_CONFIRM_*` diagnostic，不返回成功发送/采集描述。
- 非法分页/枚举按全局异常返回 `40000`。
- 无权限或跨 BU 写操作返回 `40304`。

## 5. 审计事件
- `OPERATION_ALERT_ACKNOWLEDGED`
- `OPERATION_ALERT_RESOLVED`
- `OPERATION_REPORT_EXPORT_REQUESTED`
- `OPERATION_SCHEDULER_ASSISTANT_DIAGNOSED`
- `OPERATION_CROSS_TENANT_ACCESS_DENIED`

所有写操作审计 detail 必须包含 `TASK-dashboard-alert-report` 与对应 AC 编号。

## 6. 前端契约
- 路由：`/dash`、`/sched`、`/alert`、`/report`。
- 页面标题分别为：`工作台`、`调度中心`、`告警中心`、`报表中心`。
- 页面必须显示 `TASK-dashboard-alert-report` 标签。
- 页面样式必须使用 `console-*` 通用类，不新增一套业务私有 hero/filter/table 样式。
