# Code Review Report

## Summary
- Feature: F019-model-registry-foundation
- Review Round: 第十八轮代码复审
- Date: 2026-06-03
- Reviewer: Codex Code Reviewer
- Verdict: PASS_WITH_COMMENTS

## Scope & Baseline
- Governing prompt: `C:/GIT/yfind_aiplatform/.omx/state/rendered-prompts/code-reviewer-f019-review18.md`
- Worktree: `C:/GIT/yfind_aiplatform/.codex/worktrees/feature-model-registry-foundation`
- Stage 1 references verified:
  - `docs/features/F019-model-registry-foundation/plan.md`
  - `docs/features/F019-model-registry-foundation/contract.md`
  - `docs/features/F019-model-registry-foundation/test-plan.md`
- Review focus: 确认第十七轮 HIGH「拒绝访问申请自动化覆盖补齐」已修复，并完成本轮全量变更复审。

## Files Reviewed
| File | Review Focus |
|---|---|
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/ModelRegistryController.java` | 模型中心 API 路由与访问申请 approve/reject 暴露面 |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/ModelRegistryService.java` | 模型权限、版本状态机、reject/approve、下载、审计 |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/ModelRegistryDtos.java` | DTO/响应契约 |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/ObjectStorageService.java` | 预签名下载 URL TTL 处理 |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformException.java` | 业务码/HTTP 状态承载 |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformResponses.java` | 自定义状态响应与 delete blocked 响应封装 |
| `backend/smp-app/src/main/java/com/yf/smp/app/web/GlobalExceptionHandler.java` | 平台异常映射 |
| `backend/smp-app/src/main/resources/db/migration/V24__model_registry_foundation.sql` | F019 模型中心表结构、权限、菜单、索引 |
| `backend/smp-app/src/test/java/com/yf/smp/app/platform/ModelRegistryControllerTest.java` | 后端主链路、规则阻断、reject/approve 自动化 |
| `frontend/src/features/model-registry/ModelRegistryPage.tsx` | 模型中心页面、审批区、selector、下载、刷新 |
| `frontend/src/features/model-registry/ModelRegistryPage.test.tsx` | 前端单测覆盖 reject refresh / selector / 权限显隐 |
| `frontend/src/features/platform/platformApi.ts` | 模型中心前端 API 与 409 blocked 解包 |
| `frontend/src/App.tsx` | `/hub` 路由挂载 |
| `frontend/e2e/helpers.ts` | 模型中心 E2E mock、reject/approve 状态刷新 |
| `frontend/e2e/model-registry-foundation.spec.ts` | 模型中心 E2E 主链路与 reject/approve 场景 |
| `frontend/e2e/model-selector.spec.ts` | selector 过滤与选择行为 |
| `frontend/src/components/ModuleOverviewPage.tsx` | 兼容 Ant Design 6 API 调整 |
| `frontend/src/styles/global.css` | 模型中心 Drawer 布局样式 |
| `docs/features/F019-model-registry-foundation/*` | 计划、契约、测试计划与本轮审查目标一致性 |

## Stage 1 Spec Compliance
结论：通过。

### 第十七轮 HIGH 修复确认
1. 前端单测 reject -> refresh PENDING 列表 -> 空态：已补齐。
   - 证据：`frontend/src/features/model-registry/ModelRegistryPage.tsx:269-279,404-410,727-752` 在 reject 成功后执行 `invalidateQueries(['model-access-requests', selectedModelId])`，审批表仅查询 `status=PENDING`，无数据时显示“暂无待处理访问申请”。
   - 证据：`frontend/src/features/model-registry/ModelRegistryPage.test.tsx:470-503` 明确断言 reject 后再次查询待审批列表，并最终展示“暂无待处理访问申请”。

