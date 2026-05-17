# F007 QA 验收报告

## 结论

- Verdict: PASS
- 日期：2026-05-17
- QA 范围：AC-01 ~ AC-10、原型一致性、权限/审计/状态机、前后端门禁。

## 验收矩阵

| AC | 结果 | 自动化证据 |
|---|---|---|
| AC-01 | PASS | `PlatformOrganizationConfigControllerTest.organizationTreeCreateDeleteAndMemberScopeRespectBuBoundary` |
| AC-02 | PASS | 同上，覆盖 BU_ADMIN 跨 BU 403 |
| AC-03 | PASS | `configsInheritAndRejectBuLimitEscalationWithAudit` |
| AC-04 | PASS | 同上，覆盖 BU 配置突破集团上限 422 |
| AC-05 | PASS | `fileMetadataNotificationAndApiKeyUseProductionSeams` |
| AC-06 | PASS | 同上，通知测试返回 `UNCONFIGURED` / `TODO_CONFIRM_SMTP_HOST` |
| AC-07 | PASS | 同上，API Key 一次性明文、列表脱敏、撤销 |
| AC-08 | PASS | `App.test.tsx`、`platform-organization-config.spec.ts` |
| AC-09 | PASS | 后端权限/边界测试与前端菜单权限接入 |
| AC-10 | PASS | TODO_CONFIRM seam 与配置/文件/API Key seam 均保留 |

## 已执行验证

```powershell
mvn -pl smp-app test -Dtest=PlatformOrganizationConfigControllerTest -DskipTests=false
# Tests run: 3, Failures: 0, Errors: 0, BUILD SUCCESS

npm --prefix frontend run test:ci
# Test Files 1 passed; Tests 5 passed

npm --prefix frontend run lint
# 0 errors, 1 existing warning: react-refresh/only-export-components

npm --prefix frontend run build
# vite build completed

npm --prefix frontend run e2e
# 4 passed
```

## 原型一致性记录

- `/org` 保留：标题“组织管理”、副标题“花叔工业智能 · 组织架构管理”、Tab“组织架构 / 部门管理 / 成员管理”、新建租户、添加成员、编辑配额、BU配置、权限跳转入口。
- `/sys` 保留：Tab“基础设置 / 存储配置 / 通知设置 / API 密钥 / 数据安全 / 认证集成 / 标签管理”、通知测试、API Key 一次性展示、认证集成未配置态。
- 外部系统未配置时显示 `UNCONFIGURED` 与 `TODO_CONFIRM_*`，未伪造成功。

## 剩余风险

- 本地门禁使用 `--skip-backend-integration` 可跳过真实 PostgreSQL/Redis 集成；合并前仍建议 CI 全绿。
- 真实对象存储、SMTP、SSO、KMS、API Gateway 参数待 F017 或外部系统确认。
