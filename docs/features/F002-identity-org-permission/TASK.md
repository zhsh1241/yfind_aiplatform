# TASK：身份、组织与权限基线

## 元数据

- Feature：F002-identity-org-permission
- 任务 ID：TASK-identity-org-permission
- 状态：completed
- 创建日期：2026-05-02
- 计划来源：`plan.md`（已批准）

## 任务说明

在 F001 平台骨架之上实现身份、组织、权限与审计的 MVP 基线，为后续数据资产、标注、训练、模型、推理、边缘下发和监控审计模块提供统一的用户上下文、权限词表、默认拒绝策略和审计义务。

## 复用方案

- 复用审查已完成：优先复用 `backend/`、`frontend/`、`docs/features/`、MockMvc 测试、Vitest `App.test.tsx`、现有 `/api/health` 风格控制器组织方式，再新增 F002 专用边界。
- 复用 `backend/` Spring Boot 3 模块化单体，不新增身份服务。
- 复用 `com.yfind.aiplatform` 包根，新增 `identity/`、`organization/`、`permission/`、`audit/` 包作为共享边界。
- 复用 `frontend/` React + TypeScript + Ant Design 原型，不新增前端工程。
- 复用现有 Vitest、MockMvc、Maven、ai-scaffold 门禁。
- 复用 `TODO_CONFIRM_*` 占位规则，不猜测真实 IAM/SSO 配置。
- 暂不复用 `ai-adapter/` 做认证授权；F002 的平台权限源由主后端负责。

## 验收项

- [x] AC-01：`plan.md` 已批准，规划证据、PRD、test-spec 可追溯。
- [x] AC-02：后端新增 identity、organization、permission、audit 边界。
- [x] AC-03：提供 `GET /api/auth/status` 与 `GET /api/auth/me` 当前用户/认证状态 API。
- [x] AC-04：提供 MVP 权限词表与权限检查 API，未知权限默认拒绝。
- [x] AC-05：提供登录、角色权限变更、高风险拒绝访问的审计义务输出。
- [x] AC-06：前端组织权限页展示用户上下文、角色和模块权限门禁。
- [x] AC-07：IAM/SSO 生产值保持 `TODO_CONFIRM_*`，不写入猜测值。
- [x] AC-08：后端、前端、AI Adapter 和 scaffold 门禁通过。

## 完成记录

- 完成日期：2026-05-02
- 验证报告：`reports/verification.md`

## 范围外

- 真实企业 SSO、Keycloak、LDAP、SCIM、MFA、密码重置、真实 session/token 管理。
- 生产级 PostgreSQL 权限表迁移和管理员初始化流程。
- 业务对象行级/列级权限。
- `ai-adapter/` 内部服务认证实现。
