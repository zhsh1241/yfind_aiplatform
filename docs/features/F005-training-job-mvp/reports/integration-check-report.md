# F005 训练任务 MVP 联调检查报告

- 检查角色：integration-checker
- 代码事实来源：`C:\GIT\yfind_aiplatform\.codex\worktrees\feature-training-job-mvp`
- 报告落点：主仓库 `docs/features/F005-training-job-mvp/reports/integration-check-report.md`
- 检查方式：按冻结契约逐项核对 worktree 实现，不修改业务代码
- 检查时间：2026-05-05

## 一、结论

**PASS（带条件）**

结论依据：worktree 中已经具备训练任务 MVP 的完整主链路实现，且后端、`ai-adapter`、前端与 E2E 测试彼此对齐，能够覆盖列表、详情、创建、取消、模板查询以及内部 submit 接口。

但需要明确：该实现是 **MVP 简化版**，并 **未完全覆盖冻结契约的全部扩展字段与内部回写接口**。这些缺口不影响本次“主链路联调通过”的判定，但必须在报告中列明。

---

## 二、核对范围与证据文件

已核对的实际文件：

- `backend/src/main/java/com/yfind/aiplatform/training/TrainingController.java`
- `backend/src/main/java/com/yfind/aiplatform/training/TrainingService.java`
- `backend/src/test/java/com/yfind/aiplatform/training/TrainingControllerTest.java`
- `ai-adapter/app/api/training.py`
- `ai-adapter/app/main.py`
- `frontend/src/App.tsx`
- `frontend/src/pages/TrainingPage.tsx`
- `frontend/src/modals/TrainingModal.tsx`
- `frontend/src/prototype-data.ts`
- `frontend/e2e/training-job-mvp.spec.ts`

另外，还核对了相关 DTO / 异常处理：

- `backend/src/main/java/com/yfind/aiplatform/training/TrainingModels.java`
- `backend/src/main/java/com/yfind/aiplatform/training/TrainingApiExceptionHandler.java`
- `ai-adapter/app/schemas/training.py`

---

## 三、逐项一致性检查

### 3.1 列表接口 `GET /api/training-jobs`

**结论：符合契约主要求，属于可用实现**

证据：

- `TrainingController.list(...)` 提供 `/api/training-jobs`
- 支持契约要求的查询参数：
  - `status`
  - `datasetKey`
  - `datasetVersionKey`
  - `templateKey`
  - `ownerKey`
  - `keyword`
  - `createdAtFrom`
  - `createdAtTo`
  - `pageNumber`
  - `pageSize`
  - `sort`
- 返回 `TrainingJobListResponse`，包含：
  - `items`
  - `page`
  - `featureTrace`

对应测试：

- `TrainingControllerTest.listTrainingJobsReturnsSummaries()`

**说明**：
- 契约中 `pageSize` 上限 100、默认排序 `-createdAt`、分页结构等，worktree 实现已覆盖。
- `featureTrace` 是实现附加字段，属于 MVP 辅助追踪，不构成契约冲突。

### 3.2 详情接口 `GET /api/training-jobs/{jobKey}`

**结论：符合契约主要求**

证据：

- `TrainingController.detail(...)` 提供详情接口
- 返回 `TrainingJobDetail`
- 详情中包含：
  - `resourceRequest`
  - `resourceDecision`
  - `parameters`
  - `logPreview`
  - `metricSnapshots`
  - `artifacts`
  - `failureReason`
  - `cancelReason`
  - `dispatchMessage`

对应测试：

- `TrainingControllerTest.trainingJobDetailReturnsNestedState()`

**说明**：
- 契约要求的核心详情字段已经齐全。
- `featureTrace` 仍为实现附加字段，可接受。

### 3.3 创建接口 `POST /api/training-jobs`

**结论：主链路符合契约；存在少量 MVP 简化**

证据：

- `TrainingController.create(...)` 返回 `201 Created`
- 显式写入 `Location: /api/training-jobs/{jobKey}`
- 返回 `TrainingJobDetail`
- `TrainingService.create(...)` 会：
  - 校验 `datasetKey`
  - 校验 `datasetVersionKey`
  - 校验 `templateKey`
  - 校验 `resourceRequest`
  - 生成 `submitted` 状态
  - 设定 `dispatchStatus=pending`
  - 产生 `resourceDecision=pending`
  - 生成初始日志与审计记录
  - 调用本地 `ai-adapter` stub 提交

