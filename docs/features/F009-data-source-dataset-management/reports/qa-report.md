# QA Acceptance Report

## Summary
- Feature: F009-data-source-dataset-management
- Date: 2026-05-18
- Tester: qa-tester
- Verdict: PASS
- 结论摘要：依据本轮最新命令证据，F009 相关后端定向测试、前端 lint / Vitest / build，以及 Playwright 端到端验收均已通过；lint 仅存在既有 warning，不构成功能阻塞。AC-01 ~ AC-10 均获得对应测试或命令证据支撑，本轮 QA 复验结论为通过。

## 验收范围与依据
- 任务文档：`docs/features/F009-data-source-dataset-management/TASK.md`
- 契约文档：`docs/features/F009-data-source-dataset-management/contract.md`
- 测试计划：`docs/features/F009-data-source-dataset-management/test-plan.md`
- 强制前置阅读：`.omx/state/rendered-prompts/qa-tester-F009.md`
- AC 范围：AC-01 ~ AC-10

## AC 验收矩阵

| AC | 验收点 | 对应测试/命令证据 | 结果 | 备注 |
|---|---|---|---|---|
| AC-01 | 数据源列表、新建、连接测试、激活/禁用、详情诊断 | `DataManagementControllerTest.dataSourceTestGateMasksSecretsAndAuditDiagnostics`；Playwright 用例 1 | PASS | 后端定向测试 3/3 通过，前端 E2E 覆盖关键交互 |
| AC-02 | 敏感字段脱敏、`UNCONFIGURED` / `TODO_CONFIRM_*` 真实诊断 | `DataManagementControllerTest.dataSourceTestGateMasksSecretsAndAuditDiagnostics`；Playwright 用例 1 | PASS | 验证未配置状态不伪造成功 |
| AC-03 | 数据集列表、统计、分类 Tab、搜索筛选、版本入口 | `DataManagementControllerTest.datasetLifecycleBlocksUnconfiguredSafetyAndImmutablePublishedVersion`；Playwright 用例 2；Vitest | PASS | 页面 IA 与 API 接入均有证据 |
| AC-04 | 上传向导复用 F007 文件 seam，创建草稿/文件登记 | `DataManagementControllerTest.datasetLifecycleBlocksUnconfiguredSafetyAndImmutablePublishedVersion`；Playwright 用例 3；Vitest | PASS | 覆盖上传向导与草稿生成入口 |
| AC-05 | 已发布版本不可修改/删除，必须新建版本 | `DataManagementControllerTest.datasetLifecycleBlocksUnconfiguredSafetyAndImmutablePublishedVersion` | PASS | 后端状态机约束已验证 |
| AC-06 | 数据集详情、版本、文件、权限、血缘、预览退化 | `DataManagementControllerTest.datasetLifecycleBlocksUnconfiguredSafetyAndImmutablePublishedVersion`；Playwright 用例 2；Vitest | PASS | 原型结构与详情信息展示通过 |
| AC-07 | 受限数据集访问申请/授权 seam，无授权拒绝 | `DataManagementControllerTest.restrictedDatasetRequiresGrantAndReferenceUsesBuIsolation` | PASS | 验证授权前拒绝与授权 seam |
| AC-08 | BU 隔离、跨 BU 不暴露资源存在性 | `DataManagementControllerTest.restrictedDatasetRequiresGrantAndReferenceUsesBuIsolation` | PASS | 后端隔离规则验证通过 |
| AC-09 | 数据源/数据集/版本/文件/授权/拒绝写审计 | 三个 `DataManagementControllerTest` 用例 | PASS | 关键 mutation 与拒绝路径均有审计断言 |
| AC-10 | 不实现完整 Pipeline/标注/增强/真实 connector，仅保留 seam | 契约/测试计划；`restrictedDatasetRequiresGrantAndReferenceUsesBuIsolation` | PASS | 实现范围与冻结边界一致 |

## 测试执行记录

