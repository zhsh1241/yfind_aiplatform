> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-pipeline-editor-operator-marketplace.md`

﻿# PRD: F011 完整 Pipeline 编辑器与算子市场

## 1. 元信息

- Feature: F011-pipeline-editor-operator-marketplace
- Title: 完整 Pipeline 编辑器与算子市场
- Source Spec: `.omx/specs/deep-interview-pipeline-editor-operator-marketplace.md`
- Business References:
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md` FUNC-DATA-080~091、FUNC-DATA-092
  - `docs/business/原型页面完成度清单.md` Pipeline 编辑器、算子广场、Pipeline 添加算子侧边栏、运行历史面板
  - `docs/business/评审报告-文档质量与截图差距分析.md` 可视化 Pipeline 与算子广场补充项
- Prototype References:
  - `docs/prototype/SMP工业AI平台-原型v2.html`：`pipeline`、`opmarket`、`dsdetail`、`lineage`
- Status: ralplan consensus draft

## 2. 目标与用户价值

F011 的目标是在 F010 数据标准化闭环之上，补齐原型中的完整 Pipeline 控制平面和算子生态：数据工程师可以通过可视化 DAG 画布构建数据处理流程，从算子广场发现/选择算子，配置节点参数和全局变量，保存版本快照，进行沙箱测试运行，并在运行完成后形成可审计的运行历史、节点日志、输出数据集和血缘。

用户价值：

- 降低数据预处理/标准化流程搭建门槛。
- 将数据加工流程从“单次标准化任务”升级为可版本化、可复用、可审计的 Pipeline 定义。
- 建立算子生态入口，为后续真实调度引擎、AI 助手、自定义算子运行时打基础。

## 3. 用户角色

- 数据工程师：创建/编辑 Pipeline、配置算子、测试运行、查看历史。
- 数据管理员 / BU Admin：管理本 BU Pipeline、审核自定义算子、查看算子使用统计。
- 模型训练工程师：复用已发布 Pipeline 输出数据集作为训练输入。
- 超级管理员：管理全局算子目录、权限与安全审计。

## 4. 范围

### 4.1 In Scope

1. **Pipeline 编辑器 `/pipeline`**
   - 保留原型信息架构与页面语义：工具栏、算子库、画布、节点配置、运行历史、版本快照、全局变量。
   - 支持 DAG 节点新增、拖拽移动/排序、节点选择、节点参数配置、边关系展示与保存。
   - 支持保存 Pipeline 定义，生成版本快照。

2. **Pipeline 后端控制平面**
   - Pipeline 定义、版本、节点、边、变量、运行记录、节点运行记录持久化。
   - 支持 DAG 校验：无环、输入/输出节点完整、引用算子存在、变量引用合法。
   - 支持沙箱测试运行：生成 run、node run、状态、耗时、日志摘要、失败原因。

3. **输出数据集与血缘**
   - 成功运行可基于 F009/F010 seam 生成 `PREPROCESSED` 或 `PIPELINE_OUTPUT` 语义输出数据集（实际枚举以契约冻结为准）。
   - 写入 `data_lineage`，transform type 使用 `PIPELINE` / `STANDARDIZATION` 中与任务类型匹配的值。

4. **全局变量**
   - 变量名、类型、值类型（literal、secretRef、envRef）、默认值、是否必填。
   - 运行时保存变量快照。
   - 禁止保存明文密钥。

5. **算子市场 `/opmarket`**
   - 分类浏览、关键词搜索、算子卡片、详情抽屉、参数 schema、输入输出说明。
   - 原型级 Before/After 示例预览与使用统计。
   - 支持“添加到 Pipeline”或在 Pipeline 添加算子侧边栏中选用。

6. **自定义算子 seam**
   - JSON Schema 参数定义。
   - HTTP endpoint 配置、请求/响应映射、超时、并发限制。
   - 提交审核、审核通过/驳回、发布状态。
   - 外部凭据只能使用 `secretRef` 或 `TODO_CONFIRM_*`。

7. **权限与审计**
   - 新增 `data:pipeline:*`、`data:operator:*`、`menu:pipeline`、`menu:opmarket` 权限。
   - 创建、保存、运行、回滚、审核、发布、失败等动作写审计日志。
   - 复用 F006 BU 隔离。

### 4.2 Out of Scope

- 不实现真实 Spark/Flink/Airflow/Argo 分布式调度。
- 不真实执行外部 HTTP 算子处理生产数据；只保存配置并做安全约束/沙箱占位。
- 不实现 AI Pipeline 助手（FUNC-DATA-084）完整能力；可保留入口和 TODO。
- 不宣称已经内置 136+ 正式算子清单；本期 seed 原型 18 个并支持后续导入。
- 不重写 F009 数据集管理、F010 数据标准化任务闭环；只复用与集成。

## 5. 功能需求

### FR-01 Pipeline 定义列表与详情

- 查询本 BU 可见 Pipeline 定义。
- 创建 Pipeline：名称、描述、输入数据集、输出类型、可见范围。
- 查询详情：当前版本、节点、边、变量、最近运行、版本快照。

### FR-02 可视化 DAG 编辑器

