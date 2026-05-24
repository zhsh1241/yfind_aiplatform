---
feature: F009-data-source-dataset-management
title: 数据源与数据集管理基础能力
task_status: implemented
owner: codex
created_at: 2026-05-18
updated_at: 2026-05-20
---

# Task: 数据源与数据集管理基础能力

## 1. 需求摘要

作为数据工程师、标注工程师与模型训练工程师，我需要在 SMP 中管理外部数据源、数据集、版本、文件绑定、访问授权与血缘引用，以便后续标注、Pipeline、训练、评估和推理均能引用同一个可审计、可授权、可追溯的数据资产事实源。

### Source References

- `docs/business/bizdocs/02-01-业务流程-数据管理.md`
- `docs/business/bizdocs/03-01-系统功能-数据管理.md`
- `docs/business/domain/01-领域对象-数据域.md`
- `docs/business/rules/01-数据管理规则.md`
- `docs/business/api/01-API接口规范.md`
- `docs/prototype/SMP工业AI平台-原型v2.html`
- `docs/prototype/screen-datasets.png`
- `docs/prototype/screen-dsdetail.png`
- `docs/prototype/screen-upload.png`

## 2. 范围

### In Scope

- 数据源列表、新建、连接测试、激活/禁用、详情与同步任务 seam；本地 sandbox connector 覆盖 `RELATIONAL_DB`、`API`、`STREAM`、`TIME_SERIES`、`INDUSTRIAL_PROTOCOL` 导入。
- 2026-05-20 需求调整后，数据集接入方式收敛为 `IMPORT`（导入）与 `API`（接口）；数据库、对象存储、流、时序、工业协议等专用 connector 暂不进入本阶段范围。
- 数据集内容类型收敛为 `IMAGE`（图片）与 `AUDIO_VIDEO`（影音）；其他类型暂不考虑。
- 数据集列表、统计、搜索、版本抽屉、详情、文件、权限、血缘、引用检查。
- 上传向导复用 F007 文件对象 seam，表达对象存储/内容安全未配置状态。
- DATA 域 Flyway 表、权限码、审计事件和后续引用 seam。

### Out of Scope

- 真实 DB/OSS/Kafka/OPC-UA 等专用 connector 生产联调；生产外部系统参数仍以 `TODO_CONFIRM_*` 管理。
- 完整数据资产门户审批中心、Pipeline 执行、标注任务与训练任务实现。
- 真实内容安全第三方服务；F009 冻结 `SECURITY_PENDING` / `UNCONFIGURED` 阻断行为。

## 复用方案

- 复用 F006 身份/权限/审计：`PlatformIdentityService`、`PlatformPrincipal`、`platform_audit_log`、RBAC 权限表。
- 复用 F007 组织与文件元数据：`platform_tenant` BU 隔离、`platform_file_object` hash/size 校验、对象存储 `TODO_CONFIRM_MINIO_*` seam；sandbox 同步导入生成的文件也写入该表。
- 复用 F008 seam 思路：后续训练/标注/Pipeline 只引用 `DatasetReference`，不复制 DATA 事实源。
- 复用前端基座：`apiClient`、`sessionStore`、`AppNavigation` 页面 key、Ant Design/TanStack Query 页面模式。
- 不复用已删除旧实现、不复制原型 JSX、不在 `ai-adapter/` 复制数据资产事实。

## 4. Acceptance Criteria

- [x] AC-01：`datasrc` 页面接入真实 API，支持数据源列表、新建、连接测试、激活/禁用、详情/编辑和状态诊断；连接测试未通过不可激活。
- [x] AC-02：数据源敏感连接字段不回显，未配置真实 connector 时返回 `UNCONFIGURED` / `TODO_CONFIRM_*`，不展示假成功。
- [x] AC-03：`ds` 页面接入真实 API，支持数据集统计、分类 Tab、搜索/筛选、权限/状态 badge、批量/版本入口。
- [x] AC-04：`up` 上传向导复用 F007 文件元数据 seam，完成数据集创建、文件登记入口、hash/size 校验与版本草稿生成。
- [x] AC-05：数据集版本状态机生效，已发布版本不可修改或删除，变更必须新建版本。
- [x] AC-06：`dsdetail` 展示数据集概览、版本、文件、权限、血缘摘要和样例预览；非图片/不可预览文件显示真实退化状态。
- [x] AC-07：受限数据集访问申请与有效期授权 seam 生效；无授权访问受限下载/引用返回 `DATASET_ACCESS_REQUIRED` 或 403。
- [x] AC-08：数据集查询、详情、下载遵循 BU 隔离；跨 BU 无授权不暴露资源存在性。
- [x] AC-09：数据源、数据集、版本、文件、授权、删除、跨 BU 拒绝等关键事件均写审计。
- [x] AC-10：F009 不实现完整 Pipeline、标注、数据增强、生产采集调度和真实外部 connector；仅提供后续引用 seam。
- [ ] AC-11：需求确认后，数据集接入方式和 sandbox connector 验收口径应收敛为 `IMPORT` 与 `API`；旧的数据库、对象存储、流、时序、工业协议入口需从业务设计中移出或降级为后续扩展/未支持诊断。
- [ ] AC-12：需求确认后，数据集内容类型应调整为仅支持图片和影音；其他类型在创建/导入/筛选中暂不展示或返回未支持诊断。
- [ ] AC-13：需求确认后，F009 应为后续标注任务产物保留 `ANNOTATION_RESULT` 标注文件角色，确保 `ANNOTATED` 数据集版本可绑定标注文件。

## 5. Definition of Done

- [x] plan.md 已批准。
- [x] contract.md 已冻结。
- [x] test-plan.md 引用全部 AC-xx。
- [x] 复用审查已完成：已确认 F009 复用 F006 身份/权限/审计、F007 组织与文件元数据、F008 后续引用 seam 设计以及现有前端 `apiClient`/session store/导航基座，未复制旧实现或原型 JSX。
- [x] 后端 DATA API、SQL、权限、审计与测试完成。
- [x] 前端 DATA 页面与 E2E 覆盖完成。
- [x] sandbox connector 扩展已完成并纳入后端测试与前端 E2E。
- [x] 最终 gate、review、QA 报告归档。

## 8. 需求调整记录

- 2026-05-20：用户确认“当前数据集主要有 2 种，图片或者影音，其他暂时先不考虑；数据集接入方式还是导入或者接口；使用数据集做标注任务后应该产生对应的标注文件保存”。本 TASK 先记录文档调整，代码实现待用户确认后再改。
