---
feature: F022-dashboard-alert-report
title: 工作台、调度中心、告警中心与报表中心运营闭环
plan_status: approved
approved_at: 2026-06-05
owner: codex
created_at: 2026-06-05
updated_at: 2026-06-05
---

# Plan: F022 工作台、调度中心、告警中心与报表中心运营闭环

## 0. Planning Evidence / 规划证据

本计划基于标准 `/plan-feature` 流程产物生成：

- Deep Interview：`reports/planning/deep-interview.md`
- PRD / Ralplan：`reports/planning/prd.md`
- Test Spec：`reports/planning/test-spec.md`
- Runtime Spec：`.omx/specs/deep-interview-dashboard-alert-report.md`
- Runtime PRD：`.omx/plans/prd-dashboard-alert-report.md`
- Runtime Test Spec：`.omx/plans/test-spec-dashboard-alert-report.md`

## 1. Intent / 背景与目标

F006~F021 已完成平台身份权限审计、组织配置、资源视图、数据源/数据集、标注、预处理、模型注册/评估和边端下发等一期核心业务切片。但当前 `/dash`、`/sched`、`/alert`、`/report` 仍主要停留在导航占位或原型语义，无法让平台管理员、BU 管理员和运维人员从统一运营入口看到跨域状态、风险、待办、趋势和处理闭环。

F022 的目标是在不引入外部可观测/通知/报表系统猜测实现的前提下，复用已有平台事实源，交付一期运营中心闭环：

- 工作台：跨域摘要、待办、近期活动、风险提醒。
- 调度中心：统一任务/队列/失败诊断视图与调度助手 seam。
- 告警中心：告警统计、筛选、详情、确认/关闭和规则/通知 seam。
- 报表中心：运营看板、专项报表、过滤、下钻 seam 与导出请求 seam。

## 2. Business / Prototype Sources

### 业务来源

- `docs/business/bizdocs/02-04-业务流程-平台运营.md`：平台运营、资源管理、平台监控与告警横向关联。
- `docs/business/bizdocs/03-05-系统功能-告警管理.md`：告警规则、自动触发、告警中心页面、告警处理、升级通知。
- `docs/business/bizdocs/05-05-系统功能-报表与看板.md`：平台运营看板、业务报表、报表过滤/导出/自定义看板。
- `docs/business/bizdocs/07-工作台与调度中心.md`：工作台 Dashboard 与 Scheduling Center 功能规格。
- `docs/business/domain/04-领域对象-平台域.md`：通知、审计、高危操作与平台角色。
- `docs/business/rules/05-平台与权限规则.md`：PLT-011 高危操作 CRITICAL 审计与告警、跨租户访问安全告警、账号锁定/停用告警。
- `docs/business/bizdocs/06-非功能性需求.md`：NFR-O02 监控与可观测性、NFR-S02 保留策略、NFR-C03 审计完整性。
- `docs/business/open-questions.md`：NFR/外部集成待确认项，特别是通知渠道、运维维护窗口、合规/报表模板。

### 原型来源

- `docs/prototype/SMP工业AI平台-原型v2.html` / compiled demo：nav key `dash`、`sched`、`alert`、`report`。
- 原型中告警中心包含告警统计、过滤、详情、处理、规则配置、通知渠道入口。
- 原型中调度中心包含任务队列、策略切换、AI 调度助手浮窗。
- 原型中报表中心包含运行/质量/资源/自定义看板、导出按钮与组件添加。

## 3. Desired Outcome

1. `/dash` 不再是占位页，展示真实后端聚合的运营总览、待办、近期活动与风险。
2. `/sched` 不再是占位页，展示已有任务/事件投影形成的统一调度视图、队列摘要、失败诊断和调度助手 seam。
3. `/alert` 不再是占位页，支持告警列表、筛选、详情、确认、关闭、规则与通知渠道 seam。
4. `/report` 不再是占位页，支持平台总览、数据资产、模型资产、资源使用、任务执行、边端运行、安全合规报表，支持过滤与导出请求 seam。
5. 四个页面全部按模型中心统一 `console-*` 风格实现。
6. 后端所有返回通过统一 API envelope，权限、跨 BU 隔离、审计和错误码可测试。

## 4. In Scope

### 4.1 后端

- 新增 Operations 聚合 Controller/Service/DTO。
- 聚合已有事实源：审计、资源、数据集/标注/pipeline、模型/评估、边端下发、用户/组织/权限。
- 新增轻量运营事实表（如需要）：
  - `operation_alert_event`
  - `operation_alert_rule`
  - `operation_notification_channel`
  - `operation_report_export`
