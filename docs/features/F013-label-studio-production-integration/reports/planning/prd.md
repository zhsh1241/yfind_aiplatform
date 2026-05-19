> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-label-studio-production-integration.md`

﻿# RALPLAN PRD: F013 Label Studio 生产化联通

## 0. RALPLAN-DR 摘要

### Principles

1. **真实联通优先**：配置存在时必须真实调用 Label Studio API；未调用成功不得标记成功。
2. **安全边界优先**：token/API key 只能通过 `secretRef` 或运行时环境解析，不得入库、入日志、入响应。
3. **复用优先**：复用 F012 `AnnotationController`、`AnnotationService`、`LabelStudioAnnotationAdapter`、`annotation_external_binding` 和前端 `/ann`/`/annwork`/`/annreview` IA。
4. **诊断优先**：未配置、认证失败、网络失败、label config 不合法、结果格式不支持必须有可区分诊断码和审计。
5. **业务规则不降级**：不得绕过 DAT-003/004/009/010/012、PLT-001/011/014；Label Studio 只是外部标注执行面，不替代 SMP 审核和发布规则。

### Decision Drivers

1. F012 已完成 seam，但 `UnconfiguredLabelStudioAnnotationAdapter` 仍返回 `UNCONFIGURED`，业务闭环缺少真实外部项目/任务/结果映射。
2. 本地 Docker 已具备 Label Studio sandbox，适合作为可复现集成验证目标。
3. 生产 URL/token/workspace/storage/export format 未完全确认，需要以配置项和 `TODO_CONFIRM_*` 留出边界。

### Viable Options

| Option | 描述 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- | --- |
| A | 在 F012 adapter seam 上新增配置驱动 HTTP adapter | 复用最多、风险低、可渐进替换未配置实现 | 需要补字段和测试替身 | **选择** |
| B | 引入 `label-studio-sdk` 并绕过现有 seam | SDK 语义贴近官方 | 新依赖、Java 生态不匹配、与现有 seam 脱节 | 拒绝 |
| C | 前端直接调用 Label Studio API | 实现快 | token 泄露、跨域复杂、绕过平台权限审计 | 拒绝 |
| D | 先做完整生产部署和 SSO 再接 API | 生产治理完整 | 范围过大，阻塞数据标注闭环 | 拒绝 |

### Architect Review / Synthesis

- 最强反论：真实生产集成若没有确认生产 URL、token 和存储策略，容易做成又一层 TODO seam。
- 综合方案：F013 不猜生产参数，但必须完成本地 sandbox 的真实 API 调用路径；生产路径通过配置和 secretRef 启用，缺配置时明确失败。这样既满足“不能 mock 核心流程”，又不把未知生产参数硬编码。

### Critic Verdict

APPROVE。计划满足边界清晰、复用 F012、失败诊断、可测试性和安全约束。进入正式 `plan.md` 时必须保留 Non-goals、Decision Boundaries、Exception Scenarios 和 Reuse Strategy。

## 1. 背景

F012 已完成标注任务管理、标签模板、标注工作台、审核、质量检查、`ANNOTATED` 数据集发布与 Label Studio seam。当前 seam 在未知生产参数下始终返回 `UNCONFIGURED`，前端也只展示 `TODO_CONFIRM_LABEL_STUDIO_*`。F013 目标是在不推翻 F012 业务闭环的前提下，将 Label Studio 适配器推进到可配置、可真实调用、可诊断、可审计、可本地验证的生产化状态。

Label Studio 官方 API 约束显示：创建 project 需要 `label_config` 等字段并通过 Token 认证；任务导入要求 `data` key 与 label config 中变量匹配；导出可通过 Easy Export API 或 snapshot 路径完成，大规模导出需要避免同步超时。因此 F013 必须把标签模板、样本 payload、结果转换和导出格式确认作为显式边界。

## 2. 业务目标

- 管理员在 `/ann` 对一个启用 Label Studio 的标注任务执行“同步项目”后，平台创建或复用 Label Studio project，并显示 project id、launch URL、同步时间和诊断状态。
- 标注员在 `/annwork` 对工作项执行“同步 task / 打开 Label Studio”后，能进入真实 Label Studio 页面完成标注。
- 审核或管理员触发“导入结果”后，平台从 Label Studio 拉取 annotations，转换为 SMP `annotation_json`，继续走 F012 审核、质量检查和发布流程。
- 任意失败都能在 API、前端和审计中说明原因，不出现“实际失败但显示成功”。

## 3. 范围

### In Scope

1. `HttpLabelStudioAnnotationAdapter`
   - 根据配置启用/禁用。
   - 支持 `baseUrl`、token secretRef、workspace、超时、重试上限、导出格式白名单。
   - 实现 status、syncProject、syncTask、importResults。

2. 配置与 secretRef
   - 新增 Spring configuration properties。
   - 本地 Docker 可通过 `.env` 或开发 secret 注入 token。
   - 响应只展示 secretRef/脱敏状态，不展示明文 token。

3. 持久化映射
   - 扩展 `annotation_external_binding` 或新增 work item 级 external binding，保存 external project id、external task id、launch URL、last sync status、diagnostic code/message、last sync time。
   - 保持幂等：重复同步同一 task 不创建重复外部资源。

4. API 行为
   - 沿用 F012 API 路径：`/label-studio/status`、`/sync-project`、`/sync-task`、`/import-results`。
   - 必要时扩展 response DTO 字段，例如 `externalTaskId`、`configured`、`secretRefMasked`、`retryable`。

5. Label Studio 数据映射
   - Project：使用 F012 标签模板的 `labelStudioConfigXml`。
   - Task：根据 scene 生成 `data` payload，字段与 label config 变量匹配（如 image/text/audio）。
   - Result：支持 JSON 原始 annotation 导入，转换到 `annotation_work_item.annotation_json`。
   - Export format：本期默认 JSON；其他格式保留 `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`。

6. 前端
   - `/ann` 展示配置状态、project id、同步时间、打开项目入口、错误诊断。
   - `/annwork` 展示 task 同步状态、打开 task 入口、结果导入提示。
   - `/annreview` 保留审核/质检/发布语义，增加“结果来源：Label Studio”或导入状态提示。

7. 验证
   - 后端 adapter 单元测试覆盖成功、未配置、401/403、超时、格式错误、幂等。
   - 后端集成测试可用 fake Label Studio HTTP server 或 sandbox profile。
   - 前端 E2E 覆盖从 `UNCONFIGURED` 到 `PROJECT_SYNCED`/失败诊断的展示。
   - 本地 Docker Label Studio 联通脚本或手工验证报告。

### Out of Scope

- 生产 Label Studio 集群部署、高可用、备份、升级、账号体系治理。
- 企业 SSO / SCIM / Label Studio 用户组同步。
- Label Studio ML Backend、真实 AI 预标注模型服务。
- 前端内嵌完整 Label Studio iframe 作为强制要求；优先外链打开。
- 复杂视频/CAD/3D 标注格式全量映射。
- 训练任务消费标注数据集。

## 4. 关键用户故事

- US-01：作为 BU 管理员，我希望把 SMP 标注任务同步为 Label Studio project，以便标注员使用专业工具执行标注。
- US-02：作为数据标注工程师，我希望在工作台打开对应 Label Studio task，以便完成外部标注而不手动找项目和样本。
- US-03：作为审核工程师，我希望导入 Label Studio 结果后仍在 SMP 执行审核，以便保留 DAT-004 和审计链路。
- US-04：作为平台管理员，我希望 token 不出现在数据库/日志/前端，以便满足凭据安全要求。
- US-05：作为运维人员，我希望看到明确的 Label Studio 失败诊断，以便定位网络、认证、配置或格式问题。

## 5. 技术方案

### 5.1 后端

- 新增或拆分：
  - `LabelStudioProperties`
  - `HttpLabelStudioAnnotationAdapter`
  - `LabelStudioClient` / `LabelStudioHttpClient`
  - `LabelStudioPayloadMapper`
  - `LabelStudioResultMapper`
  - `LabelStudioSecretResolver`
- 保留 `UnconfiguredLabelStudioAnnotationAdapter` 作为配置缺失 fallback。
- Adapter 选择逻辑：`enabled && baseUrl 非 TODO && secretRef 可解析` 时使用 HTTP adapter，否则 fallback 但返回明确 `UNCONFIGURED`。
- HTTP 语义：
  - `POST /api/projects/` 创建 project。
  - task 导入遵循 Label Studio task data 与 label config 变量匹配要求。
  - export/import 默认 JSON，导入 annotations.result。
- 错误映射：
  - 401/403 → `LABEL_STUDIO_AUTH_FAILED`
  - 404 project/task → `LABEL_STUDIO_MAPPING_MISSING`
  - timeout/io → `LABEL_STUDIO_UNREACHABLE`
  - 4xx validation → `LABEL_STUDIO_SCHEMA_REJECTED`
  - empty/not completed → `LABEL_STUDIO_RESULT_NOT_READY`

### 5.2 数据库

建议新增 `V10__label_studio_production_integration.sql`：

- 扩展 `annotation_external_binding`：`workspace_id`、`external_task_count`、`secret_ref`（或 masked ref）、`last_error_at`、`retry_count`。
- 新增 `annotation_external_task_binding`：`id`、`work_item_id`、`task_id`、`provider`、`external_project_id`、`external_task_id`、`external_task_url`、`sync_status`、`import_status`、`diagnostic_code`、`diagnostic_message`、`last_sync_at`、`last_import_at`。
- 增加唯一约束：`provider + work_item_id`、`provider + external_project_id + external_task_id`，保证幂等。

### 5.3 前端

- 复用 `DataPages.tsx` 现有 Annotation 页面，必要时拆出：
  - `LabelStudioStatusBanner`
  - `LabelStudioProjectActions`
  - `LabelStudioTaskActions`
- `platformApi.ts` 扩展 DTO 字段，不改变现有 API 路径。
- E2E 文案保持：`标注任务管理`、`Label Studio`、`外部标注工具`、`AI 预标注`、`审核规则`。

### 5.4 部署与配置

- `deploy/local/.env.example` 增加：
  - `SMP_LABEL_STUDIO_ENABLED=true`
  - `SMP_LABEL_STUDIO_BASE_URL=http://label-studio:8080` 或主机 `http://localhost:8083`
  - `SMP_LABEL_STUDIO_TOKEN_SECRET_REF=secret://local/label-studio-token`
  - `SMP_LABEL_STUDIO_WORKSPACE_ID=TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY`
  - `SMP_LABEL_STUDIO_EXPORT_FORMAT=JSON`
