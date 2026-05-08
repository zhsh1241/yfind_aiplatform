---
feature: F008-dataset-preparation-pipeline
title: 数据准备流水线
plan_status: approved
approved_at: "2026-05-08"
owner: codex
created_at: 2026-05-08
updated_at: 2026-05-08
---

# 计划：数据准备流水线

## Intent

- Why：为算法/训练团队提供平台内自助完成训练前数据准备的正式入口，统一多来源数据接入并沉淀标准训练数据集。
- Why now：当前项目已经具备数据资产、训练任务、模型注册与 PAI 集成的前后文规划，但“训练前数据准备”仍缺少正式的全流程平台能力；若继续依赖分散脚本和人工流程，会削弱后续训练与治理链路的一致性、可追溯性与复用性。

## Planning Evidence

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`

## Context

- `project.md` 已把数据准备列为平台核心业务链路的前 7 个步骤，是训练调度之前的必要前置。
- 仓库已有：
  - F004：数据资产 MVP
  - F005：训练任务 MVP
  - F006：模型注册 MVP
  - F007：PAI 生产集成
- F008 需要在 F004 的 dataset domain 基础上扩展为“数据准备流水线”，而不是另起一套平行数据域。

## Scope

### In Scope

- 多来源原始数据接入：公开数据集、企业内部系统、网络采集来源登记与接入编排。
- 数据清洗：去噪、异常值处理、重复样本识别、缺失值处理、格式统一。
- 数据标注：标签结构管理、标注任务、结果接入、一致性与准确性检查。
- 数据划分：训练 / 验证 / 测试集划分比例配置与快照管理。
- 数据预处理：图像归一化/裁剪/旋转，文本分词/编码/token 序列化等。
- 数据增强：样本增强策略配置、执行与结果版本化。
- 格式转换与加载：转换为训练框架支持格式，生成加载配置或 DataLoader 元数据。
- 全流程配置、质量门禁、失败阻断、人工修正重跑、版本快照、权限隔离与审计留痕。

### Out of Scope / Non-goals

- 训练任务提交、资源调度、日志指标监控。
- 模型注册、审批、发布、治理与推理服务。
- 依赖平台外脚本或外部步骤来完成任一核心数据准备能力。
- 在本计划阶段确认未落地的真实企业外部系统、生产爬取策略或最终合规清单。

## Decision Boundaries

### Codex may decide without confirmation

- 数据准备任务、阶段、规则快照、质量报告、重跑记录等领域对象的模块边界与命名。
- 前端任务列表、阶段详情、配置表单、质量结果视图与失败提示的组织方式。
- 默认划分比例候选值、阶段状态机字段、增强配置表达方式、格式转换元数据结构。
- 在现有 dataset domain 基础上扩展的代码组织方式，以及与 training / permission 域的衔接 DTO 设计。

### Must escalate / remain pending

- 企业内部系统首期实际接入清单与凭据来源。
- 网络采集能力的正式合规边界、来源白名单与访问限制。
- 首期必须优先保证的模态深度（图像、文本或并行）。
- 首期要正式支持的训练格式清单与存储容量 / 配额外部事实。

## Exception Scenarios

### Handled In This Feature

- 任一步骤失败或质量门禁不达标：立即阻断后续步骤，要求人工修正后重跑。
- 数据源缺少关键字段或格式不一致：阻断清洗后续流程，并记录失败原因。
- 标注结果一致性不足：阻断版本发布或后续划分。
- 数据划分后样本分布异常或数量不足：阻断预处理 / 格式转换。
- 预处理、增强或格式转换产生异常结果：阻断标准训练数据集产出，保留失败记录与重跑入口。

### Explicitly Deferred / Not Handled In This Feature

- 训练执行与调度侧的资源控制。
- 模型治理、模型审批与上线流程。
- 未确认的真实企业外部系统生产级适配细节。
- 泛化到所有模态都同等深度的复杂算法实现细节（保留统一流程位点，具体深度在 build-feature 契约中冻结）。

## Reuse Strategy

### Must Reuse

- `backend/src/main/java/com/yfind/aiplatform/dataset/*`：数据集、版本、处理任务、事件存储与现有 API 边界。
- `backend/src/main/java/com/yfind/aiplatform/permission/*`、`identity/*`：权限、会话、审批与审计基线。
- `backend/src/main/java/com/yfind/aiplatform/training/*`：作为 F008 产物与训练任务衔接的边界参考，不重复实现训练侧逻辑。
- `frontend/src/pages/DatasetPage.tsx`、`frontend/src/modals/UploadDatasetModal.tsx`、`frontend/src/api/datasetApi.ts`：现有数据资产入口与交互骨架。
- `tools/ai-scaffold`、`docs/features/`、F004/F005 既有 planning / QA 报告结构与测试基座。

### Duplication Rejected

- 不创建第二个独立的数据准备服务或平行 dataset domain。
- 不复制第二套权限 / 审批 / 审计实现。
- 不为不同来源或不同模态复制独立流水线框架。
- 不把正式业务流程拆到 `ai-adapter/` 或其他旁路目录中重复实现。

### Approved New Seams

- 新增数据准备任务、阶段状态、规则快照、质量报告、标注任务与重跑记录等领域对象，因为现有 dataset domain 尚未覆盖完整流水线编排。
- 新增多阶段流水线状态机与步骤执行 seam，因为 F004 主要覆盖数据资产管理，不具备端到端数据准备能力。
- 新增面向多模态的预处理 / 增强策略抽象，因为当前仓库缺少统一可配置处理层。

## Delivery Plan

1. 在 build-feature 阶段冻结 `contract.md`，明确数据准备任务、阶段输入输出、质量门禁、权限与重跑语义。
2. 产出 `test-plan.md`，覆盖 7 个步骤主链路、失败阻断、人工修正重跑、协作权限与审计。
3. 后端优先扩展 dataset domain，建立数据准备任务与多阶段状态机，再补齐质量报告与重跑语义。
4. 前端在契约稳定后实现任务列表、阶段详情、配置表单、质量结果、阻断提示与重跑入口。
5. 完成联调、代码评审、QA 与 scaffold gate 验证。

## Risks

- 首期一次性纳入 7 个步骤会扩大交付范围，若不控制模态深度可能导致计划过宽。
- 企业内部系统接入与网络采集存在外部事实未确认风险。
- 标注、增强与格式转换若没有统一规则快照与质量门禁，后续可追溯性会不足。
- 若与 F004 数据资产边界切分不清，可能出现重复领域对象或重复页面。

## Acceptance Criteria Draft

- AC-01：规划证据归档完整，`plan.md`、`reports/planning/deep-interview.md`、`reports/planning/prd.md`、`reports/planning/test-spec.md` 齐备。
- AC-02：F008 正式范围明确覆盖数据收集、清洗、标注、划分、预处理、增强、格式转换与加载全部 7 个步骤。
- AC-03：功能边界明确止于“可直接用于训练的标准数据集”，不包含训练任务、模型治理与推理部署。
- AC-04：所有核心步骤均要求平台内置能力完成。
- AC-05：默认异常策略明确为“失败即阻断，人工修正后重跑”。
- AC-06：计划明确要求保留过程配置、质量检查结果、版本、重跑记录、权限隔离与多人协作支持。
- AC-07：复用策略明确约束不得复制现有 dataset / permission / training 平行实现。

## Open Questions

- 首期需要优先保证哪种模态的深度体验：图像、文本，还是两者同级？
- 企业内部系统接入首期是否只做抽象与占位配置，不绑定真实系统？
- 网络采集能力首期是否仅支持受控来源登记，而非开放通用爬取？
- 标注首期是否需要人工标注工作台，还是先覆盖标签结构、任务流转与结果接入？
- 首期优先支持哪些训练格式与加载配置形式？

## Approval Notes

- Reviewer: user
- Decision: approved on 2026-05-08

