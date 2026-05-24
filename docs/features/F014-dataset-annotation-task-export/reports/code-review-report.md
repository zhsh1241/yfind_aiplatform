# F014 代码审查报告

## Verdict
- Verdict: PASS_WITH_COMMENTS

## 审查摘要
- 后端复用现有 `AnnotationService`、`DataManagementService`、`platform_file_object`、审计与权限模型；未新增依赖。
- 新增 `annotation_training_export` 记录导出生命周期，权限 `data:annotation:export` 与下载权限分离。
- 前端复用 `DataPages.tsx`、`platformApi.ts`、TanStack Query 与既有 Playwright mock。
- 回归测试覆盖一数据集多任务、导出 gating、图片副本、异步阈值、保留期、download-url 诊断和审计。

## 发现与处理
- 测试流程最初使用管理员直接提交 work item，不能代表真实标注员/审核员分离；已改为 `annotator` 提交、`admin` 审核，并按 `workItemId` 精确匹配待审核项。
- 嵌套 `annotationJson` 原始字符串转义不足导致请求解析失败；已修正测试 payload。

## 结论
可放行。剩余 TODO 均为合同中已声明的生产配置/格式细节，不阻塞 F014 基线交付。