对应测试：

- `TrainingControllerTest.createTrainingJobReturnsCreatedDetail()`
- `TrainingControllerTest.createRejectsInvalidDatasetVersion()`

**契约符合点**：
- `201 Created`
- `Location` 头
- 返回体为详情对象
- 状态初始为 `submitted`

**MVP 简化点**：
- 创建后的 `ai-adapter` 调用是本地 stub，并非真实外部调度
- `idempotencyKey`、`callbackPolicy`、`tags` 等扩展字段在当前前端/主流程里未完整暴露，但后端 DTO 已留位

### 3.4 取消接口 `POST /api/training-jobs/{jobKey}/cancel`

**结论：符合契约主要求；状态机做了 MVP 化约束**

证据：

- `TrainingController.cancel(...)` 已实现
- `TrainingService.cancel(...)` 仅允许 `submitted` / `running` 取消
- 取消后返回 `cancelled`
- `cancelReason` 进入 `user_requested`
- 非法状态返回 `409 TRAINING_JOB_STATE_INVALID`

对应测试：

- `TrainingControllerTest.cancelTrainingJobReturnsCancelledDetail()`
- `TrainingControllerTest.cancelRejectsSucceededJob()`

**契约符合点**：
- 状态限制符合契约
- `cancelReason` 被保留

**MVP 简化点**：
- 取消后的 `dispatchStatus` 直接置为 `failed`，未细分更复杂的派发失败路径

### 3.5 模板查询 `GET /api/training-jobs/templates`

**结论：符合契约主要求**

证据：

- `TrainingController.templates(...)` 已实现
- 支持查询参数：
  - `status`
  - `datasetType`
  - `keyword`
- 返回 `TrainingTemplateListResponse`

对应测试：

- `TrainingControllerTest.listTemplatesReturnsActiveItems()`

**说明**：
- 默认 `status=active` 与契约一致。
- 模板中包含 `defaultResourceRequest`、`defaultParameters`、`supportedMetrics` 等信息。

### 3.6 `ai-adapter` submit 接口 `POST /internal/api/training-jobs/submit`

**结论：符合契约主要求；当前仅实现 submit，未实现 status/artifacts 回写**

证据：

- `ai-adapter/app/main.py` 已挂载：
  - `/internal/health`
  - `/internal/api/training-jobs/submit`
- `ai-adapter/app/api/training.py` 提供 `submit_training_job(...)`
- `ai-adapter/app/schemas/training.py` 定义了提交请求与响应

请求字段对照：

- `jobKey`
- `datasetKey`
- `datasetVersionKey`
- `templateKey`
- `templateVersion`
- `algorithmKey`
- `resourceRequest`
- `parameters`
- `outputArtifactRoot`
- `logPrefix`
- `callbackUrl`
- `requestId`
- `idempotencyKey`

响应字段对照：

- `accepted`
- `adapterJobId`
- `provider`
- `status`
- `message`
- `retryable`
- `traceId`

**契约符合点**：
- 路径正确
- 请求/响应字段与契约主结构一致
- `status=queued`、`retryable=false`、`traceId` 均符合 submit 场景

**MVP 简化点**：
- 实现为本地 stub，固定返回接受，不接真实 Kubeflow/Argo
- 当前未实现契约中的：
  - `POST /internal/api/training-jobs/{jobKey}/status`
  - `POST /internal/api/training-jobs/{jobKey}/artifacts`

这两项属于 **未覆盖的契约扩展能力**，但不影响 submit 主链路的联调通过判定。

### 3.7 前端训练中心页面

**结论：主链路符合契约诉求；部分能力是 MVP 简化**

证据：

- `frontend/src/App.tsx`
  - 已将训练中心接入真实状态流
  - `trainingJobs` 来自 `prototype-data.ts`
  - 创建训练任务会向列表中插入新任务
  - 支持任务详情选择与取消
  - 启动训练会打开真实表单弹窗
- `frontend/src/pages/TrainingPage.tsx`
  - 展示训练任务看板
  - 展示详情、进度、资源配额、下发状态、指标、artifact
  - 提供“取消训练”按钮
