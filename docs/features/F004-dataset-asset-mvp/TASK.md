# Task Template

> 新功能目录使用 `docs/features/F004-dataset-asset-mvp/`。同目录内统一维护 `plan.md`、`TASK.md`、`contract.md`、`test-plan.md`、`sql/` 和 `reports/`。

---

# Task: 数据资产 MVP

## Metadata
- Feature: F004-dataset-asset-mvp
- ID: TASK-dataset-asset-mvp
- Status: draft / in_progress / completed / blocked
- Prerequisite: `plan.md` is approved (`plan_status: approved`)
- Owner: codex
- Created: 2026-05-04
- Updated: 2026-05-04

## 1. Requirement Summary

### User Story
作为 {角色}，我想要 {功能}，以便 {价值}。

### Business Value
- {业务价值1}
- {业务价值2}

## 2. Scope

### In Scope
- [ ] {功能点1}
- [ ] {功能点2}
- [ ] {功能点3}

### Out of Scope
- {排除项1}
- {排除项2}

## 3. Technical Analysis

### Backend
- Entity:
- Service:
- API:

### Frontend
- Pages:
- Components:
- Stores:

### Database
- Tables:
- Migrations:
- Feature SQL: `docs/features/F004-dataset-asset-mvp/sql/`

### Reuse Plan
- Existing backend seams to reuse:
- Existing frontend seams to reuse:
- Existing SQL / permissions / test fixtures to reuse:
- New seams allowed only if existing seams cannot be reused, because:

## 4. Acceptance Criteria

> 每条验收项使用稳定 ID（`AC-01`、`AC-02`...）。
> `TASK.md`、`test-plan.md` 与自动化测试必须保持同一组 AC 标识。
> 自动化测试文件必须包含特性追踪标签 `TASK-dataset-asset-mvp`，并写明覆盖到的 `AC-xx`。

- [ ] **AC-01**: {验收标准1}
- [ ] **AC-02**: {验收标准2}
- [ ] **AC-03**: {验收标准3}

### 4.1 Definition of Done

- [ ] `contract.md` 已冻结或标记为 `implemented`
- [ ] `test-plan.md` 已创建，且引用全部 `AC-xx`
- [ ] 自动化测试包含 `TASK-dataset-asset-mvp` 和覆盖到的 `AC-xx`
- [ ] 本 feature 需要执行的 SQL 与测试数据 SQL 已归档到 `docs/features/F004-dataset-asset-mvp/sql/`
- [ ] 复用审查已完成：优先复用现有服务 / 组件 / DTO / SQL / 权限 / 测试基座；若未复用，原因已在 `Reuse Plan` 中记录
- [ ] 新增功能所需菜单、接口、动作或页面权限已先授予 `admin`
- [ ] 若本次修改涉及 `frontend/`，已补充或更新 Playwright 用例
- [ ] 若涉及 `frontend/`，Playwright E2E 已使用 `admin` 账号执行
- [ ] 若涉及 `frontend/`，Playwright 报告已归档到 `docs/features/F004-dataset-asset-mvp/reports/`
- [ ] 合并前通过 `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F004-dataset-asset-mvp`
- [ ] 未使用 `git commit --no-verify` / `git push --no-verify`
- [ ] 若同类门禁失败已连续三轮仍未解决，已记录并触发 Human-in-the-loop

## 5. Dependencies

### Blocked By
- {阻塞项1}
- {阻塞项2}

### Blocks
- {被阻塞项1}

## 6. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| {风险1} | High/Medium/Low | High/Medium/Low | {缓解措施} |

## 7. Progress Tracking

### Phases
| Phase | Status | Owner | Notes |
|-------|--------|-------|-------|
| 需求分析 | pending | - | - |
| 契约冻结 | pending | - | - |
| 测试计划 | pending | - | - |
| 后端开发 | pending | - | - |
| 前端开发 | pending | - | - |
| 联调检查 | pending | - | - |
| 代码审查 | pending | - | - |
| QA验收 | pending | - | - |

### Deliverables
| Deliverable | Status | Location |
|-------------|--------|----------|
| 契约文档 | pending | `docs/features/F004-dataset-asset-mvp/contract.md` |
| 测试计划 | pending | `docs/features/F004-dataset-asset-mvp/test-plan.md` |
| SQL脚本 | pending | `docs/features/F004-dataset-asset-mvp/sql/` |
| 流程报告 | pending | `docs/features/F004-dataset-asset-mvp/reports/` |
| 后端代码 | pending | backend/... |
| 前端代码 | pending | frontend/... |

## 8. Notes

### Decisions
- {决策1}: {原因}
- {决策2}: {原因}

### Questions
- {问题1}
- {问题2}

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-05-04 | v1 | Initial | codex |
