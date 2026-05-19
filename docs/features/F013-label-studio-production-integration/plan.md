---
feature: F013-label-studio-production-integration
title: Label Studio 生产化联通
plan_status: approved
approved_at: 2026-05-19
owner: codex
created_at: 2026-05-19
updated_at: 2026-05-19
---

# Plan: Label Studio 生产化联通

## 1. 背景与目标

F012 已完成 DATA 域标注任务、标签模板、标注工作台、标注审核、质量检查、`ANNOTATED` 数据集发布与 Label Studio seam；当前 Label Studio 相关 API 在生产参数未知时返回 `UNCONFIGURED` / `TODO_CONFIRM_*`，前端也明确展示“外部标注工具未配置”。本功能 F013 的目标是在不推翻 F012 标注控制面和业务规则的前提下，把 Label Studio 从“可诊断未配置 seam”推进为“配置存在时真实调用、配置缺失或调用失败时准确诊断”的生产化联通能力。

规划证据：

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`

业务来源：

- `docs/business/bizdocs/02-01-业务流程-数据管理.md`：DATA-003 数据标注流程、DATA-006 标注数据集管理流程，要求可使用在线标注工具、导入标注结果并生成标注数据集。
- `docs/business/bizdocs/03-01-系统功能-数据管理.md`：FUNC-DATA-020、022、024、025、026、042、047。
- `docs/business/domain/01-领域对象-数据域.md`：`AnnotationTask`、`LabelTemplate`、`Dataset`、`DataLineage`。
- `docs/business/rules/01-数据管理规则.md`：DAT-003、DAT-004、DAT-009、DAT-010、DAT-011、DAT-012。
- `docs/business/rules/05-平台与权限规则.md`：PLT-001、PLT-005、PLT-009、PLT-011、PLT-014。

既有功能来源：

- `docs/features/F012-annotation-integration/plan.md`
- `docs/features/F012-annotation-integration/contract.md`
- `docs/features/F012-annotation-integration/test-plan.md`
- `backend/smp-app/src/main/java/com/yf/smp/app/platform/AnnotationService.java`
- `frontend/src/features/data/DataPages.tsx`
- `deploy/local/docker-compose.yml`

官方约束参考：

- Label Studio API：`https://labelstud.io/guide/api.html`
- Create Project API：`https://api.labelstud.io/api-reference/api-reference/projects/create`
- Import Tasks：`https://api.labelstud.io/tutorials/tutorials/import-tasks`
- Export：`https://labelstud.io/guide/export.html`

## 2. Intent / Desired Outcome

F013 的意图不是新增第二套标注系统，也不是替代 SMP 的标注审核与数据集发布规则；它只把 F012 已预留的 `LabelStudioAnnotationAdapter` seam 生产化。完成后：

1. 配置缺失时，现有 `UNCONFIGURED` 行为继续成立，且明确提示缺少哪些 `TODO_CONFIRM_*`。
2. 配置有效时，管理员可从 `/ann` 将 SMP 标注任务同步为 Label Studio project。
3. 标注员可从 `/annwork` 将工作项同步为 Label Studio task，并打开外部 task 页面完成标注。
4. 管理员或审核人员可从 Label Studio 导入结果，回写 SMP `annotation_work_item.annotation_json`，继续走 F012 审核、质量检查和 `ANNOTATED` 数据集发布流程。
5. 任何认证、网络、schema、格式或结果未完成问题都返回可区分诊断码并写审计，不伪造同步成功。
6. token/API key 不入库、不入响应、不入前端、不入日志，只能通过 `secretRef` 或运行时安全配置解析。

## 3. 范围

### 3.1 In Scope

- **配置驱动的 Label Studio HTTP Adapter**
  - 新增 `HttpLabelStudioAnnotationAdapter` 或等价实现。
  - 支持 `baseUrl`、token `secretRef`、workspace/project 策略、超时、启停开关、默认导出格式。
  - 保留 `UnconfiguredLabelStudioAnnotationAdapter` 作为配置缺失 fallback。

