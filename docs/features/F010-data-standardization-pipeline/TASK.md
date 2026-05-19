---
feature: F010-data-standardization-pipeline
title: 基于数据集的数据标准化与 Pipeline 能力
task_status: implemented
owner: codex
created_at: 2026-05-18
updated_at: 2026-05-18
---

# Task: 基于数据集的数据标准化与 Pipeline 能力

## 需求摘要

作为数据工程师，我需要基于已接入的数据集查看标准画像、字段标准匹配和质量问题，并能运行标准化任务生成预处理数据集，确保不同数据源进入训练/标注前具备统一格式、Schema 和质量要求。

## Source References

- `docs/prototype/SMP工业AI平台-原型v2.html`：`pipeline`、`opmarket`、`dsdetail`
- F009 数据源与数据集管理基础能力

## 复用方案

- 复用 F009 后端数据集 seam：`DataManagementService`、`DataManagementController`、`DataDtos`，以及 `dataset`、`dataset_version`、`dataset_file`、`data_lineage`、`data_source`、`platform_file_object` 表。
- 复用 F006 权限、BU 隔离和审计 seam：`PlatformIdentityService`、`platform_permission`、`platform_role_permission`、`audit_event`；本功能只新增 `data:standard:read/write/run`、`menu:pipeline`、`menu:opmarket`。
- 复用 F007 文件对象元数据：`platform_file_object` 和数据集文件绑定，不新增平行文件存储模型。
- 复用前端 `frontend/src/features/platform/platformApi.ts`、`frontend/src/features/data/DataPages.tsx`、`frontend/src/components/AppNavigation.tsx`、TanStack Query、Ant Design、`frontend/e2e/helpers.ts`。
- 复用审查已完成：禁止复制原型 JSX；新增 `data_standard_task` 是必要新 seam，用于保存标准化任务状态、质量分、规则和输出数据集。

## Acceptance Criteria

- [x] AC-01：展示所有可见数据集标准画像、字段映射、质量分和问题数。
- [x] AC-02：画像基于数据集 `dataType` 与来源 `sourceType`，覆盖关系库、对象、文件、API、流、时序、工业协议。
- [x] AC-03：支持创建标准化任务。
- [x] AC-04：运行任务后生成 `PREPROCESSED` 数据集、发布版本、标准化文件和 `STANDARDIZATION` 血缘。
- [x] AC-05：前端 `/pipeline` 提供数据校验、清洗、归一化、格式转换等原型语义入口。
