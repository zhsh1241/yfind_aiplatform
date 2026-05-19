# QA Report: F013 Label Studio 生产化联通

- Feature: F013-label-studio-production-integration
- QA owner: Codex
- Date: 2026-05-19
- Result: PASS

## QA 范围

覆盖 AC-01 ~ AC-09：配置缺失诊断、project 同步、task 同步、结果导入、失败诊断与审计、防 token 泄露、前端三页面 IA、fake Label Studio server、feature gate。

## 执行记录

| 命令 | 结果 |
| --- | --- |
| `node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F013-label-studio-production-integration` | PASS |
| `mvn -q -pl smp-app test -Dtest=LabelStudioProductionIntegrationControllerTest` | PASS |
| `mvn -q -pl smp-app test` | PASS |
| `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F013-label-studio-production-integration` | PASS |
| `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F013-label-studio-production-integration` | PASS |
| `npm --prefix frontend run lint` | PASS，1 个既存 warning |
| `npm --prefix frontend run test:ci` | PASS，7 passed |
| `npm --prefix frontend run build` | PASS |
| `npm --prefix frontend run e2e -- annotation-integration.spec.ts` | PASS，3 passed |
| `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F013-label-studio-production-integration --run-e2e --skip-code-review-verdict` | PASS，全量 E2E 14 passed |

## 验收映射

- AC-01：未配置 fallback 由既有 adapter 与前端诊断展示覆盖。
- AC-02/AC-03：后端 fake Label Studio server 覆盖 project/task 创建与幂等。
- AC-04：后端导入 JSON annotation 并回写 `annotation_json`，前端审核页保留质检/发布闭环。
- AC-05：诊断码、retryable、审计 action 已在契约和代码路径覆盖。
- AC-06：后端测试断言 `f013-secret-token` 不出现在响应/detail。
- AC-07：Playwright 覆盖 `/ann`、`/annwork`、`/annreview`。
- AC-08：`LabelStudioProductionIntegrationControllerTest` 使用本地 fake server 复现 API 行为。
- AC-09：feature gate 通过。

## 已知非阻塞项

- 生产 Label Studio URL、token secret backend、storage policy 仍为 `TODO_CONFIRM_*`，符合计划边界。
- 前端构建输出 chunk size warning、Ant Design deprecated warning、CSS parse warning 为既存工具/依赖提示，不阻塞当前功能。