- **Project 同步**
  - 复用 F012 标签模板的 `labelStudioConfigXml` 创建或复用 Label Studio project。
  - 持久化 external project id、external URL、launch URL、同步状态、诊断码、同步时间。
  - 重复调用必须幂等，不能无控制地重复创建外部 project。

- **Task 同步**
  - 将 SMP `annotation_work_item` 转换为 Label Studio task `data` payload。
  - 依据标注场景映射 `image` / `text` / `audio` 等 label config 变量。
  - 保存 work item 与 external task id / task URL 的映射。
  - 重复调用必须幂等。

- **结果导入**
  - 默认支持 Label Studio JSON annotation 导入。
  - 将 `annotations.result` 或等价结果转换为 SMP `annotation_json`。
  - 导入后继续 F012 的提交、审核、质量检查和发布链路；不得绕过 DAT-004 / DAT-010。

- **状态、诊断与审计**
  - 区分 `UNCONFIGURED`、`CONFIGURED`、`PROJECT_SYNCED`、`TASK_SYNCED`、`RESULT_IMPORTED`、`AUTH_FAILED`、`SYNC_FAILED`、`IMPORT_FAILED`、`RESULT_NOT_READY` 等状态/诊断。
  - 同步成功、同步失败、导入成功、导入失败、跨 BU 拒绝、权限不足均写审计。

- **前端接入**
  - `/ann` 展示 Label Studio 配置状态、project id、同步时间、打开项目入口、失败诊断。
  - `/annwork` 展示 task 同步状态、打开 task 入口、导入结果提示。
  - `/annreview` 保留 F012 审核/质检/发布语义，增加结果来源或导入状态提示。
  - 保持原型和 F012 页面信息架构、文案语义与视觉结构。

- **本地 Docker Sandbox 验证**
  - 复用 `deploy/local/docker-compose.yml` 中 `label-studio` 服务。
  - 允许通过 `.env` / 本地 secretRef / 测试替身提供 token。
  - 产出可复现的联通验证证据。

### 3.2 Out of Scope / Non-goals

- 不负责生产 Label Studio 集群部署、高可用、备份、升级和运维编排。
- 不实现企业 SSO、SCIM、Label Studio 用户组或组织深度同步。
- 不实现 Label Studio ML Backend 或真实 AI 预标注模型服务。
- 不新增独立前端标注画布，不替代 Label Studio UI。
- 不强制 iframe 内嵌 Label Studio；优先外链打开 project/task。
- 不覆盖复杂视频、CAD、3D 等专用标注格式全量映射。
- 不实现模型训练任务消费标注数据集的下游流程。
- 不绕过 F012 的标注审核、质量检查、数据集版本和血缘规则。

## 4. Decision Boundaries

Codex 可自主决定：

- adapter 类、配置类、client、payload mapper、result mapper、secret resolver 的具体拆分。
- 使用 Spring Boot 4 / Java 21 既有 HTTP 能力的具体封装方式；不引入 SDK 依赖。
- 新增 `annotation_external_task_binding` 还是扩展既有表以保存 work item 级 external task 映射。
- 诊断码、状态枚举、DTO 字段、前端组件命名和 E2E mock 结构。
- 本地 sandbox 验证脚本、fake Label Studio server 与真实 Docker 联通测试的组合。

必须保留为配置或待确认：

- `TODO_CONFIRM_LABEL_STUDIO_BASE_URL`
- `TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET`
- `TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY`
- `TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY`
- `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`
- 生产 TLS、代理、证书、网络白名单、跨域策略。

## 5. Exception Scenarios

