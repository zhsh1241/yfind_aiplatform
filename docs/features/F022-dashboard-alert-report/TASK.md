# Task: F022 工作台、调度中心、告警中心与报表中心运营闭环

## Metadata
- Feature: F022-dashboard-alert-report
- ID: TASK-dashboard-alert-report
- Status: implemented
- Owner: codex
- Created: 2026-06-05
- Updated: 2026-06-05
- 前置：同目录 `plan.md` 已人审批准，`check-build-feature-prereqs` 已通过。

## 1. 需求摘要
### User Story
作为平台管理员、BU 子管理员和运维人员，我想在统一运营入口查看工作台摘要、调度任务、告警处理和报表导出，以便及时发现平台风险、跟进待办并形成可审计运营闭环。

### Business Value
- 把 F006~F021 已落地的身份、数据、模型、资源、边端能力汇总为可运营视角。
- 让 `/dash`、`/sched`、`/alert`、`/report` 从占位页升级为可测试页面。
- 以透明 seam 承接真实可观测、通知、报表导出与 AI 调度助手后续接入。

### Source References
- Business docs: `docs/business/bizdocs/02-04-业务流程-平台运营.md`
- Business docs: `docs/business/bizdocs/03-05-系统功能-告警管理.md`
- Business docs: `docs/business/bizdocs/05-05-系统功能-报表与看板.md`
- Business docs: `docs/business/bizdocs/07-工作台与调度中心.md`
- Business rules: `docs/business/rules/05-平台与权限规则.md`
- Prototype: `docs/prototype/SMP工业AI平台-原型v2.html` page keys `dash` / `sched` / `alert` / `report`
- Style: `docs/architecture/03-frontend-console-style-guide.md`

## 2. 范围
### In Scope
- [x] AC-01 工作台展示租户隔离后的数据、模型、边端、资源、告警摘要。
- [x] AC-02 工作台展示待办与近期活动，来源包括访问审批、边端审批、失败任务与告警。
- [x] AC-03 调度中心展示任务实例、队列摘要和失败诊断，支持类型/状态筛选。
- [x] AC-04 调度助手返回 `TODO_CONFIRM_SCHEDULER_AI_ASSISTANT` seam 诊断，不宣称真实 AI 调度。
- [x] AC-05 告警中心展示统计、列表、详情，支持确认与关闭。
- [x] AC-06 告警规则与通知渠道显示 `TODO_CONFIRM_*` seam，不保存明文密钥。
- [x] AC-07 报表中心展示平台、数据、模型、资源、任务、边端、安全合规报表。
- [x] AC-08 报表支持过滤与导出请求 seam，生成审计和可追踪状态。
- [x] AC-09 跨 BU 明细不可见，超级管理员可查看全局汇总。
- [x] AC-10 告警确认/关闭、报表导出和高危事件写审计；失败使用统一 envelope。
- [x] AC-11 四个前端页面使用模型中心统一 `console-*` 风格并有 E2E 主链路。

### Out of Scope
- 不接入真实 Prometheus/Loki/OpenTelemetry/Grafana。
- 不发送真实邮件、短信、钉钉或企业微信通知。
- 不接入外部 ITSM/工单系统。
- 不实现拖拽自定义看板、复杂报表模板、定时报表 PDF 附件。
- 不实现二期训练/中心推理真实调度。

## 3. 技术分析
### Backend
- Module/API: `smp-app` 新增 `OperationsController`、`OperationsService`、`OperationsDtos`。
- Domain objects: `operation_alert_event`、`operation_alert_rule`、`operation_report_export`。
- Business rules: 复用 `PlatformIdentityService.requirePermission`、tenant 隔离、`PlatformException`、`ApiResponse<T>`、审计签名写入。
- API:
  - `GET /api/v1/operations/dashboard/overview`
  - `GET /api/v1/operations/dashboard/todos`
  - `GET /api/v1/operations/dashboard/activities`
  - `GET /api/v1/operations/scheduler/overview`
  - `GET /api/v1/operations/scheduler/tasks`
  - `POST /api/v1/operations/scheduler/assistant:diagnose`
  - `GET /api/v1/operations/alerts`
  - `GET /api/v1/operations/alerts/{alertId}`
  - `POST /api/v1/operations/alerts/{alertId}/acknowledge`
  - `POST /api/v1/operations/alerts/{alertId}/resolve`
  - `GET /api/v1/operations/alerts/rules`
  - `GET /api/v1/operations/reports/overview`
  - `GET /api/v1/operations/reports/{reportType}`
  - `POST /api/v1/operations/reports/{reportType}/exports`
  - `GET /api/v1/operations/reports/exports`

