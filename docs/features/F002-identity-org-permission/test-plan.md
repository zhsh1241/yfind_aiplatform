# 测试计划：身份、组织与权限基线

## 范围

覆盖 F002 的后端 API、权限默认拒绝、审计义务和前端组织权限原型门禁展示。

## 后端测试

- `AuthControllerTest`
  - AC-03：`GET /api/auth/status` 返回本地开发主体和 `TODO_CONFIRM_*` IAM 占位。
  - AC-03：`GET /api/auth/me` 返回当前用户、组织、角色、权限。
  - AC-04：`GET /api/auth/permissions` 返回 MVP 权限词表，包含高风险权限标记。
  - AC-04：`GET /api/auth/check` 对未知权限默认拒绝。
- `AuditControllerTest`
  - AC-05：`GET /api/audit/events` 返回登录、角色权限变更、高风险拒绝访问审计义务。

## 前端测试

- `App.test.tsx`
  - AC-06：点击“组织权限”后展示当前用户上下文和权限门禁矩阵。
  - 回归：导航、上传、训练、部署、推理图表和流程节点点击效果保持可用。

## 门禁

- AC-01：`check-build-feature-prereqs` 验证 plan 批准与规划证据存在。
- AC-02：`mvn test` 编译并测试新增 `identity/`、`organization/`、`permission/`、`audit/` 包边界。
- AC-07：`AuthControllerTest` 验证 IAM/SSO 仍为 `TODO_CONFIRM_*`。
- AC-08：综合门禁命令验证后端、前端、AI Adapter 与 scaffold。
- `mvn test` / `mvn verify`
- `npm run lint`
- `npm run test:ci`
- `npm run build`
- `python -m unittest discover -s tests -v`
- `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F002-identity-org-permission`
- `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F002-identity-org-permission`
- `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F002-identity-org-permission --skip-code-review-verdict`
