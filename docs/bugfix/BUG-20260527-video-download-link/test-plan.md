# Test Plan: BUG-20260527-video-download-link

## 回归用例

1. 后端 RTSP 采样样本可读取
   - 创建 RTSP_STREAM 数据源、测试、激活、运行采样任务。
   - 读取数据集详情中的 `FILE-*.mp4`。
   - 调用 `/api/v1/platform/files/{fileId}/content`。
   - 期望 200、`Content-Type: video/mp4`、body 包含 sandbox sample 标记。

2. 后端本地上传视频可读取
   - 上传 mp4/mov/avi 并提交数据集。
   - 通过 `/content` 读取绑定视频。
   - 期望返回原始视频 payload。

3. 前端下载按钮鉴权下载
   - Mock `/download-url` 与 `/content`。
   - 点击 `获取下载链接`。
   - 期望请求 `/content` 时携带 Bearer token，并触发浏览器 download 事件。

## 验证命令

```powershell
mvn -pl smp-app -Dtest=DataManagementControllerTest#rtspStreamSourceTestsSamplesAndBlocksDirectAnnotation test
npm run build --prefix frontend
npx playwright test frontend/e2e/rtsp-video-stream-input.spec.ts --config frontend/playwright.config.ts
node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration
```