- API：
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

### 4.2 前端

- 新增或等价实现 operations 页面：
  - `DashboardPage`
  - `SchedulingCenterPage`
  - `AlertCenterPage`
  - `ReportCenterPage`
- 改造 `App.tsx`：`/dash`、`/sched`、`/alert`、`/report` 接入真实页面。
- 扩展 `platformApi.ts`：新增 operations API client 与类型。
- 页面统一遵循 `docs/architecture/03-frontend-console-style-guide.md`。
- 新增 Vitest 与 Playwright E2E 覆盖主链路。

### 4.3 权限 / 审计 / 错误处理

- 权限草案：
  - `ops:dashboard:read`
  - `ops:scheduler:read`
  - `ops:scheduler:advise`
  - `ops:alert:read`
  - `ops:alert:handle`
  - `ops:alert:configure`
  - `ops:report:read`
  - `ops:report:export`
- 审计草案：
  - `OPERATION_ALERT_ACKNOWLEDGED`
  - `OPERATION_ALERT_RESOLVED`
  - `OPERATION_ALERT_RULE_CREATED`
  - `OPERATION_NOTIFICATION_CHANNEL_CONFIGURED`
  - `OPERATION_REPORT_EXPORT_REQUESTED`
  - `OPERATION_REPORT_EXPORT_READY`
  - `OPERATION_DASHBOARD_ACCESS_DENIED`
- 错误码草案：
  - `40000` 参数格式错误。
  - `40304` 跨 BU 或权限不足。
  - `40400` 告警/报表导出记录不存在。
  - `40971` 告警状态不允许当前操作。
  - `42271` 报表类型或过滤维度不支持。
  - `50371` 外部观测/通知 provider 未配置。

## 5. Out of Scope / Non-goals

- 不接入真实 Prometheus、Loki、OpenTelemetry、OpenSearch、Grafana。
- 不实现真实邮件、短信、钉钉、企业微信发送。
- 不实现外部 ITSM / 工单系统。
- 不实现拖拽式自定义看板。
- 不实现定时 PDF 附件推送或复杂报表模板。
- 不实现二期训练任务、中心端在线推理、批量推理真实调度。
- 不用前端静态 mock 伪装核心运营能力；未接入能力必须显示 `TODO_CONFIRM_*` seam。

## Reuse Strategy

### Must Reuse

- 身份、组织、权限、审计：复用 F006/F007 的 `PlatformIdentityService`、菜单权限、组织/BU 隔离、审计日志。
- 资源事实源：复用 F008 `ResourceManagementPage` / PAI 资源、资源池、配额、存储池等既有表和服务。
- 数据事实源：复用 F009/F015/F016/F017/F018 的数据源、同步任务、数据集、版本、文件、标注、pipeline、导出状态。
- 模型事实源：复用 F019/F020 模型、版本、评估、Production readiness 与活跃引用。
- 边端事实源：复用 F021 边端服务器、下发任务、审批、完整性校验、失败/回滚状态。
- API 与错误：复用统一 `ApiResponse<T>`、`PlatformException`、`GlobalExceptionHandler`。
- 前端风格：复用 `global.css` 的 `console-*` 语义类；不得为四个页面另起一套风格。
- 测试基座：复用 Spring Boot Controller integration test、Vitest/RTL、Playwright helpers。

### Duplication Rejected

- 拒绝新增与数据/模型/资源/边端平行的影子事实表来保存完整业务对象。
- 拒绝用前端静态 JSON 作为运营报表核心数据源。
- 拒绝新增独立权限、用户、组织或审计体系。
- 拒绝在 F022 中猜测外部监控系统、通知渠道、工单系统或 PDF 模板。

### Approved New Seams

- `TODO_CONFIRM_OBSERVABILITY_PROVIDER`
- `TODO_CONFIRM_ALERT_NOTIFICATION_CHANNEL`
- `TODO_CONFIRM_ITSM_INTEGRATION`
- `TODO_CONFIRM_REPORT_EXPORT_TEMPLATE`
- `TODO_CONFIRM_SCHEDULER_AI_ASSISTANT`

## 7. Decision Boundaries

Agent 在 build-feature 阶段可自行决定：

