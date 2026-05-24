# Code Review Report — F016 数据集生命周期管理增强（最终复审）

## 1. 复审范围
本轮按用户指定，仅对以下正式输入做最终复审，并确认上一轮剩余 must-fix 是否已全部关闭：

1. `docs/features/F016-dataset-lifecycle-management/reports/code-review-report.md`
2. `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java`
3. `backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java`
4. `docs/features/F016-dataset-lifecycle-management/contract.md`
5. `docs/features/F016-dataset-lifecycle-management/test-plan.md`

## 2. 验证证据
- 已复核 F016 冻结契约与测试计划中和本轮修复直接相关的 DAT-012、上传追加、append commit 语义。
- 已复核 `DataManagementService` 与 `DataManagementControllerTest` 最新实现和测试覆盖。
- 已再次执行并通过：
  - `mvn -q -f backend/pom.xml -pl smp-app test -Dtest=DataManagementControllerTest`
- 已对本轮复审关注的修改文件执行静态检查补充动作：
  - `lsp_diagnostics`：`DataManagementService.java`、`DataManagementControllerTest.java` 均返回 `diagnosticCount: 0`
  - AST 扫描未发现 `console.log`、空 `catch`、硬编码 `apiKey`

## 3. 上一轮 must-fix 关闭复核

### 3.1 Must-fix #1：跨 BU 上传会话写操作必须返回 404 隐藏资源存在性
**本轮状态：已关闭。**

关闭证据：
- `createDatasetUploadSession(...)` 已改为 `ensureCanSeeTenant(principal, tenantId, false)`，不再沿用跨 BU 写操作的 `403` 语义。
  - 证据：`backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java:287-306`
- 上传会话可见性检查 `datasetUploadSessionRecordVisible(...)` 对跨 BU session 查询/写入继续统一返回 `404`。
  - 证据：`backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java:822-828`
- 已新增直接负例测试，明确锁定“跨 BU 创建 `APPEND_VERSION` session 返回 `40400`”，并为 `qeuser` 增加 `BU_ADMIN` 角色前置，避免误判为普通权限不足。
  - 证据：`backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java:883-918`
- 该行为现已与 frozen contract 第 9 节 DAT-012 以及 `test-plan.md` 7.3 / `F016-P0-13` 保持一致。

### 3.2 Must-fix #2：APPEND_VERSION commit 阶段必须重新校验目标版本仍为当前且可写
**本轮状态：已关闭。**

关闭证据：
- `commitDatasetUploadSession(...)` 在 `APPEND_VERSION` 分支提交前继续调用 `assertAppendTargetWritable(...)`，会重新校验：
  1. 目标 dataset 可见；
  2. 目标 dataset 未归档；
  3. `targetVersionId == currentVersionId`；
  4. 目标版本仍为可变状态。
  - 证据：`backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java:348-376, 830-842`
- 回归测试已覆盖：
  - session 创建后目标 dataset 被归档，commit 返回 `409 DATASET_ARCHIVED_READONLY`
  - session 创建后当前版本切换，commit 返回 `409 DATASET_TARGET_VERSION_NOT_CURRENT`
  - 证据：`backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java:921-974`

## 4. 规格符合性结论
本轮复审范围内，F016 与 frozen contract / test plan 对齐情况如下：

- DAT-012：跨 BU 读写与上传追加已统一收敛到 `404 RESOURCE_NOT_FOUND` 语义，不再泄露资源存在性。
- `APPEND_VERSION`：创建 session、commit 前重校验、归档阻断、当前版本漂移阻断均已具备自动化覆盖。
- 本轮未发现上一轮 must-fix 的残留缺口。

## 5. 代码质量结论
- 本轮关注的 Java 修改文件未发现新的高风险安全问题、类型诊断问题或明显反模式。
- 测试证据与源码实现能够相互印证，足以支撑 F016 本轮修复关闭结论。

## 6. 剩余问题
### Must-fix
- 无。

### Comments
- 无阻塞性 comment。

## 7. Verdict
**PASS**

- Verdict: PASS

## 8. 最终结论
- 此前剩余 must-fix 已全部关闭。
- 本轮复审范围内，无新增 must-fix、无需再以 `CHANGES_REQUIRED` 阻塞 F016。
