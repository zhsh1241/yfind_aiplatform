# Bugfix Template

## Metadata
- Bug ID: BUG-20260521-image-segmentation-task-422
- Title: 图片分割标注任务创建报 422 且数据集详情页可误选错误模板
- Status: fixed
- Created: 2026-05-21
- Owner: Codex

## Symptom
- 在 `/dsdetail` 页面从数据集创建图片分割标注任务时，请求返回 422。
- 用户希望直接对已创建标注任务的数据集进行图片分割标注，但弹窗中可选择到不匹配的图片打标模板。
- 现网/本地环境缺少一个同 BU、已发布、可直接用于图片分割的标签模板。

## Expected vs Actual
- 预期：图片数据集在选择“图片分割”场景时，只能选择同 tenant 的已发布分割模板，并可成功创建分割标注任务。
- 实际：候选模板未按数据集 tenant 与当前 scene 约束，前端允许把 `IMAGE_TAGGING` 模板用于 `IMAGE_SEGMENTATION`，后端按 `DAT-013` 拒绝返回 422。

## Root Cause
- 后端 `annotation-candidates` 返回模板时只按 `PUBLISHED + scene in {IMAGE_TAGGING, IMAGE_SEGMENTATION}` 过滤，没有收敛到数据集所属 tenant。
- 基线种子数据中缺少 `TENANT-CABIN` 下已发布的图片分割模板。
- 前端数据集详情页创建任务弹窗没有按当前 `scene` 过滤模板列表，也没有在切换场景时重置 `templateId`。
- 本地 PostgreSQL 启动时还暴露出 `V13__annotation_artifact_scope_adjustment.sql` 中 `ADD CONSTRAINT IF NOT EXISTS` 的兼容性问题，会阻塞当前代码启动验证。

## Fix Plan
- 后端：`annotation-candidates` 仅返回与当前数据集同 tenant 的图片打标/图片分割模板。
- 数据：新增 `V15__annotation_segmentation_template_seed.sql`，补种 `LT-WELD-POLYGON`（`TENANT-CABIN` / `IMAGE_SEGMENTATION` / `PUBLISHED`）。
- 前端：数据集详情页创建任务弹窗按 `scene` 过滤模板、切换场景时自动重置模板、无模板时禁用提交并给出提示。
- 启动链路：修正 `V13` 中 PostgreSQL 不兼容语法，保证本地 docker postgres 能成功迁移到 v15 并起服。

## Verification
- 后端回归测试通过。
- 前端单测通过。
- 实机接口验证通过，已成功创建图片分割标注任务。

## Regression Risk
- 低到中：影响数据集详情页标注候选模板筛选与本地数据库迁移链路；未变更核心标注任务状态机。
