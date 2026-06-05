# F022 代码审查报告

- Feature: F022-dashboard-alert-report（工作台、调度中心、告警中心与报表中心运营闭环）
- Date: 2026-06-05
- Reviewer: Codex Code Reviewer
- Review Mode: 本地静态复审 + 目标测试/构建/E2E 证据复核
- Verdict: PASS_WITH_COMMENTS

## Scope

| File / Area | Review Focus | Result |
|---|---|---|
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/OperationsController.java` | `/api/v1/operations` 路由、统一 envelope、principal 注入 | PASS |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/OperationsService.java` | 聚合查询、租户隔离、告警状态机、报表导出、审计 | PASS_WITH_COMMENTS |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/OperationsDtos.java` | DTO 与 contract 对齐 | PASS |
| `backend/smp-app/src/main/resources/db/migration/V27__dashboard_alert_report.sql` | 表结构、权限、菜单、默认规则 | PASS |
| `backend/smp-app/src/test/java/com/yf/smp/app/platform/OperationsControllerTest.java` | AC-01~AC-10 后端回归 | PASS |
| `frontend/src/features/platform/platformApi.ts` | F022 API 类型与方法 | PASS |
| `frontend/src/features/operations/OperationsPages.tsx` | 四页 UI、状态刷新、seam 文案、统一风格 | PASS_WITH_COMMENTS |
| `frontend/src/App.tsx` | `/dash` `/sched` `/alert` `/report` 路由替换占位页 | PASS |
| `frontend/src/features/operations/OperationsPages.test.tsx` | 前端组件主链路测试 | PASS |
| `frontend/e2e/dashboard-alert-report.spec.ts` | E2E 主链路 | PASS |
| `frontend/e2e/helpers.ts` | E2E session 权限 | PASS |
| `docs/features/F022-dashboard-alert-report/*` | plan / TASK / contract / test-plan / reports | PASS |

## Blocking Issues

无 Critical / High / Medium 阻塞问题。

## Non-blocking Comments

1. `OperationsService` 当前为一期聚合服务，逻辑集中且偏长；后续若新增真实可观测/通知/报表导出 provider，建议按 provider seam 拆分查询与外部集成适配层。当前已有 `OperationsControllerTest` 锁定行为，非本期阻塞。
2. 前端使用 Ant Design 6 时仍出现若干 deprecation warning（如 `Alert.message`、`Space.direction`、`Drawer.width`、Table `rowKey` index）；不影响功能与测试结果，建议后续统一做一次 AntD 6 API 清理。
3. Vite build 仍提示主 chunk 超过 500 kB；这是既有单包结构警告，非 F022 阻塞。后续可规划 route-level code splitting。

## Security / Permission Review

- [x] 后端所有 F022 API 通过 `PlatformIdentityService.requirePrincipal` 获取当前主体。
- [x] 读/写权限拆分为 `operations:dashboard:read`、`operations:scheduler:read`、`operations:alert:read`、`operations:alert:handle`、`operations:report:read`、`operations:report:export`。
- [x] 非 SUPER_ADMIN 仅可访问自身租户/BU 明细，后端测试覆盖跨 BU 拒绝。
- [x] 告警处理与报表导出写审计，包含 `TASK-dashboard-alert-report` 追踪信息。
- [x] 通知渠道、可观测 provider、AI 调度助手、报表存储均为 masked / `TODO_CONFIRM_*` seam，不保存明文密钥。

## Verification Evidence

```powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F022-dashboard-alert-report
# PASS

mvn -f backend/pom.xml -pl smp-app -Dtest=OperationsControllerTest test
# PASS

npm --prefix frontend run test:ci -- src/features/operations/OperationsPages.test.tsx
# Test Files 1 passed; Tests 4 passed

npm --prefix frontend run build
# PASS

npm --prefix frontend run e2e -- dashboard-alert-report.spec.ts
# 1 passed
```

## Final Recommendation

F022 当前代码满足已冻结契约与 TASK AC-01~AC-11，建议进入 QA / feature gate。Verdict: **PASS_WITH_COMMENTS**。
