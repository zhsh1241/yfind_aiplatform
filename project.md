# Project Guide: yfind_aiplatform

本仓库当前处于 **SMP 工业 AI 小模型平台重建基线**：旧版 backend/frontend/deploy 实现已清空，后续实现必须以 `docs/business/` 的业务资料和 `docs/prototype/` 的交互原型为输入重新规划、重新落地。

## 1. 产品定位

SMP（Small Model Platform）是面向工业 AI 场景的小模型全生命周期平台，服务对象包括平台管理员、BU 子管理员、数据标注/审核人员、模型训练工程师、模型应用工程师和运维人员。

平台目标是支撑以下闭环：

```text
组织/登录/权限 -> 数据源接入 -> 数据集管理 -> 数据加工/标注/审核 ->
训练/实验/评估 -> 模型注册/市场 -> 在线/批量推理 -> 边端下发 ->
监控/告警/审计/报表 -> 数据与推理结果回流
```

## 2. 权威资料

### 2.1 业务规格资料

- `docs/business/bizdocs/`：业务场景、业务流程、系统功能、非功能需求、工作台与调度中心。
- `docs/business/domain/`：数据域、模型域、资源域、平台域、推理域的领域对象和状态机。
- `docs/business/rules/`：DAT / MDL / INF / RES / PLT 业务规则，MUST 规则必须进入契约、服务校验、测试计划和审计设计。
- `docs/business/api/01-API接口规范.md`：REST API 总体规范与域级端点框架。
- `docs/business/arch/01-部署架构.md`：中心端 + 边端混合部署框架。
- `docs/business/open-questions.md`：已解决和待确认问题；未解决项不得用猜测填充。
- `docs/business/glossary.md`：术语、角色、缩写和命名口径。
- `docs/business/SMP平台-原型与规格综合评审报告.md`、`功能覆盖差距分析.md`、`原型页面完成度清单.md`：规格与原型覆盖关系。

### 2.2 原型资料

- `docs/prototype/SMP工业AI平台-原型v2.html`：交互原型 JSX 源文件。
- `docs/prototype/SMP工业AI平台-原型v2-compiled.html`：可直接打开的编译版原型。
- `docs/prototype/*.png`：主要页面截图和导航/风格对比素材。
- `docs/prototype/build.sh`：将 JSX 原型编译为纯 JS HTML 的辅助脚本。

## 3. 业务域与一期重建参考

| 领域 | 页面/能力 | 核心约束 |
|---|---|---|
| DATA 数据域 | 数据源、数据集、标注任务、标注审核、数据血缘、Pipeline、算子广场、数据资产门户 | 数据入平台必须安全检测；受限数据跨 BU 访问必须审批；已发布数据集版本不可修改；删除前检查训练引用 |
| MODEL 模型域 | 开发环境、训练监控、实验管理、模型评估、模型市场、模型工程化 | 训练必须引用已激活数据集；提交前检查资源配额；模型通过评估后才能发布；活跃部署版本不得删除 |
| INFERENCE 推理域 | 推理服务、批量推理、边端管理、第三方推理服务纳管 | 仅已发布/审批模型可部署；流量权重总和必须 100%；健康检查失败自动回滚；边端下发需审批和完整性校验 |
| RESOURCE 资源域 | 集群、节点、资源池、GPU/NPU、存储、镜像 | BU 不得超配额；训练任务队列调度；基础镜像安全扫描；单任务申请不得超过上限 |
| PLATFORM 平台域 | 租户/组织、用户、角色、权限、SSO、审计、通知、系统配置、报表 | tenantId 隔离；用户至少一个角色；最后一个超管不可删除/停用；审计日志不可篡改且至少保留 3 年 |

## 4. 技术栈基线（已确定）

完整基线见 `docs/architecture/01-technology-stack-baseline.md`；脚手架摘要同步在 `ai-scaffold.config.json` 的 `technologyStack`。这些是后续重建的默认技术选型，不代表 backend/frontend 产品实现已经恢复。

| 层级 | 技术栈 | 基线版本/范围 |
|---|---|---|
| 主后端 | Java + Spring Boot | Java 21 LTS；Spring Boot 4.0.x；Maven 3.9.x |
| 后端持久化 | Spring Data JPA + Hibernate + Flyway | PostgreSQL 18 元数据；Flyway 12.x 迁移 |
| 后端契约/安全 | OpenAPI 3.1 + Spring Security | `/api/v1`、统一 envelope、Bearer/API Key、YF LDAP |
| 后端测试 | JUnit 5 + Mockito + Testcontainers | 单元、MockMvc、容器化集成测试 |
| 前端 | React + TypeScript + Vite | React 19；TypeScript 6.x；Vite 8 |
| 前端 UI/状态 | Ant Design + TanStack Query + Zustand | Ant Design 6；Query 5；Zustand 5 |
| 前端测试 | Vitest + Playwright | Vitest 4；Playwright 1.60 |
| AI 适配器 | Python + FastAPI | Python 3.12；FastAPI 0.136.x；Pydantic 2.13.x；uv |
| 数据与中间件 | PostgreSQL + Valkey + Kafka + MinIO + OpenSearch | PostgreSQL 18；Valkey 8.1；Kafka 4.0；MinIO S3；OpenSearch 3.x |
| MLOps | Label Studio + MLflow + Argo Workflows + KServe | 标注、实验追踪、训练/评估编排、在线推理 |
| 部署运维 | Docker/OCI + Kubernetes + Helm + Argo CD | Kubernetes 1.35.x 作为生产落地基线；Helm 4；Argo CD 3.x |
| 可观测 | OpenTelemetry + Prometheus + Grafana + Loki | 指标、日志、链路、告警 |

