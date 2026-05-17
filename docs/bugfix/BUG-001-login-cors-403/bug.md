# BUG-001 登录 403 修复记录

## Metadata
- Bug ID: BUG-001
- Title: 本地前端直连后端登录接口时浏览器预检返回 403/401
- Status: completed
- Created: 2026-05-17
- Owner: Codex

## Symptom
- 用户使用本地页面登录时看到 403。
- 后端 `POST /api/v1/auth/login` 已允许匿名访问，但浏览器跨源请求会先发送 `OPTIONS /api/v1/auth/login` 预检。

## Expected vs Actual
- Expected: `http://localhost:5173` 或 `http://127.0.0.1:5173` 的本地前端可完成登录预检并继续发送登录 POST。
- Actual: Security 规则只放行 POST 登录，未启用 CORS，也未显式放行 `/api/**` 的 OPTIONS 预检，浏览器阶段被拦截为未认证/禁止访问。

## Root Cause
- `SecurityConfig` 禁用了 CSRF 且放行 `POST /api/v1/auth/login`，但未配置 `CorsConfigurationSource`。
- Spring Security 对跨源预检 OPTIONS 不匹配 POST 登录规则，进入认证分支，导致本地浏览器登录被拦截。

## Fix Plan
- 为 `/api/**` 增加 CORS 配置，默认只允许本地 Vite 开发源：`http://localhost:5173`、`http://127.0.0.1:5173`。
- 将允许源抽成配置项 `smp.security.allowed-origins`，生产环境必须显式配置，不使用通配符。
- 显式放行 `OPTIONS /api/**`。
- 增加后端回归测试覆盖登录预检。

## Verification
- `mvn -f backend/pom.xml -pl smp-app -Dtest=PlatformIdentityAuthControllerTest test`
- `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F007-platform-organization-config --skip-backend-integration --run-e2e`

## Regression Risk
- 风险较低：仅影响浏览器跨源访问 API 的预检；认证接口和受保护接口仍保持原有 Bearer Token 校验。
- 安全注意：生产部署应设置 `smp.security.allowed-origins` 为真实前端域名，不得配置为 `*`。
