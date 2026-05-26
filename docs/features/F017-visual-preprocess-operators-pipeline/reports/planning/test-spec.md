> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-visual-preprocess-operators-pipeline.md`

# Test Spec: F017 视觉预处理算子与预处理数据集闭环

## 后端测试
- API 集成测试覆盖：
  - 视觉算子目录按数据类型过滤返回。
  - 创建/保存图片或视频预处理 Pipeline。
  - 运行成功后生成 `PREPROCESSED` 数据集、版本、文件清单、血缘。
  - 结果集未激活时不得被标注任务引用（DAT-009）。
  - 缺少 `sourceDatasetId` 或处理参数时禁止发布结果集（DAT-007）。
  - 跨 BU 访问结果数据集返回 404/403（DAT-012 / DAT-006）。
- 异常测试覆盖：
  - 数据类型不兼容算子。
  - 视频抽帧超阈值。
  - 运行失败仅部分成功时的状态与审计。
  - 已发布版本不可修改，只能创建新版本（DAT-005）。

## 前端测试
- 页面集成 / E2E 覆盖：
  - `/opmarket` 可按图片处理/视频处理分类浏览新增算子。
  - `/pipeline` 可选择图片/视频模板并配置关键参数。
  - 运行成功后显示处理摘要、前后对比、结果数据集确认入口。
  - 激活后的预处理数据集出现在标注任务新建页面的数据集下拉中。
  - 未激活结果集不出现在标注来源列表中。

## 规则与审计验证
- DAT-005：发布版本不可原地修改。
- DAT-007：增强/预处理结果必须携带血缘。
- DAT-009：仅 ACTIVE 原始/预处理数据集可被标注任务引用。
- DAT-012：BU 数据隔离。
- 审计事件：Pipeline 创建、运行、结果激活、标注引用。

## 质量门禁建议
- Backend: Maven test + 新增控制器/服务集成测试。
- Frontend: lint、build、vitest、Playwright（pipeline/opmarket/annotation 关键路径）。
- Repo gate: `node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration`。
