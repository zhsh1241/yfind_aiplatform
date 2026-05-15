# Task: 前端工程底座

## Metadata
- Feature: F004-frontend-foundation
- ID: TASK-frontend-foundation
- Status: implemented
- Owner: codex
- Created: 2026-05-15
- Updated: 2026-05-16
- 前置：同目录 `plan.md` 已标记 approved，用于本次工程底座恢复追溯。

## 1. 需求摘要

### User Story

作为后续参与 SMP 重建的前端工程师，我想要一个已验证的 React 19 / TypeScript 6 / Vite 8 管理台骨架，以便后续业务 feature 能按原型页面 key 接入真实 API 和视觉实现。

### Business Value

- 恢复 frontend 目录到可 lint、test、build、E2E 的状态。
- 固化原型 25 个主导航页面 key，避免后续页面拆分口径漂移。
- 为后续 F006 起的业务功能提供 API client、查询缓存、Ant Design shell 和测试基座。

### Source References

- Business docs: `docs/business/原型页面完成度清单.md`, `docs/business/SMP平台-原型与规格综合评审报告.md`, `docs/business/api/01-API接口规范.md`
- Prototype: `docs/prototype/SMP工业AI平台-原型v2.html`, `docs/prototype/SMP工业AI平台-原型v2-compiled.html`, `docs/prototype/*.png`
- Feature breakdown: `docs/features/FEATURE_BREAKDOWN.md` F004-C01～F004-C06

## 2. 范围

### In Scope

- [x] AC-01: `frontend/` 包含 React 19 / TypeScript 6 / Vite 8 / Ant Design 6 工程骨架。
- [x] AC-02: 前端导航保留原型 25 个主导航页面 key 和中文页面名称。
- [x] AC-03: API client 支持统一 envelope 类型、`X-Trace-Id` 与 TanStack Query 状态卡。
- [x] AC-04: Vitest 单测、Playwright smoke、lint 与 build 命令可运行。

### Out of Scope

- 不实现业务页面细节、复杂图表、权限菜单裁剪和真实登录会话。
- 不用本地 fallback 替代任何后续核心业务 API。
- 不复制旧前端实现。

## 3. 技术分析

### Backend

- Module/API: 默认读取 F003 `/api/v1/foundation/status`；后续业务 API 由对应 feature contract 冻结。
- Domain objects: 不新增业务领域对象。
- Business rules: 不涉及。

### Frontend

- Prototype page key: 25 个主导航 key 全量保留。
- Pages/components: `App`, `AppNavigation`, `PrototypePage`, `FoundationStatusCard`, `apiClient`。
- States/interactions: TanStack Query 管理后端状态请求；后续 Zustand 用于轻量客户端状态。

### AI Adapter / Integration

- Adapter endpoint: 不涉及。
- External system placeholders: `TODO_CONFIRM_E2E_USERNAME`, `TODO_CONFIRM_E2E_PASSWORD`, `TODO_CONFIRM_INGRESS_HOST` 后续确认。

### Database

- Tables: 不涉及。
- Migrations: 不涉及。

## Reuse Plan

- Existing reference seams to reuse: `docs/prototype/SMP工业AI平台-原型v2.html`, `docs/prototype/SMP工业AI平台-原型v2-compiled.html`, `docs/prototype/*.png`, `docs/business/原型页面完成度清单.md`, `docs/features/FEATURE_BREAKDOWN.md`。
- Existing service/scaffold seams to reuse: F003 `/api/v1/foundation/status`, `tools/ai-scaffold/`, `ai-scaffold.config.json` frontend commands。
- Existing test fixtures to reuse: Vitest、React Testing Library、Playwright、Vite webServer。
- New seams allowed only if existing seams cannot be reused, because: frontend 目录已清空，必须新建 `prototypePages`、`apiClient` 和管理台 shell 作为后续业务接入底座。

## 5. Acceptance Criteria

- [x] AC-01: `npm run lint`、`npm run test:ci`、`npm run build` 在 `frontend/` 下通过。
- [x] AC-02: 单测可断言 `数据集管理`、`模型市场` 等原型导航项存在。
- [x] AC-03: 前端状态卡在后端未启动时显示 `smp-frontend` fallback，后端启动后可请求 `/api/v1/foundation/status`。
- [x] AC-04: Playwright smoke 可从 `/` 进入 `模型市场` 路由并看到页面 key `hub`。

## 6. Definition of Done

- [x] plan.md 已批准。
- [x] contract.md 已实现态。
- [x] test-plan.md 引用全部 AC-xx。
- [x] 复用审查已完成。
- [x] 权限、审计和 MUST 规则有验证证据或明确留给后续 feature。
- [x] 质量门禁通过或记录等价 CI 证据。

## 7. 风险与问题

- 业务页面仍需按 F006+ feature 逐项实现，不能把 placeholder 当业务完成。
- 后端未启动时 Vite proxy 会出现可接受的连接失败日志；不影响本地 shell smoke。