---
feature: F010-data-standardization-pipeline
title: 基于数据集的数据标准化与 Pipeline 能力
plan_status: approved
approved_at: 2026-05-18
owner: codex
created_at: 2026-05-18
updated_at: 2026-05-18
---

# Plan: 基于数据集的数据标准化与 Pipeline 能力

## 背景与目标

根据 `docs/prototype/SMP工业AI平台-原型v2.html`，原型没有独立“数据标准中心”，而是在数据管理的信息架构中通过 `Pipeline编辑器`、`算子广场`、数据集详情的质量/血缘/文件元数据表达数据清洗、Schema 校验、格式转换、归一化与标准化。F009 已完成数据源、数据集、版本、文件、血缘和多源测试数据，本功能在 F009 上扩展“基于数据集”的数据标准能力。

目标是：用户选择任一数据集，平台根据数据集类型、来源数据源类型、文件元数据和血缘自动生成数据画像与标准化建议，创建并运行标准化任务，输出 `PREPROCESSED` 标准化数据集，并保留血缘。

规划证据：

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`

## 范围

### In Scope

- 数据标准概览：统计已画像数据集、合规数据集、问题数、标准化任务数。
- 数据集标准画像：字段映射、标准字段、类型、单位、必填、规则、质量分。
- 覆盖多源数据集：`RELATIONAL_DB`、`OBJECT_STORAGE`、`FILE`、`API`、`STREAM`、`TIME_SERIES`、`INDUSTRIAL_PROTOCOL`。
- 标准化任务：创建、运行、状态、质量分 before/after。
- 输出标准化数据集：生成 `PREPROCESSED` 数据集、版本、标准化文件和 `STANDARDIZATION` 血缘。
- 前端入口保持原型信息架构：在 `Pipeline 设计器` 页面落地数据标准化能力，保留算子语义：数据校验、空值填充、去重、异常过滤、归一化、格式转换。

### Out of Scope

- 不做独立“数据标准中心”主菜单。
- 不实现真实大规模 Spark/Flink/Airflow 调度。
- 不实现真实文件内容解析和外部数据治理系统同步。
- 不覆盖标注任务工作台；标注另开功能。

## 技术方案

- 后端复用 F009 `dataset`、`dataset_version`、`dataset_file`、`data_lineage` 和 `platform_file_object`。
- 新增 `data_standard_task` 表保存标准化任务和质量分。
- 新增 API：
  - `GET /api/v1/data-standards/overview`
  - `GET /api/v1/datasets/{id}/standard-profile`
  - `GET /api/v1/data-standard-tasks`
  - `POST /api/v1/data-standard-tasks`
  - `POST /api/v1/data-standard-tasks/{id}/run`
- 前端复用 `DataPages.tsx` 与 `platformApi.ts`，将 `/pipeline` 从占位原型页替换成真实数据标准化页面。
- 权限新增 `data:standard:*` 和菜单 `menu:pipeline`、`menu:opmarket`。

## 复用策略

- **优先复用** F009 后端数据底座：`backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java`、`DataManagementController.java`、`DataDtos.java`，以及 SQL 表 `dataset`、`dataset_version`、`dataset_file`、`data_lineage`、`data_source`、`platform_file_object`。
- **优先复用** F006 身份、权限、BU 隔离和审计 seam：`PlatformIdentityService`、`platform_permission`、`platform_role_permission`、`audit_event`，新增权限只扩展 `data:standard:*` 与 `menu:pipeline`。
- **优先复用** F007 文件对象元数据和下载 seam：`platform_file_object`、数据集文件绑定、对象存储 bucket 配置，不新增平行文件存储模型。
- **优先复用** 前端既有框架：`frontend/src/features/platform/platformApi.ts`、`frontend/src/features/data/DataPages.tsx`、`frontend/src/components/AppNavigation.tsx`、TanStack Query、Ant Design 与现有 `frontend/e2e/helpers.ts` mock 基座。
- **禁止复制 / 平行实现**：不复制 `docs/prototype/SMP工业AI平台-原型v2.html` JSX，不新建独立“数据标准中心”，不新增与 `/api/v1/datasets/*` 平行的数据集模型；按原型 `pipeline`/`opmarket`/`dsdetail` 信息架构扩展 `/api/v1/data-standards/*` 与 `/api/v1/data-standard-tasks/*`。
- **Approved New Seams**：仅新增 `data_standard_task` 表与标准化任务 API，因为现有 F009 只有数据源同步/数据集导入，没有保存标准化任务状态、质量分和输出数据集血缘的任务表。

## 风险与处理

- 字段语义自动推断可能误判：本期以可解释映射建议呈现，运行任务仍生成规则和质量报告。
- 多源数据实际内容差异大：本期按数据集 `dataType` 与来源 `sourceType` 生成可测标准画像，后续再接真实 profiler。
- 与 Pipeline 完整调度边界：本期只实现数据标准化任务闭环，不做复杂 DAG 调度。

## 验收草案

- AC-01：能查看所有可见数据集的数据标准画像，展示字段映射、质量分和问题数。
- AC-02：画像逻辑考虑数据集来源数据源类型和数据类型。
- AC-03：能为任一可见数据集创建标准化任务。
- AC-04：运行标准化任务后生成 `PREPROCESSED` 数据集、版本、文件和血缘。
- AC-05：前端 `/pipeline` 按原型展示数据校验、清洗、归一化、格式转换等标准化能力。
