> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-data-source-dataset-management.md`

﻿# Test Spec: F009-data-source-dataset-management

## Metadata

- Feature: F009-data-source-dataset-management
- Created: 2026-05-18
- Source PRD: .omx/plans/prd-data-source-dataset-management.md
- Source Spec: .omx/specs/deep-interview-data-source-dataset-management.md

## Acceptance Coverage

| AC | Requirement | Priority | Verification |
|---|---|---|---|
| AC-01 | datasrc 页面和数据源 API 支持列表、新建、测试、激活/禁用、详情/编辑，连接测试未通过不可激活 | P0 | Backend + frontend + E2E |
| AC-02 | 数据源敏感字段不回显；未配置 connector 返回 UNCONFIGURED / TODO_CONFIRM_* | P0 | Backend + security review |
| AC-03 | ds 页面真实 API 支持统计、分类 Tab、搜索/筛选、分页、权限/状态 badge、版本抽屉 | P0 | Frontend + E2E |
| AC-04 | up 上传向导复用 F007 文件元数据 seam，支持文件初始化/完成登记、hash/size 校验、版本草稿生成 | P0 | Backend + frontend |
| AC-05 | 数据集版本状态机生效，已发布版本不可修改/删除，变更须新建版本 | P0 | Backend |
| AC-06 | dsdetail 展示概览、版本、文件、权限、血缘摘要和样例预览；不可预览文件显示退化状态 | P1 | Frontend + E2E |
| AC-07 | 受限数据集访问申请与有效期授权 seam 生效；无授权下载被阻断 | P0 | Backend + frontend |
| AC-08 | 数据集查询/详情/下载遵循 BU 隔离；跨 BU 无授权不暴露资源存在性 | P0 | Backend/security |
| AC-09 | 数据源、数据集、版本、文件、授权、删除、跨 BU 拒绝均写审计 | P0 | Backend |
| AC-10 | F009 不实现完整 Pipeline/标注/增强/生产 connector，只提供后续引用 seam | P1 | Docs + contract review |

## P0 Test Scenarios

| ID | AC | Scenario | Expected |
|---|---|---|---|
| T-P0-01 | AC-01 | 创建数据源后未测试即激活 | 返回 DATA_SOURCE_TEST_FAILED 或状态冲突，数据源保持未激活，写审计 |
| T-P0-02 | AC-01 | 连接测试 seam 返回成功后激活 | 状态变为 ACTIVE，记录 lastTestAt/latency/diagnostic，写审计 |
| T-P0-03 | AC-02 | 查询数据源详情 | 响应不含 password/secret 明文，仅显示 masked/secretRef |
| T-P0-04 | AC-02 | connector 未配置时测试连接 | 返回 UNCONFIGURED / TODO_CONFIRM_*，前端显示未配置引导 |
| T-P0-05 | AC-03 | 查询数据集列表并按类型/状态/标签筛选 | 返回分页结果，BU 内数据可见，状态/权限 badge 正确 |
| T-P0-06 | AC-04 | 上传文件完成登记 hash 不匹配 | F007 文件对象标记 FAILED，F009 不允许绑定到可发布版本 |
| T-P0-07 | AC-04 | 创建数据集并绑定已完成文件 | 生成 DRAFT 版本和 dataset_file 绑定，列表/详情可见 |
| T-P0-08 | AC-05 | 修改已发布版本文件绑定 | 返回 DATASET_VERSION_IMMUTABLE，写 WARNING/CRITICAL 审计 |
| T-P0-09 | AC-07 | 无授权用户下载 RESTRICTED 数据集版本 | 返回 DATASET_ACCESS_REQUIRED 或 403，前端引导申请 |
| T-P0-10 | AC-07 | 审批受限数据集申请 | 生成 grant，expiresAt 生效，下载/引用允许 |
| T-P0-11 | AC-08 | BU_ADMIN 查询其他 BU 私有数据集详情 | 返回 404，不暴露存在性，写跨 BU 审计 |
| T-P0-12 | AC-09 | 删除存在引用的 ACTIVE 数据集 | 返回 DATASET_REFERENCED，展示引用摘要，写审计 |

## P1 Test Scenarios

| ID | AC | Scenario | Expected |
|---|---|---|---|
| T-P1-01 | AC-06 | dsdetail 打开图片样例 | 显示样例/缩略图 URL 或可预览状态 |
| T-P1-02 | AC-06 | dsdetail 打开非图片样例 | 显示“不支持预览/仅元数据”状态，不报错 |
| T-P1-03 | AC-06 | 查看血缘摘要 | 显示数据源 → 数据集 → 版本链路，后续节点为空态合理 |
| T-P1-04 | AC-03 | 批量选择数据集并尝试删除 | 服务端逐项校验引用/权限，前端展示阻断结果 |
| T-P1-05 | AC-10 | 同步任务手动触发但 connector 未配置 | 显示 UNCONFIGURED，不产生假成功运行记录 |

## Backend Verification Plan

- DataSourceControllerTest
  - AC-01/02/09：连接测试、激活门禁、脱敏、审计。
- DatasetControllerTest
  - AC-03/04/05/07/08/09：CRUD、版本、文件绑定、发布、不可变、权限隔离、访问申请。
- DatasetReferenceServiceTest
  - AC-07/08/10：后续引用 seam 只返回有效授权 ACTIVE/PUBLISHED 版本。
- Flyway migration smoke：V5 表结构、权限 seed、审计事件不破坏 V1~V4。

## Frontend Verification Plan

- Vitest:
  - DataSourceManagementPage.test.tsx 覆盖列表、测试连接、未配置状态、敏感字段不可见。
  - DatasetManagementPage.test.tsx 覆盖统计、筛选、版本抽屉、权限/状态 badge。
  - DatasetUploadPage.test.tsx 覆盖三步向导、文件登记结果、hash 失败提示。
  - DatasetDetailPage.test.tsx 覆盖概览、版本、权限、血缘、预览退化。
- Playwright:
  - 登录 → 数据源管理 → 测试连接 → 激活。
  - 登录 → 新建数据集 → 上传/登记 → 发布版本 → 列表/详情查看。
  - 受限数据集无授权 → 申请 → 审批 seam → 下载/引用状态变化。

## Cross-cutting Verification

- Permission:
  - SUPER_ADMIN 全局读写；BU_ADMIN 本 BU 写；普通用户按 grant/read/download 控制。
- Audit:
  - 所有 P0 写操作和拒绝分支可从 platform_audit_log 查询。
- Business rules:
  - DAT-001、DAT-005、DAT-006、DAT-011、DAT-012 必须有自动化测试。
  - DAT-002 内容安全未配置时必须有明确状态/诊断，contract 阶段冻结最终阻断点。
- NFR:
  - 列表分页，避免一次性加载全部数据。
  - API 统一 envelope/traceId。
  - 敏感信息脱敏。
- Frontend visual/prototype parity:
  - 对照 screen-datasets.png、screen-dsdetail.png、screen-upload.png 与原型 HTML 页面 key。

## Commands Planned For Build Stage

`powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F009-data-source-dataset-management
mvn -f backend/pom.xml verify
npm --prefix frontend run lint
npm --prefix frontend run test:ci
npm --prefix frontend run build
npm --prefix frontend run e2e
node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F009-data-source-dataset-management
node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F009-data-source-dataset-management
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F009-data-source-dataset-management --skip-backend-integration --run-e2e
`

## Manual Review Points

- 确认 F009 不把完整 Pipeline、标注、增强、门户审批纳入实现范围。
- 确认 DAT-002 内容安全的未配置/待处理状态不会被误解为已检测通过。
- 确认 F007 文件对象 seam 与 F009 dataset_file 绑定边界清晰。
- 确认真实外部 connector 均以 TODO_CONFIRM 占位，后续可逐个接入。
