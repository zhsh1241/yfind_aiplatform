# TASK：数据资产 MVP

## 元数据

- Feature：F004-dataset-asset-mvp
- 任务 ID：TASK-dataset-asset-mvp
- 状态：completed
- 前置条件：`plan.md` 已批准（`plan_status: approved`）
- Owner：codex
- 创建日期：2026-05-04
- 更新日期：2026-05-04

## 1. 需求摘要

### 用户故事

作为平台管理员、数据集负责人、标注人员或算法工程师，我希望平台提供统一的数据资产中心，支持数据集列表、上传、版本、图片样例预览、权限申请审批与受控下载，以便后续标注、训练、模型与推理能力都围绕清晰的数据集版本开展工作。

### 业务价值

- 让平台首次具备可正式承接后续 AI 业务能力的数据入口与数据版本基础。
- 将数据查看、下载、申请、审批与处理链路统一到平台中，避免后续模块各自实现。
- 为后续标注、训练、模型仓库和推理服务提供统一的数据资产基座。

## 2. 范围

### In Scope

- [x] 数据集列表、搜索、筛选与详情视图。
- [x] 本地文件上传、元数据登记与数据集版本生成。
- [x] 图片样例预览与非图片文件退化展示。
- [x] 数据集级查看权限与版本级下载权限。
- [x] 权限申请、审批与状态追踪。
- [x] hash、去重策略、异步预处理任务状态展示。
- [x] 后端存储接口抽象，默认本地文件系统实现。

### Out of Scope

- 外部系统同步。
- 对象存储引用。
- 数据源连接测试。
- 通用文件深度在线预览。
- 真实生产对象存储接入。

## 3. 技术分析

### Backend

- Entity：`dataset`、`datasetversion`、`datasetfile`、`datasetaccessrequest`、`datasetprocessingjob`。
- Service：本地内存数据集服务、权限申请审批服务、存储抽象服务、图片样例与异步处理状态汇总。
- API：
  - `GET /api/datasets`
  - `GET /api/datasets/{datasetKey}`
  - `POST /api/datasets/upload`
  - `POST /api/datasets/{datasetKey}/access-requests`
  - `POST /api/datasets/access-requests/{requestId}/approve`
  - `GET /api/datasets/access-requests`

### Frontend

- Pages：数据资产工作台。
- Components：数据集表格、详情卡片、版本列表、申请审批列表、上传弹窗。
- Stores：组件内状态即可，不新增全局 store。

### Database

- Tables：本轮以服务内 MVP 数据为主，正式 SQL 仅记录设计说明。
- Migrations：不引入真实数据库迁移，先产出 `sql/migration-notes.md`。
- Feature SQL：`docs/features/F004-dataset-asset-mvp/sql/`

### Reuse Plan

- Existing backend seams to reuse：`backend/` 既有 Spring Boot 单体骨架、F002 的身份/权限边界、MockMvc 测试基座、`PermissionService` 的权限词表与默认拒绝策略。
- Existing frontend seams to reuse：`frontend/` React + TypeScript + Ant Design 原型骨架、现有 `DatasetPage`、`Modal`、`Table`、`App.test.tsx` 测试基座。
- Existing SQL / permissions / test fixtures to reuse：`dataset:read`、`dataset:manage` 权限键，`TASK-...` 测试追踪方式，既有 feature 报告目录结构。
- New seams allowed only if existing seams cannot be reused, because：当前仓库尚无正式数据集、版本、文件、审批与处理任务领域对象，必须新增这些业务边界；同时需要新增存储抽象 seam 以支持未来对象存储切换。

## 4. 验收项

