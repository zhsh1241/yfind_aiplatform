# SQL / Migration Notes：身份、组织与权限基线

F002 暂不创建生产数据库迁移。原因：真实 IAM provider、组织层级、管理员初始化、PostgreSQL 测试库和租户字段仍为 `TODO_CONFIRM_*`。

后续接入数据库时建议表边界：

- `iam_principal_binding`：外部 IAM subject 与平台用户绑定。
- `organization`：组织/租户/部门层级。
- `role`：平台角色。
- `permission`：平台权限词表。
- `role_permission`：角色权限关联。
- `user_role`：用户角色关联。
- `audit_event`：登录、权限变更、拒绝访问和高风险操作审计。

在真实迁移前，未知权限仍必须由服务层默认拒绝。
