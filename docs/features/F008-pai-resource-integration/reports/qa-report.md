# F008 QA 验收报告

## 结论

- Verdict: PASS
- 日期：2026-05-17
- QA 范围：AC-01 ~ AC-10、原型一致性、权限/审计/状态机、前后端门禁。

## 验收矩阵

| AC | 结果 | 自动化证据 |
|---|---|---|
| AC-01 | PASS | `App.test.tsx`、`pai-resource-integration.spec.ts` 验证标题、Tab、卡片、同步状态。 |
| AC-02 | PASS | `PlatformPaiResourceControllerTest.statusOverviewAndWorkspaceExposePaiAsExternalSource` 与前端未配置引导。 |
| AC-03 | PASS | `superAdminCanUpdateBindingAndAuditRejectPlainSecret` 覆盖连接/绑定更新、脱敏与明文 secret 拒绝。 |
| AC-04 | PASS | `buAdminCannotCrossBuAndAuditDenial` 覆盖 BU_ADMIN 跨 BU 403 与审计。 |
| AC-05 | PASS | `configuredSandboxSyncCreatesSnapshotAndReferenceBlocksDisabledBinding` 覆盖 sandbox 同步成功、snapshot 与 requestId。 |
| AC-06 | PASS | `syncFailureKeepsLatestSnapshotStaleAndLogsDiagnostics` 覆盖未配置失败、stale 快照和失败审计。 |
| AC-07 | PASS | `configuredSandboxSyncCreatesSnapshotAndReferenceBlocksDisabledBinding` 覆盖 resource reference 与禁用阻断。 |
| AC-08 | PASS | 后端测试覆盖 `PAI_CONNECTION_UPDATED`、`PAI_BINDING_UPDATED`、`PAI_SYNC_FAILED`、`PAI_RESOURCE_REFERENCE_BLOCKED` 等审计。 |
| AC-09 | PASS | 代码审查确认仅新增 `platform_pai_*` seam，无本地物理调度事实源。 |
| AC-10 | PASS | `contract.md` 记录 PAI 官方文档核验、SDK/adapter 决策与 `PaiResourceClient` seam。 |

## 已执行验证

```powershell
mvn -pl smp-app -Dtest=PlatformPaiResourceControllerTest test
# Tests run: 5, Failures: 0, Errors: 0, BUILD SUCCESS

mvn verify
# Tests run: 21, Failures: 0, Errors: 0, BUILD SUCCESS

npm --prefix frontend run test:ci
# Test Files 1 passed; Tests 6 passed

npm --prefix frontend run build
# vite build completed

npm --prefix frontend run e2e
# 6 passed

npm --prefix frontend run lint
# 0 errors, 1 existing warning: react-refresh/only-export-components

node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F008-pai-resource-integration
# All checked contracts are ready for development.

node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F008-pai-resource-integration
# AC traceability check passed.
```

## 原型一致性记录

- `/resource` 保留：标题“资源管理”、副标题中说明“集群总览 · GPU 节点 · 资源池 · 存储”、四个 Tab、资源用量进度条、资源池与存储列表。
- 语义调整：原型中的本地资源概念均标注为 PAI Workspace / Resource Quota / Resource Group / PAI Snapshot 来源。
- 未配置状态展示 `UNCONFIGURED` 与 `TODO_CONFIRM_PAI_*`，未伪造 PAI 在线或同步成功。

## 剩余风险

- 真实阿里云 PAI 账号、Region、Workspace、Quota、RAM Role、VPC/Endpoint 尚待确认；当前只交付稳定 seam、权限审计和 sandbox 测试替身。
- 本地 gate 可使用 `--skip-backend-integration` 降级；合并前仍建议 CI 全绿并在真实环境补充 PAI 连通性验收。
