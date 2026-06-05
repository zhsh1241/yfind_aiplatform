# F021 QA 验收报告

- Feature: F021-edge-management-delivery（边端服务器与模型下发）
- Date: 2026-06-05
- QA Verdict: PASS

## 验收范围

- 边端服务器列表、创建、详情、心跳、停用。
- 模型下发申请、owner 审批/拒绝、执行 seam、SHA-256 完整性校验、回滚 seam。
- Production 模型版本准入、`platform_file_object.sha256` 可信 hash 复用、跨 BU 权限与审计。
- 前端 `/edge` 页面、状态机按钮、权限禁用、错误 envelope / traceId 展示。
- F019 模型版本删除 409 blocked 兼容回归。

## Acceptance Criteria Traceability

| AC | Evidence | Status |
|---|---|---|
| AC-01 边端服务器登记与筛选 | 后端集成测试 + 前端单测 + E2E | ✅ |
| AC-02 边端状态与心跳 | 后端集成测试 | ✅ |
| AC-03 下发申请与 Production 准入 | 后端集成测试 + E2E | ✅ |
| AC-04 owner 审批/拒绝 | 后端集成测试 + E2E | ✅ |
| AC-05 执行与完整性校验 | 后端集成测试 + E2E | ✅ |
| AC-06 回滚 seam | 后端集成测试 | ✅ |
| AC-07 权限/跨 BU/审计 | 后端集成测试 | ✅ |
| AC-08 前端交互与错误提示 | 前端单测 + E2E | ✅ |

## Verification Evidence

```powershell
mvn -f backend/pom.xml -pl smp-app -Dtest=EdgeManagementControllerTest test -q
# PASS

npm exec vitest run src/features/edge/EdgeManagementPage.test.tsx src/features/platform/platformApi.test.ts -- --reporter=verbose --pool=forks --poolOptions.forks.singleFork=true
# Test Files 2 passed; Tests 3 passed

npm exec playwright test e2e/model-registry-foundation.spec.ts e2e/edge-management-delivery.spec.ts
# PASS

node tools/ai-scaffold/dist/cli.js check-code-review-verdict docs/features/F021-edge-management-delivery
# PASS after PASS_WITH_COMMENTS report

node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F021-edge-management-delivery
# PASS

node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F021-edge-management-delivery
# PASS
```

## Known Risks / Follow-up

- 真实边端 Agent、mTLS、外部审批/工单与回滚命令仍为 `TODO_CONFIRM_*` seam，需在外部集成信息确认后补齐。
- 当前回滚记录状态与审计，不回减模型版本 active deployment count；真实运行时接入后需补齐引用生命周期策略。
