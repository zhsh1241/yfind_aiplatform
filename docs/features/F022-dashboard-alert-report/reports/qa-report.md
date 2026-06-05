# F022 QA 验收报告

- Feature: F022-dashboard-alert-report（工作台、调度中心、告警中心与报表中心运营闭环）
- Date: 2026-06-05
- Tester: Codex QA
- QA Verdict: PASS
- Integration Status: PASS（见 `reports/integration-report.md`）
- Code Review Verdict: PASS_WITH_COMMENTS（无阻塞项，见 `reports/code-review-report.md`）

## 验收范围

- 工作台：运营摘要、领域健康、告警分布、待办、近期活动。
- 调度中心：队列摘要、任务列表、类型/状态筛选、调度助手 seam。
- 告警中心：统计、列表、详情 Drawer、确认、关闭、规则与通知 seam。
- 报表中心：报表类型、指标、明细、下钻 seam、导出请求与导出记录。
- 后端：权限、跨 BU 隔离、审计、状态机、统一 envelope。
- 前端：统一 `console-*` 风格，不再走占位页。

## Acceptance Criteria Traceability

| AC | 验收点 | Evidence | Status |
|---|---|---|---|
| AC-01 | 工作台展示数据、模型、边端、资源、告警摘要并按权限过滤 | 后端 `OperationsControllerTest` + 前端 `DashboardPage` 单测/E2E | PASS |
| AC-02 | 工作台展示待办与近期活动 | 后端 todos/activities API + 前端单测/E2E | PASS |
| AC-03 | 调度中心展示任务、队列、失败诊断与筛选 | 后端 scheduler tests + 前端单测/E2E | PASS |
| AC-04 | 调度助手 seam，不宣称真实 AI | 后端返回 `TODO_CONFIRM_SCHEDULER_AI_ASSISTANT`；前端展示建议 | PASS |
| AC-05 | 告警统计、列表、详情、确认、关闭 | 后端状态机测试 + 前端单测/E2E | PASS |
| AC-06 | 告警规则与通知 seam，不保存明文密钥 | SQL 默认规则 + 前端规则表 + `TODO_CONFIRM_NOTIFICATION_CHANNEL` | PASS |
| AC-07 | 报表中心展示平台/数据/模型/资源/任务/边端/安全报表 | 后端 reportTypes/detail + 前端报表页 | PASS |
| AC-08 | 报表过滤、下钻 seam、导出请求可追踪 | 后端导出 API + 前端导出按钮 + E2E | PASS |
| AC-09 | 跨 BU 明细不可见，超管可全局汇总 | 后端跨 BU 拒绝测试 | PASS |
| AC-10 | 写操作审计与统一错误 envelope | 后端审计断言与重复处理 40971 | PASS |
| AC-11 | 四页统一 `console-*` 风格并有 E2E 主链路 | `OperationsPages.tsx` + `dashboard-alert-report.spec.ts` | PASS |

## Verification Evidence

| 类型 | 命令 | 结果 |
|---|---|---|
| 前置门禁 | `node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F022-dashboard-alert-report` | PASS |
| 后端目标测试 | `mvn -f backend/pom.xml -pl smp-app -Dtest=OperationsControllerTest test` | PASS |
| 前端目标单测 | `npm --prefix frontend run test:ci -- src/features/operations/OperationsPages.test.tsx` | PASS：1 file / 4 tests |
| 前端构建 | `npm --prefix frontend run build` | PASS |
| 前端 E2E | `npm --prefix frontend run e2e -- dashboard-alert-report.spec.ts` | PASS：1 passed |

## Known Risks / Follow-up

- 真实 Prometheus/Loki/OpenTelemetry、通知渠道、AI 调度助手、报表模板/导出存储尚未确认，当前按契约保留 `TODO_CONFIRM_*` seam。
- 后续接入真实 provider 时需补充 provider 适配层、凭据管理、失败重试与审计细节。
- Ant Design 6 deprecation warning 与 Vite chunk size warning 为非阻塞技术债，建议后续统一清理。

## 结论

F022 P0/P1 验收项已通过，页面可进入本地联调与用户验收。QA Verdict: **PASS**。
