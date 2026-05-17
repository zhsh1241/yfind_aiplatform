# F008 联调报告：阿里云 PAI 资源集成控制面

## 结论

- Verdict: PASS
- 日期：2026-05-17
- 范围：`/resource` 资源管理页面、后端 `/api/v1/platform/pai-resources/**`、F006 身份/权限/审计复用、F007 组织边界复用。

## 联调检查

| 检查项 | 结果 | 证据 |
|---|---|---|
| PAI 连接状态与未配置诊断 | PASS | `GET /status` 返回 `UNCONFIGURED` 与 `TODO_CONFIRM_PAI_*`；前端显示“PAI 连接尚未配置”。 |
| Workspace/Quota 绑定与权限 | PASS | `PlatformPaiResourceControllerTest` 覆盖 SUPER_ADMIN 更新连接/绑定、BU_ADMIN 跨 BU 403 与审计。 |
| PAI 同步与 stale 快照 | PASS | `/sync` 未配置返回失败诊断但保留最近快照；sandbox seam 成功写入 snapshot/log。 |
| 资源引用 seam | PASS | `/references` 返回 `resourceBindingId`、`paiWorkspaceId`、`paiQuotaId`；禁用绑定返回 409 并审计。 |
| 前端 `/resource` 接入 | PASS | `ResourceManagementPage` 接入 PAI API，保留“集群总览 / GPU 节点 / 资源池 / 存储”Tab 与原型语义。 |
| 禁止本地调度事实源 | PASS | 本地仅新增 `platform_pai_connection/binding/snapshot/sync_log`；未新增 Kubernetes/GPU 调度器或物理节点写入 API。 |

## 已执行命令

```powershell
$env:JAVA_HOME='C:\java\jdk-21.0.6'
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
```

## 说明

- 真实 PAI Region、Endpoint、Workspace、Quota、RAM Role 仍为 `TODO_CONFIRM_PAI_*`；非 sandbox 且真实 SDK/adapter 未配置时返回 `PAI_CLIENT_NOT_CONFIGURED`，不得伪造同步成功。
- 前端 E2E 使用 Playwright route mock 验证页面行为；后端单测使用 H2/Flyway 与本地 `PaiResourceClient` sandbox seam，不访问公网 PAI。
