# 测试计划：刷新页面后登录态保持

## 测试目标

验证用户刷新页面后不会因为前端内存状态重置而被迫重新登录，并覆盖正常恢复、临期刷新和回归路径。

## 测试用例

| 用例 ID | 场景 | 前置条件 | 步骤 | 预期结果 |
| --- | --- | --- | --- | --- |
| TC-01 | 有效本地会话恢复 | `localStorage` 存在未过期 `smp.session.v1` | 直接打开 `/usermgmt` | 调用 `/auth/me` 恢复用户，展示平台壳和用户信息，不显示登录页 |
| TC-02 | 临期会话自动刷新 | `localStorage` 存在 60 秒内过期的会话 | 直接打开 `/usermgmt` | 调用 `/auth/refresh`，本地 token 更新为新 token，进入受保护页面 |
| TC-03 | 登录后写入本地会话 | 无本地会话 | 登录成功 | `localStorage` 写入 `accessToken/refreshToken/expiresAt`，菜单和页面正常 |
| TC-04 | 登出清理会话 | 已登录 | 执行登出 | 内存和本地会话清理，后续访问受保护页面回到登录页 |
| TC-05 | 身份权限回归 | 已登录超级管理员 | 访问用户管理、权限管理 | 页面仍按权限展示菜单与内容 |

## 自动化验证

- `npm --prefix frontend run test:ci`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run e2e -- platform-identity-audit.spec.ts`

## 风险回归关注

- 浏览器禁用本地存储时，登录不应被阻断，只是刷新后无法保持会话。
- 本地 token 无效或后端会话已撤销时，应清理本地会话并要求重新登录。
- `localStorage` 存储 token 存在 XSS 暴露风险，生产方案建议升级为 HttpOnly Cookie 或后端 refresh-token 专用交换策略。
