# Code Review Report

## Summary
- Feature: F009-data-source-dataset-management
- Date: 2026-05-18
- Scope: 前一轮 3 个阻塞点复审（DAT-001 / 上传向导文件登记 / session 租户）
- Verdict: PASS

## 复审结论
本轮复审聚焦上一轮提出的 3 个阻塞问题。结合最新实现、后端测试 `DataManagementControllerTest` 与前端 E2E `frontend/e2e/data-source-dataset-management.spec.ts`，3 个阻塞点均已修复，当前范围内未发现新的阻塞问题。

## 阻塞点复审结果

### 1. DAT-001：同步任务 / 数据集导入必须要求数据源 `ACTIVE + OK + lastTestAt`
- 结论：已修复
- 代码证据：
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java:84`：`createSyncTask(...)` 创建前调用 `ensureSourceReferenceable(...)`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java:96`：`createDataset(...)` 的 `sourceId` 导入路径同样调用 `ensureSourceReferenceable(...)`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java:115`：`ensureSourceReferenceable(...)` 明确要求 `status == ACTIVE`、`diagnosticCode == OK`、`lastTestAt != null`
- 测试证据：
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java:46-56`：覆盖未激活/未通过测试数据源被同步任务、数据集导入拒绝，返回 `DATA_SOURCE_NOT_ACTIVE`
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java:61-70`：覆盖 sandbox 数据源测试成功后可激活，并可成功创建同步任务

### 2. 上传向导必须有文件登记并调用 `attachFile`
- 结论：已修复
- 代码证据：
  - `frontend/src/features/data/DataPages.tsx:100`：上传向导声明 `attach` mutation，实际调用 `dataApi.attachFile(...)`
  - `frontend/src/features/data/DataPages.tsx:102`：三步向导已具备“填写元数据 -> 文件登记 -> 预览确认”；文件登记步骤展示 `platform_file_object` 列表，要求选择文件后点击“完成文件登记并绑定版本”
  - `frontend/src/features/platform/platformApi.ts:580`：已提供 `attachFile(datasetId, versionId, input)` API 封装
- 测试证据：
  - `frontend/e2e/data-source-dataset-management.spec.ts:30-41`：E2E 明确覆盖上传向导进入文件登记页、选择 `FILE-001`、点击“完成文件登记并绑定版本”、进入确认页
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java:91-99`：后端测试覆盖 `POST /datasets/{id}/versions/{versionId}/files`，断言绑定结果为 `BOUND`

### 3. 前端不得硬编码 `TENANT-CABIN`，应使用 session 租户
- 结论：已修复（F009 数据域页面范围内）
- 代码证据：
  - `frontend/src/features/data/DataPages.tsx:24`：数据源页通过 `useSessionStore((state) => state.user?.tenantId)` 获取当前 session 租户
  - `frontend/src/features/data/DataPages.tsx:52`：新建数据源提交时使用 `tenantId: currentTenantId`
  - `frontend/src/features/data/DataPages.tsx:91`：上传向导同样从 session 读取当前租户
  - `frontend/src/features/data/DataPages.tsx:102`：新建数据集提交时使用 `tenantId: currentTenantId`
- 复核说明：已检索 `frontend/src/features/data`，未发现 `TENANT-CABIN` 硬编码残留。仓库其他非 F009 页面仍存在历史默认值，但不属于本次 F009 阻塞点复审范围。

## Stage 2：代码质量与安全复核
- 已对本次修改涉及的前端文件执行 `lsp_diagnostics`：
  - `frontend/src/features/data/DataPages.tsx`
  - `frontend/src/features/platform/platformApi.ts`
  - `frontend/src/App.tsx`
  - `frontend/src/App.test.tsx`
  - `frontend/e2e/data-source-dataset-management.spec.ts`
  - `frontend/e2e/helpers.ts`
- 结果：上述文件诊断均为 0 error。
- AST 检查结果：未发现新增 `console.log(...)`、空 `catch {}`、硬编码 `apiKey = "..."`。
- 后端方面已复核 `DataManagementService` / `DataManagementController` / `DataDtos` 与最新测试用例，当前复审范围内未见新的高严重度问题。

## Recommendation
- 结论：APPROVE
- 本轮复审范围内建议通过。
