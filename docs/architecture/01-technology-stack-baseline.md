# SMP 技术栈基线

> 状态：已确定，作为重建阶段默认技术选型基线
> 生效日期：2026-05-15
> 适用范围：后端、前端、AI 适配器、数据层、MLOps、部署运维、质量门禁
> 权威输入：`docs/business/`、`docs/prototype/`、`docs/business/open-questions.md`、`ai-scaffold.config.json`

## 1. 决策原则

1. **业务事实优先**：技术栈服务于 `DATA`、`MODEL`、`INFERENCE`、`RESOURCE`、`PLATFORM` 五大领域闭环，不按已删除旧实现倒推。
2. **中心端优先、边端可扩展**：中心端采用 Kubernetes 原生架构；边端先按 Agent/服务器接入，通信与证书细节在边端功能计划中细化。
3. **主后端掌握业务事实源**：权限、状态机、审计、领域规则和元数据以主后端与 PostgreSQL 为准；Python 侧只封装 AI/MLOps 集成。
4. **选择成熟稳定线**：正式实现优先使用 LTS 或当前稳定主线；不使用 RC、Beta 或实验性版本作为生产默认。
5. **契约先行**：所有业务 API 先冻结 OpenAPI 3.1 契约，再实现后端、前端、联调与测试。
6. **未知环境不猜测**：外部地址、账号、密钥、容量、维护窗口、合规要求继续使用 `TODO_CONFIRM_*` 或 open question 追踪。

## 2. 一页技术栈总览

| 层级 | 已确定技术栈 | 基线版本/范围 | 用途 |
|---|---|---|---|
| 主后端 | Java + Spring Boot | Java 21 LTS；Spring Boot 4.0.x | 平台 API、领域规则、权限、审计、编排 |
| 后端构建 | Maven | 3.9.x | 多模块构建、测试、依赖管理 |
| 后端持久化 | Spring Data JPA + Hibernate | 随 Spring Boot 4.0 管理 | 元数据读写、事务、领域模型持久化 |
| 数据迁移 | Flyway | 12.x | 数据库版本迁移 |
| 后端 API 契约 | OpenAPI | 3.1.x | 前后端契约、接口文档、契约测试 |
| 后端测试 | JUnit 5 + Mockito + Testcontainers | JUnit 5；Testcontainers 1.21.x | 单元、集成、数据库/依赖容器测试 |
| 前端运行时 | React + TypeScript | React 19；TypeScript 6.x | 管理控制台 |
| 前端构建 | Vite | 8.x | 开发服务器、构建、预览 |
| 前端 UI | Ant Design | 6.x | 企业管理台组件体系 |
| 前端数据状态 | TanStack Query + Zustand | Query 5.x；Zustand 5.x | 服务端状态、轻量客户端状态 |
| 前端测试 | Vitest + Playwright | Vitest 4.x；Playwright 1.60.x | 单元/组件/E2E |
| AI 适配器 | Python + FastAPI | Python 3.12；FastAPI 0.136.x；Pydantic 2.13.x | AI/MLOps 外部系统适配 |
| 元数据库 | PostgreSQL | 18.x | 平台业务元数据、审计索引 |
| 缓存 | Valkey | 8.1.x | 会话/令牌缓存、热点配置、短期状态 |
| 消息队列 | Apache Kafka | 4.0.x | 领域事件、审计/告警/任务事件流 |
| 对象存储 | MinIO（S3 兼容） | 私有化部署基线 | 数据集、模型文件、评估产物、日志归档 |
| 检索/日志索引 | OpenSearch | 3.x | 审计检索、运行日志与模型/数据集搜索 |
| 实验追踪 | MLflow | 3.x | 实验、指标、模型工件索引 |
| 工作流引擎 | Argo Workflows | 4.x | 训练、评估、批处理、工程化任务编排 |
| 模型服务 | KServe | 0.16+ | Kubernetes 原生在线推理服务 |
| 标注工具 | Label Studio | 1.x | 数据标注/审核工具适配 |
| 容器/编排 | Docker/OCI + Kubernetes | Kubernetes 1.35.x 作为生产落地基线 | 中心端部署、弹性伸缩、GPU/NPU 调度 |
| 包管理/GitOps | Helm + Argo CD | Helm 4；Argo CD 3.x | 应用打包、环境晋级、声明式发布 |
| 可观测 | OpenTelemetry + Prometheus + Grafana + Loki | 当前稳定线 | 指标、日志、链路、告警 |
| 身份认证 | YF LDAP + Spring Security | 企业 LDAP 参数待确认 | SSO、用户同步、RBAC/ABAC 基础 |

