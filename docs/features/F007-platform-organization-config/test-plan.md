# Test Plan: 组织、配置与文件元数据

## 1. Test Scope

- Feature: F007-platform-organization-config
- Contract version: v1
- Business references: `docs/business/bizdocs/03-04-系统功能-平台管理.md`、`docs/business/bizdocs/05-01-系统功能-平台基础.md`、`docs/business/bizdocs/05-03-系统功能-通知与文件管理.md`、`docs/business/rules/05-平台与权限规则.md`、`docs/business/api/01-API接口规范.md`
- Prototype references: `docs/prototype/SMP工业AI平台-原型v2.html` page key `org` / `sys`，`screen-org.png`，`screen-sys.png`

## 2. P0 - Blocking

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-01 | 组织树查询并创建 PROJECT | SUPER_ADMIN 登录；GET tree；POST `/organizations` 创建 PROJECT | 返回 CORP/BU/PROJECT 树；创建成功；写 `ORG_NODE_CREATED` 审计 |
| T-P0-02 | AC-01, AC-09 | 删除存在引用的组织 | DELETE 存在子节点/成员/文件引用的组织 | 返回 409；写 `ORG_NODE_DELETE_BLOCKED` 审计 |
| T-P0-03 | AC-02, AC-09 | BU_ADMIN 跨 BU 分配成员 | BU_ADMIN 试图给 QE BU 分配成员 | 返回 403；写 `CROSS_TENANT_ACCESS_ATTEMPT` 审计 |
| T-P0-04 | AC-03, AC-04 | 配置继承与集团上限 | GLOBAL 上传上限 200；BU 设为 120；PROJECT 读取；BU 尝试设为 999 | PROJECT 继承 120；999 返回 422；写 `CONFIG_LIMIT_REJECTED` |
| T-P0-05 | AC-05 | 文件 object key 与完成校验 | POST init；POST complete 匹配 hash/size；再用错误 hash complete | 成功文件为 `AVAILABLE`；错误 hash 返回 422 和 `FILE_HASH_MISMATCH` |
| T-P0-06 | AC-06 | 通知渠道未配置测试 | POST notification test | 返回 `UNCONFIGURED` 与 `TODO_CONFIRM_*` 诊断；写 `NOTIFICATION_TEST_FAILED` |
| T-P0-07 | AC-07 | API Key 一次性明文与撤销 | POST create；GET list；POST revoke | create 返回 `plainTextKey`；list 仅脱敏；revoke 后 `REVOKED` 且 CRITICAL 审计 |
| T-P0-08 | AC-08 | 前端 org/sys API 接入 | Vitest mock F007 API 渲染 `/org` 与 `/sys` | 主标题、Tab、表格、弹窗入口存在；数据来自 HTTP mock |
| T-P0-09 | AC-08, AC-09 | 浏览器 E2E 主路径 | Playwright 登录后访问 `/org`、`/sys`、通知测试、API Key 新建 | 原型结构可见；未配置态真实展示；一次性 API Key 明文可见 |

## 3. P1 - Important

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-03 | 敏感配置脱敏 | 查询 storage endpoint / SMTP host | 返回 masked/TODO_CONFIRM，不泄露 secret 明文 |
| T-P1-02 | AC-05 | 文件软删除/恢复/下载 seam | init + complete 后 delete/restore/download-url | 状态正确流转；下载 URL 在 MinIO 未配置时返回 `UNCONFIGURED` |
| T-P1-03 | AC-06 | 通知渠道配置保存 | PUT channel 更新 masked config | 返回更新后的渠道；写 `NOTIFICATION_CHANNEL_UPDATED` |
| T-P1-04 | AC-10 | 后续 seam 保留 | 检查 API/表/配置/报告 | F008/F009/F011/F016/F017 所需 seam 与 TODO_CONFIRM 保留 |

## 4. P2 - Nice to Have

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-08 | 原型视觉抽查 | 对照 `screen-org.png` / `screen-sys.png` 手工检查 | 标题、Tab、表格、入口和未配置态一致，差异记录在 QA 报告 |
| T-P2-02 | AC-03, AC-04 | 配置版本查询 | 检查 `platform_config_version` | 配置变更版本已记录 |

## 5. Cross-cutting Verification

- Permission：覆盖 401、403、BU_ADMIN 边界、SUPER_ADMIN 全局访问、`menu:org` / `menu:sys` 菜单权限。
- Audit：覆盖组织、成员、配置、文件、通知、API Key 的 SUCCESS/FAILURE 审计与 `CRITICAL` / `WARNING` 风险等级。
- Business rules：覆盖 PLT-009、PLT-010、PLT-011、PLT-012、PLT-014，以及 FUNC-PLT-031~038、FUNC-NOTIFY-001~010、FUNC-FILE-001~009 中 F007 范围内规则。
- NFR：统一 envelope、traceId、Flyway migration、无新增依赖、敏感值脱敏、API Key hash 存储。
- Frontend visual/prototype parity：`/org` 与 `/sys` 必须对照原型 page key、主文案、Tab、表格列、弹窗入口。

## 6. Automated Test Mapping

- Backend JUnit / Spring Boot:
  - `PlatformOrganizationConfigControllerTest` -> T-P0-01, T-P0-02, T-P0-03, T-P0-04, T-P0-05, T-P0-06, T-P0-07, T-P1-01, T-P1-02, T-P1-03, T-P1-04
- Frontend Vitest:
  - `frontend/src/App.test.tsx` -> T-P0-08
- Playwright:
  - `frontend/e2e/platform-organization-config.spec.ts` -> T-P0-09
- Scaffold:
  - `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F007-platform-organization-config`
  - `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F007-platform-organization-config`
  - `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F007-platform-organization-config --skip-backend-integration --run-e2e`

## 7. Traceability

- AC-01 -> T-P0-01, T-P0-02
- AC-02 -> T-P0-03
- AC-03 -> T-P0-04, T-P1-01, T-P2-02
- AC-04 -> T-P0-04, T-P2-02
- AC-05 -> T-P0-05, T-P1-02
- AC-06 -> T-P0-06, T-P1-03
- AC-07 -> T-P0-07
- AC-08 -> T-P0-08, T-P0-09, T-P2-01
- AC-09 -> T-P0-02, T-P0-03, T-P0-09
- AC-10 -> T-P1-04
