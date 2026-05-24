# Bug Fix Report

## Bug Information

- ID：BUG-20260520-session-refresh-login
- Title：刷新页面后需要重新登录
- Severity：Major

## Analysis

- Root Cause：前端登录态只保存在 Zustand 内存状态和 `platformApi` 模块变量中，刷新页面后丢失；启动流程没有通过本地会话和 `/auth/me` 恢复当前用户。
- Affected Files：
  - `frontend/src/features/platform/sessionStore.ts`
  - `frontend/src/features/platform/platformApi.ts`
  - `frontend/src/App.test.tsx`
- Related Features：F006 platform identity frontend；所有受保护页面登录态恢复。

## Solution

- Approach：增加前端会话持久化与启动恢复逻辑。
- Changes Made：
  - `sessionStore.ts`：登录保存 `accessToken/refreshToken/expiresAt`；启动时读取本地会话，调用 `/auth/me` 恢复用户，临期时调用 `/auth/refresh`；失败或登出时清理会话。
  - `platformApi.ts`：补充 `refresh()` API 封装。
  - `App.test.tsx`：新增刷新恢复和临期刷新两个回归测试，mock `/auth/me` 与 `/auth/refresh`。

## Testing

- [x] 复现测试已添加：`restores session from localStorage after page refresh`
- [x] 临期刷新测试已添加：`refreshes an expiring stored session before rendering protected pages`
- [x] 单元测试通过：`npm --prefix frontend run test:ci`
- [x] Lint 通过：`npm --prefix frontend run lint`，保留既有 `AppNavigation.tsx` fast-refresh warning，无 error
- [x] E2E 回归通过：`npm --prefix frontend run e2e -- platform-identity-audit.spec.ts`

## Contract Change

- [x] 不涉及契约变更
- [ ] 契约已更新：不适用

## Verification

- [x] Bug 已修复
- [x] 无已知功能副作用
- [x] 文档已更新

## Remaining Risk

当前按既有后端能力实现，`/auth/refresh` 仍依赖 Authorization 中的 access token；如果 access token 已过期，前端会清理会话并要求重新登录。生产更推荐后端支持 refresh token 独立换取 access token，并将长期凭证放入 HttpOnly Cookie。
