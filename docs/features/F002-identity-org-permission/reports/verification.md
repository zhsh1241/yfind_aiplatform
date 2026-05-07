# 验证报告：身份、组织与权限基线

## 验证日期

2026-05-02

## 实现范围

- 后端新增 `identity/`、`organization/`、`permission/`、`audit/` 包边界。
- 后端新增当前用户、认证状态、权限词表、权限检查、当前组织、审计事件 API。
- 前端组织权限页面展示本地用户上下文、IAM 占位、角色和模块权限门禁矩阵。
- 保持 `TODO_CONFIRM_IAM_PROVIDER`、`TODO_CONFIRM_SSO_ISSUER` 等未知生产值，不写入猜测配置。

## 自动化验证结果

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F002-identity-org-permission` | 通过 | plan 已批准，规划证据、PRD、test-spec 存在。 |
| `mvn test` | 通过 | 后端 6 个测试通过，覆盖健康检查、认证/权限、审计。 |
| `npm run lint` | 通过 | 前端 TypeScript 类型检查通过。 |
| `npm run test:ci` | 通过 | 前端 1 个测试文件、7 个用例通过。 |
| `npm run build` | 通过 | Vite 生产构建成功。 |
| `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F002-identity-org-permission` | 通过 | `contract.md` 状态为 `frozen`。 |
| `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F002-identity-org-permission` | 通过 | TASK 验收项可追溯到自动化测试。 |
| `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F002-identity-org-permission --skip-code-review-verdict --run-e2e` | 通过 | 后端 verify、AI Adapter、前端 lint/test/build、E2E placeholder 均通过。 |

## 验收项追踪

- AC-01：build-feature 前置门禁通过。
- AC-02：新增 `backend/src/main/java/com/yfind/aiplatform/{identity,organization,permission,audit}`。
- AC-03：`AuthControllerTest` 覆盖 `/api/auth/status` 与 `/api/auth/me`。
- AC-04：`AuthControllerTest` 覆盖权限词表和未知权限默认拒绝。
- AC-05：`AuditControllerTest` 覆盖登录、角色权限变更、高风险拒绝访问审计义务。
- AC-06：`App.test.tsx` 覆盖组织权限页用户上下文和权限门禁矩阵。
- AC-07：测试确认 IAM/SSO 仍为 `TODO_CONFIRM_*`。
- AC-08：综合门禁通过。

## 已知限制

- 当前为本地开发主体 `LOCAL_DEV_PRINCIPAL`，尚未接入真实 Spring Security/OIDC。
- 角色、权限、审计事件暂为服务内 MVP 基线数据，未写入 PostgreSQL。
- 本地 E2E 仍使用 F001 placeholder；真实 Playwright 场景应在后续 UI feature 中补齐。
- 按当前系统限制，本轮未启动独立 code-review 子代理；门禁使用 `--skip-code-review-verdict`，合并前应补一次正式代码审查报告。

## 2026-05-07 生产可用登录授权加固

### 新增能力

- 后端新增 `BACKEND_SESSION_TOKEN` 登录会话，`POST /api/auth/login` 成功后签发 32 字节随机 Bearer Token，过期时间为 8 小时。
- `GET /api/auth/me`、数据资产、训练、模型仓库等关键 API 不再接受硬编码本地开发 Token，统一通过后端会话解析当前用户并按权限默认拒绝。
- 新增授权申请闭环：提交授权申请、管理员审批、使用已批准申请切换登录态；授权事件写入 `platform_domain_events`，可随数据库持久化。
- 前端组织权限页改为真实登录 + 授权申请入口；所有业务 API 客户端统一从 `authSession` 获取 Bearer Token。

### 内置启动账号

| 账号 | 默认密码来源 | 角色 | 用途 |
| --- | --- | --- | --- |
| `admin@yfind.local` | `YFIND_BOOTSTRAP_ADMIN_PASSWORD`，未设置时测试默认 `admin123!` | `platform-admin` | 初始平台管理员、审批授权 |
| `reviewer@yfind.local` | `YFIND_BOOTSTRAP_REVIEWER_PASSWORD`，未设置时测试默认 `reviewer123!` | `quality-reviewer` | 数据/标注/模型审批复核 |
| `engineer@yfind.local` | `YFIND_BOOTSTRAP_ENGINEER_PASSWORD`，未设置时测试默认 `engineer123!` | `algorithm-engineer` | 训练与模型读取 |

生产部署必须通过环境变量覆盖默认密码；默认密码仅用于本地自动化测试和无外部 IAM 的演示环境。

### 本轮回归验证

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `mvn test -q` | 通过 | 覆盖登录、未授权 401、授权审批、数据/训练/模型权限拒绝。 |
| `npm run lint` | 通过 | 前端静态检查通过。 |
| `npx vitest run src/api/platformApis.test.ts src/api/modelRegistryApi.test.ts --config vitest.config.ts --reporter verbose` | 通过 | API 客户端 Bearer Token 头回归。 |
| `npx vitest run src/App.test.tsx --config vitest.config.ts --testNamePattern "组织权限页面支持" --reporter verbose` | 通过 | 授权登录、审批、切换登录态 UI 回归。 |