## 3. 主后端基线

### 3.1 技术选型

- 语言与运行时：**Java 21 LTS**。
- 框架：**Spring Boot 4.0.x**。
- Web/API：Spring MVC + Bean Validation + Spring Security。
- 持久化：**Spring Data JPA + Hibernate**，不采用 MyBatis Plus 作为默认基线。
- 数据库迁移：**Flyway**。
- API 文档：`springdoc-openapi` 输出 **OpenAPI 3.1**。
- 对象映射：优先使用 Java record/手写 assembler；仅在字段映射复杂且收益明确时引入 MapStruct。
- Boilerplate：不把 Lombok 作为默认必选；可在具体 feature 中经评审引入。
- 缓存客户端：Spring Cache + Caffeine（本地）+ Valkey（分布式）。
- 消息客户端：Spring for Apache Kafka。
- 可观测：Micrometer + OpenTelemetry exporter。

### 3.2 架构约束

- 后端按领域分包：`data`、`model`、`inference`、`resource`、`platform`，禁止按原型页面堆叠 Controller。
- 所有写操作必须具备：认证、授权、租户/BU 边界校验、状态机校验、审计事件。
- 所有 API 使用 `/api/v1` 前缀和 `docs/business/api/01-API接口规范.md` 的统一响应 envelope。
- 长任务不在 HTTP 请求内同步执行；提交任务后通过状态查询、事件流或通知回传进度。
- 主后端只保存文件元数据、对象 key、hash、权限、状态和审计关联；大文件进入对象存储。

### 3.3 测试基线

- 单元测试：JUnit 5 + Mockito。
- Web/API 测试：Spring Boot Test + MockMvc。
- 数据库/消息/对象存储集成：Testcontainers。
- 覆盖要求：每个 feature 的 `test-plan.md` 必须覆盖 happy path、权限失败、状态机错误、审计行为和相关 NFR/业务规则。

## 4. 前端基线

### 4.1 技术选型

- 语言：**TypeScript 6.x**。
- 框架：**React 19**。
- 构建工具：**Vite 8**。
- UI 组件库：**Ant Design 6**。
- 路由：React Router。
- 服务端状态：**TanStack Query 5**。
- 客户端轻量状态：**Zustand 5**。
- HTTP：Axios 或 Fetch wrapper 均可，但必须统一封装 API client、错误 envelope、鉴权头和 traceId。
- 图表：Apache ECharts。
- 表单：优先使用 Ant Design Form，复杂流程按页面拆分 wizard/state machine。
- 样式：Ant Design token + CSS Modules/CSS variables；不把 Tailwind CSS 作为默认必选。

### 4.2 原型约束

- 信息架构以 `docs/prototype/SMP工业AI平台-原型v2.html` 与编译版为准。
- 主导航 25 个页面必须保留；任何裁剪或重排必须进入 feature plan 并说明理由。
- 截图资产 `docs/prototype/*.png` 是视觉验收参考，不是可直接复制的前端实现。
- 前端不得以静态 mock 代替核心业务流验收；临时空态/骨架屏必须能接入真实 API。

### 4.3 测试基线

- 单元/组件测试：Vitest + React Testing Library。
- E2E：Playwright。
- API mock：仅允许用于前端单测、契约测试或后端不可达时的降级测试；正式联调必须连真实后端或测试替身服务。
- 视觉验收：涉及原型复刻的 feature 需保存截图或视觉差异说明到对应 `reports/`。

## 5. AI 适配器与 MLOps 基线

### 5.1 AI 适配器

- 语言：**Python 3.12**。
- Web 框架：**FastAPI 0.136.x**。
- Schema/config：Pydantic 2.13.x + pydantic-settings 2.14.x。
- ASGI server：Uvicorn 0.47.x。
- 包管理：uv；当前 `ai-adapter/pyproject.toml` 保持 `requires-python >=3.12`。
- 测试：当前保留 `unittest` 基线；新增复杂适配时可引入 pytest，但必须同步脚手架命令。

### 5.2 MLOps 外部能力

| 能力 | 基线技术 | 说明 |
|---|---|---|
| 标注/审核 | Label Studio 1.x | 通过 `ai-adapter/` 封装任务创建、同步、回写 |
| 实验追踪 | MLflow 3.x | 记录参数、指标、模型工件；主后端保存业务状态 |
| 训练/评估工作流 | Argo Workflows 4.x | 默认工作流引擎；如必须接入 Kubeflow Pipelines，需在 feature plan 中说明原因 |
| 在线推理 | KServe 0.16+ | Kubernetes 原生推理服务与灰度能力 |
| 预训练模型源 | HuggingFace/已验证开源模型 | 遵守 `open-questions.md` 已解决的 ARC-04 口径；版权/许可证进入模型入库校验 |

## 6. 数据与中间件基线

| 类型 | 基线 | 决策 |
|---|---|---|
| 元数据库 | PostgreSQL 18.x | 取代部署架构占位中的 MySQL/PostgreSQL/国产数据库待定项，作为默认实现数据库 |
| 缓存 | Valkey 8.1.x | Redis 协议兼容；用于会话、热点配置、短期任务状态，不作为业务事实源 |
| 消息队列 | Apache Kafka 4.0.x | 用于任务事件、审计事件、告警事件、异步通知；不默认使用 RabbitMQ/Pulsar |
| 对象存储 | MinIO（S3 兼容） | 私有化部署默认对象存储；如客户已有 OSS/Ceph/S3，可通过 S3 兼容配置替换 |
| 检索/日志索引 | OpenSearch 3.x | 审计日志检索、运行日志搜索、模型/数据集检索增强 |
| 本地缓存 | Caffeine 3.x | JVM 内热点缓存，与 Valkey 分层使用 |

## 7. 部署、运维与安全基线

- 容器：Docker/OCI 镜像。
- 编排：Kubernetes，生产落地以 **1.35.x production baseline** 为下限；实际集群版本由基础设施团队确认。
- GPU/NPU：通过 Kubernetes device plugin / 节点标签 / taint/toleration 管理。
- 包管理：Helm 4。
- GitOps：Argo CD 3.x。
- Ingress/API 网关：Kubernetes Ingress/Gateway API + 企业网关；具体供应商待部署 feature 确认。
- 证书与传输：中心端 HTTPS；中心-边端 HTTPS/mTLS，证书管理方案待边端 feature 确认。
- 身份：对接 **YF LDAP**，使用 Spring Security 作为主后端安全框架；OAuth2/SAML 仅作为外部网关或后续扩展，不作为当前默认。
- 权限：RBAC + 必要 ABAC；`tenantId`、BU、owner、resource status 是服务端强制校验字段。
- 审计：写入 PostgreSQL 事实表，同时异步投递 Kafka/OpenSearch 支持检索和告警；审计日志不可修改删除，保留期按业务规则至少 3 年。
- 可观测：OpenTelemetry trace/log/metric 采集，Prometheus 指标，Grafana 看板，Loki 日志聚合。

## 8. 工程质量与工具链

| 领域 | 基线工具 |
|---|---|
| 后端静态质量 | Maven、Spring Boot Test、JUnit 5、Mockito、Testcontainers、JaCoCo（后续启用） |
| 前端静态质量 | ESLint 10、Prettier 3、TypeScript strict、Vitest、Playwright |
| Python 质量 | `python -m compileall`、`unittest`；新增复杂适配时补 Ruff/Mypy/Pytest |
| 契约质量 | OpenAPI 3.1、契约测试、`docs/features/*/contract.md` 冻结 |
| 脚手架质量 | `tools/ai-scaffold`、`ai-scaffold.config.json`、feature/bugfix 文档门禁 |
| CI/CD | 先由 AI scaffold gate 定义本地等价门禁；`.github/workflows/ci.yml` 或企业 CI 后续确认 |

## 9. 与业务资料/原型的映射

| 业务/原型要求 | 技术栈承载方式 |
|---|---|
| `docs/business/api/01-API接口规范.md` 要求 REST、统一 envelope、Bearer/API Key | Spring Boot + OpenAPI 3.1 + Spring Security + API client wrapper |
| 数据源类型覆盖 MySQL/PostgreSQL/MinIO/Kafka/S3 等 | 主后端保存数据源元数据；连接器和同步任务通过 Java connector 或 AI adapter/worker 执行 |
| 数据集/模型文件/评估产物大文件管理 | MinIO S3 对象存储 + PostgreSQL 元数据 |
| 训练、评估、批量任务调度 | 主后端提交业务任务；Argo Workflows 执行；Kafka 传递事件 |
| 在线推理、灰度、回滚、健康检查 | KServe + Kubernetes + 主后端状态机 |
| 边端模型下发与完整性校验 | 主后端审批/审计；对象存储产物；边端 Agent 通过 HTTPS/mTLS 拉取 |
| 组织、权限、SSO、审计 | YF LDAP + Spring Security + PostgreSQL + OpenSearch |
| 原型中的管理台页面 | React 19 + Ant Design 6 + Vite 8 逐页重建 |

## 10. 明确不采用或暂缓的选项

| 选项 | 决策 | 原因 |
|---|---|---|
| 恢复旧 backend/frontend 技术栈 | 不采用 | 旧实现已清空且不再作为事实来源 |
| MyBatis Plus 作为默认持久化 | 不采用 | 当前重建基线选择 JPA/Hibernate 以贴合领域模型和 Spring Boot 默认生态 |
| Tailwind CSS 作为默认样式基线 | 暂缓 | 原型更接近企业控制台组件体系；优先 Ant Design token 与局部 CSS |
| RabbitMQ/Pulsar | 暂缓 | 默认 Kafka 覆盖任务/审计/告警事件流；除非 feature 明确需要其他语义 |
| Kubeflow Pipelines | 暂缓 | 默认 Argo Workflows；KFP 仅在平台团队确认已有集群能力时纳入 |
| Spring Boot 3.5 作为默认生产线 | 不采用 | 当前新建重建基线采用 Spring Boot 4.0.x；若企业依赖兼容性验证失败，再通过 ADR 降级到 3.5.x |
| Python 3.13 | 暂缓 | AI 适配器当前已基于 Python 3.12，且企业依赖兼容性更稳 |

## 11. 仍待确认的环境参数

以下不是技术选型问题，而是落地环境参数，继续在后续 feature/部署计划中确认：

- `TODO_CONFIRM_LDAP_URL`、Base DN、同步周期、服务账号与脱敏策略。
- `TODO_CONFIRM_POSTGRES_*` 测试库、生产库、备份、HA 和容量参数。
- `TODO_CONFIRM_MINIO_*` endpoint、bucket、KMS/加密策略、生命周期策略。
- `TODO_CONFIRM_KAFKA_*` broker、topic 命名、保留期、ACL。
- `TODO_CONFIRM_K8S_*` 集群版本、节点池、GPU/NPU device plugin、命名空间策略。
- `TODO_CONFIRM_ARGO_*`、`TODO_CONFIRM_KSERVE_*`、`TODO_CONFIRM_MLFLOW_*`、`TODO_CONFIRM_LABEL_STUDIO_*` 地址与认证。
- NFR-03 存储规模、NFR-04 合规标准、NFR-05 维护窗口、NFR-06 国际化资源来源。

## 12. 后续执行要求

1. 新 feature 的 `plan.md`、`TASK.md`、`contract.md`、`test-plan.md` 必须引用本文件作为技术栈基线。
2. 若某 feature 需要偏离本基线，必须在 `plan.md` 的 Reuse/Decision/Risk 中说明原因，并更新本文件或新增 ADR。
3. `ai-scaffold.config.json` 中的 `technologyStack` 是脚手架可读摘要；本文件是人审完整基线。
4. backend/frontend 重建完成后，必须把 `ai-scaffold.config.json` 中对应 `enabled` 改为 `true` 并补全实际门禁命令。

## 13. 版本核对来源（2026-05-15）

本基线写入前已核对关键官方资料；后续升级应重新核对：

- Spring Boot: `https://spring.io/projects/spring-boot`, `https://github.com/spring-projects/spring-boot/wiki/Supported-Versions`, `https://docs.spring.io/spring-boot/system-requirements.html`
- Node.js: `https://nodejs.org/en/about/previous-releases`
- React: `https://react.dev/blog/2025/10/01/react-19-2`
- Vite: `https://vite.dev/guide/`
- Ant Design: `https://ant.design/changelog`
- TypeScript: `https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html`
- Python: `https://devguide.python.org/versions/`
- Python/PyPI: `https://pypi.org/project/fastapi/`, `https://pypi.org/project/pydantic/`, `https://pypi.org/project/pydantic-settings/`, `https://pypi.org/project/uvicorn/`
- PostgreSQL: `https://www.postgresql.org/about/news/postgresql-18-released-3142/`
- Kubernetes: `https://kubernetes.io/releases/` (current maintained lines include 1.36/1.35/1.34; production baseline selects 1.35.x instead of immediately tracking latest 1.36)
- OpenAPI: `https://spec.openapis.org/oas/`
