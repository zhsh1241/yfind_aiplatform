# Bug Fix Report

## Bug Information
- ID: BUG-20260521-image-segmentation-task-422
- Title: 图片分割标注任务创建报 422
- Severity: Major

## Analysis
- Root Cause: 候选模板未按数据集 tenant 过滤、缺少同 BU 已发布分割模板、前端按场景选模板时未做联动过滤；此外本地 PostgreSQL 被 `V13` 的不兼容语法阻塞启动验证。
- Affected Files: `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java`, `backend/smp-app/src/main/resources/db/migration/V13__annotation_artifact_scope_adjustment.sql`, `backend/smp-app/src/main/resources/db/migration/V15__annotation_segmentation_template_seed.sql`, `backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java`, `frontend/src/features/data/DataPages.tsx`, `frontend/src/App.test.tsx`
- Related Features: F012 标注集成、F014 数据集标注任务导出

## Solution
- Approach: 采用最小闭环修复：补同 BU 分割模板、收紧候选模板过滤、修正前端弹窗模板联动，并保证本地 docker postgres 可直接起当前代码做真实验证。
- Changes Made:
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java`: `annotation-candidates` 仅返回与数据集同 tenant 的图片标注/图片分割模板。
  - `backend/smp-app/src/main/resources/db/migration/V15__annotation_segmentation_template_seed.sql`: 新增 `LT-WELD-POLYGON` 已发布图片分割模板种子数据。
  - `backend/smp-app/src/main/resources/db/migration/V13__annotation_artifact_scope_adjustment.sql`: 去掉 PostgreSQL 不支持的 `ADD CONSTRAINT IF NOT EXISTS` 语法，保证本地起服链路可用。
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java`: 新增 422 根因回归测试，覆盖 tenant 过滤、分割任务成功创建、错误模板仍被 422 拒绝。
  - `frontend/src/features/data/DataPages.tsx`: 数据集详情页创建任务弹窗按 `scene` 过滤模板，切换场景自动重置模板，无模板时禁用提交并提示。
  - `frontend/src/App.test.tsx`: 新增前端回归测试，验证 `/dsdetail` 选择“图片分割”时只出现分割模板。

## Testing
- [x] 复现测试已添加
- [x] 单元测试通过
- [x] 集成测试通过
- [x] 回归测试通过

## Contract Change
- [x] 不涉及契约变更
- [ ] 契约已更新: N/A

## Verification
- [x] Bug 已修复
- [x] 无副作用
- [x] 文档已更新

## Evidence
- 2026-05-21 执行：`mvn -f backend/pom.xml -pl smp-app "-Dtest=DataManagementControllerTest#datasetAnnotationTaskExportFlowCreatesMultipleTasksAndTrainingPackages+datasetAnnotationCandidateFiltersTemplatesByTenantAndSupportsSegmentationTaskCreation" test`
- 2026-05-21 执行：`npm --prefix frontend run test:ci -- App.test.tsx`
- 2026-05-21 执行：`npm --prefix frontend run lint`
- 2026-05-21 使用本地 docker postgres/minio 配置启动当前后端，`GET http://127.0.0.1:8080/api/v1/foundation/status` 返回 READY
- 2026-05-21 实机接口验证：
  - `GET /api/v1/datasets/DATASET-WELD-DEFECT/annotation-candidates` 返回模板 `LT-WELD-POLYGON (IMAGE_SEGMENTATION)` 与 `LT-WELD-BBOX (IMAGE_TAGGING)`
  - `POST /api/v1/datasets/DATASET-WELD-DEFECT/annotation-tasks` 使用 `templateId=LT-WELD-POLYGON, scene=IMAGE_SEGMENTATION` 创建成功
  - 成功任务：`ANN-DE5552C600`

## Known Gaps
- 未执行 Playwright E2E。
- 前端 lint 仍存在既有 warning：`frontend/src/components/AppNavigation.tsx` 的 `react-refresh/only-export-components`，与本次修复无关。
