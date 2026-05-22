# F015 代码审查报告

- **Feature**: `F015-local-dataset-upload`
- **审查时间**: 2026-05-22（Asia/Shanghai）
- **Verdict**: PASS_WITH_COMMENTS
- **审查范围**: F015 后端 upload-session API / service / migration、前端 `DatasetUploadPage` / `DatasetDetailPage` / `platformApi`、Playwright E2E、feature 文档与 gate 证据。

## 1. 总体结论

F015 当前实现与批准计划、冻结契约和测试计划一致，未发现阻塞交付的问题：

- 后端在 `DataManagementService` 中复用 F009/F007 的 dataset / version / file object / lineage seam，新增 upload session 聚合和文件明细模型，没有引入平行数据事实源。
- `POST /dataset-upload-sessions`、`/files`、`GET session`、`/commit` 四个接口与 frozen contract 对齐，覆盖空会话、非法格式、损坏图片、超限文件、高风险内容、内容安全待处理、跨 BU 与重复 commit 等关键规则。
- 前端 `DatasetUploadPage` 已完成双入口切换、无可用数据源空态、本地上传文件列表、commit 轮询、阶段进度展示与详情页跳转；`DatasetDetailPage` 仅在 ACTIVE 数据集上开放“创建标注任务”，满足 DAT-009。
- Playwright 已覆盖无可用数据源入口、本地上传提交后跳转详情页继续发起标注任务、数据源导入回归、高风险内容进入 `SECURITY_PENDING` 并阻断标注入口。
- 代码审查上一轮提出的两项问题已关闭：默认内容安全扫描器不再把 `sandbox/internal` 直接视作通过；前端已通过 `useQuery` 轮询把 commit 期间阶段进度对用户可见。

## 2. 放行检查

| 检查项 | 结论 | 说明 |
| --- | --- | --- |
| 需求/契约一致性 | PASS | `contract.md` frozen；接口、DTO、权限、错误码与实现一致。 |
| 后端规则强制 | PASS | DAT-002、DAT-005、DAT-009、DAT-012 在 service 层强制校验并写审计。 |
| 数据模型复用 | PASS | session 仅承接过程态；最终事实仍落到 `dataset`、`dataset_version`、`dataset_file`、`platform_file_object`、`data_lineage`。 |
| 前端一致性 | PASS | `up` / `ds` / `dsdetail` 保持原型 IA，新增本地上传能力不破坏数据源导入旧路径。 |
| 测试覆盖 | PASS | 后端集成测试、Vitest、Playwright 专项用例与 traceability 均已覆盖 AC-01~AC-06。 |
| 风险控制 | PASS_WITH_COMMENTS | 真实内容安全服务与生产阈值仍待 `TODO_CONFIRM_*` 冻结，但当前实现已避免假成功。 |

## 3. 已关闭发现

### 已关闭 1：内容安全默认实现不再存在启发式“假通过”
- 当前 `DefaultContentSafetyScanner` 仅在：
  - endpoint 缺失 / `TODO_CONFIRM_*`
  - HTTP 非 2xx
  - 返回体无法解析为 `PASSED/BLOCKED`
  时返回 `PENDING`。
- 只有外部服务真实返回 `PASSED`/`BLOCKED` 时才会进入对应状态。
- 证据：`backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java` 中 `DefaultContentSafetyScanner` 当前逻辑；`localDatasetUploadSecurityPendingDoesNotPretendReady` 与 `localDatasetUploadSecurityBlockedFilesDoNotEnterReadyVersion` 两个后端测试均通过。

### 已关闭 2：前端已把 commit 阶段做成可观察的真实进度流
- `DatasetUploadPage` 在 `uploadSession.status === 'PROCESSING'` 时启用 `GET /api/v1/dataset-upload-sessions/{sessionId}` 轮询。
- 轮询阶段根据后端返回的 `progress.phase / percent` 展示 `阶段进度：...` 文案，并在终态自动刷新数据集列表与跳转详情页。
- 证据：`frontend/src/features/data/DataPages.tsx` 中 `uploadSessionQuery` + `refetchInterval` + `isCommitPolling` 逻辑；Playwright F015 专项用例通过。

## 4. 非阻塞建议

1. 当前阶段进度使用 Alert 文案展示，若后续上传链路更复杂，可再升级为更显式的 progress overlay / steps 组件。
2. `DataManagementService` 已承载数据源、数据集、本地上传、标准化等较多逻辑；后续若继续扩展上传治理，可以拆出专门的 upload session service。
3. 生产环境仍需冻结内容安全 endpoint、文件数/大小阈值和对象存储 key 策略；当前 contract 中的 `TODO_CONFIRM_*` 需要后续 feature / ADR 收口。

## 5. 主要证据

- `mvn -q -f backend/pom.xml -pl smp-app -Dtest=DataManagementControllerTest test`：PASS，18/18。
- `npm --prefix frontend run lint`：PASS，只有 1 条既有 Fast Refresh warning。
- `npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true`：PASS。
- `npm --prefix frontend run build`：PASS。
- `npm --prefix frontend run e2e -- local-dataset-upload.spec.ts`：PASS，4/4。
- `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F015-local-dataset-upload`：PASS。
- `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F015-local-dataset-upload`：PASS。

## 6. 审查结论

F015 当前实现满足 build-feature 收尾前的代码审查放行条件。以上建议均为后续增强项，不阻塞本次交付。
