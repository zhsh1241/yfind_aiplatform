---
feature: F004-dataset-asset-mvp
title: 数据资产 MVP
plan_status: approved
approved_at: "2026-05-04"
owner: codex
created_at: 2026-05-04
updated_at: 2026-05-04
---

# 计划：数据资产 MVP

## Intent

- Why：在 F002 权限基线之后建立统一的数据资产中心，为后续标注、训练、模型与推理能力提供可管理、可授权、可追踪的数据集版本基础。
- Why now：当前项目已有平台骨架、权限基线与交互原型，但尚未有正式的数据资产能力；若继续推进后续功能，会导致数据入口、授权与版本语义分散实现。

## Planning Evidence

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`

## Context

- `docs/architecture/04-ai-execution-plan.md` 已将 WP-003 定义为数据资产 MVP，并作为 F002 之后的下一项核心功能。
- 当前仓库已具备：
  - F001：平台架构基线
  - F002：身份、组织、权限与审计基线
  - F003：可点击平台原型
- F004 是后续标注、训练、模型仓库和推理服务的共同前置能力。

## Scope

### In Scope

- 数据集列表、搜索、筛选、详情入口。
- 本地文件上传与元数据登记。
- 数据集版本生成与版本信息管理。
- 图片样例预览（非图片文件允许上传，但不保证预览）。
- 权限申请与审批流程。
- 数据集级查看权限与版本级下载权限。
- 文件 hash、去重策略、异步预处理队列。
- 后端存储接口抽象，默认本地文件系统实现。

### Out of Scope / Non-goals

- 外部系统同步。
- 对象存储引用作为 F004 首批能力。
- 数据源连接测试。
- 通用文档/表格/音视频等完整在线预览。
- 真实对象存储生产接入。
- 高级数据质量分析、复杂治理编排、自动标注相关能力。

## Decision Boundaries

### Codex may decide without confirmation

- `backend/` 内数据集、版本、文件条目、授权申请、审批、异步任务的模块划分与 DTO 命名。
- `frontend/` 内列表、详情、上传、审批、预览页面与状态交互布局。
- 存储接口抽象的代码组织方式，以及默认本地文件系统实现方案。
- 非图片文件的退化展示方式（例如仅显示文件元数据与不可预览提示）。
- 去重策略的首版分支形态与异步任务状态字段设计。

### Must escalate / remain pending

- 未来生产对象存储供应商、桶策略、访问凭据与部署方式。
- 是否在后续版本升级到对象级/行列级授权。
- 是否引入多级审批流或更复杂审批策略。
- 是否扩展为多类型在线预览与外部系统同步。

## Exception Scenarios

### Handled In This Feature

- 上传非图片文件：允许上传，但预览退化为不支持预览状态。
- 上传重复文件：依据 hash 与去重策略执行提示、拦截或状态化处理。
- 异步预处理失败：原始文件与版本关系保留，任务状态可见并允许后续重试策略。
- 用户仅有数据集查看权限：允许浏览数据集信息，但不得下载具体版本。
- 权限申请未审批或被拒绝：申请状态可追踪，下载继续受限。

### Explicitly Deferred / Not Handled In This Feature

- 真实对象存储接入与对象存储引用。
- 外部数据源测试连接与外部系统同步。
- 非图片文件的深度在线预览。
- 高级数据治理能力，如自动质检、复杂血缘图谱、自动分类标注。

## Reuse Strategy

### Must Reuse

- `backend/src/main/java/com/yfind/aiplatform/identity/PermissionService.java`、`dataset:read` / `dataset:manage` 权限键，以及 `backend/` Spring Boot 单体骨架。
- `backend/src/test/java/com/yfind/aiplatform/identity/AuthControllerTest.java`、既有 MockMvc 测试基座与 F002 权限边界。
- `frontend/src/App.tsx`、`frontend/src/App.test.tsx` 与 `frontend/` React + TypeScript + Ant Design 基线。
- `tools/ai-scaffold`、`docs/features/` 既有 feature 工作流，以及 `docs/features/F002-identity-org-permission/` 已验证的报告结构。
- F003 原型中已有的数据资产入口、模块导航与 `/api/datasets` 数据资产概念信息架构。

### Duplication Rejected

- 不创建第二个独立数据资产服务。
- 不在 `ai-adapter/` 中复制数据元数据与授权流程。
- 不复制第二套上传、版本或审批机制。
- 不为未来对象存储预建一套与本地文件系统完全平行的业务流程。

### Approved New Seams

- 新增数据集、版本、文件条目、授权申请、审批与异步处理任务等业务边界，因为当前仓库尚无对应领域模块。
- 新增存储接口抽象，因为未来明确存在对象存储扩展方向，而当前必须先以本地文件系统落地。
- 新增预处理任务状态与执行 seam，因为用户明确要求 F004 纳入异步处理链路。

## Delivery Plan

1. 基于本计划在 build-feature 阶段冻结 `contract.md`，明确数据模型、授权边界、版本语义与异步任务状态。
2. 产出 `test-plan.md`，覆盖上传、版本、预览、申请审批、授权拦截、去重与异步处理。
3. 后端先实现数据资产与授权主流程，再联通异步预处理链路。
4. 前端在后端契约稳定后实现列表、筛选、上传、详情、预览、申请审批与下载受控交互。
5. 完成联调、代码审查、QA 与 gate 验证。

## Risks

- 异步预处理队列如果设计过重，会扩大 F004 开发复杂度。
- 数据集级查看与版本级下载的分层授权若契约不清晰，容易导致前后端行为不一致。
- 通用文件上传与图片预览并存时，类型判断与错误处理需要清晰定义。
- 若存储层未保持抽象，未来切换对象存储的改造成本会偏高。

## Acceptance Criteria Draft

- AC-01：规划证据归档完整，`plan.md`、`reports/planning/deep-interview.md`、`reports/planning/prd.md`、`reports/planning/test-spec.md` 齐备。
- AC-02：F004 正式范围明确覆盖列表、搜索、筛选、上传、元数据登记、版本、样例预览、权限申请与审批。
- AC-03：授权边界明确为“数据集级查看 + 版本级下载”。
- AC-04：上传策略明确为“通用文件可上传，图片预览有保证”。
- AC-05：hash、去重策略、异步预处理队列属于 F004 正式交付范围。
- AC-06：存储策略明确为“抽象接口 + 默认本地文件系统实现”。
- AC-07：后续 build-feature 的验收必须同时证明端到端业务闭环与处理链路稳定。

## Open Questions

- 异步预处理首版最小动作集合应包含哪些步骤。
- 去重策略首版采用阻止、提示跳过、还是保留副本的具体规则。
- 数据集版本状态是否需要区分草稿、处理中、可用、已归档。
- 审批流首版是否是一层审批，或需要预留多角色扩展结构。

## Approval Notes

- Reviewer:
- Decision:

