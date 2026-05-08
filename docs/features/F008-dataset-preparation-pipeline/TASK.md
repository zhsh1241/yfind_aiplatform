# Task: 数据准备流水线

## Metadata
- Feature: F008-dataset-preparation-pipeline
- ID: TASK-dataset-preparation-pipeline
- Status: in_progress
- Prerequisite: `plan.md` is approved (`plan_status: approved`)
- Owner: codex
- Created: 2026-05-08
- Updated: 2026-05-08

## 1. Requirement Summary

### User Story
作为算法工程师 / 数据治理人员，我想要在平台内完成训练前数据准备流水线配置、执行、质量门禁与失败重跑，以便把多来源原始数据沉淀为可直接用于训练的标准训练数据集。

### Business Value
- 将训练前数据收集、清洗、标注、划分、预处理、增强、格式转换与加载统一纳入平台内置流程，减少分散脚本和人工交接。
- 为训练任务提供可追溯、可审计、可重跑的数据集版本和质量报告。
- 复用现有数据资产、权限、审计和训练边界，避免形成第二套数据域。

## 2. Scope

### In Scope
- [ ] 数据准备任务列表、详情、阶段状态机与阶段质量门禁。
- [ ] 7 个正式阶段：数据收集、清洗、标注、划分、预处理、增强、格式转换与加载。
- [ ] 多来源登记与规则快照：公开数据集、企业内部系统占位、受控网络采集来源登记。
- [ ] 失败即阻断、人工修正、重跑记录与阻断原因展示。
- [ ] 训练数据集快照、加载配置 / DataLoader 元数据、权限校验和审计事件。
- [ ] 前端任务列表、阶段详情、质量结果、阻断提示、重跑入口与 Playwright 覆盖。

### Out of Scope
- 真实企业内部系统凭据、生产连接器和开放通用爬取。
- 训练任务提交、资源调度、训练日志监控。
- 模型注册、审批、发布、治理和推理服务。
- 针对所有模态实现完整算法级处理；首期以统一流程、规则快照和可验证元数据为主。

## 3. Technical Analysis

### Backend
- Entity / records: 在 `dataset` domain 内新增数据准备任务、阶段、质量门禁、规则快照、输出快照、审计/重跑摘要 DTO，不新建平行 domain。
- Service: 扩展 `DatasetService` 或新增同包内协作服务，保留现有 `DatasetEventStore` 事件风格。
- API: 在 `/api/datasets/preparation-jobs` 下提供列表、详情、创建、执行下一阶段、人工修正重跑等接口。

### Frontend
- Pages: 复用并扩展 `frontend/src/pages/DatasetPage.tsx`，在数据资产页面加入数据准备流水线视图。
- Components: 优先使用现有 Ant Design `Card`、`Table`、`Descriptions`、`Progress`、`Tag`、`Button` 组合，不引入新依赖。
- Stores/API: 扩展 `frontend/src/api/datasetApi.ts`，保留 fallback 体验。

### Database
- Tables: 当前 MVP 延续内存事件存储 / 本地模拟数据；若后续持久化再归档 SQL。
- Migrations: 本阶段无数据库迁移。
- Feature SQL: `docs/features/F008-dataset-preparation-pipeline/sql/` 暂不需要；若 gate 要求则提供 migration-notes。

### Reuse Plan
- Existing backend seams to reuse:
  - `backend/src/main/java/com/yfind/aiplatform/dataset/*`：复用 `DatasetController`、`DatasetService`、数据集详情、版本、处理任务、事件存储模式。
  - `backend/src/main/java/com/yfind/aiplatform/identity/PlatformAuthorizationService.java`：复用 `dataset:read` / `dataset:manage` 权限校验。
  - `backend/src/main/java/com/yfind/aiplatform/training/*`：仅作为训练数据集输出边界参考，不复刻训练逻辑。
- Existing frontend seams to reuse:
  - `frontend/src/pages/DatasetPage.tsx`：作为数据资产入口承载流水线摘要与详情。
  - `frontend/src/api/datasetApi.ts`：扩展数据准备 API 和 fallback 映射。
  - `frontend/src/prototype-data.ts` / `simulationStore.ts`：必要时复用本地演示数据策略。
- Existing SQL / permissions / test fixtures to reuse:
  - 复用 backend controller/service 测试基座、Spring MVC 测试配置和现有授权头约定。
  - 复用 frontend Vitest + Testing Library、Playwright `dataset-asset.spec.ts`。
  - 权限继续使用 `dataset:read` 与 `dataset:manage`，新增动作默认 admin 可访问。
- New seams allowed only if existing seams cannot be reused, because:
  - 允许新增数据准备相关 DTO / record / API 方法，因为现有 F004 数据资产只覆盖上传、版本、访问申请和处理任务，不覆盖 7 阶段流水线与门禁重跑。
  - 不允许新增第二套 dataset domain、第二套权限或第二套审计实现。

