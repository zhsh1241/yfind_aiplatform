# PRD: F022 dashboard-alert-report（工作台 / 调度中心 / 告警中心 / 报表中心）

## 1. 背景

F006~F021 已逐步完成平台身份/权限/审计、组织配置、资源视图、数据源/数据集、标注、预处理、模型注册/评估和边端下发。当前 `/dash`、`/sched`、`/alert`、`/report` 仍主要为占位或原型语义，缺少可审计、可筛选、可验收的真实运营入口。F022 需要把已有事实源聚合成一期运营闭环。

## 2. 目标用户

- 超级管理员：查看全局运营态势、告警、安全合规和报表。
- BU 子管理员：查看本 BU 任务、资源、数据/模型资产和待办风险。
- 模型应用/运维工程师：查看调度队列、失败诊断、边端运行与告警处理。
- 安全管理员（可由超级管理员兼任）：处理高危审计/安全告警。

## 3. 核心能力

### 3.1 工作台 `/dash`

- 平台总览指标：数据集、模型版本、边端节点、资源池、待处理告警、失败任务。
- 待办列表：边端下发审批、模型访问申请、数据访问申请、告警确认、失败任务。
- 近期活动：审计事件、状态流转、报表导出请求。
- 风险提醒：CRITICAL 审计、离线边端、失败下发、资源水位告警。

### 3.2 调度中心 `/sched`

- 统一任务实例视图：数据同步/采样、预处理 pipeline、标注导出、模型评估、边端下发等已存在任务或事件投影。
- 队列摘要：任务类型、状态、优先级、BU、排队/运行/失败数量。
- 失败诊断：失败原因、diagnosticCode、关联资源。
- 调度助手 seam：返回基于当前队列/失败原因的静态规则建议，标记 `TODO_CONFIRM_SCHEDULER_AI_ASSISTANT`，不宣称真实 AI 调度。

### 3.3 告警中心 `/alert`

- 告警统计：总数、严重、警告、信息、未处理、处理中、已关闭。
- 告警列表：级别、来源、资源、BU、状态、触发时间、摘要、诊断。
- 告警详情：上下文、建议处理方案、关联审计/资源/任务。
- 处理动作：acknowledge / resolve，必须写审计。
- 规则配置与通知渠道 seam：展示与轻量持久化配置占位；外部通知渠道保持 `TODO_CONFIRM_ALERT_NOTIFICATION_CHANNEL`。

### 3.4 报表中心 `/report`

- 平台总览看板：资产、任务、告警、资源、边端维度。
- 专项报表：数据资产、模型资产、资源使用、任务执行、边端运行、安全合规。
- 过滤：时间范围、BU、项目、资源类型。
- 下钻 seam：点击 BU/项目返回明细列表或 diagnostic。
- 导出请求 seam：生成 `PENDING/READY/FAILED` 状态记录与审计；复杂 PDF/定时推送不做。

## 4. 方案选择（RALPLAN-DR）

### Principles

1. 复用事实源，不创建平行业务事实。
2. 占位外部能力必须透明 seam，不得 mock 成已接入。
3. 四个页面统一模型中心 console-* 风格。
4. 权限和审计默认开启。
5. 一期优先可演示、可验证、可回归。

### Decision Drivers

1. F022 是一期闭环验收入口，必须跨域聚合但避免重做各域业务。
2. 外部监控/通知/报表模板未确认，需要可替换 seam。
3. 前端已有菜单占位，改造价值高且范围可控。

### Options

| 选项 | 优点 | 缺点 | 结论 |
|---|---|---|---|
| A. 单一 Operations 聚合域 + 轻量告警/导出事实表 | 复用现有域事实源；边界清晰；易测试 | 聚合 SQL/DTO 较多 | 采用 |
| B. 直接接入 Prometheus/IM/PDF 全链路 | 更接近生产终态 | 外部输入未确认，风险高 | 拒绝 |
| C. 仅前端静态报表/告警 mock | 快 | 违反核心能力不得 mock 化 | 拒绝 |
| D. 每个域各自实现报表/告警 API | 域自治 | 重复、口径分裂 | 拒绝 |

## 5. 数据与接口草案

### 5.1 新增/复用数据

必须复用：
- `platform_audit_log` / 平台审计事实。
- F006/F007 用户、组织、权限、系统配置。
- F008 资源池/配额/PAI 资源事实。
- F009~F018 数据源、数据集、标注、pipeline/导出事实。
- F019/F020 模型、版本、评估事实。
- F021 边端服务器、下发任务事实。

