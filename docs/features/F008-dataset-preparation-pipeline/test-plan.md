# Test Plan: 数据准备流水线

## Metadata
- Feature: F008-dataset-preparation-pipeline
- Status: ready
- Owner: test-designer
- Created: 2026-05-08
- Updated: 2026-05-08
- Trace: TASK-dataset-preparation-pipeline

## 1. Acceptance Coverage

| AC | 自动化覆盖 |
|----|------------|
| AC-01 | scaffold feature-dir gate、文档检查 |
| AC-02 | 后端 `DatasetPreparationControllerTest` 校验 7 阶段；前端/E2E 校验阶段文案 |
| AC-03 | 后端创建任务测试校验来源配置、规则快照、质量门禁、输出目标 |
| AC-04 | 后端状态机测试校验门禁失败阻断；前端展示阻断原因 |
| AC-05 | 后端重跑测试校验 rerunRecords/auditTrail；前端重跑入口 |
| AC-06 | 前端 Vitest/Playwright 校验任务、进度、质量、阻断和重跑 |
| AC-07 | 后端 artifact API 和前端产物摘要校验不提交训练任务 |
| AC-08 | Controller 权限测试校验 `dataset:read` / `dataset:manage`；测试文件含 trace 标签 |

## 2. Backend Test Strategy

### Unit / MVC tests
- File: `backend/src/test/java/com/yfind/aiplatform/dataset/DatasetPreparationControllerTest.java`
- Tags in comments: `TASK-dataset-preparation-pipeline`, `AC-02` ... `AC-08`
- Scenarios:
  1. `GET /api/datasets/preparation-jobs` 返回任务摘要与 `featureTrace`。
  2. `GET /api/datasets/preparation-jobs/{jobId}` 返回 7 阶段、规则快照、门禁、重跑、审计、产物字段。
  3. `POST /api/datasets/preparation-jobs` 创建任务，校验 required fields 和默认 7 阶段。
  4. `POST /run-next-stage` 推进阶段，门禁通过时进入下一阶段。
  5. 门禁失败时返回 blocked 语义并禁止继续推进。
  6. `POST /rerun-blocked-stage` 在人工修正后恢复任务，并记录重跑次数与审计。
  7. `GET /api/datasets/training-datasets/{artifactKey}` 返回训练数据集快照与 loaderConfig。
  8. 缺少权限时返回 403。

### Service tests
- 可在 Controller 测试中覆盖内存状态机；若逻辑复杂，新增 `DatasetPreparationServiceTest`。

## 3. Frontend Test Strategy

### Vitest
- File: `frontend/src/App.test.tsx` 或新增页面级测试。覆盖总览页、7 个阶段独立处理页入口和单阶段专属功能按钮。
- Scenarios:
  - 数据资产页展示“数据准备流水线”。
  - 展示 7 阶段名称、进度、质量门禁、阻断原因，并进入单阶段独立处理页校验输入、功能处理、质量门禁、产出与本页专属操作。
  - 重跑按钮可见且可触发 API fallback 状态刷新。

### Playwright E2E
- File: `frontend/e2e/dataset-asset.spec.ts`
- Scenarios:
  - 打开数据资产页，看到数据准备流水线区块。
  - 校验 7 阶段文本与 7 个独立处理页入口和阶段专属功能区。
  - 校验阻断原因与“人工修正后重跑”入口。
  - 校验训练数据集产物摘要不出现训练提交动作。

## 4. Integration Checks

- Contract vs backend: API path、字段名、权限、`featureTrace`。
- Backend vs frontend: `datasetApi.ts` 类型匹配后端响应，fallback 不掩盖字段缺失。
- Feature traceability: 所有新增自动化测试包含 `TASK-dataset-preparation-pipeline` 与相关 `AC-xx`。

## 5. Commands

```powershell
$env:JAVA_HOME='C:\java\jdk-21.0.6'
$env:Path="C:\java\jdk-21.0.6\bin;" + [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
cd backend
mvn test -q
cd ../frontend
npm run lint
npm run test:ci
npm run build
npm run e2e
cd ..
node C:/GIT/yfind_aiplatform/tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F008-dataset-preparation-pipeline
node C:/GIT/yfind_aiplatform/tools/ai-scaffold/dist/cli.js verify-contract docs/features/F008-dataset-preparation-pipeline
node C:/GIT/yfind_aiplatform/tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F008-dataset-preparation-pipeline --run-e2e
```

## 6. Manual Review

- 确认企业内部系统和网络采集仅保留 `TODO_CONFIRM_*`，未伪造真实外部资源。
- 确认 F008 不提供训练任务提交按钮或接口。
- 确认新增能力复用 dataset domain、权限和页面入口，并确认每个阶段进入独立处理页后可查看阶段输入、功能处理、质量门禁、产出与本页专属操作。