关键决策：

- 主后端选择 **Spring Data JPA/Hibernate**，不把 MyBatis Plus 作为默认持久化基线。
- 前端选择 **Ant Design 6 + token/CSS 变量**，不把 Tailwind CSS 作为默认样式基线。
- 消息队列默认 **Kafka**，RabbitMQ/Pulsar 仅在具体 feature 证明必要时引入。
- MLOps 工作流默认 **Argo Workflows**，Kubeflow Pipelines 暂缓。
- Spring Boot 4.0.x 已作为当前主后端默认；Python 3.13/3.14、Kubernetes 1.36 等更新线暂不作为当前生产默认，后续通过 ADR/feature plan 评估升级。

## 5. 当前仓库布局

- `docs/business/`：业务和规格参考根（reference root）。
- `docs/prototype/`：交互原型和截图参考根（reference root）。
- `ai-adapter/`：仍保留并可验证的内部 AI/MLOps 适配器基线。
- `backend/`：旧实现已清空；当前在 `ai-scaffold.config.json` 中禁用，待正式 feature 重建。
- `frontend/`：旧实现已清空；当前在 `ai-scaffold.config.json` 中禁用，待基于原型重建。
- `deploy/`：旧部署材料已清空；待正式架构设计后重建。
- `tools/ai-scaffold/`：AI 脚手架 CLI 和质量门禁。
- `.agents/`、`.codex/`：AI 角色、技能和 workflow 表面。

## 6. AI Scaffold 配置

项目适配器：`ai-scaffold.config.json`。

当前关键设置：

- `referenceRoots`: `docs/business/`, `docs/prototype/`。
- `codeLikeRoots`: `ai-adapter/`, `docs/db/`。
- `backend.enabled`: `false`，因为旧后端已清空。
- `frontends[web].enabled`: `false`，因为旧前端已清空。
- `services[ai-adapter].enabled`: `true`，继续执行 Python compile/test/verify。
- `technologyStack`: 指向 `docs/architecture/01-technology-stack-baseline.md`，并记录 Java/Spring Boot、React、Python/FastAPI、PostgreSQL、Kafka、MinIO、Kubernetes 等已确定技术栈摘要。
- 外部系统地址、账号、密钥、容量、E2E 账号、LDAP 参数、MLOps/Kubernetes 环境参数等仍使用 `TODO_CONFIRM_*` 占位。

### 脚手架命令

```powershell
node tools/ai-scaffold/dist/cli.js scaffold-status
node tools/ai-scaffold/dist/cli.js doctor
npm --prefix tools/ai-scaffold run build
npm --prefix tools/ai-scaffold test
node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration
```

### AI adapter 验证

```powershell
Push-Location ai-adapter
python -m compileall app tests
python -m unittest discover -s tests -v
Pop-Location
```

## 7. 后续功能交付规则

1. 先读 `docs/business/` 与 `docs/prototype/`，再写 feature 计划。
2. 每个功能落在 `docs/features/F{nnn}-{slug}/`，包含 `plan.md`、`TASK.md`、`contract.md`、`test-plan.md`、`reports/`。
3. `plan.md` 人审 approved 前不得实现业务代码。
4. 契约必须引用业务规则、领域对象、权限、审计和错误码；MUST 规则必须有测试覆盖。
5. 不得用 mock/假接口替代核心业务能力；未知外部系统参数使用 `TODO_CONFIRM_*`。
6. 前端实现应以 `docs/prototype/SMP工业AI平台-原型v2.html` 的信息架构、页面清单、交互和截图为验收参考。

## 8. 当前已知缺口

- `docs/features/`、`docs/bugfix/`、`docs/architecture/` 在旧清空提交中已移除，需要在下一次正式规划前重建模板与编号文件。
- 后端、前端、部署目录暂无可运行产品实现。
- `ai-adapter/` 中训练接口仍含旧功能 trace 和占位行为，后续重建时需要按新 feature 重新归档和更新。
- LDAP、数据库、对象存储、Kafka、Label Studio、MLflow、Argo Workflows、KServe、Kubernetes、边端网络等外部环境参数仍待确认；技术选型已在 `docs/architecture/01-technology-stack-baseline.md` 锁定。
- `docs/business/open-questions.md` 中仍有 NFR、容量、合规、维护窗口、国际化等待确认项。