- 不把真实 token 提交到仓库。

## 6. Acceptance Criteria 草案

| AC | 验收项 |
| --- | --- |
| AC-01 | 配置缺失时仍返回 `UNCONFIGURED`/`TODO_CONFIRM_*`，且不尝试外部调用。 |
| AC-02 | 配置有效时 `sync-project` 真实创建或复用 Label Studio project，保存 external project id 与 launch URL。 |
| AC-03 | `sync-task` 真实创建或复用 Label Studio task，保存 work item 与 external task id 映射，重复调用幂等。 |
| AC-04 | `import-results` 可导入 JSON annotation，回写 SMP work item，并继续 F012 审核/质检/发布流程。 |
| AC-05 | 认证失败、网络失败、schema 失败、结果未完成均返回不同诊断码并写审计。 |
| AC-06 | token 明文不入库、不入响应、不入前端、不入日志。 |
| AC-07 | 前端展示 project/task 同步状态、打开入口、失败诊断，并保持原型 IA。 |
| AC-08 | 本地 Docker Label Studio sandbox 有自动或半自动验证证据。 |
| AC-09 | 通过 feature prereq、后端测试、前端测试/E2E 和 scaffold gate。 |

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| Label Studio API 版本差异 | 调用失败 | adapter 封装，测试使用官方 API 语义和本地容器验证。 |
| token 泄露 | 安全事故 | secretRef、脱敏、日志过滤、测试断言。 |
| 大规模导出超时 | 导入失败 | 本期默认小批量 JSON；大规模 snapshot 标为后续增强。 |
| label config 与 task data 不匹配 | 标注页面不可用 | mapper 测试覆盖各 scene，失败返回 `SCHEMA_REJECTED`。 |
| 外部系统失败阻断标注 | 业务中断 | 保留 F012 平台内人工标注路径，外部失败可重试。 |

## 8. 参考来源

- `docs/features/F012-annotation-integration/plan.md`
- `docs/features/F012-annotation-integration/contract.md`
- `docs/business/bizdocs/02-01-业务流程-数据管理.md`
- `docs/business/rules/01-数据管理规则.md`
- Label Studio API: https://labelstud.io/guide/api.html
- Label Studio Create Project API: https://api.labelstud.io/api-reference/api-reference/projects/create
- Label Studio Import Tasks: https://api.labelstud.io/tutorials/tutorials/import-tasks
- Label Studio Export: https://labelstud.io/guide/export.html
