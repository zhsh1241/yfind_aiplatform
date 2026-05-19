# Task: 完整 Pipeline 编辑器与算子市场

## Metadata
- Feature: F011-pipeline-editor-operator-marketplace
- ID: TASK-pipeline-editor-operator-marketplace
- Status: approved-for-build
- Owner: codex
- Created: 2026-05-18
- Updated: 2026-05-18
- 前置：同目录 `plan.md` 已由用户会话指令“p批准并执行”批准；`check-build-feature-prereqs` 已通过。

## 1. 需求摘要

### User Story
作为数据工程师/BU 数据管理员，我想在 `Pipeline编辑器` 中拖拽配置数据处理 DAG、管理变量、保存版本并发起沙箱运行，同时在 `算子广场` 中发现和提交算子，以便把 F009 数据集和 F010 标准化能力纳入可审计、可复用的数据处理控制平面。

### Business Value
- 补齐 F010 报告中明确留出的完整 Pipeline 画布、运行历史、版本快照、全局变量和算子市场缺口。
- 将标准化、清洗、特征工程、格式转换等处理能力统一沉淀为算子目录，减少平行页面和重复数据模型。
- 为后续接入 Spark/Flink/Argo/Airflow 或 PAI Pipeline 预留受控 seam，但本期先提供可落地的控制平面、沙箱 runner、权限、审计和血缘闭环。