2. E2E reject -> 暂无待处理访问申请，同时保留 approve 主链路：已补齐。
   - 证据：`frontend/e2e/helpers.ts:602-620` 与 `frontend/e2e/helpers.ts:621-640`（approve/reject 路由）在 mock 层维护 `modelAccessRequests` 状态，`GET ?status=PENDING` 会按最新状态过滤。
   - 证据：`frontend/e2e/model-registry-foundation.spec.ts:54-72` 先验证 reject 后空态，再重新申请并验证 approve 主链路仍可执行，最终再次回到“暂无待处理访问申请”。

3. 后端 reject 成功 -> PENDING 列表移除 -> `MODEL_ACCESS_REJECTED` 审计：已补齐。
   - 证据：`backend/smp-app/src/main/java/com/yf/smp/app/platform/ModelRegistryService.java:407-425` 将申请状态更新为 `REJECTED`，并写入 `MODEL_ACCESS_REJECTED` 审计。
   - 证据：`backend/smp-app/src/main/java/com/yf/smp/app/platform/ModelRegistryService.java:361-425` 审批/拒绝都受 `ensurePendingAccessRequest` 保护，避免重复处理。
   - 证据：`backend/smp-app/src/test/java/com/yf/smp/app/platform/ModelRegistryControllerTest.java:705-732` 先校验 reject 前 `status=PENDING` 列表包含申请，再校验 reject 后 PENDING 列表移除，同时通过审计日志接口确认 `MODEL_ACCESS_REJECTED` 已落审计。

### 需求符合度补充
- 模型中心 `/hub` 已由占位页替换为真实业务页，满足 F019 计划与 contract 对模型中心入口的要求：`frontend/src/App.tsx:116-122`。
- `ModelSelector` 仅展示未废弃且用户有权限的版本，符合 AC-10：`frontend/src/features/model-registry/ModelRegistryPage.tsx:137-188`，并由 `frontend/e2e/model-selector.spec.ts`、`frontend/src/features/model-registry/ModelRegistryPage.test.tsx:506-529` 覆盖。
- 删除阻断 409 返回 body data 的前端解包逻辑存在且被 UI 使用，符合 AC-07：`frontend/src/features/platform/platformApi.ts:719-727,871-873` 与 `frontend/src/features/model-registry/ModelRegistryPage.tsx:359-379`。

## Stage 2 Code Quality
结论：未发现 CRITICAL / HIGH / MEDIUM 问题。

### Diagnostics / Verification Evidence
- `npm --prefix frontend run lint`
  - 结果：通过，0 error / 6 warning。
  - 备注：warning 位于既有非本次核心变更文件 `AppNavigation.tsx`、`DataPages.tsx`、`main.tsx`。
- `npm --prefix frontend run build`
  - 结果：通过。
  - 备注：Vite 报告主包体积较大，为构建警告，不构成本轮阻塞项。
- `mvn -pl smp-app -Dtest=ModelRegistryControllerTest test`
  - 结果：通过，7/7。
- Shell pattern scan：`rg -n "console\.log|catch \([^)]*\) \{\s*\}|apiKey\s*=\s*\"" frontend backend`
  - 结果：未命中新引入风险模式。
- MCP `lsp_diagnostics` / `ast_grep_search`
  - 结果：工具端返回 `Transport closed`，本轮改用 lint/build/maven/rg 作为等价核查证据。

## Issues
本轮未发现需要 `CHANGES_REQUIRED` 或 `BLOCK` 的问题。

## Comments
- `frontend` 构建仍有单 bundle 体积告警；这不是本轮 F019 reject 修复引入的问题，也不影响当前 feature 验收，但后续若继续向单页聚合更多功能，建议分包治理。
- 代码智能 MCP 在本轮审查时不可用，已用仓库命令完成替代核查；后续若恢复，可补跑一次文件级 LSP 诊断留存更细粒度证据。

## Recommendation
- Verdict: **PASS_WITH_COMMENTS**
- 原因：第十七轮 HIGH 已按要求修复并具备前端单测、E2E、后端自动化与实现链路证据；本轮未发现新的阻塞性问题。保留 comments 仅为工具可用性与非阻塞构建告警。
