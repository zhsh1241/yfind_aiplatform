# Bug 修复报告：Pipeline 调试模式与预处理产物格式

## Bug Information

- ID：BUG-20260528-pipeline-debug-preprocessed-output
- Title：Pipeline 编辑器缺少调试中间步骤监控，视频预处理输出 zip 导致图片数据集不可用
- Severity：Major
- Date：2026-05-28

## Analysis

- Root Cause：
  - 后端 `PipelineService#createOutputDataset` 在视频抽帧场景生成 `PREPROCESSED / IMAGE` 数据集时仍绑定 `output.zip` / `application/zip`，与图片数据集语义和预览链路不匹配。
  - Pipeline 前端运行入口固定 `triggerMode=MANUAL`，运行结果抽屉未突出节点级执行状态，用户无法快速确认中间步骤是否成功。
- Affected Files：
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/PipelineDtos.java`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/PipelineService.java`
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/VisualPreprocessPipelineControllerTest.java`
  - `frontend/src/features/platform/platformApi.ts`
  - `frontend/src/features/data/DataPages.tsx`
  - `frontend/src/features/data/DataPages.test.tsx`
- Related Features：F017 视觉预处理 Pipeline / Pipeline 加工任务 / 数据集预览与标注前置链路。

## Solution

- Approach：最小化扩展现有 Pipeline 运行与详情接口，不引入新服务或依赖；将 `DEBUG` 作为 `triggerMode` 的显式模式，并复用现有 `pipeline_run_node` 表展示节点状态。
- Changes Made：
  - `PipelineRunDetailResponse` 增加 `debugMode`，前端类型同步补齐。
  - `PipelineService` 在 `triggerMode=DEBUG` 时返回 `debugMode=true`，节点日志补充“步骤 x/y、输入、输出、状态、调试采样”摘要。
  - 视频抽帧输出对象从 `output.zip` / `application/zip` 改为 `frames/frame-0001.jpg` / `image/jpeg`，保持输出数据集为 `PREPROCESSED / IMAGE` 且可预览。
  - Pipeline 编辑器新增运行模式选择（普通运行 / 调试模式），调试运行发送 `triggerMode=DEBUG`。
  - 运行详情抽屉新增“中间步骤监控”卡片，运行历史新增“查看步骤”入口。
  - 前端对旧 mock / 旧响应缺少 `nodeRuns`、`debugMode` 的情况做兜底，避免运行详情抽屉崩溃。

## Testing

- [x] 复现测试已添加：`debugRunShowsNodeProgressAndCreatesUsableImageFilesInsteadOfZip`
- [x] 后端相关回归测试通过
- [x] 前端 DataPages 回归测试通过
- [x] 前端类型构建通过
- [x] 本地质量门禁通过

## Contract Change

- [x] 涉及轻量响应契约扩展：`PipelineRunDetailResponse` / `PipelineRunDetail` 增加 `debugMode`。
- [x] 兼容性：前端对缺失 `debugMode` 与 `nodeRuns` 兜底；既有 `MANUAL` 运行路径保持不变。

## Verification

- [x] Bug 已修复：调试运行可查看中间步骤，视频抽帧输出不再 zip。
- [x] 无已知副作用：普通运行与确认/激活链路回归通过。
- [x] 文档已更新：`bug.md`、`test-plan.md`、本报告与验证记录。