- `frontend/src/modals/TrainingModal.tsx`
  - 提供任务名称、数据集版本、训练模板、Epochs、CPU、内存、GPU、存储表单
  - 提交时构造 `CreateTrainingRequest`
- `frontend/src/prototype-data.ts`
  - 已包含 `trainingTemplates`、`trainingJobs`
  - 训练任务字段与页面展示字段保持一致
- `frontend/e2e/training-job-mvp.spec.ts`
  - 覆盖创建训练任务
  - 覆盖取消运行中任务

**契约符合点**：
- 页面已不再是纯静态占位，具备训练中心主流程交互
- 已覆盖列表、详情、创建、取消、模板选择、artifact 展示

**MVP 简化点**：
- 前端仍使用本地内存态/原型数据，不直接调用后端 REST API
- `artifact` 区块明确注明“不接入外部对象存储或真实下载链路”
- 任务创建后的 id、调度状态、回写状态由前端模拟，不是实时后端拉取

这属于 **可接受的 MVP 简化**，但如果以“真实端到端联调”作为更高标准，则仍需后续接入真实 API。

### 3.8 E2E 覆盖

**结论：具备最小联调验证能力**

证据：

- `frontend/e2e/training-job-mvp.spec.ts`
  - 创建训练任务后能看到新任务
  - 能看到“等待 ai-adapter 接收”
  - 能看到“暂无 artifact”
  - 支持取消运行中任务并显示取消原因

**说明**：
- 这证明前端主流程与训练任务状态展示是自洽的。
- 但它验证的是原型状态流，不是后端 API 直连状态流。

---

## 四、与冻结契约相比的“不完全满足项”

以下项 **未完全满足冻结契约的扩展能力**，但属于当前 MVP 范围内的可接受简化或未落地项：

1. **`ai-adapter` 的状态回写接口未实现**
   - 缺失：`POST /internal/api/training-jobs/{jobKey}/status`
   - 缺失：`POST /internal/api/training-jobs/{jobKey}/artifacts`
   - 影响：无法验证训练回写、指标流式上报、artifact 增量写入
   - 结论：不影响 submit 主链路 PASS，但属于明确未覆盖契约项

2. **前端未接真实后端 API**
   - 当前训练中心仍使用本地内存态和原型数据
   - 影响：列表/详情/创建/取消未经过真实网络请求
   - 结论：属于 MVP 简化，不是契约冲突

3. **部分扩展字段未在前端完整暴露**
   - 例如 `callbackPolicy`、`tags`、更完整的 `resourceDecision`、`datasetVersionStatus` 等
   - 结论：后端 DTO 已预留，但前端交互没有全部展开，属于范围裁剪

4. **`featureTrace` 等追踪字段为实现附加字段**
   - 作用：便于联调和测试定位
   - 结论：不是契约冲突

---

## 五、问题清单

### 问题 1：`ai-adapter` 缺少 status / artifacts 回写接口
- **严重级别**：中
- **说明**：当前仅实现 submit，未覆盖契约 8.2 / 8.3
- **处理建议**：若后续需要真实训练执行闭环，应补齐这两个接口

### 问题 2：前端仍是原型态本地状态流
- **严重级别**：中
- **说明**：训练中心已经有真实交互，但尚未连接后端 REST API
- **处理建议**：若目标升级到真实联调，应替换为 API 驱动

### 问题 3：部分契约扩展字段未在前端完整呈现
- **严重级别**：低
- **说明**：当前 UI 聚焦主链路，未展开全部高级参数
- **处理建议**：按业务需要逐步补齐

---

## 六、最终判定说明

**PASS**

理由：

- 后端训练任务公共 API 已实现并有测试覆盖
- `ai-adapter` submit 接口已实现并对齐契约主结构
- 前端训练中心已具备创建、取消、详情、模板、artifact 展示主流程
- E2E 已覆盖关键路径

同时明确：

- 本次 PASS 不是“全量冻结契约字段都 100% 落地”的 PASS
- 而是“F005 训练任务 MVP 主链路联调通过”的 PASS
- 未实现的 `status` / `artifacts` 内部回写接口，以及前端的 API 直连，属于当前 MVP 的已知简化或后续增强项，不构成本次主链路失败
