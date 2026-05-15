---
feature: F004-frontend-foundation
title: 前端工程底座
plan_status: approved
approved_at: 2026-05-16
owner: codex
created_at: 2026-05-15
updated_at: 2026-05-16
---

# Plan: 前端工程底座

## 1. 背景与目标

旧版前端已清空，本功能恢复可验证的管理台前端工程骨架，保留原型 25 个主导航页面 key 的路由占位，为后续业务 feature 按页面逐步接入真实 API 做准备。

- 业务来源：`docs/business/原型页面完成度清单.md`、`docs/business/SMP平台-原型与规格综合评审报告.md`、`docs/business/api/01-API接口规范.md`
- 原型来源：`docs/prototype/SMP工业AI平台-原型v2.html`、`docs/prototype/SMP工业AI平台-原型v2-compiled.html`、`docs/prototype/*.png`
- 技术来源：`docs/architecture/01-technology-stack-baseline.md`、`docs/features/FEATURE_BREAKDOWN.md` F004
- 目标结果：建立 React 19 / TypeScript 6 / Vite 8 / Ant Design 6 管理台骨架、路由、主题、API client、查询缓存、测试和 E2E smoke。

## 2. 范围

### In Scope

- 创建 `frontend/` Vite + React + TypeScript 工程。
- 使用 Ant Design 建立管理台 shell、侧边导航和页面内容区。
- 保留 25 个原型页面 key：`dash`、`ds`、`ann`、`datasrc`、`annreview`、`lineage`、`pipeline`、`opmarket`、`portal`、`devenv`、`train`、`exp`、`eval`、`hub`、`infer`、`batch`、`sched`、`edge`、`report`、`resource`、`usermgmt`、`org`、`perm`、`alert`、`sys`。
- 提供 Axios API client、`X-Trace-Id`、TanStack Query 状态卡和后端未启动时的底座 fallback。
- 提供 Vitest/RTL 单测、Playwright smoke、Dockerfile、nginx 配置和 README。

### Out of Scope

- 不实现具体业务页面复刻、表单流转、权限菜单或真实业务数据。
- 不用 mock API 替代后续核心业务能力；当前 fallback 仅用于工程底座未联通后端时保持 shell 可渲染。
- 不确认 E2E 账号、SSO、网关域名等外部参数。

## Reuse Strategy

### Must Reuse

- 原型资料：`docs/prototype/SMP工业AI平台-原型v2.html`、`SMP工业AI平台-原型v2-compiled.html`、`docs/prototype/*.png`。
- 页面映射：`docs/features/FEATURE_BREAKDOWN.md` F004 与第 4 节原型页面索引。
- API 规范：`docs/business/api/01-API接口规范.md` 的统一 envelope 与 `/api/v1` 基线。
- AI 脚手架：`tools/ai-scaffold/` frontend gate 与 `ai-scaffold.config.json`。

### Duplication Rejected

- 不复制旧已删除 frontend 实现。
- 不在本功能中重写原型全部视觉和业务交互；后续按 feature 逐页复刻。
- 不创建与后端契约冲突的前端假业务模型。

### Approved New Seams

- 新增 `prototypePages` 页面 key 映射，作为后续前端接入的稳定导航 seam。
- 新增 `apiClient`，统一 baseURL、`X-Trace-Id` 和 envelope 类型。
- 新增 `FoundationStatusCard`，用于联通 F003 后端状态接口并在本地开发时提供非业务 fallback。

## 4. 交付方案

1. 搭建 Vite/React/TypeScript 工程与 Ant Design shell。
2. 建立 25 个原型页面 route placeholder。
3. 接入 API client 与 TanStack Query 状态卡。
4. 增加 lint、Vitest、Playwright、build 配置和 Docker/nginx。
5. 启用 AI scaffold frontend gate 并运行验证。

## 5. 数据、权限与审计

- 领域对象：不新增前端业务领域对象，仅保留原型页面元数据。
- MUST 规则：不实现具体业务 MUST；后续页面 feature 必须覆盖。
- 权限：菜单当前全量展示；权限裁剪由 F006 后端与前端联动实现。
- 审计事件：本功能不产生业务审计事件。

## 6. 风险与未决问题

- F004 仅为工程骨架，后续业务页面不得长期停留在 placeholder。
- E2E 账号、SSO/网关路径和部署域名仍为 `TODO_CONFIRM_*`。
- Ant Design 6 与 Vite 8 体积/构建警告需在业务页面增多后做 code splitting。

## 7. 审批记录

- Reviewer: codex 自主工程底座规划
- Decision: approved，用于恢复可验证前端骨架并重新启用 frontend gate。