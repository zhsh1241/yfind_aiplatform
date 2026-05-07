> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-model-registry-mvp.md`

# PRD: F006-model-registry-mvp

## Problem
F005 已能产出训练任务和 artifact 占位，但平台尚无模型版本管理能力。若直接进入推理服务，部署对象缺少审批、评测、版本状态和可追溯训练来源。

## Goals
- 建立模型仓库 MVP，承接 F005 artifact。
- 提供模型与版本列表、详情、注册、审批、驳回、归档能力。
- 展示训练来源、评测指标、artifact URI、checksum、状态和部署准入标记。
- 为 F007 推理服务提供 approved model version seam。

## Users
- 算法工程师：注册并查看训练产物模型版本。
- 平台管理员 / 模型审批人：审核模型版本是否可发布。
- 推理服务模块：只消费已批准模型版本。

## Functional Requirements
- 后端 API：模型列表、详情、版本注册、审批、驳回、归档、可部署版本查询。
- 模型版本字段：modelKey、versionKey、trainingJobKey、artifactUri、metrics、checksum、status、approvalStatus、deployable。
- 前端页面：模型列表、版本详情、评测指标、来源追踪、审批/驳回操作。
- 权限：读操作 `model:read`，写/审批操作 `model:manage`。
- 所有测试和响应包含 `TASK-model-registry-mvp` trace。

## Non-goals
- 不接入真实 MLflow / 对象存储。
- 不执行真实推理部署。
- 不实现复杂多级审批和自动评测流水线。

## Decision
使用本地内存 MVP 数据与明确 TODO seam。复用 F005 artifact URI 和训练任务 key，先建立平台内部模型版本合同，再由后续功能接入真实存储与推理部署。

## Risks
- artifact 根 URI 未确认：用 `TODO_CONFIRM_MODEL_ARTIFACT_URI` 标记。
- 评测标准未确认：用 `TODO_CONFIRM_MODEL_EVAL_POLICY` 标记。
- 审批策略未生产化：用 `TODO_CONFIRM_MODEL_APPROVAL_POLICY` 标记。
