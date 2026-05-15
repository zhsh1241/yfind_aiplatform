# SMP 平台 API 接口规范

> **文档状态**：占位符（Placeholder）— 待详细设计  
> **版本**：V0.1  
> **创建日期**：2026-05-09  
> **关联需求**：Q-013（评审报告）

---

## 1. 概述

本文档定义 SMP（工业AI小模型平台）对外暴露的 REST API 规范，涵盖数据域、模型域、推理域、资源域和平台域的核心接口。

### 1.1 设计原则

- **RESTful 风格**：资源为中心，使用 HTTP 动词（GET / POST / PUT / PATCH / DELETE）
- **版本化**：所有接口以 `/api/v1/` 为前缀；重大变更时升级版本号至 `/api/v2/`
- **统一响应结构**：所有响应使用如下 Envelope：
  ```json
  {
    "code": 0,
    "message": "success",
    "data": { ... },
    "traceId": "uuid"
  }
  ```
- **认证鉴权**：使用 Bearer Token（JWT），通过 `Authorization: Bearer <token>` 头部传递；推理应用接口使用 API Key 认证
- **分页**：列表接口使用 `?page=1&pageSize=20` 参数；响应中包含 `total` 字段
- **错误码**：HTTP 状态码 + 业务错误码双重标识（见第 5 节）

### 1.2 基础 URL

| 环境 | Base URL |
|-----|---------|
| 生产 | `https://<platform-domain>/api/v1` |
| 开发/测试 | `https://<dev-domain>/api/v1` |

---

## 2. 接口模块清单

> **说明**：以下为各域核心接口的框架性描述，详细参数定义待 API 设计阶段补充（可输出为 OpenAPI 3.0 YAML）。

### 2.1 平台域（Platform）

| 方法 | 路径 | 描述 | 认证 |
|-----|------|------|------|
| POST | `/auth/login` | 用户登录（SSO 或本地账号） | 无 |
| POST | `/auth/logout` | 登出 | Bearer |
| POST | `/auth/refresh` | 刷新 Token | Bearer |
| GET | `/tenants` | 获取租户列表（超级管理员） | Bearer |
| POST | `/tenants` | 创建租户 | Bearer |
| GET | `/tenants/{tenantId}/users` | 获取租户用户列表 | Bearer |
| POST | `/tenants/{tenantId}/users` | 添加用户到租户 | Bearer |
| GET | `/roles` | 获取角色列表 | Bearer |
| POST | `/roles` | 创建自定义角色 | Bearer |
| GET | `/audit-logs` | 查询操作审计日志 | Bearer |

### 2.2 数据域（Data）

| 方法 | 路径 | 描述 | 认证 |
|-----|------|------|------|
| GET | `/data-sources` | 获取数据源列表 | Bearer |
| POST | `/data-sources` | 创建数据源 | Bearer |
| POST | `/data-sources/{id}/test` | 测试数据源连接 | Bearer |
| GET | `/datasets` | 获取数据集列表（支持门户搜索） | Bearer |
| POST | `/datasets` | 创建数据集 | Bearer |
| GET | `/datasets/{id}` | 获取数据集详情 | Bearer |
| POST | `/datasets/{id}/versions` | 创建数据集新版本 | Bearer |
| GET | `/datasets/{id}/lineage` | 查询数据集血缘 | Bearer |
| POST | `/datasets/{id}/access-requests` | 提交受限数据集访问申请 | Bearer |
| GET | `/access-requests` | 获取访问申请列表（审批人视角） | Bearer |
| PUT | `/access-requests/{requestId}/approve` | 审批通过 | Bearer |
| PUT | `/access-requests/{requestId}/reject` | 拒绝申请 | Bearer |
| GET | `/annotation-tasks` | 获取标注任务列表 | Bearer |
| POST | `/annotation-tasks` | 创建标注任务 | Bearer |
| POST | `/augmentation-jobs` | 提交数据增强任务 | Bearer |

### 2.3 模型域（Model）

| 方法 | 路径 | 描述 | 认证 |
|-----|------|------|------|
| GET | `/models` | 获取模型列表 | Bearer |
| POST | `/models` | 注册/上传模型 | Bearer |
| GET | `/models/{id}` | 获取模型详情 | Bearer |
| GET | `/models/{id}/versions` | 获取模型版本列表 | Bearer |
| POST | `/fine-tuning-jobs` | 提交微调训练任务 | Bearer |
| GET | `/fine-tuning-jobs/{id}` | 获取训练任务状态 | Bearer |
| POST | `/fine-tuning-jobs/{id}/cancel` | 取消训练任务 | Bearer |
| POST | `/engineering-jobs` | 提交模型工程化任务（量化/剪枝等） | Bearer |
| GET | `/engineering-jobs/{id}` | 获取工程化任务状态 | Bearer |
| POST | `/engineering-jobs/{id}/retry` | 重试失败的工程化任务（MDL-013） | Bearer |
| GET | `/development-tasks` | 获取开发任务列表 | Bearer |
| POST | `/development-tasks` | 创建开发任务（Jupyter/VSCode/SSH） | Bearer |

### 2.4 推理域（Inference）

