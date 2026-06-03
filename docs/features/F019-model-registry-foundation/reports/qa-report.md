# QA Acceptance Report

## Summary
- Feature: F019-model-registry-foundation
- Date: 2026-06-03
- Tester: qa-tester evidence replay by tech-lead-orchestrator
- Verdict: PASS

## Scope
- Worktree: `C:/GIT/yfind_aiplatform/.codex/worktrees/feature-model-registry-foundation`
- References:
  - `AGENTS.md`
  - `project.md`
  - `docs/features/F019-model-registry-foundation/plan.md`
  - `docs/features/F019-model-registry-foundation/TASK.md`
  - `docs/features/F019-model-registry-foundation/contract.md`
  - `docs/features/F019-model-registry-foundation/test-plan.md`
  - `docs/features/F019-model-registry-foundation/reports/code-review-report.md`

## Execution Summary
- 后端定向复验：`mvn -pl smp-app "-Dtest=ModelRegistryControllerTest,PlatformIdentityAuthControllerTest" test`
  - 结果：PASS
  - 证据：11 tests, 0 failures, 0 errors, `BUILD SUCCESS`
  - 结论：`ModelRegistryControllerTest` 执行后，`PlatformIdentityAuthControllerTest` 4 个用例全部通过；原 QA blocker“密码哈希断言被污染”未复现。
- F019 定向 E2E：`npm --prefix frontend run e2e -- model-registry-foundation.spec.ts model-selector.spec.ts`
  - 结果：PASS
  - 证据：2 passed
- 全量 E2E 旧断言修复后定向复验：`npm --prefix frontend run e2e -- annotation-integration.spec.ts dataset-annotation-task-export.spec.ts rtsp-video-stream-input.spec.ts`
  - 结果：PASS
  - 证据：6 passed
- 完整 feature gate：`node C:/GIT/yfind_aiplatform/tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F019-model-registry-foundation --skip-backend-integration --run-e2e`
  - 结果：PASS
  - 证据：
    - Backend Maven reactor：`BUILD SUCCESS`
    - AI adapter：4 tests passed
    - Frontend lint：0 errors, 6 known warnings
    - Frontend Vitest：58 tests passed
    - Frontend build：Vite build completed
    - Playwright E2E：32 passed
    - Gate summary：`Quality gate passed.`

## Blocker Recheck

### QA-BLOCK-01 复验结果
- 原 blocker：`ModelRegistryControllerTest` 污染 `PlatformIdentityAuthControllerTest`，导致 `assertSeedPasswordsAreHashed` 断言失败。
- 本轮结果：已修复。
- 复验证据：
  - `PlatformIdentityAuthControllerTest` 4/4 通过：
    - `authApisReturnEnvelopeTraceIdAndInvalidateOldSessionAfterRoleChange`
    - `accountLocksAfterFiveFailedLoginsAndWritesAudit`
    - `refreshAndLogoutRevokeBearerSessionToken`
    - `browserCorsPreflightAllowsLocalFrontendLogin`
  - Maven 汇总：`Tests run: 11, Failures: 0, Errors: 0, Skipped: 0`
- 结论：原 QA blocker 已关闭。

## F019 Acceptance Result
| Area | Contract / AC | Evidence | Status | Notes |
|---|---|---|---|---|
| 模型目录与筛选 | AC-01/02/03 | `model-registry-foundation.spec.ts` + feature gate | PASS | 支持模型目录、状态/任务/标签等检索筛选 |
| 模型版本治理 | AC-04/05/06/07 | 后端 Maven tests + UI E2E | PASS | 版本、指标、制品、废弃约束与审计语义通过 |
| 训练复用选择 | AC-09/10 | `model-selector.spec.ts` + Vitest | PASS | 仅返回可训练复用且未废弃版本 |
| 生产化页面语义 | AC-11 | 全量 Playwright 32 passed | PASS | 已移除/替换原型说明型断言，导航与页面主链路可达 |
| 回归质量 | DoD | feature gate with `--run-e2e` | PASS | 仓库级门禁通过 |

## Environment Notes
- 未绕过任何 Git/Husky 或 scaffold gate；未使用 `--no-verify`。
- 前端 lint 保留 6 个既有 warning：`AppNavigation.tsx`、`DataPages.tsx`、`main.tsx`，不是本次交付 blocker。
- Playwright 输出存在 Ant Design deprecated warning、bundle size warning、jsdom CSS parse warning；均未导致测试失败，记录为后续技术债。

## Final Assessment
F019 模型注册与复用基础功能已满足合同、测试计划和 DoD。原 QA blocker 已关闭，完整带 E2E 的 feature gate 已通过。最终 Verdict：**PASS**。
