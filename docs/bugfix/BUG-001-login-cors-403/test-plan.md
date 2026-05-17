# BUG-001 测试计划

## Scope
- 登录接口跨源预检。
- 既有登录、刷新、登出、账号锁定回归。
- F007 组织配置质量门禁回归。

## Reproduction
- 从 `http://localhost:5173` 页面向 `http://localhost:8080/api/v1/auth/login` 发起 JSON 登录请求。
- 浏览器发送 `OPTIONS /api/v1/auth/login`，修复前返回未认证/403 类错误，登录 POST 不会继续。

## Regression Cases
| ID | Scenario | Expected |
|---|---|---|
| BT-01 | `Origin: http://localhost:5173` 的 `OPTIONS /api/v1/auth/login` | 返回 200，并包含 `Access-Control-Allow-Origin` 与允许方法/请求头 |
| BT-02 | `admin / Smp@123456 / YF` 登录 | 返回 code 0 与 Bearer token |
| BT-03 | 旧会话在角色变更、刷新、登出后访问 `/api/v1/auth/me` | 返回 40100 |
| BT-04 | F007 门禁含后端、前端、E2E | Quality gate passed |

## Evidence
- `mvn -f backend/pom.xml -pl smp-app -Dtest=PlatformIdentityAuthControllerTest test`：4 tests passed。
- `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F007-platform-organization-config --skip-backend-integration --run-e2e`：待执行/完成后记录在 `reports/qa-report.md`。
