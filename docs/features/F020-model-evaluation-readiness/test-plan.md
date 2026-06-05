# Test Plan: 模型评估结果与发布门禁

## 1. Test Scope
- Feature: F020-model-evaluation-readiness
- Contract version: v1
- Business references: `docs/business/bizdocs/02-02-业务流程-模型开发与训练.md`, `docs/business/rules/02-模型开发规则.md`
- Prototype references: `docs/prototype/SMP工业AI平台-原型v2.html` page key `eval`

## 2. P0 - Blocking
| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-01 AC-02 | 创建评估任务与非法输入防线 | 登录 BU 管理员；创建模型版本；用已发布数据集版本创建评估；再用缺失版本/非法阈值创建 | 合法请求返回 READY；非法请求返回 400/404/422 |
| T-P0-02 | AC-03 AC-04 | 导入结果自动判定与终态保护 | 对 READY run 导入包含阈值指标的结果；重复导入；缺少阈值指标导入 | 达标为 PASSED；重复导入 409；缺指标 422 |
| T-P0-03 | AC-05 AC-06 AC-11 | Production 发布门禁 | 版本进入 TESTING；无 PASSED run 发布；导入 FAILED 后发布；导入 PASSED 后发布 | 前两次阻断并审计；PASSED 后可发布 |
| T-P0-04 | AC-10 | 跨 BU 不可见 | QE 用户访问 CABIN 私有模型评估详情/对比 | 返回 403/404，不泄露报告 |

## 3. P1 - Important
| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-07 | 报告详情 seam | 导入 curveData/confusionMatrix/errorCases/artifact | 详情返回曲线、矩阵、错误样例和 artifact |
| T-P1-02 | AC-08 | 多版本指标对比 | 为同一模型两个版本导入 PASSED/FAILED 指标；调用 compare API | 返回版本对比行并标记 best=true |
| T-P1-03 | AC-09 AC-11 | artifact 下载权限与审计 | 带 `model:evaluation:download` 用户获取 artifact download-url | 返回下载 seam 并写 `MODEL_EVALUATION_ARTIFACT_DOWNLOADED` |
| T-P1-04 | AC-12 | 前端评估页主链路 | 打开 `/eval`，查看列表/详情，导入结果，执行对比 | 页面使用真实 API、空状态/错误态业务化，无原型 mock 文案 |

## 4. P2 - Nice to Have
| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-07 AC-12 | 无记录空状态 | 清空筛选或无评估记录 | 展示“暂无模型评估记录”而非原型说明 |

## 5. Cross-cutting Verification
- Permission: 覆盖 `model:evaluation:read/write/import/download` 与跨 BU 私有模型拒绝。
- Audit: 覆盖 `MODEL_EVALUATION_CREATED`、`MODEL_EVALUATION_RESULT_IMPORTED`、`MODEL_EVALUATION_PASSED/FAILED`、`MODEL_VERSION_PUBLISH_BLOCKED_EVALUATION_REQUIRED`、`MODEL_VERSION_PUBLISH_GATE_PASSED`、`MODEL_EVALUATION_ARTIFACT_DOWNLOADED`。
- Business rules: `MDL-006` 通过后端集成测试验证；`MDL-009` 通过 F019 transition 仍按既有状态机验证。
- NFR: 不新增依赖；分页 pageSize 限制；跨 BU 不泄露不可见版本。
- Frontend visual/prototype parity: `/eval` 保留模型评估信息架构，使用 Ant Design shell 和真实 API。

## 6. Traceability
- AC-01 -> T-P0-01
- AC-02 -> T-P0-01
- AC-03 -> T-P0-02
- AC-04 -> T-P0-02
- AC-05 -> T-P0-03
- AC-06 -> T-P0-03
- AC-07 -> T-P1-01 T-P2-01
- AC-08 -> T-P1-02
- AC-09 -> T-P1-03
- AC-10 -> T-P0-04
- AC-11 -> T-P0-03 T-P1-03
- AC-12 -> T-P1-04 T-P2-01
