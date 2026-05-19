# F011 QA 验收与完整测试报告

- **Feature**: `F011-pipeline-editor-operator-marketplace`
- **报告时间**: 2026-05-18 23:50（Asia/Shanghai）
- **Verdict**: PASS
- **测试对象**: 完整 Pipeline 编辑器、算子市场、自定义算子审核、Pipeline 运行与血缘输出。
- **原型依据**: `docs/prototype/SMP工业AI平台-原型v2.html` 的 `pipeline`、`opmarket`、`dsdetail`、`lineage`。
- **实现依据**: `docs/features/F011-pipeline-editor-operator-marketplace/{plan.md,TASK.md,contract.md,test-plan.md}`。

## 1. 总体结论

F011 已完成 F010 留出的完整 Pipeline 能力缺口：

- `/pipeline` 已按原型信息架构展示工具栏、算子库、DAG 画布、节点配置、运行历史、版本快照、全局变量。
- Pipeline DAG、节点、边、变量、版本和运行记录已由后端 API 与数据库持久化；沙箱运行成功后生成输出数据集、文件占位和 `PIPELINE` 血缘。
- `/opmarket` 已支持分类、搜索、算子详情、参数 schema、Before/After、使用统计、自定义 HTTP 算子注册与审核 seam。
- 权限、BU 隔离、DAG 校验、明文 secret 拒绝和审计路径已有后端测试覆盖。
- 前端 E2E 共 11 个用例通过，新增 F011 主链路用例并保持 F009/F010/F008/F006/F007 回归用例可用。

## 2. 原型对比矩阵

| 原型位置 | 原型能力 | F011 实现结果 | 结论 |
| --- | --- | --- | --- |
| `pipeline` 顶部工具栏 | 选择 Pipeline、保存、运行、添加算子 | 已实现 Pipeline selector、添加算子、保存、保存快照、沙箱运行 | PASS |
| `pipeline` 左侧算子库 | 算子搜索、分类卡片、拖入/添加节点 | 已实现算子库搜索与卡片点击添加；添加抽屉支持完整列表 | PASS_WITH_NOTES：拖拽入画布用点击添加替代，节点本身可拖拽移动。 |
| `pipeline` DAG 画布 | 可视化节点、连线、节点选择/移动 | 已用 SVG 连线 + HTML 节点实现 DAG 展示、选择与移动 | PASS_WITH_NOTES：非专业图库，满足原型级交互。 |
| `pipeline` 右侧配置 | 节点参数、状态、验证反馈 | 已展示算子、阶段、状态、JSON 参数编辑与校验提示 | PASS |
| `pipeline` 运行历史 | run 状态、耗时、输出、诊断 | 已展示 run 表，并由沙箱 runner 生成记录 | PASS |
| `pipeline` 版本快照 | 保存快照、回滚 | 已支持保存版本与恢复草稿 | PASS |
| `pipeline` 全局变量 | literal/env/secret 变量 | 已展示变量类型、来源、masked 值和必填状态；后端拒绝明文 secret | PASS |
| `opmarket` 算子广场 | 分类、搜索、详情、schema、示例、统计 | 已实现分类侧栏、关键词、详情抽屉、参数 schema、Before/After、调用/引用/错误率 | PASS |
| `opmarket` 自定义算子 | 注册、提交审核、审核状态 | 已实现 HTTP 自定义算子创建、提交、批准、驳回 API 与前端入口 | PASS |
| `dsdetail/lineage` | Pipeline 输出血缘链路 | 沙箱运行写入输出数据集、版本、文件占位和 `PIPELINE` 血缘 | PASS |

## 3. 验收项覆盖

