# Bugfix Test Plan Template

## Scope
- 数据集详情页从数据集创建图片分割标注任务。
- 数据集标注候选模板过滤（tenant + scene）。
- 本地 PostgreSQL/Flyway 启动链路。

## Reproduction
- 使用 `DATASET-WELD-DEFECT` 打开 `/dsdetail`。
- 在“创建标注任务”弹窗中选择 `图片分割`。
- 修复前会出现可选 `LT-WELD-BBOX` 或缺少可用分割模板，提交后返回 422。

## Regression Cases
| ID | Scenario | Expected |
|---|---|---|
| BT-01 | `GET /api/v1/datasets/DATASET-WELD-DEFECT/annotation-candidates` | 仅返回 `TENANT-CABIN` 下的 `LT-WELD-BBOX` 与 `LT-WELD-POLYGON`，不返回跨 BU 模板 |
| BT-02 | 使用 `LT-WELD-POLYGON + IMAGE_SEGMENTATION` 创建任务 | 返回 200，任务 `scene=IMAGE_SEGMENTATION` |
| BT-03 | 使用 `LT-WELD-BBOX + IMAGE_SEGMENTATION` 创建任务 | 返回 422，消息包含 `DAT-013` |
| BT-04 | 前端 `/dsdetail` 创建任务弹窗切换到“图片分割” | 模板下拉只显示“焊缝图片分割模板” |
| BT-05 | 本地 PostgreSQL 启动当前后端 | Flyway 成功迁移到 `v15`，`/api/v1/foundation/status` 返回 READY |

## Evidence
- `mvn -f backend/pom.xml -pl smp-app "-Dtest=DataManagementControllerTest#datasetAnnotationTaskExportFlowCreatesMultipleTasksAndTrainingPackages+datasetAnnotationCandidateFiltersTemplatesByTenantAndSupportsSegmentationTaskCreation" test`
- `npm --prefix frontend run test:ci -- App.test.tsx`
- `npm --prefix frontend run lint`
- 真实接口创建成功：`ANN-DE5552C600`（`templateId=LT-WELD-POLYGON`，`scene=IMAGE_SEGMENTATION`）
