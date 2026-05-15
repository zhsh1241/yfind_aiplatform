# Test Plan: 前端工程底座

## 1. Test Scope

- Feature: F004-frontend-foundation
- Contract version: v1
- Business references: `docs/business/原型页面完成度清单.md`, `docs/business/SMP平台-原型与规格综合评审报告.md`, `docs/business/api/01-API接口规范.md`
- Prototype references: `docs/prototype/SMP工业AI平台-原型v2.html`, `docs/prototype/SMP工业AI平台-原型v2-compiled.html`, `docs/prototype/*.png`

## 2. P0 - Blocking

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-01 | 前端工程可静态验证 | 执行 `npm run lint`, `npm run test:ci`, `npm run build` | 全部通过 |
| T-P0-02 | AC-02 | 原型导航项存在 | 渲染 `App` 单测 | 能看到 `数据集管理`、`模型市场` 等中文导航 |
| T-P0-03 | AC-03 | 后端未启动时 shell 仍可渲染 | mock API 请求失败 | 状态卡显示 `smp-frontend` fallback |

## 3. P1 - Important

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-04 | 原型路由可达 | Playwright 打开 `/` 并点击 `模型市场` | 页面显示 key `hub` |
| T-P1-02 | AC-02 | 页面 key 保持完整 | 检查 `prototypePages` | 25 个 key 与 `FEATURE_BREAKDOWN.md` 一致 |

## 4. P2 - Nice to Have

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-04 | AI scaffold frontend gate | 执行 `node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration` | frontend lint/test/build 被执行 |

## 5. Cross-cutting Verification

- Permission: 当前菜单不裁剪；F006 实现权限后补充权限失败和菜单可见性测试。
- Audit: 本功能无审计事件。
- Business rules: 本功能不实现业务 MUST；后续页面 feature 必须覆盖。
- NFR: 构建、单测、E2E smoke 和 Docker/nginx 入口为后续交付基线。
- Frontend visual/prototype parity: 当前只验收信息架构与 route key；视觉 parity 后续逐页验收。

## 6. Traceability

- AC-01 -> T-P0-01
- AC-02 -> T-P0-02, T-P1-02
- AC-03 -> T-P0-03
- AC-04 -> T-P1-01, T-P2-01