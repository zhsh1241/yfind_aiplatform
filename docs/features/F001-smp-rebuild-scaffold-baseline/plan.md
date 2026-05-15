---
feature: F001-smp-rebuild-scaffold-baseline
title: SMP 重建脚手架基线
plan_status: approved
approved_at: 2026-05-15
owner: codex
created_at: 2026-05-15
updated_at: 2026-05-15
---

# Plan: SMP 重建脚手架基线

## 1. 背景与目标

旧版业务实现已被清空，仓库当前事实来源转为：

- 业务规格：`docs/business/`
- 交互原型：`docs/prototype/`
- AI 脚手架：`tools/ai-scaffold/`、`.agents/`、`.codex/`
- 仍可验证服务：`ai-adapter/`

本计划目标是让项目说明、AGENTS 指令、AI 脚手架配置和质量门禁准确反映当前重建基线，避免后续 agent 误用已删除的旧 backend/frontend/deploy 实现。

## 2. 范围

### In Scope

- 更新 `README.md`、`project.md`、`AGENTS.md`，说明 SMP 项目定位、业务域、原型范围和当前清空状态。
- 新增 `docs/architecture/00-project-understanding.md`，沉淀对 `docs/business/` 与 `docs/prototype/` 的整体理解。
- 重建 `docs/features/`、`docs/bugfix/`、`docs/architecture/` 的最小正式交付面和模板。
- 调整 `ai-scaffold.config.json`，将 `docs/business/` 与 `docs/prototype/` 标记为 reference roots，禁用已清空的 backend/frontend，保留 `ai-adapter/` gate。
- 改造 `tools/ai-scaffold`：支持 enabled 开关、referenceRoots、当前基线状态查看命令，并使 gate/doctor/hook/work-item 检查适配清空后的仓库。
- 更新 `ai-adapter/` README 和旧 trace，避免继续引用旧 F005 语义。

### Out of Scope

- 不重建 Spring Boot backend、React frontend 或 deploy manifests。
- 不新增真实业务 API、数据库表或外部 MLOps 集成。
- 不替换任何 `TODO_CONFIRM_*` 外部环境占位。

## Reuse Strategy

### Must Reuse

- 业务资料：`docs/business/`，尤其是 `bizdocs/`、`domain/`、`rules/`、`api/`、`arch/`、`open-questions.md`。
- 原型资料：`docs/prototype/SMP工业AI平台-原型v2.html`、`SMP工业AI平台-原型v2-compiled.html` 和截图。
- AI 适配器/脚手架：`ai-adapter/`, `tools/ai-scaffold/`, `.agents/`, `.codex/`。
- 现有脚手架测试：`tools/ai-scaffold/test/scaffold.test.mjs`。

### Duplication Rejected

- 不恢复或复制已删除旧 backend/frontend/deploy 实现。
- 不把 `docs/business/`、`docs/prototype/` 视为代码实现目录强制绑定每次 feature。
- 不新增与 `tools/ai-scaffold` 现有 CLI 模式平行的脚本入口。

### Approved New Seams

- 新增 `referenceRoots` 配置，用于区分业务/原型参考资料和代码变更。
- 新增 `enabled` 开关，用于在清空重建期间显式跳过不存在或禁用的 backend/frontend gate。
- 新增 `scaffold-status` 命令，汇总 delivery/runtime/reference/scaffold roots 状态。

## 4. 交付方案

1. 先读取 `docs/business/` 与 `docs/prototype/`，形成项目理解。
2. 更新根说明和 agent 指南，声明当前事实来源和禁用状态。
3. 调整 AI scaffold 配置与 TypeScript 实现。
4. 重建正式 feature/bugfix/architecture 文档面。
5. 运行 AI scaffold、ai-adapter 与 gate 验证。

## 5. 数据、权限与审计

本功能不引入业务数据表、权限或审计事件；但文档要求后续正式功能必须把 `docs/business/rules/` 的 MUST 规则纳入契约和测试。

## 6. 风险与未决问题

- backend/frontend 当前被禁用，后续重建到可运行状态后必须重新启用 gate。
- `.github/workflows/ci.yml` 仍不存在，CI 策略待确认。
- `docs/business/open-questions.md` 中的容量、合规、维护窗口、国际化等问题仍待业务/架构确认。

## 7. 审批记录

- Reviewer: codex 自主基线整理
- Decision: approved，用于记录本次脚手架改造与工作项关联。
