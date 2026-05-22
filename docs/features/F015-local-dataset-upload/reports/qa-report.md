# F015 QA 验收报告

- **Feature**: `F015-local-dataset-upload`
- **报告时间**: 2026-05-22（Asia/Shanghai）
- **Verdict**: PASS
- **测试对象**: 本地图片上传创建数据集、upload session、内容安全待处理/阻断、数据源导入回归、详情页标注入口。
- **原型依据**: `docs/prototype/SMP工业AI平台-原型v2.html` 的 `up`、`ds`、`dsdetail`、`ann`。
- **实现依据**: `docs/features/F015-local-dataset-upload/{plan.md,TASK.md,contract.md,test-plan.md}`。

## 1. 总体结论

F015 已完成 DATA 域“本地图片上传创建数据集”能力的可验收实现：

- `up` 页面在无可用数据源时展示明确空态，并提供“直接上传图片 / 去创建数据源” CTA。
- 平台提供 upload session 四个正式接口，支持创建 session、上传图片/zip、查询阶段进度、提交并生成 dataset/version/file/lineage。
- 高风险内容不会进入最终可用版本；内容安全未配置或不可用时进入 `SECURITY_PENDING`，不会伪造 READY/PUBLISHED 成功。
- `dsdetail` 页面只在 ACTIVE 数据集上开放“创建标注任务”，与 F012 入口规则兼容。
- `DATA_SOURCE_IMPORT` 旧路径已通过回归验证，未被本地上传能力破坏。

## 2. 测试执行记录

| 命令 | 结果 | 摘要 |
| --- | --- | --- |
| `node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F015-local-dataset-upload` | PASS | plan 已批准，planning evidence 已归档。 |
| `mvn -q -f backend/pom.xml -pl smp-app -Dtest=DataManagementControllerTest test` | PASS | 后端 F015 相关测试 18/18 通过。 |
| `npm --prefix frontend run lint` | PASS | 0 error；1 条既有 Fast Refresh warning。 |
| `npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true` | PASS | 前端单测通过。 |
| `npm --prefix frontend run build` | PASS | TypeScript + Vite 构建成功。 |
| `npm --prefix frontend run e2e -- local-dataset-upload.spec.ts` | PASS | F015 专项 4 tests passed。 |

## 3. 验收项覆盖

| AC | 验收要求 | 结果 | 证据 |
| --- | --- | --- | --- |
| AC-01 | 无数据源时展示空态与本地上传入口 | PASS | `local-dataset-upload.spec.ts` 第 1 条；`DataPages.tsx` 空态 Alert |
| AC-02 | 支持本地上传图片/zip 并创建 upload session | PASS | 后端 `localDatasetUploadSessionCreatesReceivesFilesQueriesAndCommits`、`localDatasetUploadZipContinuesAfterIllegalEntry` |
| AC-03 | 上传文件生成 FileObject 并绑定数据集版本 | PASS | 后端 happy path 测试；详情页文件与血缘断言 |
| AC-04 | 高风险内容不得进入最终可用版本 | PASS | 后端 `localDatasetUploadSecurityBlockedFilesDoNotEnterReadyVersion`、`localDatasetUploadSecurityPendingDoesNotPretendReady`；E2E 第 4 条 |
| AC-05 | 上传成功后的数据集可查看并继续发起标注任务 | PASS | E2E 第 2 条；`DatasetDetailPage` ACTIVE 限制逻辑 |
| AC-06 | 上传、失败、跨 BU 拒绝、内容安全拦截均记录审计 | PASS | 后端非法格式/超限/权限/安全阻断测试及 audit 查询断言 |

## 4. 回归覆盖

F015 专项 Playwright 覆盖以下关键旅程：

```text
1. 无可用数据源 -> 本地上传空态与 CTA
2. 本地上传提交 -> 详情页 -> 创建标注任务入口
3. 数据源导入旧路径回归
4. 高风险内容 -> SECURITY_PENDING -> 阻断标注入口
```

同时后端集成测试覆盖：
- 非法格式拒绝
- 损坏图片拒绝
- zip 混合上传
- 空会话 commit 拒绝
- 超限文件 41300
- 内容安全阻断
- 内容安全待处理
- 权限链与跨租户拒绝

## 5. 已知非阻塞项

- 内容安全服务真实生产参数与最终阈值仍为 `TODO_CONFIRM_*`，但当前实现已经用 `SECURITY_PENDING` 和明确诊断承接，QA 不作为阻塞项。
- Vite chunk warning 和前端既有 Fast Refresh warning 不影响本 feature 验收。

## 6. QA 结论

F015 满足 build-feature 当前阶段的验收标准，可进入最终 gate 与提交收尾。
