---
feature: F003-interactive-prototype
title: 可点击平台原型
plan_status: approved
approved_at: "2026-04-30"
owner: codex
created_at: 2026-04-30
updated_at: 2026-04-30
---

# 计划：可点击平台原型

## 背景与目标

在正式实现各业务模块前，先提供一个可运行、可点击、中文化的平台原型，用于演示工业 AI 小模型平台从组织登录、数据集、标注、训练、模型、推理、边缘下发到监控审计的 MVP 闭环。

## 范围

### 范围内

- 前端 `frontend/` 单页原型。
- 左侧模块导航、顶部操作区、概览卡片、业务流程节点。
- 关键动作的点击反馈：弹窗、抽屉、步骤流、确认框、消息提示、状态变化。
- 前端测试覆盖关键点击路径。

### 范围外

- 真实后端 API、真实登录、真实文件上传、真实模型训练/部署。
- 后端、AI Adapter、数据库或 Helm 行为变更。
- 高保真视觉品牌规范。

## 复用策略

- 复用现有 `frontend/` React + TypeScript + Ant Design Pro 基线。
- 复用现有测试基座 `vitest`、Testing Library 和 `src/test/setup.ts`。
- 不新增依赖，不复制第二套前端工程。

## 验收标准

- AC-01：模块导航点击后内容切换。
- AC-02：概览卡片和流程节点点击后显示详情抽屉。
- AC-03：上传数据集、启动训练、部署模型等按钮有可见交互反馈。
- AC-04：监控审计/告警操作有抽屉或消息反馈。
- AC-05：`npm run lint`、`npm run test:ci`、`npm run build` 通过。

## 规划证据

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`