- [x] **AC-01**：后端提供数据集列表、详情、上传、版本、申请审批与请求列表 API。
- [x] **AC-02**：数据集详情展示数据集级查看权限与版本级下载权限状态。
- [x] **AC-03**：上传结果记录 hash、去重策略、异步预处理任务状态，并能在详情中查看。
- [x] **AC-04**：前端数据资产页面支持搜索/筛选、详情查看、图片样例预览、上传、申请与审批交互。
- [x] **AC-05**：自动化测试覆盖后端主流程与前端关键交互，并使用 `TASK-dataset-asset-mvp` 与 `AC-xx` 追踪。
- [x] **AC-06**：`contract.md`、`test-plan.md`、SQL notes、验证报告齐备，并可通过 feature gate。

### 4.1 Definition of Done

- [x] `contract.md` 标记为 `implemented`
- [x] `test-plan.md` 已创建且引用全部 `AC-xx`
- [x] 自动化测试包含 `TASK-dataset-asset-mvp` 和覆盖到的 `AC-xx`
- [x] 本 feature 所需 SQL 说明已归档到 `docs/features/F004-dataset-asset-mvp/sql/`
- [x] 复用审查已完成，并在 `Reuse Plan` 中记录复用与新增 seam 原因
- [x] 新增功能所需数据权限已复用 `dataset:read` / `dataset:manage`
- [x] 前端变更已补充自动化测试
- [x] Playwright 本轮仍使用 placeholder 命令，限制已在验证报告说明
- [x] 合并前通过 `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F004-dataset-asset-mvp`

## 5. Dependencies

### Blocked By

- F002 身份、组织与权限基线

### Blocks

- F005 训练任务 MVP
- F004 之后的标注、模型、推理相关数据入口能力

## 6. 风险与缓解

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| 异步处理队列范围膨胀 | Medium | Medium | 首版只做状态化任务与占位结果，不引入外部队列基础设施 |
| 数据集级查看 / 版本级下载边界混乱 | Medium | High | 在 contract 与 API 响应里显式返回两层权限状态 |
| 本地文件系统实现未来难以替换 | Medium | Medium | 通过存储接口抽象隔离实现 |

## 7. 进度跟踪

### Phases

| Phase | Status | Owner | Notes |
| --- | --- | --- | --- |
| 需求分析 | completed | codex | 已完成 deep-interview 与 plan 收敛 |
| 契约冻结 | completed | codex | contract 已回填并实现落地 |
| 测试计划 | completed | codex | test-plan 已覆盖全部 AC |
| 后端开发 | completed | codex | 数据集 API 与 MockMvc 测试完成 |
| 前端开发 | completed | codex | 数据资产页交互增强与 Vitest 覆盖完成 |
| 联调检查 | completed | codex | 通过本地 gate 验证 |
| 代码审查 | completed | codex | `reports/code-review-report.md` 已落档，Verdict: PASS |
| QA验收 | completed | codex | lint/test/build/gate 通过 |

### Deliverables

| Deliverable | Status | Location |
| --- | --- | --- |
| 契约文档 | completed | `docs/features/F004-dataset-asset-mvp/contract.md` |
| 测试计划 | completed | `docs/features/F004-dataset-asset-mvp/test-plan.md` |
| SQL脚本 | completed | `docs/features/F004-dataset-asset-mvp/sql/migration-notes.md` |
| 流程报告 | completed | `docs/features/F004-dataset-asset-mvp/reports/` |
| 后端代码 | completed | `backend/src/main/java/com/yfind/aiplatform/dataset/` |
| 前端代码 | completed | `frontend/src/App.tsx` 等 |

## 8. Notes

### Decisions

- 采用内存型 MVP 数据服务，优先验证领域边界与交互闭环。
- 采用存储接口抽象 + 默认本地文件系统策略，避免对象存储环境前置阻塞。
- 图片预览作为首版保证能力，其他类型文件统一退化为元数据展示。

### Questions

- 后续切对象存储时，去重策略是否改为跨桶全局唯一。
- 后续是否需要把异步处理队列切到独立任务基础设施。

## Change Log

| Date | Version | Changes | Author |
| --- | --- | --- | --- |
| 2026-05-04 | v1 | Initial scaffold | codex |
| 2026-05-04 | v2 | Filled scope, AC, reuse plan, and completion notes | codex |
