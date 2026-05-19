> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-pipeline-editor-operator-marketplace.md`
> Interview transcript: `.omx/interviews/pipeline-editor-operator-marketplace-20260518T131039Z.md`

﻿# Deep Interview Spec: F011 完整 Pipeline 编辑器与算子市场

## Metadata

- Feature: F011-pipeline-editor-operator-marketplace
- Profile: standard
- Context Type: brownfield
- Final Ambiguity: 0.18
- Threshold: 0.20
- Context Snapshot: $contextPath
- Interview Transcript: $interviewPath

## Clarity Breakdown

| 维度 | 分数 | 依据 |
| --- | --- | --- |
| Intent | 0.95 | 用户在 F010 差距说明后确认进入 F011，意图是补齐完整 Pipeline/算子能力。 |
| Outcome | 0.90 | 目标页面与能力由原型 pipeline、opmarket、业务 FUNC-DATA-080~091 明确。 |
| Scope | 0.84 | In/Out 可基于 F010 留白、业务规格和原型完成度清单确定。 |
| Constraints | 0.85 | 项目规则、技术基线、复用 F006/F009/F010、禁止复制原型 JSX 明确。 |
| Success Criteria | 0.88 | 可通过 API、前端 E2E、原型语义/布局对比和质量门禁验证。 |
| Context | 0.86 | 已定位 F010 报告、业务规格、原型与现有前后端接入点。 |

## Intent / Desired Outcome

补齐 F010 未覆盖的完整 Pipeline 编辑器与算子市场，让数据工程师在数据管理域中可以：

1. 在 /pipeline 通过拖拽式 DAG 画布构建数据处理流程。
2. 从算子库/算子市场选择算子并添加到画布。
3. 配置节点参数、全局变量、输入/输出数据集。
4. 保存 Pipeline 定义并生成版本快照。
5. 测试运行 Pipeline，查看运行历史、节点状态、日志摘要与输出数据集/血缘。
6. 在 /opmarket 浏览算子、查看详情/效果预览、提交自定义算子申请、查看使用统计。

## In Scope

- Pipeline 编辑器页面 /pipeline：原型级工具栏、算子库、DAG 画布、节点拖拽/排序/连线展示、右侧配置面板。
- Pipeline 定义持久化：定义、版本快照、节点/边/变量、当前版本状态。
- Pipeline 测试运行控制面：运行记录、节点运行记录、日志摘要、状态机、输出数据集与血缘记录。
- 全局变量：变量名、类型、值类型（明文/secretRef/envRef）、运行时快照；禁止保存明文密钥。
- 算子市场 /opmarket：分类浏览、搜索、详情、参数 schema、输入/输出说明、Before/After 示例预览、使用统计。
- 自定义算子 seam：JSON Schema 参数定义、HTTP endpoint 配置、提交审核/发布状态；外部调用凭证只允许 secretRef/TODO_CONFIRM。
- 权限、BU 隔离与审计：复用 F006 平台身份/权限/审计机制。
- 与 F009/F010 复用：输入/输出数据集、文件、血缘、标准化算子/任务能力保持兼容。

## Out of Scope / Non-goals

- 不实现真实大规模 Spark/Flink/Airflow/Argo 工作流调度。
- 不承诺真实解析/加工大文件内容；本期实现控制平面与可测试的本地/沙箱运行记录。
- 不在未确认安全策略前真实调用外部 HTTP 算子处理生产数据。
- 不实现 AI 智能助手自动生成 Pipeline（FUNC-DATA-084 可保留入口或后续 feature）。
- 不一次性人工硬编码 136+ 生产算子清单；需等待 TODO_CONFIRM_OPERATOR_CATALOG_SOURCE，但数据模型与接口支持扩展。

## Decision Boundaries

Codex 可自主决定：

- 在不新增前端依赖前提下，用 React + Ant Design + SVG/HTML Drag-and-Drop/Pointer Events 实现画布。
- 后端表结构与 API 资源命名，只要保持 REST v1、权限/审计、BU 隔离一致。
- 以原型 18 个算子作为初始 seed，并保留 136+ catalog 扩展能力。
- 将 F010 数据标准化能力作为 Pipeline 内置算子/模板复用，而不是继续占用独立“数据标准 / Pipeline”页面。

需要用户/业务后续确认：

- 136+ 内置算子的正式清单与分类来源。
- 外部 HTTP 算子的安全审查、网络出口、鉴权和数据脱敏规则。
- 是否需要在 F011 同期实现 AI Pipeline 助手。

## Constraints

- 严格保持原型信息架构：Pipeline编辑器、算子广场、数据集详情/血缘。
- 不复制原型 JSX 或旧已删除实现。
- 不新增依赖，除非后续批准。
- 所有写操作需权限校验、BU 隔离、审计记录。
- 明文密钥禁止落库；外部凭据必须 secretRef 或 TODO_CONFIRM_*。

## Testable Acceptance Criteria

- AC-01：/pipeline 页面按原型展示工具栏、算子库、DAG 画布、右侧节点配置、运行历史、版本快照、全局变量入口。
- AC-02：用户可从算子库/添加算子侧边栏选择算子并添加到画布，节点可拖拽调整位置/顺序，保存后后端持久化 DAG 定义。
- AC-03：用户可编辑节点参数和全局变量；保存版本生成快照，可查看历史快照并回滚/复制。
- AC-04：用户可发起测试运行，后端生成 Pipeline run、节点 run、状态、耗时、日志摘要；失败节点可定位。
- AC-05：运行成功可生成输出数据集/版本/文件占位和 PIPELINE/STANDARDIZATION 血缘，且不破坏 F010 标准化任务闭环。
- AC-06：/opmarket 支持分类、搜索、算子详情、参数 schema、Before/After 示例预览、使用统计。
- AC-07：自定义算子可提交审核，HTTP endpoint/凭据按安全规则保存，审核状态可见。
- AC-08：权限不足、跨 BU 访问、无效 DAG（环、缺少输入/输出、未知算子）均被拒绝并审计。

## Assumptions / Pressure-pass Findings

- “完整”指原型级控制平面完整，不等于在 F011 中完成生产数据平面调度引擎。
- 算子目录完整性受 TODO_CONFIRM_OPERATOR_CATALOG_SOURCE 约束；先实现可扩展 catalog 与原型 seed，避免虚构 136+ 权威清单。
- Pipeline run 可以先做沙箱可测 runner：生成状态、节点日志、输出数据集/血缘；后续再接 Argo/Flink/Spark。

## Brownfield Evidence

- F010 已实现 /pipeline 的数据标准化页面，需要在 F011 中整合为 Pipeline 模板/内置算子，避免能力丢失。
- F009 提供数据集、版本、文件、血缘基础表和 API，可复用输出数据集能力。
- F006 提供权限、角色、审计机制，可扩展 pipeline/operator 权限。
