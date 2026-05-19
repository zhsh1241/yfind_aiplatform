# Test Plan: 完整 Pipeline 编辑器与算子市场

## 1. Test Scope
- Feature: F011-pipeline-editor-operator-marketplace
- Contract version: v1 frozen
- Business references:
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md` FUNC-DATA-016、017、080~092
- Prototype references:
  - `docs/prototype/SMP工业AI平台-原型v2.html` page key `pipeline`、`opmarket`、`dsdetail`、`lineage`

## 2. P0 - Blocking

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-01 | Pipeline 编辑器原型结构可见 | 登录后进入 `/pipeline` | 标题为 `Pipeline编辑器`，可见顶部工具栏、算子库、DAG 画布、节点配置、运行历史、版本快照、全局变量 |
| T-P0-02 | AC-02 | 添加算子并保存 DAG | 打开添加算子抽屉，选择算子，保存 Pipeline | 页面新增节点；后端 `PUT /pipelines/{id}` 持久化节点/边；返回当前节点数量增加 |
| T-P0-03 | AC-03 | 编辑节点参数、变量并保存版本/恢复 | 修改节点配置和变量，调用保存版本，再恢复版本 | `pipeline_version` 生成快照；恢复后当前 DAG 与快照一致 |
| T-P0-04 | AC-04 | 沙箱运行成功并生成节点日志 | 调用 `POST /pipelines/{id}/runs` | 返回 `SUCCEEDED`、duration、nodeRuns、日志摘要；运行历史可见 |
| T-P0-05 | AC-05 | 输出数据集与血缘 | 运行成功后查询输出数据集详情和血缘 | 生成 `PREPROCESSED` 数据集、`PIPELINE_OUTPUT` 文件、`PIPELINE` 血缘；F010 `STANDARDIZATION` 测试仍通过 |
| T-P0-06 | AC-08 | DAG 业务规则失败 | 保存/运行有环 DAG、缺少必填参数或未知变量 | API 返回 422；审计 `PIPELINE_VALIDATION_FAILED` |
| T-P0-07 | AC-08 | 安全规则拒绝明文 secret | 在变量、节点配置或 HTTP 算子中传 `password=` / `accessKeySecret` | API 返回 422，不落库，写失败审计 |
| T-P0-08 | AC-08 | 权限与 BU 隔离 | 普通 QE 用户访问 CABIN Pipeline；无 operator review 权限审批算子 | 跨 BU 读返回 404 或写返回 403；权限不足返回 403；审计 ACCESS_DENIED 或跨 BU 事件 |

## 3. P1 - Important

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-06 | 算子广场分类与搜索 | 进入 `/opmarket`，按关键词和分类过滤 | 可见算子分类、搜索框、算子卡片、使用统计 |
| T-P1-02 | AC-06 | 算子详情 | 点击算子卡片 | 抽屉展示参数 schema、输入输出、Before/After 示例、引用 Pipeline 数 |
| T-P1-03 | AC-07 | 自定义算子提交审核 | 创建 HTTP 自定义算子，提交审核 | 状态从 `DRAFT` 变为 `SUBMITTED`，审核记录生成 |
| T-P1-04 | AC-07 | 审核通过/驳回 | 管理员 approve/reject 已提交算子 | approve 后 `PUBLISHED`；reject 后 `REJECTED` 且 reason 可见 |
| T-P1-05 | AC-02 | 节点拖拽 | 在画布拖动节点 | 节点位置变化，保存后刷新仍保留坐标 |

## 4. P2 - Nice to Have

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-01 | 原型语义文案完整性 | 检查页面文案 | 可见“添加算子”“拖拽节点可重新排序”“沙箱运行”“AI 助手后续接入”等说明 |
| T-P2-02 | AC-06 | 136+ 正式目录 seam | 查看算子统计说明 | 页面/报告明确 `TODO_CONFIRM_OPERATOR_CATALOG_SOURCE`，不伪造完整清单 |
| T-P2-03 | AC-04 | 失败节点定位 | 构造无效 Pipeline 后运行 | 返回错误节点 ID，前端节点可展示失败状态 |

## 5. Cross-cutting Verification

- Permission:
  - 后端测试覆盖 `data:pipeline:*`、`data:operator:*` 权限不足。
  - 前端 E2E 使用 SUPER_ADMIN mock 覆盖菜单权限 `pipeline` / `opmarket`。
- Audit:
  - 后端测试查询 `platform_audit_log`，断言 `PIPELINE_RUN_SUCCEEDED`、`OPERATOR_SUBMITTED`、`PIPELINE_VALIDATION_FAILED`。
- Business rules:
  - 无环校验、输入节点、算子状态、必填参数、变量引用、明文密钥拒绝。
- NFR:
  - 无新增前端依赖；API 保持 `/api/v1` envelope；错误信息不泄露 stack 或 secret。
- Frontend visual/prototype parity:
  - E2E 覆盖 `/pipeline` 关键区域和 `/opmarket` 分类/详情/提交审核。
  - QA 报告附原型对比矩阵。

## 6. Traceability

- AC-01 -> T-P0-01, T-P2-01
- AC-02 -> T-P0-02, T-P1-05
- AC-03 -> T-P0-03
- AC-04 -> T-P0-04, T-P2-03
- AC-05 -> T-P0-05
- AC-06 -> T-P1-01, T-P1-02, T-P2-02
- AC-07 -> T-P1-03, T-P1-04
- AC-08 -> T-P0-06, T-P0-07, T-P0-08

## 7. Required commands

```powershell
$env:JAVA_HOME='C:\java\jdk-25'; $env:Path="$env:JAVA_HOME\bin;$env:Path"
mvn -q -f backend/pom.xml -pl smp-app test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
npm --prefix frontend run e2e
node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F011-pipeline-editor-operator-marketplace
node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F011-pipeline-editor-operator-marketplace
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F011-pipeline-editor-operator-marketplace --skip-backend-integration --run-e2e
```
