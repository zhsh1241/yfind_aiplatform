# Bug Fix Report

## Bug Information

- ID: BUG-20260527-video-download-link
- Title: 视频文件“获取下载链接”无法下载
- Severity: Major

## Analysis

- Root Cause: 前端通过 `window.open(downloadUrl)` 打开下载地址时不会携带 axios 注入的 Bearer token；后端对象内容读取又主要依赖 MinIO，沙箱/本地生成的视频对象在对象存储不可用时缺少稳定可读副本。
- Affected Files:
  - `frontend/src/features/data/DataPages.tsx`
  - `frontend/src/features/platform/platformApi.ts`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/ObjectStorageService.java`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/PlatformOrganizationConfigService.java`
- Related Features: F015 本地视频上传、F018 RTSP 视频流采样。

## Solution

- Approach: 最小修复为“前端鉴权 blob 下载 + 后端本地对象副本兜底 + download-url 返回平台 content 兜底”。
- Changes Made:
  - `ObjectStorageService`: 写入对象时同步写本地副本；MinIO 未配置或读取失败时回退本地副本。
  - `PlatformOrganizationConfigService`: public URL 不可用时返回 `/api/v1/platform/files/{fileId}/content` 并标记鉴权 content endpoint 可用。
  - `platformApi`: 新增 `downloadFileContent`，通过 axios blob 请求携带 Authorization。
  - `DataPages`: 数据集详情下载按钮改为获取 blob 后触发浏览器下载，不再依赖新窗口直链。
  - `DataManagementControllerTest`: 增加本地视频与 RTSP sample content 可读断言。
  - `rtsp-video-stream-input.spec.ts`: 增加前端下载请求携带 Bearer token 与 download 事件断言。

## Testing

- [x] 复现/回归测试已添加
- [x] 后端定向测试通过
- [x] 前端构建通过
- [x] E2E 下载行为通过
- [x] 仓库 gate 通过

## Contract Change

- [x] 不涉及对外请求/响应字段变更；`downloadUrl` 仍为既有字段，仅在 public object URL 不可用时返回平台鉴权 content endpoint。

## Verification

- [x] Bug 已修复
- [x] 无阻塞副作用
- [x] 文档已更新