- **Label Studio 未配置**：返回 `UNCONFIGURED` 与 `TODO_CONFIRM_*`，不调用外部 API。
- **secretRef 缺失或无法解析**：返回 `AUTH_UNCONFIGURED`，写同步失败审计。
- **token 无效 / 401 / 403**：返回 `LABEL_STUDIO_AUTH_FAILED`，不保存成功状态。
- **baseUrl 不可达或超时**：返回 `LABEL_STUDIO_UNREACHABLE` / `TIMEOUT`，标记可重试。
- **label config 非法**：阻断 project sync，返回 `LABEL_CONFIG_INVALID` 或 `LABEL_STUDIO_SCHEMA_REJECTED`。
- **task payload 与 label config 不匹配**：返回 `TASK_SYNC_FAILED`，保留 work item 平台内标注能力。
- **结果为空或未完成**：返回 `RESULT_NOT_READY`，不覆盖已有 `annotation_json`。
- **导出格式不支持**：返回 `IMPORT_FORMAT_UNSUPPORTED`，并提示 `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`。
- **重复同步**：复用既有 external project/task 映射，不创建重复资源。
- **跨 BU 或权限不足**：返回 403 或不可见，并写审计。

## 6. 技术方案要点

### 6.1 后端设计

建议新增或拆分以下组件：

- `LabelStudioProperties`：配置 `enabled`、`baseUrl`、`tokenSecretRef`、`workspaceId`、`timeout`、`exportFormat`、`launchUrlMode`。
- `LabelStudioSecretResolver`：从本地 env / secretRef seam 解析 token；永不将 token 写入 DB 或响应。
- `LabelStudioHttpClient`：封装 Label Studio HTTP 调用、认证头、超时、错误映射。
- `HttpLabelStudioAnnotationAdapter`：实现 F012 `LabelStudioAnnotationAdapter`。
- `LabelStudioPayloadMapper`：将标签模板和 work item 映射为 project/task payload。
- `LabelStudioResultMapper`：将 JSON annotation 转换为 SMP `annotation_json`。

Adapter 选择规则：

- `enabled=false`、`baseUrl` 缺失、`baseUrl` 仍为 `TODO_CONFIRM_*`、`tokenSecretRef` 缺失时，使用未配置语义。
- `enabled=true` 且配置可解析时，执行真实 HTTP 调用。
- 所有异常必须映射为业务诊断响应，不允许裸 500 泄露外部栈和 token。

### 6.2 API 草案

沿用 F012 API，不新增平行路径：

- `GET /api/v1/annotation/tasks/{taskId}/label-studio/status`
- `POST /api/v1/annotation/tasks/{taskId}/label-studio/sync-project`
- `POST /api/v1/annotation/work-items/{workItemId}/label-studio/sync-task`
- `POST /api/v1/annotation/tasks/{taskId}/label-studio/import-results`

可扩展 `AnnotationExternalBindingResponse`：

```json
{
  "bindingId": "ANN-EXT-001",
  "taskId": "ANN-WELD-Q2",
  "provider": "LABEL_STUDIO",
  "externalProjectId": "123",
  "externalUrl": "http://localhost:8083/projects/123",
  "externalTaskId": "456",
  "launchUrl": "http://localhost:8083/projects/123/data?task=456",
  "configStatus": "CONFIGURED",
  "lastSyncStatus": "TASK_SYNCED",
  "diagnosticCode": "LABEL_STUDIO_TASK_SYNCED",
  "diagnosticMessage": "Label Studio task 已同步",
  "retryable": false,
  "lastSyncAt": "2026-05-19T06:00:00Z"
}
```

### 6.3 数据模型

建议新增 `V10__label_studio_production_integration.sql`：

- 扩展 `annotation_external_binding`：
  - `workspace_id`
  - `secret_ref`
  - `external_task_count`
  - `last_error_at`
  - `retry_count`
- 新增 `annotation_external_task_binding`：
  - `binding_id`
  - `task_id`
  - `work_item_id`
  - `provider`
  - `external_project_id`
  - `external_task_id`
  - `external_task_url`
  - `sync_status`
  - `import_status`
  - `diagnostic_code`
  - `diagnostic_message`
  - `last_sync_at`
  - `last_import_at`
