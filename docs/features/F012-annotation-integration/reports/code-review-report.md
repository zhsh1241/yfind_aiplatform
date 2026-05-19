# F012 代码审查报告

- **Feature**: `F012-annotation-integration`
- **审查时间**: 2026-05-19（Asia/Shanghai）
- **Verdict**: PASS_WITH_COMMENTS
- **审查范围**: Annotation 后端 API/service/DTO、Flyway V9、前端 `/ann`/`/annwork`/`/annreview`、E2E mock 与用例、F012 文档产物。

## 1. 总体结论

F012 实现与批准计划、冻结契约和测试计划一致，未发现阻塞交付的问题：

- 后端新增 Annotation 控制面，关键状态流转和业务规则在 service 层强制校验，不仅依赖前端。
- `ANNOTATED` 数据集发布复用 F009 数据集/版本/文件/血缘表，避免平行数据模型。
- Label Studio 与 AI 预标注在未知外部参数下保持可诊断 seam，不伪造生产同步成功。
- 前端保持原型 IA 和中文文案语义，新增路由均由 API 驱动。
- 自动化测试覆盖 AC-01~AC-08，包含正向闭环、规则失败、跨 BU 与 E2E 主路径。

## 2. 放行检查

| 检查项 | 结论 | 说明 |
| --- | --- | --- |
| 需求/契约一致性 | PASS | `contract.md` frozen；API、DTO、权限和错误路径与实现一致。 |
| 后端规则强制 | PASS | DAT-003、DAT-004、DAT-009、DAT-010、DAT-012 在 `AnnotationService` 校验并写审计。 |
| 数据模型复用 | PASS | 发布结果写入 `dataset`、`dataset_version`、`platform_file_object`、`dataset_file`、`data_lineage`。 |
| 外部 seam 安全 | PASS | Label Studio adapter 未配置时返回 `UNCONFIGURED` 和 `TODO_CONFIRM_*`，不保存 token 明文。 |
| 前端一致性 | PASS_WITH_COMMENTS | 三个原型页面已落地；完整像素级画布/绘制器不在本期范围。 |
| 测试覆盖 | PASS | 后端测试、Vitest、Playwright E2E 和 traceability 覆盖已补齐。 |

## 3. 审查发现

### 阻塞问题

无。

### 非阻塞建议

1. 后续接入真实 Label Studio 时，应将 `UnconfiguredLabelStudioAnnotationAdapter` 替换为受配置驱动的 adapter，并保留当前失败诊断语义。
2. 若后续需要复杂图像框选、分割、多媒体帧标注，应独立规划前端画布/外部工具嵌入能力，避免在当前控制面中堆叠。
3. `AnnotationService` 当前集中承载任务、模板、工作项、审核和发布逻辑；后续功能扩展时可拆分为 Task/Template/Review/Publication 子 service。
4. Playwright 使用网络响应断言验证 AntD message 触发后的关键接口结果，避免依赖短暂 toast 文本；这是当前稳定性取舍。

## 4. 主要证据

- `mvn -q -f backend/pom.xml -pl smp-app test -DskipTests=false`：PASS。
- `npm --prefix frontend run lint`：PASS，1 个既有 Fast Refresh warning。
- `npm --prefix frontend run build`：PASS，Vite chunk-size warning 非阻塞。
- `npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true`：PASS，7 tests passed。
- `npm --prefix frontend run e2e`：PASS，14 tests passed。

## 5. 审查结论

F012 当前实现满足合并前代码审查放行条件。以上建议均为后续增强项，不阻塞本次交付。
