# 授权角色治理数据库变更说明

## 适用版本

- Feature：F006-platform-identity-audit
- Migration：`backend/smp-app/src/main/resources/db/migration/V11__authorization_role_governance.sql`
- 日期：2026-05-20

## 变更目标

为满足“BU 权限跟随角色管理，不直接关联用户”和“自定义角色权限不可超越父角色权限上限”，角色表补充父角色上限字段：

```sql
ALTER TABLE platform_role ADD COLUMN parent_role_code VARCHAR(64);
```

## 字段语义

| 字段 | 说明 |
|---|---|
| `parent_role_code` | 自定义角色可选父角色编码；为空表示不设置父角色上限。 |

## 约束

- `parent_role_code` 外键指向 `platform_role(code)`。
- 预设角色保持 `parent_role_code = NULL`。
- 自定义角色创建时若传入父角色，请求权限必须是父角色权限集合的子集。
- 用户授权仍写入 `platform_user_role`，只保存用户、角色、租户与过期时间；不新增用户-BU-权限直连字段。

## 回滚提示

生产回滚需先确认不存在依赖 `parent_role_code` 的自定义角色治理数据，再删除外键、索引和字段；不建议在已有授权数据的环境中直接回滚。