- 唯一约束：
  - `(provider, work_item_id)`
  - `(provider, external_project_id, external_task_id)`

### 6.4 Label Studio 映射

- Project：使用 `annotation_label_template.label_studio_config_xml` 作为 `label_config`。
- Task data：
  - `OBJECT_DETECTION` / `IMAGE_CLASSIFICATION`：使用 `$image`，优先取可访问文件 URL；无法公开访问时返回 storage policy 诊断。
  - `TEXT_LABELING`：使用 `$text` 或约定文本字段。
  - `AUDIO_LABELING`：使用 `$audio`，本期只保留映射 seam 与诊断。
- Result：默认处理 JSON annotations；保留原始结果摘要与转换后的 `annotation_json`，避免丢失可追溯性。

### 6.5 前端方案

- 复用 `frontend/src/features/data/DataPages.tsx` 现有页面，后续可按复杂度拆出：
  - `LabelStudioStatusBanner`
  - `LabelStudioProjectActions`
  - `LabelStudioTaskActions`
  - `LabelStudioDiagnosticsPanel`
- `frontend/src/features/platform/platformApi.ts` 扩展 DTO，不改变 API client 基础封装。
- E2E 覆盖 `/ann`、`/annwork`、`/annreview` 现有路径，保持原型文案：`标注任务管理`、`Label Studio`、`外部标注工具`、`审核规则`、`发布标注数据集`。

### 6.6 部署与配置

本地 `.env.example` 可新增：

```env
SMP_LABEL_STUDIO_ENABLED=true
SMP_LABEL_STUDIO_BASE_URL=http://label-studio:8080
SMP_LABEL_STUDIO_TOKEN_SECRET_REF=secret://local/label-studio-token
SMP_LABEL_STUDIO_WORKSPACE_ID=TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY
SMP_LABEL_STUDIO_STORAGE_POLICY=TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY
SMP_LABEL_STUDIO_EXPORT_FORMAT=JSON
```

严禁提交真实 token。若本地 Label Studio token 只能人工生成，应在验证报告中记录步骤和 blocker，不以硬编码方式绕过。

## 7. Reuse Strategy

### 复用策略

必须复用：

- F012 后端入口：`AnnotationController` 既有 Label Studio API 路径。
- F012 服务 seam：`LabelStudioAnnotationAdapter` 接口与 `UnconfiguredLabelStudioAnnotationAdapter` fallback。
- F012 标注业务模型：`annotation_task`、`annotation_label_template`、`annotation_work_item`、`annotation_review_item`、`annotation_external_binding`。
- F012 前端页面：`AnnotationTasksPage`、`AnnotationWorkbenchPage`、`AnnotationReviewPage` 的 IA 与文案语义。
- F006 权限审计：`PlatformIdentityService`、`platform_audit_log`、`data:annotation:*` 权限。
- F009 数据集/文件/血缘：ACTIVE 数据集校验、文件对象 URL/对象 key、数据集发布与血缘。
- 本地部署：`deploy/local/docker-compose.yml` 的 `label-studio` 服务。
- 测试基座：现有后端 Spring Boot 测试、前端 Vitest/Playwright、`tools/ai-scaffold` gate。

禁止复制或平行实现：

- 不新增第二套 `LabelStudioController` 绕过 `/api/v1/annotation/*`。
- 不新增第二套标注任务、审核、发布模型。
- 不在前端直接调用 Label Studio API 或暴露 token。
- 不用 mock 成功替代真实 adapter 成功路径；mock 只能用于错误和边界测试。

允许新增抽象的原因：

- F012 seam 只有未配置实现，无法表达 HTTP 调用、secret 解析、payload/result 映射、work item 级 external task id；因此需要新增 `HttpLabelStudioAnnotationAdapter`、client、mapper、secret resolver 和 task binding 持久化。

## 8. 风险与依赖

