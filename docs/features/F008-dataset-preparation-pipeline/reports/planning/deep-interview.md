> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-dataset-preparation-pipeline.md`
> Interview transcript: `.omx/interviews/dataset-preparation-pipeline-20260508T083906Z.md`

﻿# Deep Interview Spec: F008-dataset-preparation-pipeline

## Metadata

- Profile: standard
- Rounds: 8
- Final ambiguity: 0.16
- Threshold: 0.20
- Context type: brownfield
- Context snapshot: `.omx/context/dataset-preparation-pipeline-20260508T082308Z.md`

## Clarity Breakdown

| 维度 | 结论 |
| --- | --- |
| Intent | 为算法/训练团队提供自助式训练前数据准备能力，并沉淀标准数据集。 |
| Outcome | 在平台内完成从原始数据接入到标准训练数据集产出的完整闭环。 |
| Scope | 首期即覆盖数据收集、清洗、标注、划分、预处理、增强、格式转换与加载全部 7 个步骤。 |
| Constraints | 仅做规划；正式文档中文；所有步骤必须平台内置；异常默认阻断并人工修正。 |
| Success Criteria | 全流程可操作、全程可追溯、支持多人协作与权限隔离。 |
| Context | 需复用现有数据资产、训练任务、权限与前端骨架，不重复造平行实现。 |

## Intent

让算法/训练团队能自助完成训练前数据准备，统一接入多来源数据，并在平台内沉淀可复用、可追溯、可授权的标准数据集。

## Desired Outcome

形成一个可批准的 F008 功能计划，定义平台内置数据准备流水线的范围、边界、阶段结果、复用策略、风险与验证方向，为后续 build-feature 提供正式输入。

## In Scope

- 多来源原始数据采集（公开数据集、企业内部系统、网络采集接入能力）。
- 数据清洗：去噪、异常值/重复样本处理、缺失值处理、格式统一。
- 数据标注：监督学习场景下的标签管理、一致性与准确性控制。
- 数据划分：训练 / 验证 / 测试集划分与比例配置。
- 数据预处理：归一化/标准化、文本分词编码、图像基础预处理。
- 数据增强：图像与文本等样本增强能力。
- 格式转换与加载：转换为训练框架支持格式并提供高效加载配置。
- 过程配置、质量检查结果、版本、重跑记录、权限隔离与协作支持。

## Out of Scope / Non-goals

- 训练任务提交与调度。
- 模型注册、审批、发布与治理。
- 推理服务与在线部署。
- 任何把核心步骤交给平台外人工脚本或外部步骤执行的方案。

## Decision Boundaries

- Codex 可直接决定：模块拆分、页面组织、DTO 命名、阶段状态字段、任务编排字段、审计字段、数据版本与快照命名。
- Codex 可直接决定：默认数据划分比例的首版候选值、失败状态机、增强配置的表示方式、格式转换结果的元数据结构。
- 必须保持待确认：网络采集的合规边界、企业内部系统真实接入清单、首期重点模态优先级、外部资源配额与存储上限。

## Exception Scenarios

- 任一步骤失败或质量门禁不达标：立即阻断后续步骤，要求人工修正后重跑。
- 某数据源缺少关键字段或格式不一致：阻断进入标准化前的下一阶段。
- 标注结果一致性校验失败：阻断版本发布。
- 划分结果分布异常或样本不足：阻断格式转换与加载配置生成。
- 预处理/增强生成异常样本：阻断数据集产出并保留失败记录。

## Constraints

- 本阶段只做 feature planning，不实现业务代码。
- 所有正式文档默认中文。
- F008 首期必须完整覆盖 7 个核心步骤，不能拆成“后续再补”的占位式规划。
- 数据准备功能必须在平台内置能力中完成，不能依赖平台外脚本作为正式路径。
- 需要支持多人协作、权限隔离、过程追溯与重跑。

## Testable Acceptance Criteria (Planning-Level)

- AC-01：计划文档明确覆盖 7 个核心数据准备步骤，且全部属于首期正式范围。
- AC-02：计划文档明确产出边界止于“可直接用于训练的标准数据集”，不包含训练/模型治理后续环节。
- AC-03：计划文档明确所有步骤均由平台内置能力完成。
- AC-04：计划文档明确默认异常策略为“失败即阻断，人工修正后重跑”。
- AC-05：计划文档明确需要保留过程配置、质量检查结果、版本、重跑记录、权限隔离与协作支持。
- AC-06：复用策略明确约束不得复制现有数据资产、训练任务、权限体系的平行实现。

## Pressure-pass Findings

在“是否允许把部分步骤延后为后续扩展能力”的压力测试中，用户明确坚持首期就把 7 个步骤全部纳入正式计划。这意味着 F008 不是单点工具页，而是训练前数据准备平台能力的完整入口，后续方案必须以全流程一致性与治理可追溯为核心，而不是仅完成界面串联。

## Brownfield Evidence vs Inference Notes

- Evidence：`project.md` 已把“数据准备”列为核心业务链路的前 7 步。
- Evidence：仓库已有 F004 数据资产 MVP、F005 训练任务 MVP、F006 模型注册 MVP、F007 PAI 集成规划，可作为 F008 的上下游上下文。
- Evidence：现有 `frontend/src/pages/DatasetPage.tsx`、`backend/.../dataset/*`、`training/*`、`permission/*` 可作为复用基础。
- Inference：F008 应在现有 dataset domain 上扩展为“数据准备流水线”而不是新建第二套数据域。
