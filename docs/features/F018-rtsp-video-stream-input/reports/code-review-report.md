# F018 代码审查报告

- Feature: F018-rtsp-video-stream-input
- Reviewer: codex 自审（build-feature solo lane）
- Date: 2026-05-27
- Verdict: PASS_WITH_COMMENTS

## 审查范围
- 后端：`DataManagementService.java`、`DataManagementControllerTest.java`
- 前端：`DataPages.tsx`、`frontend/e2e/helpers.ts`、`frontend/e2e/rtsp-video-stream-input.spec.ts`
- 文档：`TASK.md`、`contract.md`、`test-plan.md`

## 结论
- `RTSP_STREAM` 复用既有数据源/同步任务/数据集/文件/血缘模型，未新增依赖或新表。
- sandbox/internal RTSP 连接测试、采样任务、`RAW/AUDIO_VIDEO` 数据集生成、`CAPTURE_SAMPLE` 血缘和标注阻断均有后端测试与前端 E2E 覆盖。
- 明文凭据拒绝、`SECRET_REF` 校验和 TODO_CONFIRM_* 诊断保留。

## Comments
- 真实生产 RTSP 解码与采集器仍按合同保留 `TODO_CONFIRM_RTSP_CAPTURE_ADAPTER`，一期仅承诺 sandbox 采样 seam。
- Vite chunk size warning 为既有前端体积告警，不阻塞本 feature。
