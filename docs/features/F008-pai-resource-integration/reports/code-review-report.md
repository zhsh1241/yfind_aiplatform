# F008 代码审查报告

- Verdict: PASS
- 日期：2026-05-17
- Reviewer: Codex code-reviewer

## 审查范围

- 后端：`PlatformPaiResourceController`、`PaiResourceService`、DTO、Flyway V4、`PlatformPaiResourceControllerTest`。
- 前端：`ResourceManagementPage.tsx`、`platformApi.ts`、`App.tsx`、Vitest 与 Playwright 用例。
- 文档：`TASK.md`、`contract.md`、`test-plan.md`、联调/QA 报告。

## 结果

| 维度 | 结论 | 说明 |
|---|---|---|
| 契约一致性 | PASS | API 路径、DTO、权限码、错误诊断、审计事件与 `contract.md` 对齐。 |
| 复用策略 | PASS | 复用 F006 `PlatformIdentityService`/审计、F007 `platform_tenant` 组织边界、统一 envelope 与现有前端 `apiClient`/session store。 |
| 安全 | PASS | Bearer 权限校验覆盖所有接口；SUPER_ADMIN 限制全局连接写入；拒绝明文 `AccessKey`/`Secret`；跨 BU 写审计并返回 403。 |
| 数据边界 | PASS | 本地只保存 PAI 连接摘要、组织绑定、同步快照和同步日志；未引入本地物理资源调度事实源。 |
| PAI 外部集成边界 | PASS | 不新增 Alibaba Cloud SDK；真实 SDK/adapter 未接入时返回 `PAI_CLIENT_NOT_CONFIGURED`，sandbox 必须显式标记。 |
| 前端原型一致性 | PASS | `/resource` 保留标题、Tab、卡片、表格、进度条和未配置/同步诊断。 |
| 测试充分性 | PASS | 后端、Vitest、Playwright 与 traceability 覆盖 AC-01~AC-10。 |

## 发现与处理

- 已处理：前端测试和 E2E 中“资源管理”/`TODO_CONFIRM_PAI_REGION` 文案重复导致 strict 查询失败，改为 heading/exact/getAll 语义查询。
- 已处理：Ant Design `Alert.message` 废弃 warning，F008 页面改用 `title`。
- 已处理：ESLint 扫描 Playwright `test-results` 目录报 ENOENT，配置忽略 `test-results`。
- 已处理：默认 `PaiResourceClient` 仅允许显式 `SANDBOX` seam 返回成功，避免非真实 PAI 配置被伪造成同步成功。
- 已确认：`frontend/src/components/AppNavigation.tsx` 仍有既有 Fast Refresh warning，本次未扩大风险，不阻塞交付。

## 建议

- 接入真实 PAI 前，先确认 `TODO_CONFIRM_PAI_*`、RAM Role 权限、VPC/专线与 SDK/adapter 路径，并在独立 feature/ADR 中实现真实 client。
- 后续训练、Pipeline、推理 feature 必须引用 `/pai-resources/references`，不得重新拼接 Workspace/Quota 参数。
