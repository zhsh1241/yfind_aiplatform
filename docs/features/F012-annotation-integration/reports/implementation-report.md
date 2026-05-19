# F012 实施报告

- **Feature**: `F012-annotation-integration`
- **报告时间**: 2026-05-19（Asia/Shanghai）
- **Verdict**: IMPLEMENTED
- **范围**: 标注任务管理、标签模板、标注工作台、标注审核、Label Studio seam、质量检查与 `ANNOTATED` 数据集发布。

## 1. 实施摘要

F012 已在 DATA 域补齐标注闭环控制面，保持原型 `/ann`、`/annwork`、`/annreview` 的信息架构与核心文案语义：

- 后端新增 `/api/v1/annotation/*` API，覆盖 overview、tasks、label-templates、work-items、review-items、quality-check、publish-dataset、Label Studio status/sync/import seam。
- 数据库新增 Annotation 领域表，复用 F009 `dataset`、`dataset_version`、`dataset_file`、`platform_file_object`、`data_lineage`，不新增平行数据集模型。
- 前端新增标注任务页、标注工作台页、标注审核页，并接入真实 API client 与 TanStack Query。
- Label Studio 与 AI 预标注保持 `TODO_CONFIRM_*` seam；未配置时返回 `UNCONFIGURED`，前端显式提示，不伪造外部成功。
- 后端测试、前端单测和 Playwright E2E 覆盖 AC-01~AC-08，包含 DAT-003、DAT-004、DAT-009、DAT-010、DAT-012 权限/规则路径。

## 2. 主要变更

### 后端

| 文件 | 内容 |
| --- | --- |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/AnnotationController.java` | 新增 Annotation REST API 控制器，统一 `ApiResponse<T>` envelope。 |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/AnnotationService.java` | 实现任务、模板、工作项、审核、质量检查、发布、Label Studio seam、权限与审计。 |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/AnnotationDtos.java` | 定义前后端契约 DTO。 |
| `backend/smp-app/src/main/resources/db/migration/V9__annotation_integration.sql` | 新增 Annotation 表、索引、权限 grant 和原型 seed 数据。 |
| `backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java` | 新增 F012 正向闭环与失败路径测试。 |

### 前端

| 文件 | 内容 |
| --- | --- |
| `frontend/src/features/platform/platformApi.ts` | 新增 Annotation DTO 与 API client 方法。 |
| `frontend/src/features/data/DataPages.tsx` | 新增 `AnnotationTasksPage`、`AnnotationWorkbenchPage`、`AnnotationReviewPage`。 |
| `frontend/src/App.tsx` | 将 `/ann`、`/annwork`、`/annreview` 接入真实页面。 |
| `frontend/src/components/AppNavigation.tsx` | 保持原型数据管理菜单并暴露标注工作台入口。 |
| `frontend/src/App.test.tsx` | 新增 F012 前端单测 mock 与路由断言。 |
| `frontend/e2e/helpers.ts` | 新增 F012 E2E API mock；具体 annotation routes 使用正则避免被泛化 route 抢先拦截。 |
| `frontend/e2e/annotation-integration.spec.ts` | 新增 3 条 F012 Playwright 用例，覆盖任务、工作台、审核/发布主链路。 |

### 文档与 SQL

| 文件 | 内容 |
| --- | --- |
| `docs/features/F012-annotation-integration/TASK.md` | 功能任务、范围、复用方案、验收标准。 |
| `docs/features/F012-annotation-integration/contract.md` | 冻结 API/DTO/权限/审计/错误契约。 |
| `docs/features/F012-annotation-integration/test-plan.md` | P0/P1/P2 测试计划与 AC 追溯。 |
| `docs/features/F012-annotation-integration/sql/annotation-integration.sql` | 正式 SQL 产物，映射 V9 迁移。 |

## 3. 复用与边界

- 复用 F006 身份、权限、审计、`PlatformPrincipal` 和统一错误 envelope。
- 复用 F009 数据集、版本、文件对象和血缘表生成 `ANNOTATED` 数据集。
- 复用 F010/F011 数据域页面组织、API client、E2E helper 和既有质量门禁。
- 未新增 Label Studio SDK、前端标注画布库或 AI 预标注依赖。
- 外部系统参数全部保留 `TODO_CONFIRM_LABEL_STUDIO_*` / `TODO_CONFIRM_PRELABEL_MODEL_SOURCE`。

## 4. 验收覆盖摘要

| AC | 实现状态 | 证据 |
| --- | --- | --- |
| AC-01 | PASS | `/ann` 任务管理页、统计、Tab、列表、模板与新建入口；E2E 第 1 条。 |
| AC-02 | PASS | 后端创建任务校验 ACTIVE 数据集与 PUBLISHED 模板；后端失败路径测试。 |
| AC-03 | PASS | 标签模板创建、发布、Label Studio config seam；后端与前端单测覆盖。 |
| AC-04 | PASS | `/annwork` 任务详情、样本队列、预标注、草稿保存、提交审核；E2E 第 2 条。 |
| AC-05 | PASS | `/annreview` 审核通过/驳回与 DAT-004 自审阻断；后端测试覆盖。 |
| AC-06 | PASS | Label Studio 未配置返回 `UNCONFIGURED` 和 `TODO_CONFIRM_*`；E2E 响应断言覆盖。 |
| AC-07 | PASS | 质量检查通过后发布 `ANNOTATED` 数据集、版本、文件与 `ANNOTATION` 血缘；后端测试覆盖。 |
| AC-08 | PASS | 权限不足、跨 BU、非法业务状态、停用/自审相关失败路径由后端测试覆盖主要路径。 |

## 5. 已知非阻塞项

- 真实 Label Studio 生产 URL/token/workspace/storage 仍未知，保持 `TODO_CONFIRM_*`。
- AI 预标注模型来源未确认，本期只落配置、预测摘要和人工可继续处理 seam。
- 前端标注画布为控制面样本队列，不实现复杂图像/视频标注绘制器。
- PostgreSQL 16.13 本地启动烟测已通过：`smp_platform_test` 中 Flyway v9 成功应用，Annotation seed 数据可查，`/actuator/health` 返回 UP。
- 已重跑 `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F012-annotation-integration --run-e2e`，后端集成未降级跳过。