## 4. Acceptance Criteria

- [ ] **AC-01**: `TASK.md`、`contract.md`、`test-plan.md` 与规划证据齐备，`plan.md` 状态为 approved。
- [ ] **AC-02**: 后端 API 返回数据准备任务列表与详情，并明确覆盖收集、清洗、标注、划分、预处理、增强、格式转换与加载 7 个阶段。
- [ ] **AC-03**: 后端支持创建数据准备任务，保存来源配置、规则快照、质量门禁阈值和训练数据集输出目标。
- [ ] **AC-04**: 任一阶段质量门禁失败时，后端状态机阻断后续阶段，返回失败原因、人工修正要求和重跑入口。
- [ ] **AC-05**: 后端支持人工修正后重跑失败阶段，并记录重跑次数、操作者、原因和审计摘要。
- [ ] **AC-06**: 前端在数据资产页展示数据准备流水线任务、7 阶段进度、质量结果、阻断提示和重跑操作。
- [ ] **AC-07**: F008 产物边界止于可训练数据集快照 / 加载配置，不提交训练任务、不实现模型治理或推理部署。
- [ ] **AC-08**: 所有新增接口复用 `dataset:read` / `dataset:manage` 权限，自动化测试包含 `TASK-dataset-preparation-pipeline` 与对应 `AC-xx` 标签。

### 4.1 Definition of Done

- [ ] `contract.md` 已冻结或标记为 `implemented`
- [ ] `test-plan.md` 已创建，且引用全部 `AC-xx`
- [ ] 自动化测试包含 `TASK-dataset-preparation-pipeline` 和覆盖到的 `AC-xx`
- [ ] 本 feature 不需要 SQL 迁移；如有说明则归档到 `docs/features/F008-dataset-preparation-pipeline/sql/`
- [ ] 复用审查已完成：优先复用现有服务 / 组件 / DTO / SQL / 权限 / 测试基座；若未复用，原因已在 `Reuse Plan` 中记录
- [ ] 新增接口权限已通过 `dataset:read` / `dataset:manage` 覆盖，并对 admin 可用
- [ ] 若本次修改涉及 `frontend/`，已补充或更新 Playwright 用例
- [ ] 合并前通过 `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F008-dataset-preparation-pipeline`
- [ ] 未使用 `git commit --no-verify` / `git push --no-verify`

## 5. Dependencies

### Blocked By
- 无；F008 plan 已由用户在 2026-05-08 批准。

### Blocks
- 后续训练任务使用标准训练数据集快照与 DataLoader 元数据。

## 6. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 7 阶段首期范围过大 | Medium | High | 首期冻结统一状态机、规则快照和门禁语义，算法级深度以可配置元数据表示。 |
| 企业内部系统和网络采集外部事实未确认 | High | Medium | 首期仅做来源登记、白名单/占位配置和审计字段，不写死真实凭据。 |
| 与 F004 数据资产边界重复 | Medium | High | 所有新增能力保留在 dataset domain，复用数据集 key、版本和处理任务概念。 |
| 本地 E2E 环境不稳定 | Medium | Medium | 保留 Playwright 用例和报告，必要时记录本地失败环境原因，合并前以 CI E2E 为准。 |

## 7. Progress Tracking

### Phases
| Phase | Status | Owner | Notes |
|-------|--------|-------|-------|
| 需求分析 | completed | codex | TASK.md 已创建，复用方案已冻结 |
| 契约冻结 | pending | contract-architect | - |
| 测试计划 | pending | test-designer | - |
| 后端开发 | pending | backend-tdd-engineer | - |
| 前端开发 | pending | frontend-engineer | - |
| 联调检查 | pending | integration-checker | - |
| 代码审查 | pending | code-reviewer | - |
| QA验收 | pending | qa-tester | - |

### Deliverables
| Deliverable | Status | Location |
|-------------|--------|----------|
| 契约文档 | pending | `docs/features/F008-dataset-preparation-pipeline/contract.md` |
| 测试计划 | pending | `docs/features/F008-dataset-preparation-pipeline/test-plan.md` |
| SQL脚本 | not_required | `docs/features/F008-dataset-preparation-pipeline/sql/` |
| 流程报告 | pending | `docs/features/F008-dataset-preparation-pipeline/reports/` |
| 后端代码 | pending | backend/... |
| 前端代码 | pending | frontend/... |

## 8. Notes

### Decisions
- 首期在 `dataset` domain 内扩展：避免重复数据域，保持数据资产与训练前准备可追溯。
- 首期企业内部系统和网络采集仅做受控来源登记：真实外部连接器与凭据未确认，不得猜测。
- 首期不提交训练任务：F008 输出标准训练数据集快照和加载配置，交给训练域消费。

### Questions
- 后续生产版本需确认真实企业系统清单、网络采集合规白名单和训练格式优先级。

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-05-08 | v1 | Initial TASK for approved F008 build | codex |
