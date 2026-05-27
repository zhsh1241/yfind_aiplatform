# BUG-20260527-video-download-link

## 问题

在数据集详情页点击视频文件的“获取下载链接”后，用户无法完成下载。

## 复现路径

1. 进入 `数据集管理`。
2. 打开本地上传视频数据集或 RTSP 采样视频数据集详情。
3. 在文件列表点击 `获取下载链接`。
4. 实际表现：前端打开对象存储 public URL 或后端 content 直链，但浏览器新窗口不携带前端 axios 的 `Authorization`，且本地/沙箱对象可能只通过平台鉴权接口可读，导致无法下载。

## 预期行为

点击按钮后应通过已登录会话鉴权下载视频文件，至少覆盖 `video/mp4`、`video/quicktime`、`video/x-msvideo` 及 RTSP sandbox sample。

## 影响范围

- 前端：数据集详情文件下载按钮。
- 后端：平台文件 `/content` 读取路径、RTSP/沙箱生成对象的本地可读性。
- 相关功能：F015 本地视频上传、F018 RTSP 视频流采样。

## 根因

- 前端使用 `window.open(downloadUrl)`，对后端鉴权接口不会附带 axios 注入的 Bearer token。
- `ObjectStorageService.uploadObjectIfConfigured` 在对象存储不可用或未真正写入时缺少本地对象副本兜底；`fileContent` 直接依赖 MinIO 读取，沙箱/本地环境容易失败。

## 修复策略

- 前端改为通过 `apiClient` 带 Authorization 拉取 blob 并触发 `<a download>`，不再依赖新窗口 token 传递。
- 后端对象存储服务增加本地对象副本兜底：上传时写本地副本，读取时 MinIO 失败则回退本地副本。
- `download-url` 在未配置可用 public endpoint 时返回平台鉴权 content URL，前端仍走 blob 下载。
