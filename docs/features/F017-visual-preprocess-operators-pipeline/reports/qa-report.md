# F017 QA 验收报告

- Feature: F017-visual-preprocess-operators-pipeline
- Tester: Codex
- Date: 2026-05-26
- Result: PASS

## 验收范围

- 算子广场图片/视频视觉预处理算子展示与筛选。
- Pipeline 运行后生成预处理结果、确认、激活。
- 激活后的预处理数据集进入标注来源列表。
- 标注工作台对图片型预处理数据集的后续使用。

## 结果摘要

1. 前端 Vitest 30/30 通过。
2. Playwright：
   - `pipeline-editor-operator-marketplace.spec.ts` 通过；
   - `annotation-integration.spec.ts` 通过。
3. 后端测试此前已全绿，且视觉预处理相关定向回归通过。

## 风险备注

- 浏览器执行期间仍打印若干 Ant Design 弃用 warning，但未影响功能行为与断言结果。
- 本期仍使用 `TODO_CONFIRM_*` seam 表达外部执行引擎/HTTP endpoint 未确认事实，符合仓库约束。
