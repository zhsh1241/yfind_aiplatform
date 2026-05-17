# Test Plan: 阿里云 PAI 资源集成控制面

## 1. Test Scope

- Feature: F008-pai-resource-integration
- Contract version: v1 frozen
- Trace tag: `TASK-pai-resource-integration`
- Business references:
  - `docs/business/bizdocs/02-04-业务流程-平台运营.md`
  - `docs/business/bizdocs/03-04-系统功能-平台管理.md`
  - `docs/business/api/01-API接口规范.md`
- Prototype references:
  - `docs/prototype/SMP工业AI平台-原型v2.html` page key `resource`
- Test principle: PAI 未配置/失败必须真实返回；测试替身可用于受控快照和错误映射，但不得让正式路径静态伪成功。

## 2. P0 - Blocking

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-02 | PAI 默认未配置状态 | 登录 admin；GET `/status`；打开 resource 页面 | API 返回 `UNCONFIGURED` / `TODO_CONFIRM_PAI_*`；前端显示未配置引导且无假成功数据 |
| T-P0-02 | AC-03 AC-08 | SUPER_ADMIN 更新连接、绑定与审计 | PUT `/connection` 更新 PAI 连接；PUT `/bindings/{id}` 更新 Workspace/Quota；查询 audit logs | 连接响应只返回脱敏凭证；binding 返回脱敏后的 mapping；审计含 `PAI_CONNECTION_UPDATED` 与 `PAI_BINDING_UPDATED` |
| T-P0-03 | AC-04 AC-08 | BU_ADMIN 跨 BU 访问被拒绝 | 登录 CABIN BU admin；更新/读取 QE binding | 返回 403；审计含 `PAI_CROSS_BU_ACCESS_DENIED` 或 CROSS_TENANT 事件 |
| T-P0-04 | AC-05 AC-08 | 手动同步成功保存快照 | 对 ACTIVE sandbox binding 调用 `/sync`；再 GET `/overview` | `lastSyncAt`、usage summary、paiRequestId、traceId 持久化；审计含 `PAI_SYNC_SUCCEEDED` |
| T-P0-05 | AC-06 | PAI 调用失败保留 stale 快照 | 将 binding/connection 置为 `AUTH_FAILED`/`TIMEOUT`/非 sandbox 且 SDK 未配置模式后调用 `/sync` | 返回明确 diagnostic（含 `PAI_CLIENT_NOT_CONFIGURED` 等）；最近成功快照未被覆盖，`stale=true` |
| T-P0-06 | AC-07 | 资源引用 seam 阻断失效 binding | 禁用 binding 或请求未配置组织引用 | ACTIVE 返回 resourceBindingId/workspace/quota；DISABLED 返回不可用/冲突并写审计 |

## 3. P1 - Important

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-01 | resource 页面原型结构 | 前端单测/E2E 进入 `/resource` | 标题“资源管理”、四个 Tab、总览卡、同步状态可见 |
| T-P1-02 | AC-01 AC-05 | 同步成功后前端展示快照 | mock API 返回 READY；点击手动同步 | 页面展示 Workspace/Quota、GPU/NPU/CPU/存储用量和成功提示 |
| T-P1-03 | AC-06 | 前端展示 stale 诊断 | mock API 返回 stale snapshot | 页面显示 stale/失败诊断，不隐藏旧数据来源 |
| T-P1-04 | AC-09 | 禁止本地调度事实源 | 代码审查 / grep | 不存在本地 Kubernetes/GPU 调度器、节点注册写接口或芯片驱动事实表 |
| T-P1-05 | AC-10 | PAI 文档与调用路径决策 | 检查 contract.md | 记录官方接口核验、Java client seam、SDK/adapter 后续决策 |

## 4. P2 - Nice to Have

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-01 | 存储 Tab 说明 F007 复用 | 打开存储 Tab | 显示 PAI/OSS 摘要且不替代文件元数据服务 |
| T-P2-02 | AC-05 | 节点 Tab 无节点级字段空态 | mock nodes 为空或 sourceType=PAI_QUOTA_SUMMARY | 页面展示真实空态说明 |

## 5. Cross-cutting Verification

- Permission:
  - `menu:resource` 控制导航可见性。
  - `platform:pai-resource:*` 控制 API 访问。
  - BU 子树过滤覆盖 read/update/sync/reference。
- Audit:
  - 必测：`PAI_CONNECTION_UPDATED`、`PAI_BINDING_UPDATED`、`PAI_SYNC_REQUESTED`、`PAI_SYNC_SUCCEEDED`、`PAI_SYNC_FAILED`、`PAI_RESOURCE_REFERENCE_BLOCKED`。
- Business rules:
  - PAI 是资源事实源；本地只存映射、快照、日志。
  - 未配置或失败不得 mock 成功。
  - 明文 secret 不得保存/回显。
- NFR:
  - sync 记录 traceId、duration、diagnostic。
  - 失败保留 stale 快照。
- Frontend visual/prototype parity:
  - page key `resource`。
  - 标题、四个 Tab、卡片、用量条、资源池/存储列表结构保留。

## 6. Required Automated Tests

- Backend:
  - `PlatformPaiResourceControllerTest` 覆盖 T-P0-01~T-P0-06，并在注释中包含 `TASK-pai-resource-integration AC-xx`。
- Frontend unit:
  - `App.test.tsx` 或独立 `ResourceManagementPage.test.tsx` 覆盖 `resource` 页面 AC-01/02/05/06。
- E2E:
  - `frontend/e2e/pai-resource-integration.spec.ts` 覆盖登录进入资源管理、未配置、同步成功、stale 诊断。

## 7. Traceability

- AC-01 -> T-P1-01, T-P1-02, T-P2-01, T-P2-02
- AC-02 -> T-P0-01
- AC-03 -> T-P0-02
- AC-04 -> T-P0-03
- AC-05 -> T-P0-04, T-P1-02
- AC-06 -> T-P0-05, T-P1-03
- AC-07 -> T-P0-06
- AC-08 -> T-P0-02, T-P0-03, T-P0-04, T-P0-06
- AC-09 -> T-P1-04
- AC-10 -> T-P1-05

## 8. Gate Commands

```powershell
node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F008-pai-resource-integration
node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F008-pai-resource-integration
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F008-pai-resource-integration --skip-backend-integration
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F008-pai-resource-integration --skip-backend-integration --run-e2e
```

若本地无法提供 PostgreSQL/Redis，允许 `--skip-backend-integration` 降级；合并前仍以 CI 全绿为准。
