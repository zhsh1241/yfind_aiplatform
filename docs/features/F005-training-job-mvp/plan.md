---
feature: F005-training-job-mvp
title: 训练任务 MVP
plan_status: approved
approved_at: "2026-05-05"
owner: codex
created_at: 2026-05-05
updated_at: 2026-05-05
---

# 计划：训练任务 MVP

## Intent

- Why：在数据资产 MVP 之后，为算法工程师提供从已批准数据集版本发起训练、查看调度状态、指标、日志与 artifact 的最小闭环。
- Why now：F004 已建立数据集版本与权限入口，F005 承接“数据集 -> 训练任务 -> 模型 artifact”的主链路，为后续模型仓库和推理服务准备输出物。

## Planning Evidence

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`
- `.omx/specs/deep-interview-training-job-mvp.md`
- `.omx/plans/prd-training-job-mvp.md`
- `.omx/plans/test-spec-training-job-mvp.md`

## Context

F005 采用“Spring Boot 本地业务服务 + FastAPI ai-adapter 占位编排接口 + React 训练中心页面”的第二种渐进式方案，先交付可验证骨架，不直接绑定真实 Kubeflow、Argo 或 MLflow。

## Scope

### In Scope

- 训练任务列表、详情、创建、取消与模板查询 API。
- 基于 F004 `DatasetService` 校验训练数据集键。
- 训练资源配置：CPU、GPU、NPU、epoch、加速器类型。
- 训练日志、指标快照、artifact 占位 URI 与 adapter 提交 ID。
- `ai-adapter` 训练模板与训练提交占位接口。
- 前端训练中心：任务看板、资源调度、算法模板、指标点击详情、启动训练弹窗。
- Vitest、MockMvc、ai-adapter unittest、Playwright 覆盖主流程。

### Out of Scope / Non-goals

- 真实工作流引擎接入。
- 真实 GPU/NPU 集群调度与资源配额。
- 真实 MLflow / 对象存储 artifact 写入。
- 多租户强权限拦截的生产级实现。

## Reuse Strategy

复用审查已完成：本轮复用 `backend/` Spring Boot 骨架、`frontend/` React + Ant Design 原型、`ai-adapter/` FastAPI 占位适配器、F004 `DatasetService` 数据集详情校验、既有 `App.test.tsx` / Playwright 测试组织方式，以及 `/api/training-jobs`、`.test.tsx`、`.spec.ts` 的 `TASK-training-job-mvp` 追踪方式；新增训练 seam 仅用于当前仓库尚不存在的训练任务、模板、指标、日志与 artifact 领域边界。

### Must Reuse

- `backend/src/main/java/com/yfind/aiplatform/dataset/DatasetService.java`：创建训练任务前校验数据集键。
- `backend` 现有 Spring Boot + MockMvc 测试基座。
- `ai-adapter/app/main.py` 的 router 聚合模式与 `/internal` 路径风格。
- `frontend/src/pages/TrainingPage.tsx`、`frontend/src/modals/TrainingModal.tsx` 的原型入口。
- `frontend/src/App.test.tsx` 与 `frontend/e2e/*.spec.ts` 的 feature trace 测试结构。

## Acceptance Criteria

- **AC-01**：后端可列出、查看、创建、取消训练任务，并返回 `TASK-training-job-mvp` 追踪字段。
- **AC-02**：训练任务详情包含数据集版本、模板、资源请求、状态、队列状态与 adapter 提交 ID。
- **AC-03**：训练详情包含日志、指标快照和 artifact 占位 URI，artifact URI 明确保留 `TODO_CONFIRM_MODEL_ARTIFACT_URI`。
- **AC-04**：`ai-adapter` 暴露训练模板与训练提交占位接口，返回 adapter 提交 ID、队列和 artifact 根路径。
- **AC-05**：前端训练中心可展示任务看板、资源调度、算法模板、指标图表和 artifact 提示。
- **AC-06**：前端支持启动训练步骤流，并可查看训练指标详情。
- **AC-07**：`contract.md`、`test-plan.md`、SQL notes、验证报告和 scaffold gate 均可追踪到本 feature。

## Verification Plan

- `Push-Location backend; mvn test -q; Pop-Location`
- `Push-Location ai-adapter; python -m unittest discover -s tests -v; Pop-Location`
- `Push-Location frontend; npm run lint; npm run test:ci; npm run build; Pop-Location`
- `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F005-training-job-mvp --skip-code-review-verdict --run-e2e`