可新增轻量表：
- `operation_alert_event`：告警事件投影与人工处理状态。
- `operation_alert_rule`：本地规则配置/seam。
- `operation_notification_channel`：通知渠道配置/seam，敏感字段只存 masked/secretRef。
- `operation_report_export`：报表导出请求与状态。

### 5.2 API 草案

- `GET /api/v1/operations/dashboard/overview`
- `GET /api/v1/operations/dashboard/todos`
- `GET /api/v1/operations/dashboard/activities`
- `GET /api/v1/operations/scheduler/overview`
- `GET /api/v1/operations/scheduler/tasks`
- `GET /api/v1/operations/scheduler/assistant-suggestions`
- `GET /api/v1/operations/alerts`
- `GET /api/v1/operations/alerts/{alertId}`
- `POST /api/v1/operations/alerts/{alertId}/actions:acknowledge`
- `POST /api/v1/operations/alerts/{alertId}/actions:resolve`
- `GET/POST /api/v1/operations/alert-rules`
- `GET/POST /api/v1/operations/notification-channels`
- `GET /api/v1/operations/reports/overview`
- `GET /api/v1/operations/reports/{reportType}`
- `POST /api/v1/operations/reports/{reportType}/exports`
- `GET /api/v1/operations/report-exports/{exportId}`

## 6. 权限与审计

权限草案：
- `ops:dashboard:read`
- `ops:scheduler:read`
- `ops:scheduler:advise`
- `ops:alert:read`
- `ops:alert:handle`
- `ops:alert:configure`
- `ops:report:read`
- `ops:report:export`

审计事件草案：
- `OPERATION_ALERT_ACKNOWLEDGED`
- `OPERATION_ALERT_RESOLVED`
- `OPERATION_ALERT_RULE_CREATED`
- `OPERATION_NOTIFICATION_CHANNEL_CONFIGURED`
- `OPERATION_REPORT_EXPORT_REQUESTED`
- `OPERATION_REPORT_EXPORT_READY`
- `OPERATION_DASHBOARD_ACCESS_DENIED`

## 7. 错误码草案

- `40000` 参数格式错误。
- `40304` 跨 BU 或权限不足。
- `40400` 告警/报表导出记录不存在。
- `40971` 告警状态不允许当前操作（如已关闭重复关闭）。
- `42271` 报表类型不支持或过滤维度不支持。
- `50371` 外部观测/通知 provider 未配置（仅 seam 场景）。

## 8. 前端方案

新增 operations feature：
- `frontend/src/features/operations/DashboardPage.tsx`
- `SchedulingCenterPage.tsx`
- `AlertCenterPage.tsx`
- `ReportCenterPage.tsx`
- `OperationsPage.test.tsx`

改造：
- `App.tsx` 将 `/dash`、`/sched`、`/alert`、`/report` 接入真实页面。
- `platformApi.ts` 新增 operations API client。
- 页面全部使用 `console-*` 风格。
- 新增 Playwright：`frontend/e2e/dashboard-alert-report.spec.ts`。

## 9. Acceptance Criteria Draft

- AC-01 工作台展示跨域总览指标且按权限过滤。
- AC-02 工作台待办和近期活动来自真实后端聚合。
- AC-03 调度中心展示统一任务列表、队列摘要和失败诊断。
- AC-04 调度助手 seam 返回建议并展示 TODO_CONFIRM 状态。
- AC-05 告警中心支持统计、筛选、详情、acknowledge、resolve。
- AC-06 告警规则/通知渠道配置保留 seam 并不存明文密钥。
- AC-07 报表中心支持多报表类型、过滤、下钻 seam。
- AC-08 报表导出请求可创建、查询状态并写审计。
- AC-09 权限/跨 BU 隔离覆盖四个入口。
- AC-10 关键写操作写审计，高危告警与 PLT-011 对齐。
- AC-11 前端统一模型中心 console 风格并有 E2E 主链路。

## 10. Risks / Follow-ups

- 外部观测 provider 未确认：保留 `TODO_CONFIRM_OBSERVABILITY_PROVIDER`。
- 通知渠道未确认：保留 `TODO_CONFIRM_ALERT_NOTIFICATION_CHANNEL`。
- ITSM 未确认：保留 `TODO_CONFIRM_ITSM_INTEGRATION`。
- 报表模板/PDF 未确认：保留 `TODO_CONFIRM_REPORT_EXPORT_TEMPLATE`。
- 训练/中心推理二期：调度中心只能展示已有任务/事件投影，不实现二期调度。
