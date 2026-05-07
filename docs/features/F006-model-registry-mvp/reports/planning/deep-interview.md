> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-model-registry-mvp.md`
> Interview transcript: `.omx/interviews/model-registry-mvp-20260505.md`

# Deep Interview Spec: F006-model-registry-mvp

## Metadata
- Profile: quick-continuation
- Context Type: brownfield
- Final Ambiguity: 0.18
- Threshold: 0.30
- Context Snapshot: `.omx/context/model-registry-mvp-20260505T131500Z.md`

## Intent
承接 F005 训练任务 artifact，建立模型仓库 MVP，让模型版本可登记、可查看、可审批，并为 F007 推理服务提供可信的已批准模型版本入口。

## Desired Outcome
产出 F006 计划草案和规划证据，后续经人审批准后进入 build-feature 实现模型仓库。

## In Scope
- 模型列表、详情、版本列表和版本详情。
- 模型版本注册，输入可引用 F005 训练任务和 artifact URI。
- 训练来源、评测指标、checksum、artifact 状态、版本状态展示。
- 审批、驳回、归档操作。
- 权限 trace：`model:read`、`model:manage`。
- 前端模型仓库页面、版本详情抽屉、审批/驳回弹窗。
- 后端 MockMvc、前端 Vitest、Playwright E2E。

## Out of Scope / Non-goals
- 真实 MLflow、对象存储、模型文件上传下载。
- 真实推理服务部署。
- 自动评测流水线和复杂模型 lineage 图谱。
- 生产审批流和多级组织策略。

## Decision Boundaries
Codex 可决定模型仓库 MVP 的本地数据结构、API DTO、前端交互和测试 fixture。必须保留 `TODO_CONFIRM_MODEL_ARTIFACT_URI`、`TODO_CONFIRM_MODEL_EVAL_POLICY`、`TODO_CONFIRM_MODEL_APPROVAL_POLICY` 等生产待确认点。

## Constraints
- 正式文档中文。
- plan 阶段不得实现业务代码。
- 必须复用 F005 artifact seam、F002 权限词表和现有前端原型框架。

## Acceptance Criteria Draft
- AC-01：后端提供模型列表、详情、注册、审批、驳回、归档 API。
- AC-02：模型版本可追踪到 F005 训练任务和 artifact URI。
- AC-03：模型版本展示评测指标、状态、checksum 和可部署状态。
- AC-04：权限 trace 覆盖 `model:read` 与 `model:manage`。
- AC-05：前端模型仓库页面支持查看列表、版本详情和审批交互。
- AC-06：Playwright 覆盖模型仓库主流程。
- AC-07：文档、合同、测试计划和 gate 可追踪。
