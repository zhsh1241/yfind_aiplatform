# BUG-001 修复报告

## Bug Information
- ID: BUG-001
- Title: 本地前端登录因 CORS 预检被安全链拦截
- Severity: Major

## Analysis
- Root Cause: 后端只放行 `POST /api/v1/auth/login`，未启用 API CORS，也未放行跨源预检 `OPTIONS /api/**`。
- Affected Files:
  - `backend/smp-app/src/main/java/com/yf/smp/app/config/SecurityConfig.java`
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/PlatformIdentityAuthControllerTest.java`
- Related Features: F006 platform identity / F007 platform organization config。

## Solution
- Approach: 最小化启用 `/api/**` CORS，默认仅允许本地开发前端源，并显式允许 API OPTIONS 预检。
- Changes Made:
  - `SecurityConfig.java`: 增加 `CorsConfigurationSource` Bean、接入 Spring Security CORS、放行 `OPTIONS /api/**`。
  - `PlatformIdentityAuthControllerTest.java`: 增加本地前端登录预检回归测试。

## Testing
- [x] 复现测试已添加
- [x] 单元/后端集成测试通过
- [x] 回归测试通过

## Evidence
- `mvn -f backend/pom.xml -pl smp-app -Dtest=PlatformIdentityAuthControllerTest test`：4 tests passed。
- `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F007-platform-organization-config --skip-backend-integration --run-e2e`：Quality gate passed；后端 16 tests passed，AI adapter 4 tests passed，前端 Vitest 5 tests passed，Playwright 4 tests passed。

## Contract Change
- [x] 不涉及接口契约变更；仅补充浏览器跨源访问安全配置。

## Verification
- [x] Bug 已修复
- [x] 无已知副作用
- [x] 文档已更新
