# F011 代码审查报告

- **Feature**: `F011-pipeline-editor-operator-marketplace`
- **审查时间**: 2026-05-18 23:50（Asia/Shanghai）
- **Verdict**: PASS_WITH_COMMENTS
- **审查范围**: Pipeline/Operator 后端控制平面、Flyway 迁移、前端 `/pipeline` 与 `/opmarket`、E2E mock 与用例、F011 文档产物。

## 1. 总体结论

F011 已按批准计划实现完整 Pipeline 编辑器与算子市场的首版生产级控制平面：

- 后端新增 `PipelineController` / `PipelineService` / `PipelineDtos`，提供 Pipeline 定义、DAG 校验、版本快照、运行历史、节点运行、算子目录与自定义算子审核 API。
- 新增 `V8__pipeline_operator_marketplace.sql`，持久化 operator catalog/review、pipeline definition/version/node/edge/variable/run/node-run，并 seed 权限与样例数据。
- 前端 `/pipeline` 从 F010 标准化单页升级为原型结构：顶部工具栏、算子库、DAG 画布、节点配置、运行历史、版本快照、全局变量；`/opmarket` 替换原占位页并接入真实 API client。
- E2E 已新增 `pipeline-editor-operator-marketplace.spec.ts`，并调整 F010 pipeline 回归用例以适配 F011 菜单语义。

审查未发现阻塞合并的问题；以下事项作为后续优化建议记录，不影响 F011 放行。

## 2. 放行检查

| 检查项 | 结论 | 说明 |
| --- | --- | --- |
| 需求/契约一致性 | PASS | API、页面、E2E 均覆盖 `TASK.md` AC-01~AC-08；`contract.md` 状态 frozen。 |
| 后端分层 | PASS_WITH_COMMENTS | 已从 `DataManagementService` 拆出 Pipeline 专属 service/controller/dtos；后续可继续拆分 Operator 专属 service 以降低单文件体量。 |
| 数据模型复用 | PASS | 输出数据集、版本、文件占位和血缘复用 F009 表；权限/审计复用 F006 seam；未新增平行身份/数据集模型。 |
| 前端原型一致性 | PASS_WITH_COMMENTS | 信息架构、文案语义和主要交互齐备；画布为轻量 SVG/HTML 实现，不是专业 DAG 库。 |
| 安全规则 | PASS | 明文凭据拒绝、secretRef/TODO_CONFIRM 规则、自定义 HTTP 算子审核 seam、跨 BU/权限失败测试均覆盖。 |
| 测试覆盖 | PASS | 后端包含正向与无效 DAG/secret/跨 BU 测试；前端 E2E 覆盖 Pipeline 编辑器和算子广场主路径。 |

## 3. 主要证据

- `mvn -q -f backend/pom.xml -pl smp-app test`：PASS。
- `npm --prefix frontend run lint`：PASS（仅保留既有 `react-refresh/only-export-components` warning）。
- `npm --prefix frontend run build`：PASS（Vite chunk-size warning 为既有体量提示）。
- `npm --prefix frontend run test:ci -- --runInBand`：PASS，1 file / 6 tests passed；jsdom CSS parse warnings 不影响断言。
- `npm --prefix frontend run e2e`：PASS，11 tests passed。
- `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F011-pipeline-editor-operator-marketplace`：PASS。
- `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F011-pipeline-editor-operator-marketplace`：PASS。
- `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F011-pipeline-editor-operator-marketplace --skip-backend-integration --run-e2e`：PASS，Quality gate passed。

## 4. 非阻塞建议

1. 后续真实调度 feature 接入前，应把 `TODO_CONFIRM_PIPELINE_SCHEDULER_TARGET` 转为明确调度适配层，避免前端“沙箱运行”被误读为生产调度。
2. 正式 136+ 算子目录确认后，应新增导入/版本管理流程，替换当前 seed catalog。
3. 如果后续需要缩放、框选、撤销/重做、自动布局，可另立计划评估 DAG 图编辑依赖；F011 当前遵守“无新增依赖”。
4. `PipelineService` 后续可按 Operator catalog、Pipeline definition、Run executor 拆为更细 service，降低维护成本。

## 5. 审查结论

当前实现满足 F011 放行条件。以上建议均为后续增强项，不阻塞本次交付。
