# QA Acceptance Report

## Summary
- Feature: F020-model-evaluation-readiness（模型评估结果与发布门禁）
- Date: 2026-06-05
- Tester: qa-tester
- QA Verdict: PASS
- Integration Status: PASS（见 `reports/integration-checker-report.md`）
- Code Review Verdict: PASS_WITH_COMMENTS（无 Critical / Major，见 `reports/code-review-report.md`）

## Verdict Rationale
F020 最终 QA 对照 `contract.md`、`TASK.md`、`test-plan.md`、integration 报告、code review 报告与本轮重新执行的后端/前端/E2E 命令完成验收。AC-01 至 AC-12 均有 P0/P1/P2 或交叉验证证据；所有 P0 用例通过；未发现阻塞发布问题。因此最终结论为 **QA Verdict: PASS**。

## Test Execution Evidence
| 类型 | 命令/来源 | 结果 | 说明 |
|---|---|---|---|
| 后端目标测试 | `mvn -pl smp-app -Dtest=ModelEvaluationControllerTest test`（`backend/`） | PASS：Tests run 1, Failures 0, Errors 0, Skipped 0；BUILD SUCCESS | 覆盖创建、非法输入、导入 PASSED/FAILED、重复导入、Production 门禁、对比、跨 BU、artifact 下载与审计。 |
| 前端目标单测 | `npm exec vitest run src/features/model-evaluation/ModelEvaluationPage.test.tsx`（`frontend/`） | PASS：1 test file / 2 tests passed | 覆盖详情展示、导入扩展字段、artifact 下载、创建评估。 |
| 前端 E2E | `npm exec playwright test e2e/model-evaluation-readiness.spec.ts`（`frontend/`） | PASS：1 passed | 覆盖 `/eval` 主链路、详情 seam、对比 best、导入结果、下载地址。 |
| 前端 lint | `npm run lint`（`frontend/`） | PASS：0 errors / 6 warnings | warning 为既有 Fast Refresh / hooks 提示，非 F020 阻塞。 |
| 前端 build | `npm run build`（`frontend/`） | PASS | Vite chunk size warning 非 F020 阻塞。 |
| AC 追溯 | `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F020-model-evaluation-readiness` | PASS | AC traceability check passed。 |
| Feature artifacts | `node tools/ai-scaffold/dist/cli.js check-feature-artifacts docs/features/F020-model-evaluation-readiness` | PASS | Feature artifact check passed。 |
| Code review verdict gate | `node tools/ai-scaffold/dist/cli.js check-code-review-verdict docs/features/F020-model-evaluation-readiness` | PASS | 识别到 `PASS_WITH_COMMENTS` 并放行。 |
| Integration review | `reports/integration-checker-report.md` | PASS | 7 个契约端点、权限、审计、状态机与前端 API 对齐；I-001~I-006 已关闭。 |

## Acceptance Criteria Verification
| AC | 验收点 | Status | QA 证据 |
|---|---|---|---|
| AC-01 | 为指定模型版本创建评估任务，记录验证数据集版本、任务类型、指标配置和阈值 | PASS | 后端 `ModelEvaluationControllerTest` 创建返回 READY；前端单测断言 `createModelEvaluation` 传入 `modelId/versionId/datasetVersionId/thresholdConfig`。 |
| AC-02 | 缺少模型版本、无权限模型版本、未发布/无权限数据集或非法阈值创建失败 | PASS | 后端目标测试覆盖非法阈值、缺失/不可访问数据集版本与跨 BU 创建拒绝；契约错误码 400/403/404/422 对齐。 |
| AC-03 | 导入评估结果并按阈值自动判定 PASSED / FAILED，保存指标快照 | PASS | 后端目标测试断言 PASSED 与 FAILED；Service 按阈值写入 metric snapshot；前端导入提交真实 API。 |
| AC-04 | 缺少必需指标或终态重复导入被拒绝 | PASS | 后端目标测试断言缺少 `mAP50` 返回 42253、重复导入返回 40952。 |
| AC-05 | Production 发布门禁查询 F020 PASSED 评估记录；无记录或 FAILED 阻断 | PASS | 后端目标测试覆盖无 PASSED 发布返回 42254；`ModelRegistryService` 调用 `hasPassedEvaluation` 并记录阻断审计。 |
| AC-06 | 存在 PASSED 评估记录时可继续 Production 状态流转 | PASS | 后端目标测试导入 PASSED 后 transition 返回 `PRODUCTION`，并记录 `MODEL_VERSION_PUBLISH_GATE_PASSED`。 |
| AC-07 | 报告详情展示核心指标、PR 曲线、混淆矩阵、错误案例 seam | PASS | 后端详情返回 `curveData/confusionMatrix/errorCases`；前端单测与 E2E 断言“PR 曲线数据”“混淆矩阵”“错误样例摘要”“IMG-001”。 |
| AC-08 | 多版本指标对比并标记最佳值 | PASS | 后端目标测试 compare 响应包含 `mAP50` 与 `"best":true`；E2E 断言 `v2.0: 0.9400 · best`。 |
| AC-09 | 评测数据集或报告 artifact 下载遵守权限与审计规则 | PASS | 后端目标测试覆盖下载 URL、跨 BU dataset artifact 无授权拒绝、补授 `dataset_access_grant` 后放行；code review R3 复审确认权限修复关闭。 |
| AC-10 | 跨 BU 无授权用户不可查看报告或对比不可见版本 | PASS | 后端目标测试 `crossBuDenied` 返回 40304，scoped list 不包含不可见版本；Service 使用可见性校验。 |
| AC-11 | 创建、导入、通过/失败、报告查看、artifact 下载、发布阻断记录审计 | PASS | 后端目标测试查询 `MODEL_VERSION_PUBLISH_GATE_PASSED` 审计；integration 报告确认所有 F020 审计事件已记录。 |
| AC-12 | 前端 `/eval` 使用真实 API 展示列表、详情、对比、空状态和错误状态，无原型说明性 mock 文案 | PASS | 前端页面通过 `platformApi` 调用 `/api/v1`；E2E 拦截真实 API 路径验证主链路；页面空状态为“暂无模型评估记录，请创建评估或导入评估结果。”。 |

