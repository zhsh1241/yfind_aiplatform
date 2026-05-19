---
feature: F011-pipeline-editor-operator-marketplace
title: 完整 Pipeline 编辑器与算子市场
plan_status: approved
approved_at: 2026-05-18
owner: codex
created_at: 2026-05-18
updated_at: 2026-05-18
---

# Plan: 完整 Pipeline 编辑器与算子市场

## 1. 背景与目标

F010 已完成“基于数据集的数据标准化闭环”，但原型中的完整 `Pipeline编辑器`、拖拽式 DAG 画布、运行历史、版本快照、全局变量和 `算子广场` 仍未作为生产级功能落地。F011 目标是补齐这些能力，并把 F010 标准化任务能力纳入 Pipeline 的内置算子/模板体系，避免形成独立“数据标准中心”。

规划证据：

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`

业务来源：

- `docs/business/bizdocs/03-01-系统功能-数据管理.md`：FUNC-DATA-016、017、080~092。
- `docs/business/原型页面完成度清单.md`：Pipeline 编辑器、算子广场、Pipeline 添加算子侧边栏、运行历史面板、Pipeline 缺失项。
- `docs/business/评审报告-文档质量与截图差距分析.md`：可视化 Pipeline 流程图编辑器、算子广场和血缘 DAG 补充说明。
- `docs/features/F010-data-standardization-pipeline/reports/prototype-comparison-test-report.md`：明确 F010 未覆盖完整 Pipeline 能力，建议作为后续独立 feature。

原型来源：

- `docs/prototype/SMP工业AI平台-原型v2.html`：`pipeline`、`opmarket`、`dsdetail`、`lineage`。
- 关键原型语义：顶部工具栏、左侧算子库、画布节点、节点配置、运行历史、版本快照、全局变量、添加算子侧边栏、算子广场分类/详情/自定义算子、血缘中的 Pipeline 节点。

目标结果：

- 数据工程师可以在 `/pipeline` 可视化搭建、保存、验证、运行数据处理 DAG。
- Pipeline 定义、版本、变量、运行、节点日志和输出数据集/血缘均可持久化和审计。
- `/opmarket` 成为可浏览、可选用、可扩展的算子目录，并支持自定义算子提交/审核 seam。
- F009 数据集/血缘与 F010 标准化能力被复用，不新增平行数据集或数据标准模型。

## 2. Intent / Desired Outcome

本功能的意图不是做静态页面复刻，而是实现一个可持续扩展的 Pipeline 控制平面：前端尽量贴近原型交互，后端提供生产可用的契约、权限、BU 隔离、审计、DAG 校验和持久化；真实分布式执行引擎可后续接入。

完成后，用户应能完成以下闭环：

1. 进入 `Pipeline编辑器`。
2. 从算子库/添加算子侧边栏选择算子。
3. 拖入/调整 DAG 节点并配置参数。
4. 管理全局变量。
5. 保存 Pipeline 并生成版本快照。
6. 发起沙箱测试运行并查看运行历史和节点日志。
7. 成功后生成输出数据集与血缘。
8. 在 `算子广场` 发现算子、查看详情/示例/统计、提交自定义算子并走审核。

## 3. 范围

### In Scope

- **Pipeline 编辑器 `/pipeline`**
  - 原型级页面结构：顶部工具栏、算子库、DAG 画布、右侧节点配置、运行历史、版本快照、全局变量。
  - 节点新增、选择、移动/排序、参数配置、边关系展示与保存。
  - 添加算子侧边栏：搜索、分类筛选、卡片选择、添加到画布。

- **Pipeline 控制平面后端**
  - Pipeline 定义、版本、节点、边、变量、运行、节点运行记录持久化。
  - DAG 校验：无环、输入/输出节点完整、引用算子存在、必填参数齐全、变量引用合法。
  - 沙箱测试运行：生成运行状态、耗时、日志摘要、节点状态、错误节点定位。

- **输出与血缘**
  - 成功运行生成输出数据集、版本、文件占位或标准化输出，并写入 `data_lineage`。
  - 支持与 F010 标准化任务/标准化算子共存，保持既有 API 不破坏。

- **全局变量**
  - 支持 string/int/float/bool/json 类型。
  - 支持 literal、secretRef、envRef 值来源。
  - 禁止保存明文密钥或疑似凭据。

- **算子市场 `/opmarket`**
  - 分类浏览、关键词搜索、详情抽屉、参数 schema、输入输出说明、Before/After 示例预览、使用统计。
  - Seed 原型算子清单，并保留 136+ 正式算子目录导入 seam。

- **自定义算子 seam**
  - JSON Schema 参数表单定义。
  - HTTP endpoint 配置、请求/响应映射、超时/并发限制。
  - 提交审核、审核通过/驳回、发布/禁用状态。
  - 凭据只允许 secretRef 或 `TODO_CONFIRM_*`。

- **权限、BU 隔离和审计**
  - 新增 pipeline/operator 权限。
  - 创建、保存、版本、运行、失败、审核、发布均记录审计。

### Out of Scope / Non-goals

- 不实现真实大规模 Spark/Flink/Airflow/Argo 生产调度。
- 不真实执行外部 HTTP 算子处理生产数据；本期只做受控配置、审核和沙箱占位。
- 不实现完整 AI Pipeline 助手（FUNC-DATA-084），仅允许保留入口或 TODO。
- 不伪造 136+ 正式算子清单；若正式来源未知，保留 `TODO_CONFIRM_OPERATOR_CATALOG_SOURCE`。
- 不复制原型 JSX；只按原型信息架构和交互语义重建。
- 不重写 F009 数据集管理、F010 标准化任务和现有权限体系。

## 4. Decision Boundaries

Codex 可自主决定：

- 以前端现有 React 19 + Ant Design 6 + SVG/HTML Drag-and-Drop/Pointer Events 实现轻量 DAG 画布，不新增依赖。
- 后端新增清晰的 Pipeline / Operator 控制平面表与 API，只要遵守 REST v1、权限、审计、BU 隔离与现有 ApiResponse 规范。
- 将 F010 标准化能力作为 Pipeline 内置算子/模板复用，而不是保留为 `/pipeline` 的唯一页面内容。
- 以原型 18 个算子为 seed catalog，同时设计可扩展字段支持后续导入 136+ 算子。

需要后续用户/业务确认：

- 136+ 内置算子的正式清单、分类和维护来源。
- 外部 HTTP 算子的网络出口、鉴权、脱敏和安全审核策略。
- 是否在 F011 同期纳入 AI Pipeline 助手，默认不纳入。

## 5. Exception Scenarios

- **DAG 有环**：保存/运行拒绝，返回错误节点/边并写审计。
- **缺少输入或输出节点**：校验失败，前端定位提示。
- **未知算子或算子禁用**：拒绝保存或运行。
- **必填参数缺失/类型不符**：节点配置表单与后端双重校验。
- **变量引用不存在**：保存/运行拒绝。
- **明文密钥**：保存变量、HTTP 算子配置或参数时拒绝。
- **跨 BU 访问**：不可见或 403，写审计。
- **外部 HTTP endpoint 未确认**：只能保存为未配置/待审核状态，不可运行。
- **沙箱运行失败**：保留 run/node_run、错误码、日志摘要，不生成输出数据集。
- **F010 回归风险**：保留原标准化 API 和测试，Pipeline 整合不得破坏 F010 E2E。

## 6. 技术方案要点

### 6.1 后端模块与 API 草案

建议新增或拆分 Pipeline 专属控制器/服务/DTO，避免继续无限扩张 `DataManagementService`：

- `PipelineController`
- `PipelineService`
- `PipelineDtos`
- `OperatorController`
- `OperatorService`
- `OperatorDtos`

API 草案：

- `GET /api/v1/pipelines`
- `POST /api/v1/pipelines`
- `GET /api/v1/pipelines/{id}`
- `PUT /api/v1/pipelines/{id}`
- `POST /api/v1/pipelines/{id}/versions`
- `GET /api/v1/pipelines/{id}/versions`
- `POST /api/v1/pipelines/{id}/versions/{versionId}/restore`
- `POST /api/v1/pipelines/{id}/validate`
- `POST /api/v1/pipelines/{id}/runs`
- `GET /api/v1/pipelines/{id}/runs`
- `GET /api/v1/pipeline-runs/{runId}`
- `GET /api/v1/operators`
- `GET /api/v1/operators/{operatorId}`
- `POST /api/v1/operators/custom`
- `POST /api/v1/operators/{operatorId}/submit-review`
- `POST /api/v1/operators/{operatorId}/approve`
- `POST /api/v1/operators/{operatorId}/reject`

### 6.2 数据模型草案

新增 Flyway 迁移，建议表：

- `pipeline_definition`
  - pipeline 主体、tenant/project、owner、status、current_version_id、visibility。
- `pipeline_version`
  - 版本快照、DAG JSON 摘要、version_name、note、created_by。
- `pipeline_node`
  - node_id、pipeline_id、version_id、operator_id、position_x/y、config_json、status。
- `pipeline_edge`
  - source_node_id、target_node_id、edge_type。
- `pipeline_variable`
  - name、type、value_kind、value_json/masked、required。
- `pipeline_run`
  - run_id、pipeline_id、version_id、status、triggered_by、quality/output、diagnostic、started_at/ended_at。
- `pipeline_run_node`
  - node_run_id、run_id、node_id、status、duration、log_summary、error_code。
- `operator_catalog`
  - operator_id、name、category、stage、kind、parameter_schema_json、input_schema_json、output_schema_json、status、version、usage_count。
- `operator_review`
  - operator_id、submitter、reviewer、status、reason、reviewed_at。

### 6.3 前端方案

- 将 `frontend/src/features/data/DataPages.tsx` 中 F010 `DataPipelineStandardPage` 拆分或替换为真实 `PipelineEditorPage`，同时保留 F010 标准化入口为 Pipeline 模板/算子区域。
- 新增或拆分组件：
  - `PipelineCanvas`
  - `OperatorLibrary`
  - `AddOperatorDrawer`
  - `PipelineNodeConfigPanel`
  - `PipelineRunHistoryPanel`
  - `PipelineSnapshotPanel`
  - `PipelineGlobalVariablesPanel`
  - `OperatorMarketplacePage`
  - `OperatorDetailDrawer`
- 不新增依赖：用 HTML DnD/Pointer Events + SVG 线条完成原型级拖拽与连线展示。
- `platformApi.ts` 增加 pipeline/operator API client 和类型。
- E2E helpers 增加 pipeline/operator mock。

### 6.4 状态机草案

Pipeline status：

- `DRAFT`
- `VALIDATED`
- `ACTIVE`
- `ARCHIVED`

Pipeline run status：

- `QUEUED`
- `RUNNING`
- `SUCCEEDED`
- `FAILED`
- `CANCELLED`

Operator status：

- `DRAFT`
- `SUBMITTED`
- `APPROVED`
- `REJECTED`
- `PUBLISHED`
- `DISABLED`

### 6.5 权限与审计

权限草案：

- `menu:pipeline`
- `menu:opmarket`
- `data:pipeline:read`
- `data:pipeline:write`
- `data:pipeline:run`
- `data:pipeline:admin`
- `data:operator:read`
- `data:operator:write`
- `data:operator:review`
- `data:operator:admin`

审计事件草案：

- `PIPELINE_CREATED`
- `PIPELINE_UPDATED`
- `PIPELINE_VERSION_SAVED`
- `PIPELINE_VERSION_RESTORED`
- `PIPELINE_VALIDATION_FAILED`
- `PIPELINE_RUN_STARTED`
- `PIPELINE_RUN_SUCCEEDED`
- `PIPELINE_RUN_FAILED`
- `OPERATOR_CREATED`
- `OPERATOR_SUBMITTED`
- `OPERATOR_APPROVED`
- `OPERATOR_REJECTED`
- `OPERATOR_PUBLISHED`

## Reuse Strategy

### Must Reuse

- **业务与原型事实源**：`docs/business/bizdocs/03-01-系统功能-数据管理.md`、`docs/business/原型页面完成度清单.md`、`docs/prototype/SMP工业AI平台-原型v2.html`。
- **F006 权限、BU 隔离和审计 seam**：`PlatformIdentityService`、`platform_permission`、`platform_role_permission`、`platform_audit_log`、统一 `ApiResponse`。
- **F009 数据集底座**：`dataset`、`dataset_version`、`dataset_file`、`data_lineage`、`platform_file_object`、数据集权限/引用规则。
- **F010 标准化能力**：`data_standard_task`、数据标准画像/任务运行 API；在 F011 中以 Pipeline 模板/标准化算子复用。
- **前端基础**：React 19、Ant Design 6、TanStack Query、Zustand session、`AppNavigation`、`platformApi.ts`、现有 E2E helper/mock。
- **脚手架门禁**：`tools/ai-scaffold` 的 planning/gate/check 工具。

### Duplication Rejected

- 不复制 `docs/prototype/SMP工业AI平台-原型v2.html` JSX。
- 不恢复旧已删除 backend/frontend 实现。
- 不新增与 F009 平行的数据集/文件/血缘模型。
- 不新增与 F006 平行的用户、角色、权限、审计模型。
- 不把 F010 数据标准化再复制成另一套标准任务表。
- 不新增前端 DAG 依赖来绕开项目默认“无新依赖”约束，除非后续计划明确批准。

### Approved New Seams

- 新增 Pipeline 控制平面表/API：现有 F010 只有单任务标准化，没有 Pipeline 定义、节点、边、变量、版本快照和运行历史。
- 新增 Operator catalog/review 表/API：现有只有 F010 内置标准化算子语义，没有完整算子市场、参数 schema、自定义算子审核和统计。
- 新增轻量画布组件：当前前端只有占位/标准化页面，没有真实 DAG 交互组件。

## 8. 风险与依赖

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| 真实调度引擎未接入 | 运行能力可能被误解为生产执行 | 明确 F011 为控制平面 + 沙箱 runner；真实调度后续 feature。 |
| 136+ 算子清单未知 | 无法声明完整生产算子目录 | 使用原型 seed + `TODO_CONFIRM_OPERATOR_CATALOG_SOURCE`，保留导入 seam。 |
| 前端无新依赖实现 DAG 复杂度较高 | 交互体验可能不如专业 DAG 库 | 先满足原型级拖拽/连线/配置；若后续需要高级布局再单独评估依赖。 |
| 外部 HTTP 算子安全风险 | 数据泄露/凭据泄露 | 默认只保存配置与审核状态，不真实调用生产数据；凭据只允许 secretRef。 |
| F010 页面被替换可能回归 | 标准化能力入口丢失 | 将 F010 标准化作为内置算子/模板保留，并保留 F010 API/E2E 回归。 |
| `DataManagementService` 已较大 | 继续扩张可维护性差 | F011 建议新增 Pipeline/Operator 独立 service/controller/dtos。 |

## 9. 开放问题

- `TODO_CONFIRM_OPERATOR_CATALOG_SOURCE`：正式 136+ 算子清单来源、分类、版本维护人。
- `TODO_CONFIRM_OPERATOR_HTTP_SECURITY_POLICY`：HTTP 算子网络出口、鉴权、数据脱敏、安全审核规则。
- `TODO_CONFIRM_PIPELINE_SCHEDULER_TARGET`：后续真实调度目标是 Argo Workflows、Flink、Spark、Airflow 还是 PAI Pipeline。
- `TODO_CONFIRM_PIPELINE_OUTPUT_DATASET_TYPE`：输出数据集类型是否继续使用 `PREPROCESSED`，还是新增更细的 `PIPELINE_OUTPUT` 语义。
- 是否把 AI Pipeline 助手（FUNC-DATA-084）纳入 F011；默认不纳入。

## 10. 验收草案（AC）

- **AC-01**：`/pipeline` 页面按原型展示工具栏、算子库、DAG 画布、右侧节点配置、运行历史、版本快照、全局变量入口。
- **AC-02**：用户可从算子库/添加算子侧边栏选择算子并添加到画布，节点可拖拽调整位置/顺序，保存后后端持久化 DAG 定义。
- **AC-03**：用户可编辑节点参数和全局变量；保存版本生成快照，可查看历史快照并回滚/复制。
- **AC-04**：用户可发起测试运行，后端生成 Pipeline run、节点 run、状态、耗时、日志摘要；失败节点可定位。
- **AC-05**：运行成功可生成输出数据集/版本/文件占位和 `PIPELINE`/`STANDARDIZATION` 血缘，且不破坏 F010 标准化任务闭环。
- **AC-06**：`/opmarket` 支持分类、搜索、算子详情、参数 schema、Before/After 示例预览、使用统计。
- **AC-07**：自定义算子可提交审核，HTTP endpoint/凭据按安全规则保存，审核状态可见。
- **AC-08**：权限不足、跨 BU 访问、无效 DAG、明文密钥均被拒绝并审计。

## 11. 验证路径

后续 `/build-feature` 阶段应至少执行：

```powershell
$env:JAVA_HOME='C:\java\jdk-25'; $env:Path="$env:JAVA_HOME\bin;$env:Path"
mvn -q -f backend/pom.xml -pl smp-app test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
npm --prefix frontend run e2e
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F011-pipeline-editor-operator-marketplace --skip-backend-integration --run-e2e
```

测试计划详见：`reports/planning/test-spec.md`。

## 12. 审批记录

- Reviewer: 用户（会话指令“p批准并执行”）
- Decision: approved
- 说明：2026-05-18 用户在会话中明确批准计划并要求进入执行；本记录作为 `/build-feature` 前置审批依据。
