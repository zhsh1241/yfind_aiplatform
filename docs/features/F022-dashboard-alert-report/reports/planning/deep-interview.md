# Deep Interview Spec: F022 dashboard-alert-report

## Metadata

- Feature: F022-dashboard-alert-report
- Profile: standard
- Context type: brownfield
- Final ambiguity: 0.16
- Threshold: 0.20
- Context snapshot: $contextPath
- Transcript: $interviewPath

## Clarity Breakdown

| Dimension | Score | Notes |
|---|---:|---|
| Intent | 0.92 | 完成一期运营闭环，使已交付数据/模型/边端能力可运营可验收 |
| Outcome | 0.90 | 四个入口从占位转为真实 API 与聚合视图 |
| Scope | 0.86 | 明确包含工作台/调度/告警/报表，排除外部监控/通知/PDF/拖拽看板 |
| Constraints | 0.82 | 必须复用现有事实源、权限、审计与 console-* 风格 |
| Success Criteria | 0.86 | P0 验收可测试，覆盖权限、状态、审计、E2E |
| Context | 0.88 | 菜单与占位页面已存在，业务文档和原型均有依据 |

## Intent

在 F021 边端下发之后，补齐一期运营视图：让平台管理员、BU 管理员、运维/模型应用工程师能从工作台、调度中心、告警中心、报表中心看到跨域状态、风险、待办、趋势和处理闭环，支撑一期验收演示与日常运营。

## Desired Outcome

- /dash 从占位页升级为工作台总览：关键指标、待办、风险提醒、近期任务。
- /sched 从占位页升级为调度中心：任务队列、实例状态、失败诊断、调度助手 seam。
- /alert 从占位页升级为告警中心：告警统计、筛选、详情、确认/关闭、规则/通知 seam。
- /report 从占位页升级为报表中心：运营看板、业务报表、过滤、导出请求 seam。
- 后端提供真实聚合 API，不使用前端静态 mock。

## In Scope

1. 后端新增运营聚合服务、Controller、DTO 与 Flyway 表（如需要）：
   - dashboard overview / todos / recent activities
   - scheduler overview / task list / queue summary
   - alert event list/detail/acknowledge/resolve + rule/channel seam
   - report dashboard / report query / export request seam
2. 前端新增 operations 页面或等价 feature：DashboardPage、SchedulingCenterPage、AlertCenterPage、ReportCenterPage。
3. 菜单 /dash、/sched、/alert、/report 接入真实页面。
4. 权限与租户/BU 隔离：menu:*、ops:*、lert:*、eport:*。
5. 审计：告警处理、报表导出、高危告警生成/关闭等操作留痕。
6. E2E 覆盖四个入口主链路。

## Out of Scope / Non-goals

- 不接入真实 Prometheus、Loki、OpenTelemetry、OpenSearch、Grafana。
- 不实现真实邮件/短信/钉钉/企业微信通知，只保留通知渠道 seam。
- 不实现外部 ITSM/工单系统。
- 不实现拖拽式自定义看板。
- 不实现定时 PDF 附件推送与复杂报表模板设计。
- 不实现二期训练任务、中心端推理、批量推理真实调度。

## Decision Boundaries

Agent 可自行决定：

- 聚合 DTO 字段、表格列、状态枚举映射、只读 SQL 查询结构。
- 是否新增 operation_alert_event / operation_report_export 等轻量事实表。
- 前端组件拆分与 console-* 风格应用。
- 测试数据 seed 与 E2E 拦截/真实 API 验证方式。

必须保留或等待确认：

- TODO_CONFIRM_OBSERVABILITY_PROVIDER
- TODO_CONFIRM_ALERT_NOTIFICATION_CHANNEL
- TODO_CONFIRM_ITSM_INTEGRATION
- TODO_CONFIRM_REPORT_EXPORT_TEMPLATE
- 未在业务文档解决的 NFR/合规指标。

## Constraints

- 复用 F006 身份权限审计、F007 组织配置、F008 资源视图、F009/F015~F018 数据域、F019/F020 模型域、F021 边端下发事实源。
- 正式页面遵循 docs/architecture/03-frontend-console-style-guide.md。
- 报表与告警不得以纯前端静态 mock 冒充真实能力；缺外部集成时用 diagnostic/seam 显示。
- 所有写操作必须审计；高危事件与 PLT-011 对齐。

## Testable Acceptance Criteria Draft

- AC-01 工作台展示数据、模型、边端、资源、告警摘要，并按当前用户租户/BU 权限过滤。
- AC-02 工作台展示待办与近期活动，包含访问审批、边端审批、失败任务/告警。
- AC-03 调度中心展示任务实例/队列/失败诊断，并可按类型、状态、BU、时间筛选。
- AC-04 调度中心调度助手以 seam 形式返回诊断建议，不宣称真实 AI 调度。
- AC-05 告警中心展示统计、列表、详情，支持确认与关闭，状态实时刷新。
- AC-06 告警规则与通知渠道配置入口显示 TODO_CONFIRM seam，不写入未确认外部渠道。
- AC-07 报表中心展示平台总览、数据资产、模型资产、资源使用、任务执行、边端运行、安全合规报表。
- AC-08 报表支持时间范围/BU/项目过滤与下钻 seam；导出请求生成审计和可追踪状态。
- AC-09 跨 BU 用户不可查看其他 BU 明细；超级管理员可查看全局汇总。
- AC-10 告警确认/关闭、报表导出、高危事件均写审计；失败时返回统一错误 envelope。
- AC-11 前端四个页面使用模型中心统一 console-* 风格并有 E2E 主链路。

## Assumptions and Resolutions

- Assumption: 没有外部监控也能规划告警/报表。Resolution: 只聚合平台已有事实源，外部采集保留 seam。
- Assumption: 调度中心可一期交付。Resolution: 只做统一任务/队列/诊断视图，不做二期真实训练/中心推理调度。
- Assumption: 报表导出可一期交付。Resolution: 只做导出请求与审计 seam，复杂 PDF/定时推送不做。

## Technical Context Findings

- rontend/src/components/AppNavigation.tsx 已有 dash、sched、eport、lert 菜单。
- rontend/src/App.tsx 当前除 hub/eval/edge 外，多数页面落到 ModuleOverviewPage。
- 需要新增页面替换上述四个占位路由。
- 后端已有平台服务/审计/资源/数据/模型/边端相关服务可复用。