### Source References
- Business docs:
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md`：FUNC-DATA-016、017、080~092。
  - `docs/business/原型页面完成度清单.md`：Pipeline 编辑器、算子广场、添加算子侧边栏、运行历史、版本快照。
  - `docs/business/评审报告-文档质量与截图差距分析.md`：可视化 Pipeline 流程图编辑器、算子广场、血缘 DAG 补充。
- Prototype:
  - `docs/prototype/SMP工业AI平台-原型v2.html`：page key `pipeline`、`opmarket`、`dsdetail`、`lineage`。
- Prior feature evidence:
  - `docs/features/F010-data-standardization-pipeline/reports/prototype-comparison-test-report.md`：F010 非完整 Pipeline 编辑器，F011 承接后续能力。

## 2. 范围

### In Scope
- [x] `/pipeline` 从 F010 标准化单页升级为完整 Pipeline 编辑器信息架构：顶部工具栏、算子库、DAG 画布、右侧节点配置、运行历史、版本快照、全局变量。
- [x] 支持从算子库/添加算子抽屉新增节点、节点选择、节点位置调整、配置保存、DAG 校验和版本保存。
- [x] 后端持久化 Pipeline 定义、节点、边、变量、版本、运行、节点运行和输出血缘。
- [x] 沙箱测试运行：生成 run/node_run 状态、耗时、日志摘要、诊断；成功后生成 `PREPROCESSED` 输出数据集、文件对象、版本和 `PIPELINE` 血缘。
- [x] `/opmarket` 支持分类/关键词检索、详情抽屉、参数 schema、Before/After 示例、使用统计。
- [x] 自定义 HTTP 算子注册/提交审核/批准/驳回 seam；凭据仅允许 `secretRef` 或 `TODO_CONFIRM_*`，禁止保存明文密钥。
- [x] 权限、BU 隔离和审计覆盖创建、更新、版本、运行、失败、提交、审核。

### Out of Scope
- 不接入真实 Spark/Flink/Airflow/Argo/PAI Pipeline 生产调度。
- 不真实调用外部 HTTP 算子处理生产数据。
- 不实现完整 AI Pipeline 助手（FUNC-DATA-084），仅保留后续入口说明。
- 不伪造 136+ 正式算子清单；本期 seed 原型核心算子并保留 `TODO_CONFIRM_OPERATOR_CATALOG_SOURCE`。
- 不复制原型 JSX；以原型信息架构和文案语义重建。

## 3. 技术分析

### Backend
- Module/API:
  - 新增 `PipelineController` / `PipelineService` / `PipelineDtos`。
  - 新增 `/api/v1/pipelines`、`/api/v1/pipeline-runs/{runId}`、`/api/v1/operators` 端点。
- Domain objects:
  - `pipeline_definition`、`pipeline_version`、`pipeline_node`、`pipeline_edge`、`pipeline_variable`、`pipeline_run`、`pipeline_run_node`。
  - `operator_catalog`、`operator_review`。
- Business rules:
  - DAG 必须无环、节点引用可用算子、输入/输出节点完整、必填参数齐全。
  - 变量引用必须存在；`secretRef` 不可保存明文。
  - 跨 BU 不可见或 403，敏感操作写审计。
  - 自定义算子未审核通过不得发布/运行；外部 endpoint 未确认时仅保存为待审核。

### Frontend
- Prototype page key:
  - `pipeline`、`opmarket`。
- Pages/components:
  - `PipelineEditorPage`、`PipelineCanvas`、`OperatorLibrary`、`AddOperatorDrawer`、`PipelineNodeConfigPanel`、`PipelineRunHistoryPanel`、`PipelineSnapshotPanel`、`PipelineGlobalVariablesPanel`、`OperatorMarketplacePage`、`OperatorDetailDrawer`。
- States/interactions:
  - React state + TanStack Query；HTML Pointer Events/Drag-and-Drop + SVG 线条实现轻量 DAG，不新增依赖。
  - 支持节点点击选择、拖拽移动、添加算子、编辑参数/变量、保存、保存版本、运行、查看历史和快照。

### AI Adapter / Integration
- Adapter endpoint: 本期不新增 AI adapter 运行端点。
- External system placeholders:
  - `TODO_CONFIRM_OPERATOR_CATALOG_SOURCE`
  - `TODO_CONFIRM_OPERATOR_HTTP_SECURITY_POLICY`
  - `TODO_CONFIRM_PIPELINE_SCHEDULER_TARGET`
  - `TODO_CONFIRM_PIPELINE_OUTPUT_DATASET_TYPE`

### Database
- Tables:
  - `pipeline_definition`、`pipeline_version`、`pipeline_node`、`pipeline_edge`、`pipeline_variable`、`pipeline_run`、`pipeline_run_node`、`operator_catalog`、`operator_review`。
- Migrations:
  - 新增 `backend/smp-app/src/main/resources/db/migration/V8__pipeline_operator_marketplace.sql`。

## Reuse Plan

### Existing reference seams to reuse
- `docs/business/`：业务规则、功能 ID、MUST/Should 约束。
- `docs/prototype/SMP工业AI平台-原型v2.html`：`pipeline`、`opmarket`、`lineage` 原型结构、文案与交互语义。

### Existing service/scaffold seams to reuse
- F006：`PlatformIdentityService.requirePermission`、`PlatformPrincipal`、`platform_permission`、`platform_role_permission`、`platform_audit_log`、统一 `ApiResponse`。
- F009：`dataset`、`dataset_version`、`dataset_file`、`data_lineage`、`platform_file_object`，不新增平行数据集/血缘模型。
- F010：`data_standard_task` 作为标准化算子和模板参考，不破坏既有 API/E2E。
- Frontend：`AppNavigation`、`DataPages.tsx` 数据域页面组织、`platformApi.ts` API client、E2E `helpers.ts`。
- Quality gates：`tools/ai-scaffold` 的 prereq、traceability、contract、gate、code-review verdict 检查。

### New seams allowed only if existing seams cannot be reused, because
- 新增 Pipeline 控制平面表/API：F010 只有单任务标准化，没有 DAG 节点、边、变量、版本快照和运行历史。
- 新增 Operator catalog/review 表/API：F010 只有内置标准化语义，没有算子市场、自定义 HTTP 算子审核、参数 schema 和统计。
- 新增轻量 DAG 组件：当前页面没有画布交互能力；无需新增第三方依赖即可满足原型级验收。

## 5. Acceptance Criteria
- [ ] AC-01: `/pipeline` 页面按原型展示顶部工具栏、算子库、DAG 画布、右侧节点配置、运行历史、版本快照、全局变量入口。
- [ ] AC-02: 用户可从算子库/添加算子侧边栏选择算子并添加到画布，节点可拖拽调整位置；保存后后端持久化 DAG 定义。
- [ ] AC-03: 用户可编辑节点参数和全局变量；保存版本生成快照，可查看历史快照并回滚。
- [ ] AC-04: 用户可发起测试运行，后端生成 Pipeline run、节点 run、状态、耗时、日志摘要；失败节点可定位。
- [ ] AC-05: 运行成功可生成输出数据集/版本/文件占位和 `PIPELINE` / `STANDARDIZATION` 血缘，且不破坏 F010 标准化任务闭环。
- [ ] AC-06: `/opmarket` 支持分类、搜索、算子详情、参数 schema、Before/After 示例预览、使用统计。
- [ ] AC-07: 自定义算子可提交审核，HTTP endpoint/凭据按安全规则保存，审核状态可见。
- [ ] AC-08: 权限不足、跨 BU 访问、无效 DAG、明文密钥均被拒绝并审计。

## 6. Definition of Done
- [ ] plan.md 已批准。
- [ ] contract.md 已冻结。
- [ ] test-plan.md 引用全部 AC-xx。
- [ ] 复用审查已完成。
- [ ] 权限、审计和 MUST 规则有验证证据。
- [ ] 后端测试、前端 lint/build/unit/E2E、ai-scaffold gate 通过或记录等价 CI 证据。
- [ ] code review 报告和 QA 报告已归档。

## 7. 风险与问题
- 真实调度引擎未接入：页面与 API 必须清楚标记为沙箱 runner / 控制平面。
- 136+ 算子正式清单未知：本期不能宣称完整正式目录，只 seed 原型核心算子并保留导入 seam。
- 无新增前端依赖实现 DAG：高级连线、缩放、撤销重做体验可能弱于专业图库；F011 先满足原型级可拖拽/可保存/可运行闭环。
- 外部 HTTP 算子存在数据泄露风险：本期只保存配置和审核状态，不真实调用生产数据；凭据仅 `secretRef`。
