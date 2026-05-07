# F006 联调检查报告

- Feature：F006-model-registry-mvp
- 日期：2026-05-05
- 结果：PASS

## 已验证接口

- `GET /api/models`
- `GET /api/models/deployable`
- `GET /api/models/{modelKey}`
- `POST /api/models/{modelKey}/versions`
- `POST /api/models/{modelKey}/versions/{versionKey}/approve`
- `POST /api/models/{modelKey}/versions/{versionKey}/reject`
- `POST /api/models/{modelKey}/versions/{versionKey}/archive`

## 验证命令

```powershell
$env:JAVA_HOME='C:\java\jdk-25'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; Push-Location backend; mvn test -q; Pop-Location
Push-Location frontend; npm run lint; npm run test:ci; npm run e2e; npm run build; Pop-Location
```

## 结果摘要

- 后端 MockMvc 覆盖模型列表、详情、注册、审批、驳回、归档、401/403 和 deployable 过滤。
- 前端 Vitest 14 条通过，包含 F006 模型列表与审批交互。
- Playwright 4 条通过，包含 F006 模型仓库审批主流程。
## 2026-05-06 前后端真实集成补充

- 新增 `frontend/src/api/modelRegistryApi.ts`，前端优先调用 `http://localhost:8080/api/models` 与详情/审批接口。
- `ModelPage` 增加“后端 API 已连接 / 原型 fallback”状态标签，后端不可用时自动回退本地原型数据，保证原型仍可检查。
- `ModelRegistryController` 增加本地 Vite 端口 CORS 放行：`localhost:5173`、`127.0.0.1:5173`、`127.0.0.1:4173`。
- 新增 `frontend/src/api/modelRegistryApi.test.ts` 覆盖后端 DTO 到前端结构映射与 approve 调用。
## 2026-05-06 其它页面 API 接入补充

- `DatasetPage` / `App` 接入 `GET /api/datasets`、`GET /api/datasets/{key}`、`POST /api/datasets/{key}/access-requests` 与 `POST /api/datasets/access-requests/{requestId}/approve`，并保留后端不可用时的原型数据 fallback。
- `TrainingPage` 接入 `GET /api/training-jobs`、`GET /api/training-jobs/{jobKey}` 与 `GET /api/training-jobs/templates`，用于训练任务列表、详情指标和模板选项。
- `IdentityPage` 接入 `GET /api/auth/me` 与 `GET /api/auth/permissions`，用于组织权限画像和权限矩阵展示。
- `MonitoringPage` 接入 `GET /api/audit/events`，用于审计事件列表展示。
- 后端新增全局 `/api/**` CORS 配置，统一放行本地 Vite 预览端口，避免每个 Controller 重复配置。
- 推理服务、边缘下发、标注任务、平台总览当前尚无对应业务 API，本轮保留为原型/图表展示，待后续 F007/F008 等功能补齐后接入。
## 2026-05-06 全页面后端接入信号补充

- `OverviewPage`、`InferencePage` 与 `GenericModulePage` 接入 `GET /api/health`，用于无独立业务 API 的原型页展示后端连通状态。
- 平台总览、推理服务、标注任务和边缘下发当前通过平台健康接口确认后端网关可达；业务数据仍保留原型展示，后续独立 feature 落地时替换为领域 API。
- 所有导航页均具备“后端 API 已连接 / 原型 fallback”状态提示，便于本地检查时区分真实后端与原型数据。
## 2026-05-06 剩余业务页 API 接入完成

- 平台总览改为调用 `GET /api/overview`，返回 8 个闭环节点及其真实后端 API 路径。
- 推理服务改为调用 `GET /api/inference-services`，部署确认动作调用 `POST /api/inference-services/deployments`。
- 标注任务新增 `GET /api/labeling-tasks` 与 `POST /api/labeling-tasks/{taskKey}/approve`，前端替换原 Generic 原型页为标注任务列表与复核动作。
- 边缘下发新增 `GET /api/edge-nodes` 与 `POST /api/edge-nodes/dispatches`，前端替换原 Generic 原型页为边缘节点列表与模型下发动作。
- 上述业务 API 均接入本地开发 token 与权限头：`inference:*`、`labeling:*`、`edge:*`。