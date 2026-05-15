---
feature: F002-technology-stack-baseline
title: 技术栈基线确认
plan_status: approved
approved_at: 2026-05-15
owner: codex
created_at: 2026-05-15
updated_at: 2026-05-15
---

# Plan: 技术栈基线确认

## 1. 背景与目标

用户要求“把所有的技术栈都确定下来”。当前仓库处于 SMP 重建基线：旧 backend/frontend/deploy 已清空，后续实现必须以 `docs/business/` 和 `docs/prototype/` 为事实来源。此前 `project.md` 中仍存在“推荐技术路线（待重建）”与多个“待确认技术选型”，不利于后续 feature 统一落地。

本计划目标：将后端、前端、AI 适配器、数据中间件、MLOps、部署运维、测试与质量门禁的技术栈确定为正式基线，并同步到架构文档、根说明、agent brief 与 AI scaffold 配置。

## 2. 范围

### In Scope

- 新增 `docs/architecture/01-technology-stack-baseline.md`，作为完整技术栈基线。
- 更新 `README.md`、`project.md`、`AGENTS.md`，让人审入口和 agent 指令引用同一技术栈。
- 更新 `ai-scaffold.config.json` 与 `tools/ai-scaffold`，暴露 `technologyStack` 摘要。
- 更新 `.agents/agents/*` 与 `.codex/agents/*` 中过时的 Spring Boot 3.1/Java 17、React 18、Ant Design 5、MyBatis Plus/Tailwind 默认口径。
- 为本次技术栈决策建立 feature 工作项、契约、测试计划、评审报告和验证证据。

### Out of Scope

- 不重建 `backend/`、`frontend/`、`deploy/` 产品代码。
- 不创建真实数据库 schema、Kubernetes manifests 或 CI workflow。
- 不确认外部系统地址、账号、密钥、容量、维护窗口、合规等级等环境参数；这些继续保留 `TODO_CONFIRM_*` 或 open question。

## Reuse Strategy

### Must Reuse

- 业务资料：`docs/business/`，特别是 `api/01-API接口规范.md`、`arch/01-部署架构.md`、`bizdocs/06-非功能性需求.md`、`open-questions.md`。
- 原型资料：`docs/prototype/SMP工业AI平台-原型v2.html`、编译版与截图资产。
- 现有脚手架：`ai-scaffold.config.json`、`tools/ai-scaffold/`、`.agents/agents/`、`.codex/agents/`。
- 当前 AI 适配器：`ai-adapter/pyproject.toml` 的 Python 3.12 + FastAPI 基线。

### Duplication Rejected

- 不把已删除旧 backend/frontend 的技术栈当作事实来源。
- 不保留互相冲突的默认技术栈，例如 Spring Boot 3.1/Java 17、React 18/Ant Design 5、MyBatis Plus 默认持久化、Tailwind 默认样式。
- 不新增平行脚本替代 `tools/ai-scaffold`。

### Approved New Seams

- 新增 `docs/architecture/01-technology-stack-baseline.md` 作为人审技术基线。
- 新增 `ai-scaffold.config.json` 的 `technologyStack` 摘要字段，并在 `scaffold-status`/`doctor` 中展示。

## 4. 交付方案

1. 读取业务架构、API、NFR、open questions 与原型线索。
2. 核对关键版本线：Spring Boot/Java、Node/React/Vite/TypeScript、Python/FastAPI、PostgreSQL/Kubernetes/MLOps 等。
3. 写入完整技术栈基线文档，并更新根文档与 agent brief。
4. 扩展 AI scaffold 配置与状态命令。
5. 运行 TypeScript build/test、scaffold status/doctor/gate、ai-adapter compile/unittest、work-item link 检查。

## 5. 数据、权限与审计

- 本功能不新增业务数据表。
- 技术栈基线确定：PostgreSQL 18 为元数据库，Valkey/Kafka/MinIO/OpenSearch 为默认中间件。
- 身份安全基线确定：YF LDAP + Spring Security；权限采用 RBAC + 必要 ABAC。
- 审计基线确定：PostgreSQL 事实表 + Kafka/OpenSearch 异步检索，遵守业务规则中“审计日志不可修改删除且至少保留 3 年”。

## 6. 风险与未决问题

- Spring Boot 4.0.x 已作为当前主后端默认；Python 3.13/3.14、Kubernetes 1.36 等更新线已存在，但当前基线优先企业稳定性；后续升级需 ADR/feature plan。
- 外部系统地址、账号、容量、集群版本和合规参数仍未确认。
- backend/frontend 仍禁用，技术栈确定不等于产品代码已恢复。

## 7. 审批记录

- Reviewer: codex 自主基线整理
- Decision: approved，用于本次技术栈基线落盘与脚手架改造追溯。
