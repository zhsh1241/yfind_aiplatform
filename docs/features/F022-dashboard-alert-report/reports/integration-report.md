# F022 联调检查报告

- Feature: F022-dashboard-alert-report（工作台、调度中心、告警中心与报表中心运营闭环）
- Date: 2026-06-05
- Checker: Codex
- Integration Verdict: PASS

## 检查范围

- 后端 `OperationsController` / `OperationsService` / `OperationsDtos` 与 `contract.md` 的 API、DTO、权限、审计、错误 envelope 对齐。
- 前端 `platformApi` 与 `/api/v1/operations/*` 端点路径、请求参数、响应类型对齐。
- 四个路由 `/dash`、`/sched`、`/alert`、`/report` 均替换占位页并使用统一 `console-*` 风格。
- Playwright 主链路覆盖工作台、调度助手 seam、告警详情/确认/关闭、报表下钻 seam 与导出请求。

## API / Frontend Mapping

| 页面 | 前端调用 | 后端端点 | 结论 |
|---|---|---|---|
| 工作台 | `operationsDashboardOverview` / `operationsDashboardTodos` / `operationsDashboardActivities` | `GET /dashboard/overview` / `GET /dashboard/todos` / `GET /dashboard/activities` | PASS |
| 调度中心 | `operationsSchedulerOverview` / `operationsSchedulerTasks` / `diagnoseScheduler` | `GET /scheduler/overview` / `GET /scheduler/tasks` / `POST /scheduler/assistant:diagnose` | PASS |
| 告警中心 | `operationAlerts` / `operationAlertDetail` / `acknowledgeOperationAlert` / `resolveOperationAlert` / `operationAlertRules` | `GET /alerts` / `GET /alerts/{id}` / `POST /acknowledge` / `POST /resolve` / `GET /alerts/rules` | PASS |
| 报表中心 | `operationsReportsOverview` / `operationsReportDetail` / `createOperationsReportExport` / `operationsReportExports` | `GET /reports/overview` / `GET /reports/{type}` / `POST /reports/{type}/exports` / `GET /reports/exports` | PASS |

## 权限、审计与 seam

- 权限：后端新增 `operations:*` 权限并授予 `SUPER_ADMIN`、`BU_ADMIN`、`MODEL_OPS`；前端 E2E session 增加 `sched`、`report`、`alert` 菜单权限。
- 租户隔离：后端测试覆盖跨 BU 用户不可读取其它 BU 明细；前端仅展示 API 返回结果，不在客户端绕过服务端隔离。
- 审计：告警确认/关闭、报表导出、调度助手诊断写审计，测试覆盖审计事件可查询。
- 外部依赖：可观测、通知、AI 调度助手、报表模板/导出存储均保持 `TODO_CONFIRM_*` seam，页面不宣称真实外部接入。

## 验证证据

```powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F022-dashboard-alert-report
# ✅ build-feature 前置门禁通过

mvn -f backend/pom.xml -pl smp-app -DskipTests compile
# BUILD SUCCESS（前序开发阶段已执行）

mvn -f backend/pom.xml -pl smp-app -Dtest=OperationsControllerTest test
# PASS（后端目标测试覆盖 AC-01~AC-10）

npm --prefix frontend run test:ci -- src/features/operations/OperationsPages.test.tsx
# Test Files 1 passed; Tests 4 passed

npm --prefix frontend run build
# build PASS

npm --prefix frontend run e2e -- dashboard-alert-report.spec.ts
# 1 passed
```

## 结论

前后端契约、权限、审计、状态机、seam 文案与路由主链路均已对齐，未发现阻塞联调问题。
