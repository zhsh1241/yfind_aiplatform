# Feature Contract: 前端工程底座

## Contract Metadata
- Version: v1
- Status: implemented
- Owner: contract-architect
- Created: 2026-05-15
- Updated: 2026-05-16
- Feature: F004-frontend-foundation

## 1. Requirement Summary

- 用户目标：恢复可验证的 React 19 / TypeScript 6 管理台前端骨架。
- 业务价值：为后续按原型页面逐项实现业务功能提供路由、布局、API client 和测试基线。
- 业务资料：`docs/business/原型页面完成度清单.md`, `docs/business/SMP平台-原型与规格综合评审报告.md`, `docs/business/api/01-API接口规范.md`
- 原型页面：`docs/prototype/SMP工业AI平台-原型v2.html` 全部 25 个主导航页面。

## 2. Frontend Route Contract

| Domain | Page keys |
|---|---|
| 工作台 | `dash` |
| 数据管理 | `ds`, `ann`, `datasrc`, `annreview`, `lineage`, `pipeline`, `opmarket`, `portal` |
| 模型开发 | `devenv`, `train`, `exp`, `eval`, `hub`, `infer`, `batch` |
| 运营中心 | `sched`, `edge`, `report` |
| 平台管理 | `resource`, `usermgmt`, `org`, `perm`, `alert`, `sys` |

- `/` 必须重定向到 `/dash`。
- 每个 page key 必须渲染 `PrototypePage` 占位卡片，显示中文名称、业务分组和 key。
- 后续业务 feature 替换占位页时必须保留同一 page key，除非有已批准的信息架构变更。

## 3. API Client Contract

### Request

- Base URL: `VITE_API_BASE_URL`，缺省为同源。
- Header: 每次请求设置 `X-Trace-Id`。
- Envelope: 前端类型 `ApiResponse<T>` 与后端 `ApiResponse` 对齐。

### Foundation Status

- Method: `GET`
- Path: `/api/v1/foundation/status`
- Consumer: `FoundationStatusCard`
- Fallback: 仅当后端不可用时显示 `smp-frontend` 工程底座状态，不替代业务数据。

## 4. Compatibility

- Backward compatibility: 旧前端已删除，不提供旧页面兼容。
- Versioning: 路由 key 与原型保持一致；API 默认 `/api/v1`。
- Auth: 真实登录、token 刷新、权限菜单裁剪由 F006 定义。
- Visual parity: 本功能仅建立占位路由；视觉复刻由后续业务 feature 结合截图验收。