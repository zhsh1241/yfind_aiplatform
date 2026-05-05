# 验证报告：数据资产 MVP

## 验证日期

2026-05-05

## 实现范围

- 后端新增 `dataset/` 领域包，提供数据集列表、详情、上传、申请、审批与请求列表 API。
- 前端数据资产工作台支持列表、搜索、筛选、本地上传、元数据展示、样例预览、下载申请与审批交互。
- F004 明确采用数据集级查看权限、版本级下载权限，以及 hash、去重策略、异步处理状态展示。
- 存储策略采用抽象接口 + 本地事件日志持久化回放，真实对象存储接入延后到后续 feature。

## 自动化验证结果

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F004-dataset-asset-mvp` | 通过 | `plan.md` 已批准，规划归档完整。 |
| `mvn -f backend/pom.xml test -q` | 通过 | 后端测试通过，覆盖列表、详情、上传、申请、审批等主流程。 |
| `npm run lint` | 通过 | 前端 TypeScript 类型检查通过。 |
| `npm run test:ci` | 通过 | 前端 1 个测试文件、10 个用例通过。 |
| `npm run build` | 通过 | Vite 生产构建成功；页面/弹窗已懒加载拆分，仍存在 Ant Design vendor chunk warning。 |
| `npm run e2e` | 通过 | Playwright 真实浏览器用例 2 个通过，覆盖烟雾与数据资产闭环。 |
| `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F004-dataset-asset-mvp` | 通过 | `contract.md` 状态为 `implemented`。 |
| `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F004-dataset-asset-mvp` | 通过 | `TASK.md` 验收项已追溯到自动化测试。 |
| `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F004-dataset-asset-mvp` | 通过 | feature artifact 校验、后端 verify、ai-adapter 单测、前端 lint/test/build 全部通过。 |

## 验收项追踪

- AC-01：后端提供列表、详情、上传、申请审批与请求列表 API。
- AC-02：详情与审批链路体现数据集级查看 / 版本级下载分层权限。
- AC-03：上传结果返回 hash、去重策略、异步处理状态，并通过事件日志回放保留状态。
- AC-04：前端覆盖搜索/筛选、样例预览、上传、下载申请与审批交互。
- AC-05：后端 `DatasetControllerTest` 与前端 `App.test.tsx` 已建立 `TASK-dataset-asset-mvp` / `AC-xx` 追踪。
- AC-06：契约、测试计划、SQL 说明、代码审查报告、验证报告与最终 gate 均已闭环。

## 已知限制

- 当前后端为本地事件日志持久化，不是数据库级事务持久化。
- 默认仅保证图片样例预览，非图片文件退化为元数据说明。
- 对象存储引用、外部系统同步、数据源连接测试明确不在 F004 范围内。
- Vite 构建仍存在 Ant Design 相关 chunk warning；经页面/弹窗懒加载与保守 vendor 分组后，`index` 入口已降至约 13.6 kB、最大 `antd-core` chunk 降至约 584 kB，但第三方依赖图仍触发循环拆包提示。