### Frontend
- Prototype page key: `dash` / `sched` / `alert` / `report`。
- Pages/components: 新增 `frontend/src/features/operations/OperationsPages.tsx` 与测试，路由接入 `App.tsx`。
- States/interactions: 工作台总览、调度筛选/助手、告警详情 Drawer/确认关闭、报表类型切换/导出。
- Style: 仅使用 `content-page`、`page-hero console-hero`、`console-summary-grid`、`console-panel-card`、`console-catalog-card`、`console-filter-toolbar` 等统一类。

### AI Adapter / Integration
- 不调用 AI adapter。
- 调度助手仅返回后端 seam：`TODO_CONFIRM_SCHEDULER_AI_ASSISTANT`。
- 外部观测与通知 provider 使用 `TODO_CONFIRM_OBSERVABILITY_PROVIDER`、`TODO_CONFIRM_NOTIFICATION_CHANNEL`。

### Database
- Tables:
  - `operation_alert_event`
  - `operation_alert_rule`
  - `operation_report_export`
- Migrations: `backend/smp-app/src/main/resources/db/migration/V27__dashboard_alert_report.sql`。

## Reuse Plan
- Existing reference seams to reuse: `docs/business/`、`docs/prototype/`、`docs/architecture/03-frontend-console-style-guide.md`。
- Existing service/scaffold seams to reuse: `PlatformIdentityService`、`PlatformResponses`、`PlatformException`、`PageResponse<T>`、`platform_audit_log`、`platform_permission`、`apiClient`、`platformApi`、`console-*` CSS。
- Existing facts to reuse: `dataset`、`data_source`、`pipeline_run`、`annotation_task`、`model_registry_model`、`model_registry_version`、`model_evaluation_run`、`edge_server`、`edge_deployment`、`platform_file_object`、`platform_notification_channel`。
- Existing tests/gates to reuse: Spring Boot random-port integration style、Vitest + Testing Library、Playwright helpers、`tools/ai-scaffold` feature gates。
- New seams allowed only if existing seams cannot be reused, because告警与报表导出需要本功能自有状态机和可审计请求记录。

## 5. Acceptance Criteria
- [x] AC-01: 工作台展示数据、模型、边端、资源、告警摘要，并按当前用户租户/BU 权限过滤。
- [x] AC-02: 工作台展示待办与近期活动，包含访问审批、边端审批、失败任务/告警。
- [x] AC-03: 调度中心展示任务实例、队列摘要和失败诊断，可按类型、状态、BU、时间筛选。
- [x] AC-04: 调度助手以 seam 形式返回诊断建议，不宣称真实 AI 调度。
- [x] AC-05: 告警中心展示统计、列表、详情，支持确认与关闭，状态实时刷新。
- [x] AC-06: 告警规则与通知渠道配置入口显示 `TODO_CONFIRM_*` seam，不保存明文密钥。
- [x] AC-07: 报表中心展示平台总览、数据资产、模型资产、资源使用、任务执行、边端运行、安全合规报表。
- [x] AC-08: 报表支持时间范围/BU/项目过滤与下钻 seam；导出请求生成审计和可追踪状态。
- [x] AC-09: 跨 BU 用户不可查看其他 BU 明细；超级管理员可查看全局汇总。
- [x] AC-10: 告警确认/关闭、报表导出、高危事件均写审计；失败时返回统一错误 envelope。
- [x] AC-11: 前端四个页面使用模型中心统一 `console-*` 风格并有 E2E 主链路。

## 6. Definition of Done
- [x] plan.md 已批准。
- [x] contract.md 已冻结或实现态。
- [x] test-plan.md 引用全部 AC-xx。
- [x] 复用审查已完成。
- [x] 权限、审计和 MUST 规则有验证证据。
- [x] 质量门禁通过或记录等价 CI 证据。

## 7. 风险与问题
- 外部观测与通知系统仍未确认，本期仅做透明 seam。
- 报表导出仅记录请求与 masked 下载 seam，不生成真实文件。
- 聚合口径依赖前序 feature seed 数据；测试需固定自有 F022 数据避免脆弱耦合。
