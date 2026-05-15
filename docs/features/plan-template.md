---
feature: F{nnn}-{feature-slug}
title: {feature-title}
plan_status: draft
approved_at:
owner: {agent-name}
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
---

# Plan: {feature-title}

## 1. 背景与目标
- 业务来源：引用 `docs/business/...`
- 原型来源：引用 `docs/prototype/...` 页面 key / 截图
- 目标结果：

## 2. 范围
### In Scope
-

### Out of Scope
-

## Reuse Strategy
### Must Reuse
- 业务资料：`docs/business/`
- 原型资料：`docs/prototype/`
- AI 适配器/脚手架：`ai-adapter/`, `tools/ai-scaffold/`

### Duplication Rejected
- 不复制旧已删除 backend/frontend 实现作为事实来源。
- 不新增与 `docs/business/domain/` 领域对象冲突的平行模型。

### Approved New Seams
- 仅当业务资料或原型没有现成结构时，允许新增清晰命名的模块/接口，并在 contract.md 记录原因。

## 4. 交付方案
1. 契约设计
2. 测试设计
3. 实现
4. 联调与 QA
5. 质量门禁

## 5. 数据、权限与审计
- 领域对象：
- MUST 规则：
- 权限：
- 审计事件：

## 6. 风险与未决问题
-

## 7. 审批记录
- Reviewer:
- Decision:
