# YFI 工业 AI 小模型平台技术路线

## 1. 技术原则

本平台按私有化 Kubernetes 环境设计，采用成熟组件集成为主、自研业务门户和治理层为辅的路线。

核心原则：

- 私有化部署优先，满足工业数据、安全隔离和边端接入要求。
- Kubernetes 原生，训练、推理、资源调度、弹性伸缩和运维监控都围绕 K8s 建设。
- 成熟组件集成为主，避免自研训练编排、模型注册、推理服务、标注工具等高成本基础能力。
- 自研平台门户、组织权限、业务编排、审批、审计和元数据治理。
- 数据集、模型权重、镜像产物等大文件进入对象存储；业务库只保存元数据、索引、权限和状态。
- 所有 AI 任务异步化，使用统一任务状态机、日志、指标和审计记录。

## 2. 推荐技术栈

| 层级 | 推荐选型 | 备选方案 | 不建议方案 | 说明 |
| --- | --- | --- | --- | --- |
| 前端 | React + TypeScript + Ant Design Pro | Vue 3 + TypeScript + Ant Design Vue | 无设计体系的零散页面 | 企业后台复杂表格、权限菜单和多语言支持成熟 |
| 主后端 | Java 21 + Spring Boot 3 | Kotlin + Spring Boot | Node.js 单体承载权限/审计/训练编排 | 适合企业集成、权限、安全、审计和长期维护 |
| AI Adapter | Python 3.12 + FastAPI | Python SDK 脚本由后端直接调用 | Java 后端直接承载所有 AI SDK 适配 | 封装 Label Studio、MLflow、Kubeflow/Argo、KServe 等 Python-first 集成 |
| 权限 | 企业 SSO/Keycloak + Spring Security | 仅接入企业 IAM | 自研认证中心 | 支持 OIDC/SAML、RBAC、组织和权限扩展 |
| 主库 | PostgreSQL | 企业标准关系库 | 用对象存储替代业务库 | 存放业务元数据、审批、权限、任务状态 |
| 缓存/状态 | Redis | KeyDB | 只依赖数据库轮询 | 用于任务状态、缓存、限流和短期锁 |
| 搜索 | OpenSearch 或 Elasticsearch | PostgreSQL 全文索引 | 无检索引擎 | 用于数据集、模型、日志和元数据检索 |
| 对象存储 | MinIO 或企业 S3-compatible 存储 | Ceph RGW | 将大文件存数据库 | 存放数据集、模型、训练产物和日志归档 |
| 标注 | Label Studio 集成 | CVAT、商用标注平台 | MVP 自研多模态标注器 | 降低图片、文本、音频、视频标注实现风险 |
| AI 编排 | Kubeflow Pipelines/Trainer | Argo Workflows | 自研调度器 | 承载训练、调优、评估等异步任务 |
| 实验/模型注册 | MLflow | Kubeflow Metadata + 自研注册表 | 文件目录式模型管理 | 支持实验追踪、指标、artifact 和模型版本 |
| 推理服务 | KServe | Seldon Core、Ray Serve | 手写 Deployment 模板分散管理 | 标准化模型服务、版本、探活和伸缩 |
| 工作流 | Kubeflow Pipelines 或 Argo Workflows | Temporal | 仅靠后端线程执行 | AI 任务需要可观测、可重试、可追踪 |
| 部署 | Kubernetes + Helm + Argo CD | Kustomize + GitOps | 手工改集群资源 | 私有化环境可审计、可回滚 |
| 监控 | Prometheus + Grafana | VictoriaMetrics | 无统一指标平台 | 覆盖应用、K8s、GPU/NPU、任务和服务 |
| 日志 | Loki 或 ELK | OpenSearch Logs | 日志只落本地文件 | 支持训练日志、服务日志和审计查询 |
| 链路 | OpenTelemetry | SkyWalking | 无 trace | 支持 API、任务和外部组件调用排障 |
| 边端 | 自研轻量 edge-agent | KubeEdge | 中心端直接 SSH 操作 | 适应现场网络不稳定和离线场景 |

## 3. 推荐工程结构

```text
yfind_aiplatform/
  backend/                 # Spring Boot 主平台后端
  ai-adapter/              # FastAPI 内部 AI/MLOps 适配层
  frontend/                # React 管理端
  deploy/                  # Helm/K8s/环境配置
  docs/
    architecture/          # 架构与项目方案
    features/              # feature 实施文档
    bugfix/                # bugfix 文档
  tools/ai-scaffold/       # AI 开发流程工具
```

当前仓库已包含 AI scaffold。业务工程初始化后，需要把真实路径和命令补入 `ai-scaffold.config.json`。

## 4. 核心架构

```text
用户/管理员
  -> Portal/API 层
  -> 业务服务层
  -> AI/MLOps 集成层
  -> Kubernetes 运行时层
  -> 存储与元数据层
  -> 监控审计层
  -> 边端 Agent 层
```

### 4.1 Portal/API 层

- React 管理端承载门户、数据集、标注、训练、模型、推理、资源、审计页面。
- Spring Boot API 提供统一鉴权、菜单、元数据、任务和审批接口，并作为前端唯一业务入口。
- OpenAPI 作为前后端契约，避免接口口头约定。

### 4.2 业务服务层

- 推荐模块化单体起步，按领域包隔离：identity、dataset、labeling、training、model、inference、edge、resource、audit。
- 领域边界先清晰，后续如并发、组织或部署要求变化，再拆成微服务。
- 业务层只编排任务和管理元数据，不直接承担训练/推理重负载。

### 4.3 AI/MLOps 集成层

- FastAPI `ai-adapter/` 作为内部服务封装 AI/MLOps SDK 与外部组件差异，不直接暴露给浏览器。
- Label Studio 负责标注工具和结果回收。
- Kubeflow Pipelines/Trainer 或 Argo Workflows 负责训练、调优、评估流程。
- MLflow 负责实验追踪、模型指标、artifact 和模型注册。
- KServe 负责中心端推理服务部署、探活、版本和伸缩。
- Spring Boot 保存平台业务状态、权限和审计；`ai-adapter/` 返回外部系统 ID、状态和错误信息。

### 4.4 存储与元数据层

- PostgreSQL：组织、权限、数据集元数据、模型元数据、任务状态、审批、审计索引。
- 对象存储：数据文件、标注结果、训练产物、模型包、日志归档。
- Redis：短期状态、缓存、分布式锁、限流。
- OpenSearch/Elasticsearch：全文检索、日志检索、元数据搜索。

### 4.5 Kubernetes 运行时层

- 训练任务、开发环境、推理服务和批处理任务全部运行在 K8s。
- GPU/NPU 通过厂商 device plugin 接入。
- 使用 namespace、ResourceQuota、LimitRange、node selector、taint/toleration 做组织和资源隔离。

### 4.6 边端 Agent 层

- 边端服务器运行轻量 agent，负责接收模型包、执行部署脚本、健康检查、状态回传和版本回滚。
- 中心端不依赖长期 SSH 连接，避免现场网络波动导致部署状态不可控。
- 模型包、部署记录和运行状态必须可追溯。

### 4.7 监控审计层

- Prometheus/Grafana 监控应用、K8s、GPU/NPU、训练任务和推理服务。
- Loki/ELK 收集应用日志、训练日志、推理日志和边端 agent 日志。
- 审计日志覆盖登录、权限、数据集、模型、训练、部署和管理操作。

## 5. 关键技术建议

- 先模块化单体，保留领域拆分边界，不在 MVP 期过早微服务化。
- 所有 AI 任务必须异步化，不允许在 HTTP 请求内直接执行训练、转换或部署重任务。
- AI/MLOps 组件调用必须优先通过 `ai-adapter/` 封装，Spring Boot 不直接散落调用 Python SDK 或外部工具 SDK。
- 所有大文件必须走对象存储，后端只保存对象 key、hash、大小、版本和权限。
- 数据集、模型、镜像、推理服务都必须有版本、状态、所有者和授权记录。
- 推理服务通过 KServe 标准化部署，避免每个模型写一套独立 Deployment。
- 边端通过 agent 上报状态，中心端只下发任务和接收结果。
- 所有跨组件调用必须记录 trace id，方便训练、部署和推理排障。
- 所有高风险操作必须审计，包括数据下载、权限变更、模型部署、边端下发、资源配额调整。

## 6. PoC 锁定项

MVP 开发前必须完成以下 PoC：

| PoC | 目标 | 通过标准 |
| --- | --- | --- |
| IAM/SSO PoC | 验证企业 SSO 或 Keycloak 对接 | 可登录、获取组织/角色、后端完成鉴权 |
| 对象存储 PoC | 验证数据集上传、预览、下载 | 大文件上传稳定，元数据和对象 key 可追踪 |
| Label Studio PoC | 验证标注任务创建和结果回收 | 平台可跳转任务，标注结果可导回数据集 |
| Training PoC | 验证 K8s 训练任务提交 | 可提交任务、查看日志、生成 artifact |
| MLflow PoC | 验证指标和模型注册 | 模型版本、指标和 artifact 可查询 |
| KServe PoC | 验证模型服务部署 | 可部署、探活、调用推理接口 |
| Edge Agent PoC | 验证边端模型下发 | 边端可接收模型包并回传部署状态 |

## 7. 风险与建议

| 风险 | 影响 | 建议 |
| --- | --- | --- |
| GPU/NPU 型号未确认 | 影响 device plugin、镜像和调度策略 | 项目第 0 阶段锁定硬件清单 |
| 企业 SSO/IAM 接口不明确 | 影响权限底座和菜单体系 | 提前拿到测试环境和协议文档 |
| 数据安全分级规则不明确 | 影响下载、共享、审计和内容安全 | 启动安全专项澄清 |
| KServe/Kubeflow/MLflow 版本不兼容 | 影响训练到部署闭环 | PoC 阶段锁定版本矩阵 |
| 边端网络不稳定 | 影响模型下发可靠性 | 采用 agent 拉取/断点续传/状态回传 |
| 自研范围膨胀 | 影响 6 个月 MVP | 标注、训练、模型注册、推理优先集成成熟组件 |

## 8. 待确认事项

- 是否已有集团标准前端框架、Java 基线、CI/CD 平台和镜像仓库。
- 私有化 K8s 版本、网络插件、Ingress、证书和存储类。
- 企业 SSO 协议、用户组织字段、角色映射规则。
- GPU/NPU 资源型号、驱动版本、国产芯片适配要求。
- 是否必须支持离线安装和无互联网环境部署。
- 日志、模型、数据集的留存周期和加密要求。
