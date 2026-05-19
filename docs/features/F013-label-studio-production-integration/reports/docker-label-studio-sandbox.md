# Docker Label Studio 本地沙箱联通记录

- Feature: F013-label-studio-production-integration
- Date: 2026-05-19
- Result: PASS

## 1. 已采用的本地实例

F013 本地联调目标使用 `deploy/local/docker-compose.yml` 中已部署的 Docker Label Studio 服务，而不是新增 mock 或额外实例。

| 项 | 值 |
| --- | --- |
| Compose service | `label-studio` |
| Container name | `smp-platform-label-studio` |
| Image | `heartexlabs/label-studio:latest` |
| 容器内地址（backend 容器访问） | `http://label-studio:8080` |
| 宿主机地址（浏览器/本机进程访问） | `http://localhost:8083` |
| 数据卷 | `smp_label_studio_data` |

## 2. SMP 后端配置

容器化后端使用 Compose 内部网络地址：

```env
SMP_LABEL_STUDIO_ENABLED=true
SMP_LABEL_STUDIO_BASE_URL=http://label-studio:8080
SMP_LABEL_STUDIO_TOKEN_SECRET_REF=env:LABEL_STUDIO_API_TOKEN
LABEL_STUDIO_API_TOKEN=TODO_CONFIRM_LABEL_STUDIO_API_TOKEN
```

本机直接启动后端（不在 Compose 网络内）时，`SMP_LABEL_STUDIO_BASE_URL` 应改为：

```env
SMP_LABEL_STUDIO_BASE_URL=http://localhost:8083
```

安全要求：

- `LABEL_STUDIO_API_TOKEN` 只写入本地 `deploy/local/.env` 或运行环境 secret，不写入仓库。
- `deploy/local/.env` 已加入 `.gitignore`，避免误提交本地 token。
- `deploy/local/.env.example` 仅保留 `TODO_CONFIRM_LABEL_STUDIO_API_TOKEN` 占位。

## 3. 已完成的联通验证

已确认 Docker 容器运行并暴露宿主机端口：

```powershell
docker ps --filter "name=smp-platform-label-studio" --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
```

验证结果显示 `smp-platform-label-studio` 正常运行，端口映射为 `localhost:8083 -> container:8080`。

已使用本地开发 token 调用 Label Studio API：

```powershell
$headers = @{ Authorization = "Token <LOCAL_LABEL_STUDIO_API_TOKEN>" }
Invoke-WebRequest -UseBasicParsing -Headers $headers http://localhost:8083/api/projects
```

返回 `200`，响应为项目列表空集合，证明 token 与 Docker Label Studio API 可用。

## 4. 后续联调入口

启动或重启 backend 容器并注入 `LABEL_STUDIO_API_TOKEN` 后，可通过 F013 API 验证 SMP 与当前 Docker Label Studio 的真实联通：

```http
POST /api/v1/annotation/tasks/{taskId}/label-studio/sync-project
POST /api/v1/annotation/work-items/{workItemId}/label-studio/sync-task
POST /api/v1/annotation/tasks/{taskId}/label-studio/import-results
```

前端入口保持原型信息架构：

- `/ann`：标注任务管理与 Label Studio project 同步入口。
- `/annwork`：标注工作台与 Label Studio task 打开入口。
- `/annreview`：标注审核与结果导入入口。
