> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-annotation-integration.md`

﻿# Test Spec：F012 标注任务、标注审核与 Label Studio 适配

## 1. 元信息

- Feature：`F012-annotation-integration`
- 状态：RALPLAN 测试规格草案，供 `plan.md` 和后续 `/build-feature` 测试计划引用
- 日期：2026-05-19
- 范围：规划级测试策略，不替代批准后的 `test-plan.md`

## 2. 测试目标

验证 F012 在不接入真实生产 Label Studio 和真实 AI 预标注模型的前提下，仍能提供生产可用的平台控制面：任务、模板、分配、工作项、审核、数据集生成、权限、BU 隔离、审计和外部适配失败路径均可测。

## 3. 覆盖矩阵

| 领域 | 关键规则/来源 | 必测内容 |
| --- | --- | --- |
| 任务创建 | DATA-003、FUNC-DATA-025、DAT-009 | 只能选择 ACTIVE 数据集；创建后任务状态、分配、截止时间正确。 |
| 标签模板 | FUNC-DATA-024、DAT-003 | 未发布模板不可启动/分配；发布模板可生成 Label Studio config seam。 |
| 工作台 | FUNC-DATA-022、FUNC-DATA-023 | 样本队列、预标注状态、提交结果、保存草稿。 |
| 审核 | FUNC-DATA-026、DAT-004 | 通过/驳回；审核人不得为提交人。 |
| 数据集生成 | DATA-006、DAT-010 | 质量检查、覆盖率、格式校验、生成 `ANNOTATED` 数据集与 `ANNOTATION` 血缘。 |
| BU 隔离 | DAT-012、PLT-001、PLT-009 | 跨 BU 任务/数据集不可见或 403。 |
| 审计 | PLT-005、PLT-011 | 关键操作、失败和高危/跨租户事件写审计。 |
| 账号停用 | PLT-014 | 停用前能扫描进行中标注/审核任务并提示重新分配。 |
| Label Studio | 官方 API/导出约束 | 未配置、同步失败、secretRef、label config、task payload seam。 |

## 4. 后端单元测试建议

新增 `AnnotationServiceTest` 或等价测试：

- `createTaskRejectsInactiveDataset`：非 ACTIVE 数据集创建任务失败，错误码映射 DAT-009。
- `createTaskRejectsMissingPublishedTemplate`：未配置或未发布模板时失败，错误码映射 DAT-003。
- `createTaskAssignsAnnotatorsAndAudit`：创建任务、分配标注员、写审计。
- `submitWorkItemMovesToReviewPending`：提交标注结果后进入待审核或任务待审核统计变化。
- `approveRejectsSelfReview`：审核人等于 annotatorId 时失败，错误码映射 DAT-004。
- `rejectReviewReturnsWorkItemToRejected`：驳回要求填写原因并回到可修改状态。
- `publishAnnotatedDatasetCreatesDatasetVersionFileLineage`：质量检查通过后生成 dataset/version/file/lineage。
- `qualityCheckRejectsLowCoverage`：覆盖率低于阈值时阻断发布并记录诊断。
- `labelStudioAdapterUnconfiguredReturnsDiagnostic`：未配置外部参数返回 `UNCONFIGURED` 与 `TODO_CONFIRM_*`。
- `tenantIsolationRejectsCrossTenantTaskAccess`：跨租户读取/操作失败并审计。

## 5. 后端集成测试建议

在 `smp-app` 集成测试中覆盖 REST API：

1. `GET /api/v1/annotation/overview` 返回租户内任务统计。
2. `GET /api/v1/annotation/tasks` 支持状态筛选、分页和 tenant 过滤。
3. `POST /api/v1/annotation/tasks` 成功创建任务，返回任务详情和分配。
4. `GET /api/v1/annotation/label-templates`/`POST`/`publish` 完成模板发布闭环。
5. `GET /api/v1/annotation/tasks/{taskId}/work-items` 只返回当前标注员可见工作项。
6. `POST /api/v1/annotation/work-items/{workItemId}/submit` 提交结果。
7. `GET /api/v1/annotation/review-items` 返回审核队列。
8. `POST /api/v1/annotation/review-items/{reviewItemId}/approve|reject` 状态流转正确。
9. `POST /api/v1/annotation/tasks/{taskId}/publish-dataset` 生成标注数据集和血缘。
10. Label Studio status/sync API 在未配置时可预测失败，不抛 500。

## 6. 前端组件/单元测试建议

在 `frontend/src/App.test.tsx` 或相关测试中覆盖：

- 导航到 `/ann` 显示“标注任务管理”、“标签模板”、“新建标注任务”和任务 Tab。
- 任务表格展示标注类型、进度、标注员、质量评分、截止、状态、操作。
- 新建标注任务向导包含“选择数据集”“标注配置”“分配团队”，并展示 AI 预标注配置。
- 标签模板弹窗/抽屉可展示模板状态和 Label Studio config 状态。
- `/annwork` 显示任务详情、样本队列、预标注摘要、Label Studio 未配置提示、提交按钮。
- `/annreview` 显示审核队列、通过/驳回操作，DAT-004 失败提示。

## 7. Playwright E2E 场景

新增 `frontend/e2e/annotation-integration.spec.ts`：

### E2E-01 标注任务总览与创建向导

- 进入 `/ann`。
- 断言标题“标注任务管理”、Tab、任务列表、统计卡。
- 打开“新建标注任务”。
- 选择 ACTIVE 数据集、标注类型、PUBLISHED 标签模板、启用 AI 预标注、分配标注员。
- 提交后断言任务创建成功和列表刷新。

### E2E-02 DAT-009/DAT-003 前端错误路径

- mock 后端返回非 ACTIVE 数据集错误。
- 断言提示“所选数据集状态不可用，请先激活数据集”。
- mock 未发布标签模板错误。
- 断言提示“任务尚未配置标签模板，请先完成标签体系定义”。

### E2E-03 标注工作台提交

- 从 `/ann` 操作进入 `/annwork`。
- 断言样本队列、标签模板、预标注摘要、Label Studio 状态。
- 提交标注结果。
- 断言工作项状态进入 `REVIEW_PENDING` 或任务进度更新。

### E2E-04 审核通过/驳回与自审阻断

- 进入 `/annreview`。
- 选择待审核项并通过，断言状态更新。
- 对另一个项 mock DAT-004 自审错误，断言“不允许审核自己提交的标注结果”。
- 驳回时要求填写原因，断言无原因不能提交。

### E2E-05 Label Studio 未配置

- 进入 `/annwork` 或任务详情。
- mock `/label-studio/status` 返回 `UNCONFIGURED` 和 `TODO_CONFIRM_LABEL_STUDIO_BASE_URL`。
- 断言页面显示外部标注工具未配置，且不展示“同步成功”。

### E2E-06 标注数据集发布与血缘可见

- 完成审核后执行发布标注数据集。
- 断言生成 `ANNOTATED` 数据集名称、版本和质量检查结果。
- 跳转 `/dsdetail` 断言已标注数据集可见。
- 跳转 `/lineage` 断言标注任务/标注数据集节点或时间轴事件可见。

## 8. 脚手架与门禁验证

后续 `/build-feature` 阶段至少执行：

```powershell
$env:JAVA_HOME='C:\java\jdk-25'; $env:Path="$env:JAVA_HOME\bin;$env:Path"
mvn -q -f backend/pom.xml -pl smp-app test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
npm --prefix frontend run e2e
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F012-annotation-integration --skip-backend-integration --run-e2e
```

规划阶段只需验证：

```powershell
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F012-annotation-integration --stage ralplan
node tools/ai-scaffold/dist/cli.js scaffold-status
git status --short --branch
```

`check-build-feature-prereqs` 在 `plan_status: draft` 时失败是预期结果，不作为规划失败。

## 9. 测试数据与 fixture 要求

- 至少一个 ACTIVE RAW/IMAGE 数据集：如焊缝缺陷检测数据集。
- 至少一个 ACTIVE/PREPROCESSED 数据集，用于验证 DAT-009 支持原始或预处理数据集。
- 至少一个非 ACTIVE 数据集，用于失败路径。
- 至少一个 PUBLISHED 标签模板和一个 DRAFT 标签模板。
- 至少两个用户：标注员与审核员不同；另准备自审失败用户。
- 至少一个 `DATASET-WELD-ANNOTATED` 或新生成标注数据集样例，用于详情和血缘。
- Label Studio 配置 fixture 必须包含 `UNCONFIGURED` 与 `SYNC_FAILED` 两种状态。

## 10. 验收证据要求

后续执行完成后，正式报告应至少包含：

- `docs/features/F012-annotation-integration/reports/implementation-report.md`
- `docs/features/F012-annotation-integration/reports/review-report.md`
- `docs/features/F012-annotation-integration/reports/qa-report.md`
- 后端测试输出摘要。
- 前端 lint/build/test/e2e 输出摘要。
- `tools/ai-scaffold gate` 输出。
- Label Studio 未配置/失败路径截图或 E2E trace 证据。
- DAT-003/DAT-004/DAT-009/DAT-010/DAT-012/PLT-001/PLT-011 验证证据。
