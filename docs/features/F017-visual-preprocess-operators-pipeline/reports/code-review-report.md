# F017 代码审查报告

- Feature: F017-visual-preprocess-operators-pipeline
- Reviewer: Codex
- Date: 2026-05-26
- Verdict: PASS_WITH_COMMENTS

## 审查范围

- 后端：视觉预处理 Pipeline 结果集生成、确认/激活、标注来源约束、审计兼容。
- 前端：Pipeline 编辑器、算子广场、标注来源选择、工作台/测试同步。
- 文档：`plan.md`、`TASK.md`、`contract.md`、`test-plan.md`。

## 结论

1. 已按冻结方案实现图片/视频视觉预处理算子与 `PREPROCESSED` 数据集闭环。
2. 已显式落实：
   - 图片质量提高一期仅传统增强；
   - 预览水印 / 产物水印分离；
   - 视频抽帧默认输出图片型预处理数据集；
   - 运行成功后需人工确认再激活。
3. 标注来源校验已覆盖 `DAT-005`、`DAT-007`、`DAT-009`、`DAT-012` 的实现约束。

## 评论

- Playwright 断言已收敛到更稳定的精确定位，避免因重复文案导致 strict mode 失败。
- 现有前端仍存在若干 Ant Design 弃用 warning（`Space.direction`、`Alert.message/title`、`Drawer.width/size`），不阻断本功能交付，但建议后续统一清理。

## 验证摘要

- `mvn -q -f backend/pom.xml -pl smp-app test`
- `npm --prefix frontend run test:ci -- --pool=forks --poolOptions.forks.singleFork=true`
- `cd frontend; npx playwright test e2e/pipeline-editor-operator-marketplace.spec.ts`
- `cd frontend; npx playwright test e2e/annotation-integration.spec.ts --workers=1`
