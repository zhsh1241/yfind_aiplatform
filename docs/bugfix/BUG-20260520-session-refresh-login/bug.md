# Bug 说明：刷新页面后需要重新登录

## 基本信息

- Bug ID：BUG-20260520-session-refresh-login
- 标题：已登录用户刷新页面后被重定向到登录页
- 严重级别：Major
- 发现日期：2026-05-20
- 影响范围：前端登录态、平台管理/数据管理/标注工作台等所有受保护页面

## 复现步骤

1. 在前端登录小模型平台。
2. 进入任意受保护页面，例如 `/usermgmt` 或 `/annwork`。
3. 等待页面加载完成后刷新浏览器页面。

## 实际行为

刷新后前端内存状态丢失，`App` 判断 `token/user` 为空，直接跳转 `/login`，用户需要重新登录。

## 预期行为

刷新页面后，如果本地仍有有效会话，应用应自动恢复登录态并停留在目标页面；如果 token 即将过期，应先刷新会话，再进入受保护页面；如果会话无效，才清理本地状态并回到登录页。

## 根因分析

- `sessionStore` 只把 `accessToken/user` 存在 Zustand 内存状态里。
- `platformApi` 的 `accessToken` 是模块级变量，页面刷新后也会丢失。
- `bootstrap()` 原先只设置 `initialized=true`，没有从持久化存储或 `/api/v1/auth/me` 恢复当前用户。

## 修复方案

- 登录成功后把 `accessToken`、`refreshToken`、`expiresAt` 写入 `localStorage`。
- 应用启动时读取本地会话：
  - token 未临期：设置请求头 token，并调用 `/api/v1/auth/me` 恢复用户信息。
  - token 临期：先调用 `/api/v1/auth/refresh` 获取新 token，再保存并恢复用户。
  - 恢复失败：清理内存 token 和本地会话，进入未登录状态。
- 登出时同步清理内存 token 和本地会话。

## 契约变更

不涉及新增或变更后端接口；复用已有：

- `GET /api/v1/auth/me`
- `POST /api/v1/auth/refresh`