| AC | 验收要求 | 结果 | 证据 |
| --- | --- | --- | --- |
| AC-01 | `/pipeline` 展示工具栏、算子库、DAG 画布、节点配置、运行历史、版本快照、全局变量 | PASS | `pipeline-editor-operator-marketplace.spec.ts` 可见性断言；前端实现 `DataPipelineStandardPage`。 |
| AC-02 | 可从算子库/抽屉添加算子，节点可移动，保存持久化 DAG | PASS | E2E 添加“归一化”节点；后端 `PUT /api/v1/pipelines/{id}` 测试持久化。 |
| AC-03 | 可编辑节点参数/全局变量，保存快照并回滚 | PASS | 前端 JSON 配置编辑、版本表回滚按钮；后端版本保存/恢复测试。 |
| AC-04 | 可发起测试运行并生成 run/node_run/日志摘要 | PASS | E2E 沙箱运行；后端 run/node_run 断言。 |
| AC-05 | 运行成功生成输出数据集、版本、文件占位和血缘，不破坏 F010 | PASS | 后端测试断言输出数据集/血缘；E2E 全量 11 tests passed，含 F010 回归。 |
| AC-06 | `/opmarket` 支持分类、搜索、详情、schema、示例、统计 | PASS | F011 E2E 覆盖算子广场、HTTP 安全说明、schema、Before/After、引用Pipeline数。 |
| AC-07 | 自定义算子可提交审核，HTTP endpoint/凭据安全保存 | PASS | 前端提交审核 API 响应；后端拒绝明文凭据并支持审核状态转换。 |
| AC-08 | 权限不足、跨 BU、无效 DAG、明文密钥拒绝并审计 | PASS | 后端 `pipelineEditorRejectsInvalidDagSecretsAndCrossBuAccess` 覆盖。 |

## 4. 测试执行记录

| 命令 | 结果 | 摘要 |
| --- | --- | --- |
| `node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F011-pipeline-editor-operator-marketplace` | PASS | plan 已批准，planning evidence 存在。 |
| `$env:JAVA_HOME='C:\java\jdk-25'; mvn -q -f backend/pom.xml -pl smp-app test` | PASS | 后端测试通过，Flyway 8 个 migration 成功应用。 |
| `npm --prefix frontend run lint` | PASS | 0 error，1 个既有 Fast Refresh warning。 |
| `npm --prefix frontend run build` | PASS | TypeScript + Vite build 成功，chunk-size warning 非阻塞。 |
| `npm --prefix frontend run test:ci -- --runInBand` | PASS | 1 file / 6 tests passed；jsdom CSS parse warnings 非阻塞。 |
| `npm --prefix frontend run e2e` | PASS | 11 tests passed。 |
| `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F011-pipeline-editor-operator-marketplace` | PASS | AC traceability check passed。 |
| `node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F011-pipeline-editor-operator-marketplace` | PASS | contract frozen，ready for development。 |
| `node tools/ai-scaffold/dist/cli.js check-code-review-verdict docs/features/F011-pipeline-editor-operator-marketplace` | PASS | Verdict: PASS_WITH_COMMENTS。 |
| `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F011-pipeline-editor-operator-marketplace --skip-backend-integration --run-e2e` | PASS | 后端 29 tests、AI adapter 4 tests、前端 unit 6 tests、E2E 11 tests，Quality gate passed。 |

## 5. 已知风险 / 后续项

- 真实生产调度未接入：F011 是控制平面 + 沙箱 runner，生产调度目标保留 `TODO_CONFIRM_PIPELINE_SCHEDULER_TARGET`。
- 正式 136+ 算子清单未确认：当前 seed 原型核心算子并保留 `TODO_CONFIRM_OPERATOR_CATALOG_SOURCE`。
- HTTP 算子不会真实处理生产数据：安全策略保留 `TODO_CONFIRM_OPERATOR_HTTP_SECURITY_POLICY`，凭据仅允许 secretRef / TODO_CONFIRM。
- 画布不是专业 DAG 库：已满足原型级拖拽/连线/配置/保存/运行；高级布局和撤销重做建议后续独立评估。

## 6. QA 结论

F011 满足本期验收标准，可进入最终质量门禁与交付收尾。