| 风险/依赖 | 影响 | 缓解 |
| --- | --- | --- |
| 生产 Label Studio URL/token 未确认 | 无法验证生产环境 | 以配置和 `TODO_CONFIRM_*` 保留边界；本地 sandbox 必须真实验证。 |
| Label Studio API 版本变化 | project/task/export 调用失败 | 封装 client，错误诊断，测试基于本地容器和官方 API 语义。 |
| token 泄露 | 安全事故 | secretRef、脱敏、DB/响应/日志扫描测试。 |
| 样本文件无法被 Label Studio 访问 | task 页面无法加载数据 | 明确 storage policy 诊断；本地复用 file-source 或只读挂载。 |
| 大规模导出超时 | 导入失败 | 本期默认 JSON 小批量导入；snapshot/异步导出列为后续增强。 |
| label config 与 data payload 不一致 | task 创建失败 | mapper 测试覆盖 scene；失败返回 schema 诊断。 |

## 9. 开放问题

- 生产 Label Studio 由谁运维？是否已有固定 `baseUrl`、TLS、代理和网络白名单？
- token/API key 存放在哪个 secret backend？当前项目是否需要先落本地 env resolver，再接企业 Vault？
- workspace/project 命名策略是按 BU、数据集、任务，还是按项目隔离？
- Label Studio 如何访问 SMP 样本文件：对象存储预签名 URL、内网文件源、共享存储，还是 Label Studio storage connector？
- 除 JSON 外是否必须支持 COCO、YOLO、CSV 等导出格式？
- 是否需要 webhook 回调实现自动导入，还是本期先保留手动 import-results？

## 10. AC 草案与后续 TASK 对应

| AC | 验收项 | 来源 |
| --- | --- | --- |
| AC-01 | 配置缺失时返回 `UNCONFIGURED`/`TODO_CONFIRM_*`，不尝试外部调用。 | `reports/planning/test-spec.md` T-P0-01 |
| AC-02 | 配置有效时 `sync-project` 真实创建或复用 Label Studio project，保存 external project id 与 launch URL。 | T-P0-02/T-P0-03 |
| AC-03 | `sync-task` 真实创建或复用 Label Studio task，保存 work item 与 external task id 映射，重复调用幂等。 | T-P0-04/T-P0-05 |
| AC-04 | `import-results` 可导入 JSON annotation，回写 SMP work item，并继续 F012 审核/质检/发布流程。 | T-P0-06/T-P0-07 |
| AC-05 | 认证失败、网络失败、schema 失败、结果未完成均返回不同诊断码并写审计。 | T-P0-08~T-P0-11 |
| AC-06 | token 明文不入库、不入响应、不入前端、不入日志。 | T-P0-12 |
| AC-07 | 前端展示 project/task 同步状态、打开入口、失败诊断，并保持原型 IA。 | T-P0-13~T-P0-15 |
| AC-08 | 本地 Docker Label Studio sandbox 有自动或半自动验证证据。 | T-P1-01/T-P1-02 |
| AC-09 | 通过 feature prereq、后端测试、前端测试/E2E 和 scaffold gate。 | T-P1-03 |

## 11. 验证路径草案

后续 `/build-feature` 阶段至少执行：

```powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F013-label-studio-production-integration
./mvnw -f backend/pom.xml test
npm --prefix frontend test
npm --prefix frontend run build
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F013-label-studio-production-integration --run-e2e
```

如本地 Label Studio token 需要人工生成，应补充 sandbox 验证报告并记录精确步骤、配置来源和未自动化原因。

## 12. 人审说明

本 `plan.md` 当前为 `plan_status: approved`，不得进入 `/build-feature` 实现。审查人确认范围、边界、复用策略和开放问题可接受后，人工修改 frontmatter：

```yaml
plan_status: approved
approved_at: 2026-05-19
```

可选校验：

```powershell
node tools/ai-scaffold/dist/cli.js check-plan-approved docs/features/F013-label-studio-production-integration
```

