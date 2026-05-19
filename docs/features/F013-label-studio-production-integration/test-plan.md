# Test Plan: Label Studio 生产化联通

- Feature: F013-label-studio-production-integration
- Status: active
- Created: 2026-05-19

## 1. 测试目标

验证 F013 实现真实、可配置、安全、可诊断的 Label Studio 联通，并且不破坏 F012 标注任务、审核、质检和发布闭环。

## 2. P0 测试矩阵

| ID | AC | 层级 | 场景 | 期望结果 |
| --- | --- | --- | --- | --- |
| T-P0-01 | AC-01 | 后端 | 未配置 fallback | 返回 `LABEL_STUDIO_UNCONFIGURED` / `UNCONFIGURED`，不调用外部 API |
| T-P0-02 | AC-02 | 后端 | sync-project 成功 | 保存 `externalProjectId`、`launchUrl`、`PROJECT_SYNCED` |
| T-P0-03 | AC-02 | 后端 | sync-project 幂等 | 重复调用不创建重复 project |
| T-P0-04 | AC-03 | 后端 | sync-task 成功 | 保存 `externalTaskId`、`externalTaskUrl`、`TASK_SYNCED` |
| T-P0-05 | AC-03 | 后端 | sync-task 幂等 | `(provider, workItemId)` 只保留一个 external task mapping |
| T-P0-06 | AC-04 | 后端 | import-results 成功 | Label Studio JSON annotation 回写 `annotation_json`，工作项进入 F012 提交流程 |
| T-P0-07 | AC-04 | 后端 | 导入后继续发布 | F012 `quality-check` / `publish-dataset` 仍可生成 `ANNOTATED` 数据集 |
| T-P0-08 | AC-05 | 后端 | 401/403 | 返回 `LABEL_STUDIO_AUTH_FAILED` 并写失败审计 |
| T-P0-09 | AC-05 | 后端 | 网络不可达/超时 | 返回 `LABEL_STUDIO_UNREACHABLE`，`retryable=true` |
| T-P0-10 | AC-05 | 后端 | schema rejected | 返回 `LABEL_STUDIO_SCHEMA_REJECTED`，不保存成功状态 |
| T-P0-11 | AC-05 | 后端 | 结果未完成 | 返回 `LABEL_STUDIO_RESULT_NOT_READY`，不覆盖既有 annotation |
| T-P0-12 | AC-06 | 安全 | fake token 防泄露 | DB/API/诊断/前端不包含 fake token 明文 |
| T-P0-13 | AC-07 | 前端 E2E | `/ann` 项目同步 | 显示 project id、打开入口、同步状态 |
| T-P0-14 | AC-07 | 前端 E2E | `/annwork` task 同步 | 显示 task 打开入口和导入状态 |
| T-P0-15 | AC-07 | 前端 E2E | 失败诊断 | 展示认证/网络/schema 诊断，不显示成功 toast |
| T-P0-16 | AC-08 | 集成 | fake Label Studio server | project/task/import 全链路可复现 |
| T-P0-17 | AC-09 | 门禁 | scaffold gate | feature gate、traceability、contract verify 通过 |

## 3. 回归测试

- F012 annotation E2E：任务列表、模板、工作台提交、审核、发布仍通过。
- F009 dataset/file/lineage：ACTIVE 数据集、文件绑定、血缘生成不回归。
- F006 permission/audit：权限不足、跨 BU 拒绝、审计查询不回归。

## 4. 安全测试

- 用 `SMP_LABEL_STUDIO_TOKEN_VALUE=f013-secret-token` 运行测试。
- 断言 API response 不包含 `f013-secret-token`。
- 查询 `annotation_external_binding` 与 `annotation_external_task_binding`，断言不包含 token。
- 断言前端 DOM 不包含 token。

## 5. 质量门禁命令

```powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F013-label-studio-production-integration
node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F013-label-studio-production-integration
node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F013-label-studio-production-integration
./mvnw -f backend/pom.xml test
npm --prefix frontend run lint
npm --prefix frontend run test:ci
npm --prefix frontend run build
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F013-label-studio-production-integration --run-e2e
```

## 6. 不通过条件

- 未真实调用 fake/sandbox Label Studio 却返回 `PROJECT_SYNCED` / `TASK_SYNCED`。
- 明文 token 出现在数据库、响应、日志或前端。
- 重复同步产生重复 external task mapping。
- 导入结果绕过 F012 审核和质量检查。
- 前端改动未更新 E2E 或破坏原型 IA。