| 方法 | 路径 | 描述 | 认证 |
|-----|------|------|------|
| GET | `/inference-services` | 获取推理服务列表 | Bearer |
| POST | `/inference-services` | 部署推理服务 | Bearer |
| GET | `/inference-services/{id}` | 获取服务详情 | Bearer |
| PUT | `/inference-services/{id}/traffic` | 调整流量分配（INF-002） | Bearer |
| POST | `/inference-services/{id}/rollback` | 执行版本回滚 | Bearer |
| GET | `/edge-servers` | 获取边端服务器列表 | Bearer |
| POST | `/edge-servers` | 注册边端服务器 | Bearer |
| POST | `/edge-servers/{id}/models` | 下发模型到边端服务器 | Bearer |
| GET | `/inference-apps` | 获取推理应用列表 | Bearer |
| POST | `/inference-apps` | 创建推理应用（API Key 鉴权） | Bearer |
| POST | `/inference-apps/{id}/invoke` | 调用推理服务（外部应用接口） | API Key |
| POST | `/batch-inference-jobs` | 提交批量推理任务 | Bearer |
| GET | `/third-party-services` | 获取第三方推理服务列表 | Bearer |
| POST | `/third-party-services` | 纳管第三方推理服务 | Bearer |
| POST | `/third-party-services/{id}/test` | 测试连接（INF-010） | Bearer |

### 2.5 资源域（Resource）

| 方法 | 路径 | 描述 | 认证 |
|-----|------|------|------|
| GET | `/clusters` | 获取计算集群列表 | Bearer |
| GET | `/clusters/{id}` | 获取集群详情与监控指标 | Bearer |
| GET | `/resource-pools` | 获取资源池列表 | Bearer |
| POST | `/resource-pools` | 创建资源池 | Bearer |
| PUT | `/resource-pools/{id}/quota` | 调整资源配额 | Bearer |
| GET | `/ai-chips` | 获取 AI 芯片列表（GPU/NPU） | Bearer |
| GET | `/storage-pools` | 获取存储池列表 | Bearer |
| GET | `/container-images` | 获取容器镜像列表 | Bearer |
| POST | `/container-images` | 推送/注册镜像 | Bearer |

---

## 3. 通用约束

### 3.1 请求规范

- **Content-Type**：`application/json`（文件上传接口使用 `multipart/form-data`）
- **字符集**：UTF-8
- **时间格式**：ISO 8601（`2026-05-09T10:00:00Z`）
- **UUID 格式**：标准 v4 UUID（`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`）

### 3.2 限流

| 接口类型 | 限流策略（暂定，待 NFR-P03 确认） |
|---------|-------------------------------|
| 认证接口 | 10 次/分钟/IP |
| 普通 REST 接口 | 300 次/分钟/用户 |
| 推理调用接口 | 按推理应用配置的 QPS 上限 |
| 批量/长任务接口 | 20 次/分钟/用户 |

### 3.3 幂等性

- POST 创建接口支持客户端传入 `Idempotency-Key` 头（UUID），重复提交返回相同结果
- 边端日志同步接口天然幂等（以 `logBatchId` 去重，见 INF-011）

---

## 4. Webhook 通知

系统在以下事件发生时向已配置 Webhook URL 的订阅方推送通知（POST JSON）：

| 事件类型 | 触发时机 |
|---------|---------|
| `training.completed` | 训练任务完成 |
| `training.failed` | 训练任务失败 |
| `inference.deployed` | 推理服务部署成功 |
| `inference.rollback` | 推理服务执行回滚 |
| `edge.offline` | 边端服务器离线超时（INF-011） |
| `access.approved` | 数据集访问申请审批通过 |
| `access.rejected` | 数据集访问申请被拒绝（含超时） |
| `dataset.expired` | 数据集访问权限到期 |

---

## 5. 业务错误码（⚠️ 待完善）

| HTTP 状态码 | 业务错误码 | 含义 |
|------------|----------|------|
| 400 | `INVALID_PARAM` | 参数格式错误 |
| 401 | `UNAUTHORIZED` | 未认证或 Token 失效 |
| 403 | `FORBIDDEN` | 权限不足 |
| 403 | `DATASET_ACCESS_REQUIRED` | 受限数据集需申请访问（DAT-006） |
| 404 | `RESOURCE_NOT_FOUND` | 资源不存在 |
| 409 | `CONFLICT` | 资源状态冲突（如修改已发布版本） |
| 422 | `QUOTA_EXCEEDED` | 资源配额超限（MDL-002） |
| 422 | `DATASET_NOT_ACTIVE` | 数据集未激活（MDL-001） |
| 422 | `MODEL_NOT_PRODUCTION` | 模型版本非生产状态（INF-001） |
| 422 | `TRAFFIC_SUM_NOT_100` | 流量分配比例不等于100%（INF-002） |
| 429 | `RATE_LIMIT_EXCEEDED` | 请求超出限流阈值 |
| 500 | `INTERNAL_ERROR` | 服务内部错误 |

---

## 6. 待补充事项（⚠️）

> 以下内容为 V0.1 占位符，需在详细设计阶段补充：

- [ ] OpenAPI 3.0 YAML 文件（`openapi.yaml`）— 含完整 schema 定义
- [ ] 各接口的请求/响应 body 示例
- [ ] 推理调用接口（`/inference-apps/{id}/invoke`）的 streaming 支持说明（SSE / WebSocket）
- [ ] 文件上传接口（数据集、模型文件）的分片上传协议
- [ ] gRPC 接口规范（高吞吐推理调用场景）
- [ ] 错误码全量清单（对应所有业务规则校验失败场景）
- [ ] API 变更日志（Changelog）

---

> **约束**：本文档基于 SOR V1.0 及评审报告 Q-013 补充，为框架性占位文档，详细接口设计需在产品详细设计阶段由后端架构师完成。