- Operations 聚合 DTO 字段与前端展示列。
- 轻量告警/导出表的字段细节。
- 只读聚合 SQL / service 查询组织方式。
- 调度任务投影如何从现有数据源同步、pipeline、标注、模型评估、边端下发中映射。
- 前端组件拆分、路由接入、E2E 脚本结构。

必须保留或等待确认：

- 外部观测平台类型与连接配置。
- 真实通知渠道与凭据格式。
- ITSM/工单系统是否接入。
- 报表导出格式、模板、签核和定时发送策略。
- 二期训练/中心推理调度能力。

## 8. Exception Scenarios

- 非法日期/分页/枚举：返回 `40000`，不进入 service 业务分支。
- 无权限或跨 BU 操作：返回 `40304` 或按现有规则不暴露资源，并写安全审计/告警。
- 告警不存在或不可见：返回 `40400`。
- 已关闭告警重复确认/关闭：返回 `40971`。
- 报表类型不支持：返回 `42271`。
- 通知/观测 provider 未配置：页面展示 `50371` 或 seam diagnostic，不宣称真实发送/采集成功。
- 报表导出生成失败：导出记录进入 `FAILED`，保存失败原因并写审计。
- 审计写入失败：按平台规则阻断对应高危写操作。

## 9. Acceptance Criteria Draft

- AC-01：工作台展示数据、模型、边端、资源、告警摘要，并按当前用户租户/BU 权限过滤。
- AC-02：工作台展示待办与近期活动，包含访问审批、边端审批、失败任务/告警。
- AC-03：调度中心展示任务实例、队列摘要和失败诊断，可按类型、状态、BU、时间筛选。
- AC-04：调度助手以 seam 形式返回诊断建议，不宣称真实 AI 调度。
- AC-05：告警中心展示统计、列表、详情，支持确认与关闭，状态实时刷新。
- AC-06：告警规则与通知渠道配置入口显示 `TODO_CONFIRM_*` seam，不保存明文密钥。
- AC-07：报表中心展示平台总览、数据资产、模型资产、资源使用、任务执行、边端运行、安全合规报表。
- AC-08：报表支持时间范围/BU/项目过滤与下钻 seam；导出请求生成审计和可追踪状态。
- AC-09：跨 BU 用户不可查看其他 BU 明细；超级管理员可查看全局汇总。
- AC-10：告警确认/关闭、报表导出、高危事件均写审计；失败时返回统一错误 envelope。
- AC-11：前端四个页面使用模型中心统一 `console-*` 风格并有 E2E 主链路。

## 10. Test Strategy Summary

详见 `reports/planning/test-spec.md`。build-feature 阶段至少应覆盖：

- Backend：`OperationsControllerTest`
  - dashboard overview/todos/activities 权限与 BU 隔离。
  - scheduler tasks filters / assistant seam。
  - alerts list/detail/acknowledge/resolve 状态机、审计和错误码。
  - reports overview/query/export 状态与审计。
- Frontend：`OperationsPage.test.tsx`
  - 四页面渲染、筛选、详情、操作按钮权限、错误 envelope。
- E2E：`dashboard-alert-report.spec.ts`
  - 登录后依次访问工作台、调度中心、告警中心、报表中心，验证主链路且无占位文案。
- Gate：`node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F022-dashboard-alert-report --run-e2e`

## 11. Risks and Dependencies

| 风险 | 影响 | 缓解 |
|---|---|---|
| 外部观测系统未确认 | 告警自动采集不能生产化 | 使用平台事实源 + `TODO_CONFIRM_OBSERVABILITY_PROVIDER` seam |
| 通知渠道未确认 | 告警升级通知不能真实发送 | 只保存 masked/secretRef 配置和 diagnostic，不发送真实消息 |
| 报表模板未确认 | PDF/Excel 产物不稳定 | 一期只做导出请求 seam 与审计 |
| 跨域聚合口径分裂 | 运营指标不可解释 | 明确复用现有事实源，PRD/contract 中冻结统计口径 |
| 页面范围过大 | 一次实现风险高 | 优先 P0 运营闭环，拖拽看板/定时报表/外部 ITSM 后续迭代 |

## 12. Human Review Instructions

本计划已于 2026-06-05 获批，frontmatter 已更新为：

```yaml
plan_status: approved
approved_at: 2026-06-05
```

已通过 `/build-feature` 前置门禁：

```powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F022-dashboard-alert-report
```

后续如继续修改范围，必须重新更新本计划、契约、测试计划与报告证据。
