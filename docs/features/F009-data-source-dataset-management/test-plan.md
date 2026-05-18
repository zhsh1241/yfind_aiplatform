# Test Plan: 数据源与数据集管理基础能力

## 1. P0 Blocking

| ID | AC | Scenario | Evidence |
|---|---|---|---|
| T-P0-01 | AC-01/02/09 | 数据源创建、未配置诊断、连接测试、未测试激活阻断、成功测试后激活、审计 | `DataManagementControllerTest.dataSourceTestGateMasksSecretsAndAuditDiagnostics` |
| T-P0-02 | AC-03/04/05/06/09 | 数据集列表统计、创建草稿、文件绑定、内容安全未配置发布阻断、已发布版本不可变、详情血缘/预览退化 | `DataManagementControllerTest.datasetLifecycleBlocksUnconfiguredSafetyAndImmutablePublishedVersion` |
| T-P0-03 | AC-07/08/10 | 受限数据集无授权拒绝、申请/审批授权、引用检查、跨 BU 404 | `DataManagementControllerTest.restrictedDatasetRequiresGrantAndReferenceUsesBuIsolation` |
| T-P0-04 | AC-01/03/04/06 | 前端 datasrc/ds/up/dsdetail 原型信息架构与 API 接入 | Vitest + Playwright `data-source-dataset-management.spec.ts` |

## 2. Cross-cutting

- 权限：后端所有入口调用 `PlatformIdentityService.requirePermission` 或认证主体检查。
- 审计：关键 mutation 与拒绝路径写入 `platform_audit_log`。
- NFR：不调用真实外部 connector；未配置状态以 `TODO_CONFIRM_*` 诊断呈现。
- 原型一致：保留 `datasrc` 双 Tab、`ds` 统计/Tab/表格/版本抽屉、`up` 三步向导、`dsdetail` 多 Tab 信息结构。

## 3. Traceability

- AC-01 -> T-P0-01, 前端 E2E 1
- AC-02 -> T-P0-01, 前端 E2E 1
- AC-03 -> T-P0-02, 前端 E2E 2
- AC-04 -> T-P0-02, 前端 E2E 3
- AC-05 -> T-P0-02
- AC-06 -> T-P0-02, 前端 E2E 2
- AC-07 -> T-P0-03
- AC-08 -> T-P0-03
- AC-09 -> T-P0-01/02/03
- AC-10 -> T-P0-03
