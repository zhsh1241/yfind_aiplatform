# F007 联调报告：组织、配置与文件元数据

## 结论

- Verdict: PASS
- 日期：2026-05-17
- 范围：`/org` 组织管理、`/sys` 系统配置、后端 `/api/v1/platform/**`、F006 身份/权限/审计复用。

## 联调检查

| 检查项 | 结果 | 证据 |
|---|---|---|
| 组织树与成员 API | PASS | `PlatformOrganizationConfigControllerTest` 覆盖 AC-01/AC-02/AC-09 |
| 配置继承与集团上限 | PASS | `PlatformOrganizationConfigControllerTest` 覆盖 AC-03/AC-04/AC-10 |
| 文件元数据、通知未配置、API Key | PASS | `PlatformOrganizationConfigControllerTest` 覆盖 AC-05/AC-06/AC-07 |
| 前端 `/org` 接入 | PASS | `frontend/src/App.test.tsx` 与 `frontend/e2e/platform-organization-config.spec.ts` 覆盖 AC-08 |
| 前端 `/sys` 接入 | PASS | Playwright 验证通知 `UNCONFIGURED`、`TODO_CONFIRM_SMTP_HOST`、API Key 一次性明文展示 |
| Envelope/权限/审计复用 | PASS | Controller 复用 `PlatformIdentityService.requirePrincipal` 与 `requirePermission`，写操作写入 `platform_audit_log` |

## 已执行命令

```powershell
$env:JAVA_HOME='C:\java\jdk-21.0.6'
mvn -pl smp-app test -Dtest=PlatformOrganizationConfigControllerTest -DskipTests=false
npm --prefix frontend run test:ci
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run e2e
node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F007-platform-organization-config
node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F007-platform-organization-config
```

## 差异与说明

- 外部 LDAP/SSO/MinIO/SMTP/IM/KMS/API Gateway 参数保持 `TODO_CONFIRM_*`，通知测试与下载 URL 返回真实 `UNCONFIGURED` 状态。
- 前端保留原型 page key：`org`、`sys`，并保留核心 Tab、表格、弹窗入口与关键文案。
- 不引入新依赖，不恢复旧实现。
