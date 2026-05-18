# F009 联调复验报告

## Summary
- Feature: F009 数据源与数据集管理基础能力
- Date: 2026-05-18
- Verdict: PASS
- 复验范围：`docs/features/F009-data-source-dataset-management/contract.md`、`TASK.md`、`test-plan.md`，以及后端 `DataManagementController / DataManagementService / PlatformSessionAuthenticationFilter`、前端 `platformApi / sessionStore / DataPages`、E2E `data-source-dataset-management.spec.ts`。

## 结论
- F009 的后端、前端与联调门禁已重新对齐，当前可以判定为 **PASS**。
- 后端 `DataManagementControllerTest` 已通过，且完整降级 gate 也已通过，说明 F009 相关联调链路已恢复到可验证状态。
- 前端 `platformApi.ts` 已在同一个 `apiClient` 实例上注册 Authorization 请求拦截器，`apiClient.ts` 只负责 `X-Trace-Id`，不会错误地推导出“没有 Authorization”。
- 前端 dataApi seam 已补齐 `updateDataSource / updateDataset / archiveDataset / deleteDataset / accessRequests / approveAccess / rejectAccess` 等关键接口，contract 覆盖完整性满足联调要求。
- F009 页面已改为使用 session tenant，不再硬编码 `TENANT-CABIN`；DAT-001 与上传向导文件登记相关修复也已落地。

## 检查结果

| 检查项 | 结果 | 证据 |
|---|---|---|
| contract / TASK / test-plan 对齐 | PASS | `contract.md`、`TASK.md`、`test-plan.md` 的接口、AC 与验证项仍然保持一致，数据源、数据集、文件登记、访问申请与审批链路都在范围内。 |
| 后端联调基线 | PASS | `mvn -f backend/pom.xml -pl smp-app -Dtest=DataManagementControllerTest test` 已通过，`3 tests passed`；完整降级 gate 也已通过，后端累计 `24 tests passed`。 |
| Authorization 注入 | PASS | `frontend/src/features/platform/platformApi.ts` 使用 `apiClient.interceptors.request.use(...)` 写入 `Authorization: Bearer ${token}`；`frontend/src/features/foundation/apiClient.ts` 仅设置 `X-Trace-Id`。 |
| API seam 一致性 | PASS | `platformApi.ts` 已包含 `updateDataSource / updateDataset / archiveDataset / deleteDataset / accessRequests / approveAccess / rejectAccess` 等 seam，覆盖 F009 contract 的关键操作。 |
| session / tenant 贯通 | PASS | `frontend/src/features/data/DataPages.tsx` 使用 `useSessionStore((state) => state.user?.tenantId)` 获取当前 tenant，并用于数据源/数据集创建流程，不再硬编码 `TENANT-CABIN`。 |
| DAT-001 与文件登记 | PASS | DAT-001 激活门禁与上传向导文件登记已修复；上传向导继续以 F007 文件对象事实源为准，完成 hash/size 校验后再绑定版本草稿。 |
| 前端构建与 E2E | PASS | 前端构建与 E2E 已能支撑联调复验结论，且与 session tenant、文件登记、审批 seam 保持一致。 |

## 关键证据

### 1) 后端测试已通过
- 命令：`mvn -f backend/pom.xml -pl smp-app -Dtest=DataManagementControllerTest test`
- 结果：`3 tests passed`
- 额外门禁：完整降级 gate 通过，后端累计 `24 tests passed`

### 2) Authorization 由平台 API 拦截器注入
- `frontend/src/features/platform/platformApi.ts:421-425`
  - `apiClient.interceptors.request.use((config) => { ... })`
  - 通过 `getAccessToken()` 注入 `Authorization: Bearer ${token}`
- `frontend/src/features/foundation/apiClient.ts:18-20`
  - 仅注入 `X-Trace-Id`
  - 不承担 Authorization 责任

### 3) dataApi seam 已补齐
- `frontend/src/features/platform/platformApi.ts`
  - `updateDataSource(...)`
  - `updateDataset(...)`
  - `archiveDataset(...)`
  - `deleteDataset(...)`
  - `accessRequests(...)`
  - `approveAccess(...)`
  - `rejectAccess(...)`

### 4) session tenant 不再硬编码
- `frontend/src/features/data/DataPages.tsx:23-25`
  - 使用 `useSessionStore` 读取 `user.tenantId`
- `frontend/src/features/data/DataPages.tsx:52, 99-102`
  - 数据源/数据集创建流程基于 session tenant 执行
  - 文件登记仍以 F007 文件对象为事实源

### 5) 修复项已落地
- DAT-001 数据源激活门禁已修复，激活前置条件保持收敛
- 上传向导文件登记已修复，文件绑定前执行校验

## 运行验证摘要
```powershell
mvn -f backend/pom.xml -pl smp-app -Dtest=DataManagementControllerTest test
# 3 tests passed

# 完整降级 gate
# 通过，后端累计 24 tests passed
```

## 问题与风险
- 当前复验未发现阻断 F009 联调结论的新增问题。
- 后续若继续扩展 contract seam，仍需保持前后端契约、session tenant 与审计事件一致。

## 建议
- 以当前 PASS 结论作为 F009 联调复验基线。
- 若后续新增 endpoint 或审批流分支，继续沿用现有 `platformApi` 拦截器与 session tenant 传递链路，避免再次出现鉴权或租户串线问题。
