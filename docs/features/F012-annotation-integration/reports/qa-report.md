# F012 QA 验收报告

- **Feature**: `F012-annotation-integration`
- **报告时间**: 2026-05-19（Asia/Shanghai）
- **Verdict**: PASS
- **测试对象**: 标注任务、标签模板、标注工作台、标注审核、Label Studio seam、标注数据集发布。
- **原型依据**: `docs/prototype/SMP工业AI平台-原型v2.html` 的 `ann`、`annwork`、`annreview`、`dsdetail`、`lineage`。
- **实现依据**: `docs/features/F012-annotation-integration/{plan.md,TASK.md,contract.md,test-plan.md}`。

## 1. 总体结论

F012 已完成 DATA 域标注闭环的可验收实现：

- `/ann` 可展示标注任务管理、标签模板和新建任务入口。
- `/annwork` 可展示样本队列、AI 预标注、Label Studio 未配置状态、保存草稿和提交审核。
- `/annreview` 可展示审核队列、DAT-004 防自审提示、质量检查和发布标注数据集入口。
- 后端可创建任务、发布模板、提交标注、审核、质量检查并发布 `ANNOTATED` 数据集和 `ANNOTATION` 血缘。
- 未配置 Label Studio 返回 `UNCONFIGURED`/`TODO_CONFIRM_*`，并通过前端提示和 E2E 响应断言验证。

## 2. 测试执行记录

| 命令 | 结果 | 摘要 |
| --- | --- | --- |
| `node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F012-annotation-integration` | PASS | planning gate 已通过；plan 已批准，planning evidence 已归档。 |
| `$env:JAVA_HOME='C:\java\jdk-25'; mvn -q -f backend/pom.xml -pl smp-app test -DskipTests=false` | PASS | 后端测试通过；Flyway V9 已成功应用。 |
| `npm --prefix frontend run lint` | PASS | 0 error，1 个既有 `react-refresh/only-export-components` warning。 |
| `npm --prefix frontend run build` | PASS | TypeScript + Vite 构建成功；chunk-size warning 非阻塞。 |
| `npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true` | PASS | 1 file / 7 tests passed。 |
| `npm --prefix frontend run e2e -- annotation-integration.spec.ts` | PASS | F012 专项 3 tests passed。 |
| `npm --prefix frontend run e2e` | PASS | 全量 14 tests passed。 |

## 3. 验收项覆盖

| AC | 验收要求 | 结果 | 证据 |
| --- | --- | --- | --- |
| AC-01 | `/ann` 按原型展示标注任务管理、统计、任务 Tab、任务列表、标签模板和新建入口。 | PASS | `annotation-integration.spec.ts` 第 1 条；`App.test.tsx` F012 单测。 |
| AC-02 | 创建任务只能选择 ACTIVE 数据集和 PUBLISHED 标签模板，违规后端拒绝。 | PASS | `DataManagementControllerTest.annotationIntegrationRejectsInactiveDatasetDraftTemplateSelfReviewAndCrossBu`。 |
| AC-03 | 标签模板可维护、发布并生成 Label Studio config seam。 | PASS | 后端创建/发布模板和 config 断言；前端模板抽屉。 |
| AC-04 | `/annwork` 可查看任务、样本队列、预标注、Label Studio 状态并提交结果。 | PASS | E2E 第 2 条；后端 work-item draft/submit 测试。 |
| AC-05 | `/annreview` 可审核通过/驳回；自审被 DAT-004 阻断。 | PASS | 后端 approve/reject 与自审失败测试；前端审核页断言。 |
| AC-06 | Label Studio 未配置返回 `UNCONFIGURED`/`TODO_CONFIRM_*`。 | PASS | E2E 第 1 条等待 sync-project 响应；后端 adapter 测试路径。 |
| AC-07 | 质量检查通过后生成 `ANNOTATED` 数据集、版本、文件和 `ANNOTATION` 血缘。 | PASS | 后端 publish-dataset 后查询 dataset detail/lineage。 |
| AC-08 | 权限不足、跨 BU、非法状态、停用用户相关路径有失败或审计证据。 | PASS | 后端跨 BU 404、自审 422、非 ACTIVE/DRAFT 模板失败；审计由 service 写入。 |

## 4. 回归覆盖

全量 Playwright 14 条通过，包含 F009、F010、F011、F008、F006/F007 和 smoke 回归：

```text
annotation-integration.spec.ts: 3 passed
data-source-dataset-management.spec.ts: 3 passed
data-standardization-pipeline.spec.ts: 1 passed
pai-resource-integration.spec.ts: 2 passed
pipeline-editor-operator-marketplace.spec.ts: 1 passed
platform-identity-audit.spec.ts: 1 passed
platform-organization-config.spec.ts: 2 passed
smoke.spec.ts: 1 passed
Total: 14 passed
```

## 5. 已知非阻塞项

- Ant Design `Drawer.width`、`Space.direction`、`Alert.message` deprecated warning 出现在 Playwright dev server 日志中，不影响断言。
- Vitest/jsdom 输出 CSS parse warnings，不影响断言。
- 本地验证使用 H2 test profile 和 `--skip-backend-integration`；真实 PostgreSQL/Redis 集成需后续 CI/环境补充。

## 6. QA 结论

F012 满足本期验收标准，可进入最终质量门禁与提交收尾。
