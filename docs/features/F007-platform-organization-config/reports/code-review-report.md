# F007 代码审查报告

- Verdict: PASS
- 日期：2026-05-17
- Reviewer: Codex code-reviewer

## 审查范围

- 后端：`PlatformOrganizationConfigController`、`PlatformOrganizationConfigService`、DTO、Flyway V3、`GlobalExceptionHandler`、JUnit 测试。
- 前端：`platformApi.ts`、`OrganizationManagementPage.tsx`、`SystemConfigPage.tsx`、`App.tsx`、Vitest 与 Playwright 用例。
- 文档：`TASK.md`、`contract.md`、`test-plan.md`、联调/QA 报告。

## 结果

| 维度 | 结论 | 说明 |
|---|---|---|
| 契约一致性 | PASS | API 路径、权限码、审计事件与 `contract.md` 对齐。 |
| 复用策略 | PASS | 复用 F006 `PlatformIdentityService`、`PlatformPrincipal`、`platform_tenant/user/role/permission/audit_log`。 |
| 安全 | PASS | API Key 仅一次性返回明文，持久化 hash/脱敏值；敏感配置保留脱敏/TODO_CONFIRM 状态。 |
| 数据边界 | PASS | BU_ADMIN 子树边界、跨 BU 阻断、集团上限校验均有测试。 |
| 前端原型一致性 | PASS | `/org`、`/sys` 保留原型关键标题、Tab、表格、弹窗与未配置态。 |
| 测试充分性 | PASS | 后端、Vitest、Playwright、scaffold traceability 均覆盖 AC-01~AC-10。 |

## 发现与处理

- 已处理：前端 E2E 对 Ant Design 按钮空格拆分的可访问名称改为 `/测\s*试/`。
- 已处理：文档与 SQL 中由终端编码导致的 `????` 占位已在正式交付面替换为中文或 TODO_CONFIRM。
- 已确认：`frontend/src/components/AppNavigation.tsx` 仍有既有 Fast Refresh warning，本次未新增风险，不阻塞交付。

## 建议

- F017 落地真实 MinIO/SMTP/SSO/KMS 前，不要把 `TODO_CONFIRM_*` 改成假参数。
- 后续 DATA/MODEL/RESOURCE/INFERENCE feature 应复用 F007 配置、文件元数据、组织上下文与 API Key seam。
