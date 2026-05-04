# Test Plan: 数据资产 MVP

## Metadata
- Feature: F004-dataset-asset-mvp
- Status: completed
- Contract: `docs/features/F004-dataset-asset-mvp/contract.md`
- Trace Tag: `TASK-dataset-asset-mvp`

## Test Scope
- 后端数据集列表、详情、上传、申请审批 API。
- 后端 hash、去重策略、异步任务状态与权限分层输出。
- 前端数据资产页搜索、上传弹窗、详情/预览、申请审批交互。

## Reuse Regression Focus
- Which reused seams must stay backward compatible:
  - F002 权限词表与本地管理员默认权限
  - 既有前端模块导航与数据资产入口
- Regression risks introduced by reusing existing behavior:
  - 数据资产模块增强不能破坏 F003 其他模块交互
  - 新增后端控制器不能影响 F002 认证/权限接口
- Tests that prove reused paths still work:
  - `AuthControllerTest`
  - `App.test.tsx` 中原有 F003 用例继续执行

## P0
| ID | Scenario | Verification |
|----|----------|--------------|
| T1 | AC-01 列表接口返回数据集摘要与权限状态 | MockMvc `GET /api/datasets` |
| T2 | AC-01/AC-02 详情接口返回版本、文件、申请、处理状态 | MockMvc `GET /api/datasets/{key}` |
| T3 | AC-01/AC-03 上传接口生成新版本并返回 hash/去重/任务状态 | MockMvc `POST /api/datasets/upload` |
| T4 | AC-01/AC-02 审批接口将申请更新为 approved 并授予版本下载 | MockMvc `POST /api/datasets/access-requests/{id}/approve` |
| T5 | AC-04 前端数据资产页面支持搜索、上传弹窗、申请与审批入口 | Vitest + Testing Library |

## P1
| ID | Scenario | Verification |
|----|----------|--------------|
| T6 | AC-04 图片样例预览与非图片退化展示 | Vitest + Testing Library |
| T7 | AC-05 既有 F003 交互继续通过 | Vitest 原有回归用例 |
| T8 | AC-06 feature gate 通过 | `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F004-dataset-asset-mvp` |

## Traceability
- AC-01 -> T1, T2, T3, T4
- AC-02 -> T2, T4
- AC-03 -> T3
- AC-04 -> T5, T6
- AC-05 -> T1, T2, T3, T4, T5, T6, T7
- AC-06 -> T8

## Execution Notes
- Automated tests for this feature include `TASK-dataset-asset-mvp`.
- New feature permission coverage reuses `dataset:read` and `dataset:manage`, with local admin default allow.
- SQL notes are stored under `docs/features/F004-dataset-asset-mvp/sql/`.
- Backend: `mvn -f backend/pom.xml test`
- Frontend: `Push-Location frontend; npm run lint; npm run test:ci; npm run build; Pop-Location`
- E2E: 当前仓库仍使用 placeholder 命令，限制需在验证报告记录。