### 1. 后端定向回归
- 命令：`mvn -f backend/pom.xml -pl smp-app -Dtest=DataManagementControllerTest test`
- 结果：通过
- 最新证据摘要：`3 passed`
- 覆盖用例：
  - `dataSourceTestGateMasksSecretsAndAuditDiagnostics`
  - `datasetLifecycleBlocksUnconfiguredSafetyAndImmutablePublishedVersion`
  - `restrictedDatasetRequiresGrantAndReferenceUsesBuIsolation`

### 2. 前端静态检查与单元/集成测试
- 命令：
  - `npm --prefix frontend run lint`
  - `npm --prefix frontend run test:ci`
  - `npm --prefix frontend run build`
- 结果：全部通过
- 说明：lint 仅存在既有 warning，无新增 error 或阻塞项。

### 3. 前端 E2E 验收
- 命令：`npm --prefix frontend run e2e -- data-source-dataset-management.spec.ts`
- 结果：通过
- 最新证据摘要：`3 passed`
- 通过用例：
  1. `TASK-data-source-dataset-management AC-01 AC-02 datasrc API driven diagnostics`
  2. `TASK-data-source-dataset-management AC-03 AC-06 dataset list and detail preserve prototype IA`
  3. `TASK-data-source-dataset-management AC-04 upload wizard exposes F007 file seam`

## P0 用例结论

| ID | AC | 场景 | 状态 | 说明 |
|---|---|---|---|---|
| T-P0-01 | AC-01/02/09 | 数据源创建、脱敏、连接测试、激活门禁、审计 | PASS | 后端定向测试通过 |
| T-P0-02 | AC-03/04/05/06/09 | 数据集生命周期、上传、发布阻断、不可变、详情血缘/预览 | PASS | 后端定向测试 + 前端 Vitest/Playwright 通过 |
| T-P0-03 | AC-07/08/10 | 受限访问授权、BU 隔离、引用 seam | PASS | 后端定向测试通过 |
| T-P0-04 | AC-01/03/04/06 | 前端原型信息架构与 API 接入 | PASS | Playwright 3/3 与前端 test:ci/build 通过 |

## 契约符合性判断
- API、权限、审计、状态机与错误码均有对应测试计划映射与执行证据。
- 前端 `datasrc`、`ds`、`up`、`dsdetail` 页面保持原型信息架构，并由 Vitest 与 Playwright 双重验证。
- 后端 DATA 域关键规则（测试门禁、内容安全未配置阻断、版本不可变、受限访问授权、跨 BU 隔离、审计记录）已由 `DataManagementControllerTest` 覆盖并在本轮复验通过。

## 命令证据汇总

| 类型 | 命令 | 结果 |
|---|---|---|
| Backend | `mvn -f backend/pom.xml -pl smp-app -Dtest=DataManagementControllerTest test` | 3 passed |
| Frontend Lint | `npm --prefix frontend run lint` | passed（仅既有 warning） |
| Frontend Test | `npm --prefix frontend run test:ci` | passed |
| Frontend Build | `npm --prefix frontend run build` | passed |
| Frontend E2E | `npm --prefix frontend run e2e -- data-source-dataset-management.spec.ts` | 3 passed |

## 剩余风险
1. **既有 lint warning 风险（低）**：当前 lint 仍有历史 warning，虽不阻塞发布，但建议后续专项清理，避免掩盖新问题。
2. **外部环境 seam 风险（中）**：F009 仍按契约保留 `UNCONFIGURED` / `TODO_CONFIRM_*` 外部 connector seam；真实对象存储、内容安全、采集调度等联调能力需在后续 feature 或环境确认后补齐。
3. **范围边界风险（低）**：Pipeline、标注、增强、真实 connector 本期明确 out of scope；后续扩展时需继续保持与 F009 冻结契约一致或走变更审批。

## Final Sign-off
- [x] Ready for Release
- [ ] Needs Fix Before Release
- [ ] Needs Re-test After Fix
