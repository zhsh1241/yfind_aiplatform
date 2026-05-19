# Code Review Report: F013 Label Studio 生产化联通

- Feature: F013-label-studio-production-integration
- Reviewer: Codex code-reviewer
- Reviewed at: 2026-05-19
- Verdict: PASS_WITH_COMMENTS

## 审查范围

- 后端：`AnnotationService`、`AnnotationDtos`、`LabelStudioIntegration`、`V10__label_studio_production_integration.sql`、`LabelStudioProductionIntegrationControllerTest`、`application-test.yml`。
- 前端：`DataPages.tsx`、`platformApi.ts`、`App.test.tsx`、`frontend/e2e/annotation-integration.spec.ts`、`frontend/e2e/helpers.ts`。
- 部署：`deploy/local/.env.example`、`deploy/local/docker-compose.yml`。
- 正式文档：`plan.md`、`TASK.md`、`contract.md`、`test-plan.md`。

## 结论

通过，有少量后续增强建议但不阻塞本功能交付。

## 主要正向发现

1. 契约复用正确：继续使用 F012 `/api/v1/annotation/*/label-studio/*` 路径和 `LabelStudioAnnotationAdapter` seam，没有新增平行 Controller。
2. 安全边界基本成立：后端响应 DTO 不包含 token；测试使用 `f013-secret-token` 并断言 API/detail 响应不泄露。
3. 幂等路径覆盖：后端测试断言 project/task fake server 仅收到一次创建请求，重复同步复用既有 external id。
4. 诊断和审计有落点：project/task/import 成功与失败路径分别写入 Label Studio 相关 audit action，并记录 retryable/last_error_at/retry_count。
5. 前端保持原型 IA：`/ann`、`/annwork`、`/annreview` 均保留，并展示 project/task/import 操作与诊断。
6. 验证证据充分：feature gate 含后端测试、ai-adapter 测试、前端 lint/test/build、全量 Playwright E2E 通过。

## 非阻塞建议

1. `HttpLabelStudioAnnotationAdapter` 目前集中了承载配置、HTTP、payload、result mapping、task binding 持久化等职责；后续 Label Studio 规则扩展时建议拆分 `Properties`、`SecretResolver`、`HttpClient`、`PayloadMapper`、`ResultMapper`。
2. 当前 `token-value` 仅用于测试/本地 profile，应在生产 values 中继续禁用，生产只允许 `token-secret-ref` 指向受控 secret backend。
3. `importResults` 当前将导入后的 work item 状态置为 `DRAFT`，符合“不绕过审核/发布”的保守策略；后续如需要自动提交审核，应单独建 feature 并补 DAT-004/DAT-010 流转测试。
4. 前端仍有既存 Ant Design deprecated warning 与 AppNavigation fast-refresh warning，不属于本功能新增阻塞。

## 验证摘要

- `mvn -q -pl smp-app test -Dtest=LabelStudioProductionIntegrationControllerTest`：通过。
- `mvn -q -pl smp-app test`：通过。
- `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F013-label-studio-production-integration`：通过。
- `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F013-label-studio-production-integration`：通过。
- `npm --prefix frontend run lint`：通过，1 个既存 warning。
- `npm --prefix frontend run test:ci`：7 passed。
- `npm --prefix frontend run build`：通过。
- `npm --prefix frontend run e2e -- annotation-integration.spec.ts`：3 passed。
- `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F013-label-studio-production-integration --run-e2e --skip-code-review-verdict`：通过；全量 Playwright 14 passed。
