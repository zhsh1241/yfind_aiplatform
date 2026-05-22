> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-local-dataset-upload.md`

# RALPLAN Test Spec: 本地图片上传创建数据集

## 1. Test Strategy

目标验证 F015 在不破坏 F009 既有数据源导入链路的前提下，补齐本地图片上传创建数据集能力，并满足内容安全、版本、权限、审计与后续标注兼容要求。

测试分层：

- Unit：upload session state machine、creationMode branching、diagnostic mapping。
- Backend integration：upload session API、FileObject 生成、dataset/version/file binding、security gating、audit。
- Frontend component/unit：空态、创建方式切换、上传列表、进度覆盖层。
- E2E：无数据源时直接上传图片创建数据集，进入详情页并继续标注入口。
- Scaffold gates：feature artifacts、lint/build/test、ai-scaffold gate。

## 2. P0 Acceptance Tests

### T-P0-01 无可用数据源显示本地上传空态

- Given 当前租户没有 `ACTIVE + OK` 数据源
- When 打开 `/up`
- Then 页面不显示空白来源数据源下拉
- And 显示“当前无可用数据源”说明
- And 提供“直接上传图片”“去创建数据源”入口

### T-P0-02 本地上传模式可创建 upload session

- Given 用户具备数据集创建权限
- When 在 Step 1 选择“本地上传图片”并填写元数据提交
- Then 创建 `dataset_upload_session`
- And 返回 `sessionId` 与初始状态
- And 审计 `DATASET_UPLOAD_SESSION_CREATED` 写入

### T-P0-03 上传多张图片成功生成文件对象

- Given 有效 jpg/png 图片 10 张
- When 上传到 session
- Then 每个有效文件进入 ACCEPTED/UPLOADED 状态
- And 生成对应 `platform_file_object`
- And session summary 正确统计 accepted/rejected 数量

### T-P0-04 非法格式文件被拒绝

- Given 上传 `.exe` 或不在 allowlist 的文件
- When 提交到 session
- Then 文件状态为 REJECTED
- And 返回格式不支持诊断
- And 不生成 dataset_file 绑定

### T-P0-05 commit 后生成数据集与版本绑定

- Given session 中存在已接收文件
- When 调用 commit
- Then 生成/确认 `dataset`、`dataset_version`、`dataset_file`
- And lineage 记录 `LOCAL_UPLOAD`
- And 数据集详情可见文件列表

### T-P0-06 内容安全未通过文件不得进入最终版本

- Given 部分文件被内容安全标记为高风险
- When commit / processing 完成
- Then 高风险文件不进入最终可用版本
- And session / version 有明确诊断
- And 审计 `DATASET_SECURITY_BLOCKED`

### T-P0-07 内容安全服务不可用不得假成功

- Given 内容安全服务不可用
- When 处理上传文件
- Then 版本状态为 `SECURITY_PENDING` 或提交失败
- And 不可伪造 READY/PUBLISHED
- And 前端显示待处理/失败诊断

### T-P0-08 上传完成后可进入数据集详情并发起标注任务

- Given 上传生成的数据集达到可用状态
- When 跳转 `/dsdetail`
- Then 可看到文件与版本信息
- And 后续“创建标注任务”入口按 F012/F014 规则可用

### T-P0-09 跨 BU / 无权限访问 upload session 被拒绝

- Given 非所属租户用户或无数据集写权限用户
- When 查询或 commit upload session
- Then 返回 403/404
- And 写未授权/跨租户审计

### T-P0-10 数据源导入旧路径不回归

- Given 仍存在可用数据源
- When 用户选择“从数据源导入”创建数据集
- Then 现有 sourceId 流程仍可正常工作
- And 不受本地上传功能影响

## 3. P1 / Extended Tests

- T-P1-01：zip 上传成功解包为多图片，并保持错误文件明细。
- T-P1-02：超出文件数/大小阈值时返回 `TODO_CONFIRM_*` 对应诊断或明确超限错误。
- T-P1-03：重复 commit / 空 session commit 的幂等与拒绝行为。
- T-P1-04：上传生成的数据集继续走 F014 训练格式导出链路回归。

## 4. Unit Test Matrix

| Component | Cases |
| --- | --- |
| `DatasetUploadSessionStateMachine` | create, upload, processing, commit, fail, security_pending |
| `LocalUploadEligibility` | image ok, zip ok, invalid format, oversize, empty session |
| `LocalUploadLineageMapper` | sourceType/sourceId mapping for LOCAL_UPLOAD |
| `DatasetUploadService` | file object creation, dataset binding, audit success/failure |
| `SecurityResultReducer` | safe/low risk/high risk/service unavailable |

## 5. Backend Integration Tests

- `POST /api/v1/dataset-upload-sessions` 创建 session。
- `POST /api/v1/dataset-upload-sessions/{sessionId}/files` 接收 multipart 并生成 file object。
- `GET /api/v1/dataset-upload-sessions/{sessionId}` 返回阶段进度与统计。
- `POST /api/v1/dataset-upload-sessions/{sessionId}/commit` 生成 dataset/version/file/lineage。
- 权限、租户过滤、审计、内容安全失败路径全覆盖。

## 6. Frontend / E2E Tests

建议文件：`frontend/e2e/local-dataset-upload.spec.ts`

场景：

1. 无数据源时显示本地上传空态。
2. 选择本地上传后可上传多张图片。
3. 上传进度覆盖层显示阶段性进度。
4. 上传成功后跳转数据集详情。
5. 上传失败/安全拦截时显示明确诊断。
6. 选择数据源导入路径仍然可正常使用。

## 7. Static / Gate Verification

规划阶段：

```powershell
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F015-local-dataset-upload --stage deep-interview
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F015-local-dataset-upload --stage ralplan
node tools/ai-scaffold/dist/cli.js check-feature-artifacts docs/features/F015-local-dataset-upload
```

后续 build-feature 阶段至少：

```powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F015-local-dataset-upload
mvn -q -f backend/pom.xml -pl smp-app test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
npm --prefix frontend run e2e -- local-dataset-upload.spec.ts
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F015-local-dataset-upload --run-e2e
```

## 8. Exit Criteria

- 用户在无数据源时仍可成功创建图片数据集。
- 本地上传路径的所有关键失败场景都有自动化证据。
- 数据源导入旧路径无回归。
- plan.md 人审批准前不得进入业务实现代码阶段。
