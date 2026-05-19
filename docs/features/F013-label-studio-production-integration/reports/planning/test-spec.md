> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-label-studio-production-integration.md`

﻿# RALPLAN Test Spec: F013 Label Studio 生产化联通

## 1. 测试目标

验证 F013 在 F012 标注控制面基础上实现真实、可配置、安全、可诊断的 Label Studio 联通：项目同步、任务同步、结果导入、失败诊断、审计、前端展示和本地 Docker sandbox 验证。

## 2. 测试矩阵

| ID | AC | 层级 | 场景 | 前置条件 | 期望结果 |
| --- | --- | --- | --- | --- | --- |
| T-P0-01 | AC-01 | 后端单测 | 未配置 fallback | `enabled=false` 或 baseUrl/token 缺失 | 返回 `UNCONFIGURED`，diagnostic 包含 `TODO_CONFIRM_*`，HTTP client 未被调用 |
| T-P0-02 | AC-02 | 后端集成 | 同步 project 成功 | fake/sandbox Label Studio 返回 project id | `annotation_external_binding.external_project_id`、`launch_url`、`PROJECT_SYNCED` 持久化 |
| T-P0-03 | AC-02 | 后端集成 | project sync 幂等 | binding 已有 external project id | 不重复创建 project，返回既有映射或执行 update/status |
| T-P0-04 | AC-03 | 后端集成 | 同步 task 成功 | work item 存在，project 已同步 | 新增/更新 work item external task 映射，状态 `TASK_SYNCED` |
| T-P0-05 | AC-03 | 后端集成 | task sync 幂等 | 同一 work item 已有 external task id | 不重复创建 task，返回既有 external task url |
| T-P0-06 | AC-04 | 后端集成 | 导入结果成功 | fake/sandbox 返回 JSON annotation with `annotations.result` | `annotation_work_item.annotation_json` 回写，状态进入 F012 审核链路 |
| T-P0-07 | AC-04 | 后端集成 | 导入后发布链路 | 所有 work item 已导入并通过审核 | F012 `quality-check`/`publish-dataset` 仍生成 `ANNOTATED` 数据集和血缘 |
| T-P0-08 | AC-05 | 后端单测 | 401/403 | Label Studio 返回 401/403 | 返回 `LABEL_STUDIO_AUTH_FAILED`，写 `ANNOTATION_LABEL_STUDIO_SYNC_FAILED` 审计 |
| T-P0-09 | AC-05 | 后端单测 | 网络超时 | HTTP client timeout | 返回 `LABEL_STUDIO_UNREACHABLE` 或 `TIMEOUT`，可重试标记为 true |
| T-P0-10 | AC-05 | 后端单测 | label config 非法 | Label Studio validation 4xx | 返回 `LABEL_STUDIO_SCHEMA_REJECTED`，不保存成功状态 |
| T-P0-11 | AC-05 | 后端单测 | 结果未完成 | export 为空或无 annotation | 返回 `LABEL_STUDIO_RESULT_NOT_READY`，work item 不被错误覆盖 |
| T-P0-12 | AC-06 | 安全测试 | token 防泄露 | 设置 fake token | DB、API JSON、日志捕获中不包含明文 token，只出现 secretRef/脱敏值 |
| T-P0-13 | AC-07 | 前端 E2E | `/ann` project 状态 | mock API 返回 `PROJECT_SYNCED` | 页面显示 project id/打开入口/同步时间，不显示 `UNCONFIGURED` |
| T-P0-14 | AC-07 | 前端 E2E | `/annwork` task 状态 | mock API 返回 task launch URL | 页面显示“打开 Label Studio task”入口和导入提示 |
| T-P0-15 | AC-07 | 前端 E2E | 失败诊断 | mock API 返回 `AUTH_FAILED` | Alert 展示认证失败诊断，不显示同步成功 toast |
| T-P1-01 | AC-08 | 本地集成 | Docker Label Studio project sync | `docker compose ... label-studio` 已启动并配置 token | 后端调用真实容器创建/复用 project，有验证记录 |
| T-P1-02 | AC-08 | 本地集成 | Docker Label Studio task sync/import | sandbox project/task 可访问 | work item 映射与结果导入可复现；若 token 未配置则记录 blocked evidence |
| T-P1-03 | AC-09 | 门禁 | scaffold gate | 完成实现后 | `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F013-label-studio-production-integration --run-e2e` 通过 |

## 3. 回归范围

- F012 标注任务创建、模板发布、工作台草稿/提交、审核、防自审、质量检查、发布数据集必须继续通过。
- F009 数据集 ACTIVE 校验、版本/文件/血缘不能被破坏。
- F006 权限、BU 隔离、审计查询继续通过。
- F012 `UNCONFIGURED` 行为在配置缺失时仍保留。

## 4. 安全测试要求

- 对所有 API response 执行 token 字符串扫描。
- 对测试数据库关键表执行 token 字符串扫描。
- 对捕获日志执行 token 字符串扫描。
- 验证无权限用户无法触发 `sync-project`、`sync-task`、`import-results`。
- 验证跨 BU 任务不可见或 403，并写审计。

## 5. 观测与诊断要求

- 每次 sync/import 记录 diagnosticCode、diagnosticMessage、lastSyncAt/lastImportAt。
- 失败审计至少包含 taskId、workItemId（如适用）、provider、diagnosticCode、trace tag。
- 前端错误提示应显示可操作诊断，不暴露 token、内部栈或完整外部响应体。

## 6. 官方 API 约束映射

- Project create 测试必须发送 `label_config`，并断言返回 id。
- Task create/import 测试必须保证 `data` key 与 label config 中 `$image`/`$text` 等变量匹配。
- Export/import 测试默认 JSON，校验 `annotations.result` 结构；大规模 snapshot export 只作为后续风险，不作为 P0 必须实现。

## 7. 质量门禁命令草案

```powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F013-label-studio-production-integration
./mvnw -f backend/pom.xml test
npm --prefix frontend test
npm --prefix frontend run build
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F013-label-studio-production-integration --run-e2e
```

## 8. 不通过条件

- 任何路径伪造 Label Studio 成功但没有 external id 或 API 响应证据。
- 明文 token 出现在 DB、响应、日志或前端。
- `sync-task` 重复创建多个 Label Studio task 且无幂等约束。
- 导入结果绕过 F012 审核/质量检查/发布规则。
- 配置缺失时抛 500 或误显示成功。