## Test Plan Execution

### P0 Tests (Must Pass)
| ID | AC | Scenario | Status | Notes |
|---|---|---|---|---|
| T-P0-01 | AC-01 AC-02 | 创建评估任务与非法输入防线 | PASS | 后端目标测试 + 前端创建单测覆盖。 |
| T-P0-02 | AC-03 AC-04 | 导入结果自动判定与终态保护 | PASS | 后端目标测试覆盖 PASSED、FAILED、缺指标 42253、重复导入 40952。 |
| T-P0-03 | AC-05 AC-06 AC-11 | Production 发布门禁 | PASS | 无 PASSED 阻断；PASSED 后 PRODUCTION 成功；审计可查。 |
| T-P0-04 | AC-10 | 跨 BU 不可见 | PASS | 详情/列表/创建与 dataset artifact 下载权限路径均有拒绝证据。 |

### P1 Tests (Should Pass)
| ID | AC | Scenario | Status | Notes |
|---|---|---|---|---|
| T-P1-01 | AC-07 | 报告详情 seam | PASS | 前端单测/E2E 与后端详情响应覆盖。 |
| T-P1-02 | AC-08 | 多版本指标对比 | PASS | 后端 compare 与 E2E best 标记覆盖。 |
| T-P1-03 | AC-09 AC-11 | artifact 下载权限与审计 | PASS | 下载 seam、跨 BU dataset grant、防泄露与审计确认。 |
| T-P1-04 | AC-12 | 前端评估页主链路 | PASS | Playwright 主链路通过。 |

### P2 Tests (Nice to Have)
| ID | AC | Scenario | Status | Notes |
|---|---|---|---|---|
| T-P2-01 | AC-07 AC-12 | 无记录空状态 | PASS | 代码核验空状态业务文案，不含原型说明性 mock 文案。 |

## Issues Found

### Critical (Blocks Release)
| ID | Description | Status |
|---|---|---|
| - | 未发现 | - |

### Major (Should Fix)
| ID | Description | Status |
|---|---|---|
| - | 未发现 | - |

### Minor (Nice to Fix)
| ID | Description | Impact | Recommendation |
|---|---|---|---|
| MI-01 | Code review 保留非阻塞建议：可补充 `MODEL_EVALUATION_ARTIFACT_ACCESS_BLOCKED` 审计日志断言 | 不阻塞；拒绝路径已有代码记录，主权限回归已覆盖 | 后续测试拆分时补充更细审计断言。 |
| MI-02 | Playwright/Vite 输出 Ant Design deprecated warning：`Drawer.width`、`Space.direction`、`Alert.message` | 不影响 F020 契约或功能验收 | 后续 UI 清理统一迁移到 Ant Design 新属性。 |
| MI-03 | 前端 lint 存在 6 个仓库既有 warning；build 存在 chunk size warning | 0 errors，非 F020 阻塞 | 后续技术债治理处理。 |

## Contract Compliance
- [x] 所有契约定义的功能已实现并有测试/评审证据。
- [x] API 路径、方法、权限、envelope、错误码、diagnostic 允许值与契约一致。
- [x] `MDL-006` Production 发布门禁已由 F020 `PASSED` evaluation run 驱动。
- [x] `MDL-009` 模型版本状态机仍由 F019/F019 后续服务控制，F020 只提供评估事实源。
- [x] 权限、跨 BU 防泄露、dataset artifact download grant 与审计符合契约。

## User Experience
- [x] `/eval` 页面保留模型评估信息架构。
- [x] 列表、详情、导入结果、对比、artifact 下载主链路可用。
- [x] 空状态为业务化文案。
- [x] 错误/加载状态由 Ant Design 与 TanStack Query 模式承载。

## Test Coverage Summary
- P0: 4/4 passed
- P1: 4/4 passed
- P2: 1/1 passed
- Acceptance Criteria: AC-01 至 AC-12 全部 PASS
- Integration: PASS
- Code Review: PASS_WITH_COMMENTS（无阻塞项）

## Recommendations
1. 可放行 F020：当前 QA 结论为 **QA Verdict: PASS**。
2. 后续非阻塞清理：处理 Ant Design deprecated 属性、前端既有 lint warnings 与 chunk size warning。
3. 后续测试增强：按 code review 建议补充 artifact 拒绝路径审计断言，以提升审计回归粒度。

## Sign-off
- [x] Ready for Release
- [ ] Needs Fix Before Release
- [ ] Needs Re-test After Fix