- 页面应匹配原型 `Pipeline编辑器` 的结构：顶部工具栏、左侧算子库、中间画布、右侧配置面板。
- 支持从左侧算子库或添加算子侧边栏拖入节点。
- 节点可被选中、移动、排序；节点之间的边可视化展示。
- 保存时将节点坐标、边、参数和变量引用持久化。

### FR-03 节点配置与 DAG 校验

- 节点配置表单由算子 `parameterSchema` 渲染。
- 校验规则：未知算子拒绝、必填参数缺失拒绝、变量引用不存在拒绝、DAG 有环拒绝、缺少输入/输出节点拒绝。
- 校验错误应定位到节点并在 UI 上提示。

### FR-04 版本快照

- 每次保存生成版本快照，包含版本号、说明、作者、创建时间、DAG JSON 摘要。
- 支持查看版本快照列表。
- 支持回滚到历史版本或复制历史版本为新草稿。

### FR-05 全局变量

- 支持新增/编辑/删除变量。
- 支持类型：string、int、float、bool、json。
- 支持值类型：literal、secretRef、envRef。
- 明文 secret 或疑似 credential 字段必须拒绝保存。

### FR-06 测试运行与运行历史

- 支持触发测试运行。
- 运行记录包含状态：`QUEUED`、`RUNNING`、`SUCCEEDED`、`FAILED`、`CANCELLED`。
- 节点运行记录包含状态、开始/结束时间、耗时、输入/输出摘要、日志摘要、错误码。
- 成功运行生成输出数据集和血缘；失败运行保留错误节点定位。

### FR-07 算子目录与详情

- 支持算子分类、搜索、筛选、详情。
- 算子详情包含：名称、分类、描述、版本、状态、输入输出 schema、参数 schema、示例 Before/After、使用统计。
- Seed 原型 18 个算子：数据读取、数据清洗、图像处理、文本处理、格式转换。

### FR-08 自定义算子与审核

- 用户可提交自定义算子定义，包括 JSON Schema 参数、实现类型（HTTP / FILE_PLACEHOLDER）、HTTP 配置。
- 状态：`DRAFT`、`SUBMITTED`、`APPROVED`、`REJECTED`、`PUBLISHED`、`DISABLED`。
- BU Admin / Super Admin 可审核。
- 审核动作写审计。

### FR-09 与 F010 标准化集成

- F010 数据标准化能力应作为内置标准化算子/模板出现在 Pipeline 中。
- 保留 F010 的 API/测试不破坏。
- 标准化 Pipeline 运行成功仍能生成 `PREPROCESSED` 数据集和 `STANDARDIZATION`/`PIPELINE` 血缘。

## 6. 数据模型草案

- `pipeline_definition`
- `pipeline_version`
- `pipeline_node`
- `pipeline_edge`
- `pipeline_variable`
- `pipeline_run`
- `pipeline_run_node`
- `operator_catalog`
- `operator_review`
- `operator_usage_daily`（可选，或由 run 聚合）

## 7. API 草案

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

## 8. 权限草案

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

## 9. 审计事件草案

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

## 10. 非功能要求

- 前端不新增依赖，优先用 React + Ant Design + SVG/HTML DnD。
- API 返回统一 `ApiResponse`。
- 所有列表支持分页/搜索。
- DAG JSON 应有大小限制和字段白名单，避免超大 payload。
- 外部 HTTP endpoint 配置必须有 host allowlist/TODO_CONFIRM 安全占位，不保存明文凭据。

## 11. 验收草案

- AC-01：`/pipeline` 原型结构完整可见。
- AC-02：可通过拖拽/添加算子构建 DAG 并保存。
- AC-03：可编辑节点参数与全局变量，保存版本快照并回滚。
- AC-04：可测试运行并查看运行历史与节点日志。
- AC-05：成功运行生成输出数据集与血缘。
- AC-06：`/opmarket` 支持分类、搜索、详情、效果预览、统计。
- AC-07：自定义算子提交/审核流程可用。
- AC-08：权限、BU 隔离、DAG 校验错误与审计覆盖。

## 12. RALPLAN-DR 决策摘要

### Principles

1. 原型信息架构优先：不新建平行 Pipeline 中心。
2. 控制平面先行：先持久化可审计 DAG 与运行记录，再接真实调度器。
3. 复用 F006/F009/F010 seam，避免重复数据集/权限/标准化模型。
4. 安全默认拒绝：外部算子与凭据只做受控配置，不做未审计生产调用。
5. 可测试优先：每个核心行为都有 API 与 E2E 证据。

### Decision Drivers

1. 与原型 `pipeline`/`opmarket` 一致。
2. 不破坏 F010 数据标准化闭环。
3. 为后续真实调度和算子生态扩展留下清晰 seam。

### Options

- Option A：引入 React Flow 等 DAG 库。
  - 优点：交互成熟。
  - 缺点：新增依赖，违反当前“无新依赖”默认约束。
  - 结论：本期拒绝，除非用户批准依赖。
- Option B：使用 React + SVG/HTML DnD 自研轻量画布。
  - 优点：无新增依赖、可控、满足原型级交互。
  - 缺点：复杂 DAG 体验有限。
  - 结论：本期选择。
- Option C：只做前端静态复刻。
  - 优点：快。
  - 缺点：违反生产可用级别要求，无后端契约/审计/持久化。
  - 结论：拒绝。
