# F018 QA 验收报告

- Feature: F018-rtsp-video-stream-input
- Date: 2026-05-27
- Result: PASS

## 验收覆盖
- AC-01/AC-02：RTSP 数据源类型、URL/凭据校验、sandbox 连接测试与失败诊断。
- AC-03/AC-04：手动采样任务运行生成视频数据集、版本、文件对象、文件绑定与血缘。
- AC-05：`AUDIO_VIDEO` / `RTSP_STREAM` 数据集阻断直接标注并提示先抽帧为 IMAGE。
- AC-06：凭据缺失、禁用采样、非法 URL 等失败路径由后端测试覆盖。
- AC-07：前端保持数据源/数据集/详情 IA，并新增 Playwright E2E。

## 已执行验证
- `node C:\GIT\yfind_aiplatform\tools\ai-scaffold\dist\cli.js verify-contract docs/features/F018-rtsp-video-stream-input`：PASS
- `node C:\GIT\yfind_aiplatform\tools\ai-scaffold\dist\cli.js check-task-traceability docs/features/F018-rtsp-video-stream-input`：PASS
- `npm run build --prefix frontend`：PASS（仅 Vite chunk size warning）
- `npm run e2e --prefix frontend -- rtsp-video-stream-input.spec.ts`：PASS

## 风险
- 真实 RTSP 采集器、采样上限、URL 安全策略仍待生产确认，已在合同和任务文档保留 TODO。
