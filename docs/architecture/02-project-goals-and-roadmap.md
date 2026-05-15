# SMP 项目总体目标与建设路线图

> 状态：总体规划基线
> 日期：2026-05-15
> 适用范围：SMP 重建阶段的产品目标、里程碑、功能切分、质量门禁和执行顺序
> 权威输入：`docs/business/`、`docs/prototype/`、`docs/architecture/00-project-understanding.md`、`docs/architecture/01-technology-stack-baseline.md`

## 1. 一句话目标

在当前已清空旧实现的基础上，按生产可用标准重建 **YFI / 延锋 SMP 工业 AI 小模型平台**：以多租户治理、数据资产管理、模型资产治理、边端模型下发、资源调度、审计合规和可观测运维为主线，逐步形成从数据接入到推理结果回流的工业 AI 小模型全生命周期闭环。

## 2. 建设原则

1. **事实源优先**：业务、领域对象、规则、原型均以 `docs/business/` 与 `docs/prototype/` 为准；不得复用已清空的旧 backend/frontend/deploy 实现作为产品事实。
2. **契约先行**：每个功能先冻结 `contract.md` / OpenAPI / 权限 / 审计 / 错误码，再实现后端、前端、联调和测试。
3. **平台底座先行**：租户、组织、用户、权限、审计、文件、配置、通知、资源配额是所有业务域的前置能力。
4. **垂直闭环优先**：每个里程碑优先交付可演示、可验证、可审计的端到端业务切片，而不是只堆页面或只堆接口。
5. **核心能力不得 mock 化**：允许在单元测试和契约测试中使用测试替身；正式联调与验收必须连接真实后端或明确的测试替身服务，不能用静态假接口替代核心流程。
6. **权限与审计默认开启**：所有写操作、高风险操作、跨 BU 访问、状态机变更必须具备权限校验、状态校验和审计事件。
7. **不猜外部环境**：LDAP、数据库、对象存储、Kafka、K8s、Label Studio、MLflow、Argo、KServe 等连接参数继续使用 `TODO_CONFIRM_*`，直到部署/集成 feature 确认。

## 3. 产品目标

### G1：平台治理与多租户基础

- 支持集团 → BU → 项目多级组织结构。
- 支持 YF LDAP 登录、用户同步、角色管理、RBAC 与必要 ABAC。
- 所有资源具备 `tenantId`、BU、owner、status、version 与审计关联。
- 超级管理员、BU 子管理员、工程师、标注/审核人员、模型应用工程师等角色边界清晰。

验收指标：

- 登录、组织、用户、角色、权限、菜单可见性和资源访问控制均有自动化测试。
- 关键写操作审计覆盖率 100%。
- 最后一个超级管理员不可删除/停用、用户至少一个角色等 MUST 规则有测试覆盖。

### G2：数据资产全生命周期

- 支持数据源接入、数据集上传、数据集版本、元数据、血缘、权限、数据门户和访问申请。
- 支持标注任务、标注审核、标注结果回写和 Label Studio 适配。
- 支持 Pipeline / 算子广场的基础编排与运行记录，为后续增强、特征加工、质量检测预留。

验收指标：

- 数据集发布版本不可变，删除前检查训练/模型/推理引用。
- 受限数据跨 BU 访问必须审批，审批超时/拒绝/到期均可追踪。
- 数据文件进入对象存储，数据库只保存元数据、对象 key、hash、状态和审计关联。

### G3：模型资产治理与工程化入口

- 一期优先交付模型注册、模型版本、模型市场、模型评估结果展示、模型授权和边端可下发模型资产。
- 训练任务、开发环境、实验管理、AutoML、中心端在线推理按 `open-questions.md` 已确认范围放入二期。
- 模型 owner 授权、版本状态机、许可证/来源、评估结论和部署引用必须可追溯。

验收指标：

- 未发布/未审批模型不可部署或下发。
- 活跃部署引用的模型版本不可删除。
- 模型查看、下载、推理服务使用均受 owner/BU 授权约束。

### G4：边端模型下发与资源治理

- 一期交付边端服务器管理、边端模型下发、部署历史、在线/离线状态、完整性校验和授权审批。
- 资源域交付集群、节点、GPU/NPU、资源池、存储池、镜像与配额视图，为训练/推理二期能力打底。
- 中心端与边端按 HTTPS/mTLS 方向设计，证书和网络细节进入部署 feature 确认。

验收指标：

- 边端模型下发需边端应用 owner 授权。
- 下发文件 hash 校验失败必须阻断并审计。
- BU 资源不得超过配额；单任务申请不得超过资源池上限。

### G5：运营、告警、报表与可观测

- 工作台呈现个人待办、平台总览、实例统计、资源配额和快捷入口。
- 调度中心、告警中心、报表中心形成运维闭环。
- 服务指标、日志、链路、审计事件进入 OpenTelemetry / Prometheus / Loki / OpenSearch 等基线能力。

验收指标：

- 平台关键操作可在审计日志中按用户、资源、时间、操作类型检索。
- P0/P1 告警有触达、处理、关闭和复盘记录。
- 工作台/报表数据按租户/BU 权限隔离。

### G6：二期 AI/MLOps 闭环

- 交付训练任务、开发环境、实验管理、模型工程化、中心端在线推理、批量推理、A/B 与灰度、KServe 集成。
- AI adapter 封装 Label Studio、MLflow、Argo Workflows、KServe 等外部系统，主后端保持业务事实源。

验收指标：

- 训练必须引用已激活数据集。
- 提交任务前必须检查资源配额。
- 推理流量权重总和必须为 100%，健康检查失败可自动回滚。

## 4. 阶段路线图

> 时间以相对周期表达。实际日期需结合团队规模、外部环境、企业 CI 和基础设施资源确认。

| 阶段 | 建议周期 | 目标 | 主要交付 | 阶段出口 |
|---|---:|---|---|---|
| R0 重建基线 | 已完成 | 统一事实源、技术栈、脚手架 | `docs/architecture/00/01`、F001/F002、AI scaffold `technologyStack` | `ai-scaffold` 与 `ai-adapter` 当前 gate 通过 |
| R1 工程底座 | T+2~3 周 | 恢复生产级 backend/frontend/deploy 最小骨架 | Spring Boot 多模块、React 管理台骨架、OpenAPI 框架、Flyway、基础 CI、Docker/Helm 草案 | backend/frontend/deploy 重新 `enabled=true` 且 gate 通过 |
| R2 平台治理底座 | T+3~5 周 | 交付租户、组织、用户、角色、权限、审计、配置、文件服务 | LDAP 占位配置、RBAC、审计事实表、菜单权限、对象存储元数据、API envelope | 登录到工作台、权限隔离、审计查询形成闭环 |
| R3 数据域 MVP | T+4~6 周 | 交付数据源、数据集、版本、门户、访问审批、标注集成 | 数据源连接测试、数据集上传/版本、MinIO、Label Studio 适配、数据门户、访问申请 | 数据接入 → 标注/审核 → 发布 → 授权访问闭环 |
| R4 资源与边端 MVP | T+3~5 周 | 交付资源视图、资源池/配额、边端服务器、模型下发 | 集群/节点/GPU/NPU 资产、资源池、存储池、边端注册、下发审批、hash 校验 | 已发布模型可审批下发到边端服务器并审计 |
| R5 模型资产与运营 MVP | T+3~5 周 | 交付模型注册/版本/市场/评估展示，以及工作台/告警/报表 | 模型仓库、模型市场、模型评估结果、工作台、调度中心、告警中心、报表中心 | 一期可演示：数据资产 + 模型资产 + 边端下发 + 运营审计 |
| R6 生产加固 | T+3~4 周 | 安全、性能、可观测、备份、部署、文档和验收加固 | 压测、告警演练、日志/指标/链路、Helm/Argo CD、部署手册、回滚手册 | 生产试运行候选版本 |
| R7 二期 AI/MLOps | 后续立项 | 训练、实验、开发环境、中心推理、批量推理、灰度 | Argo Workflows、MLflow、KServe、训练/实验/推理服务 | 模型训练 → 评估 → 中心推理 → 回流闭环 |

## 5. 建议功能包序列

| 建议编号 | 功能包 | 优先级 | 依赖 | 关键范围 |
|---|---|---|---|---|
| F003 | `backend-foundation` | P0 | R0 | Spring Boot 4.0.x 多模块、统一响应、异常、OpenAPI、Flyway、基础测试 |
| F004 | `frontend-foundation` | P0 | R0 | React/Vite/AntD 管理台骨架、路由、布局、API client、权限菜单占位 |
| F005 | `deploy-foundation` | P0 | F003/F004 | Dockerfile、Helm、环境变量模板、健康检查、部署说明 |
| F006 | `platform-identity-audit` | P0 | F003/F004 | LDAP 登录占位、用户/角色/权限、审计日志、菜单权限 |
| F007 | `platform-organization-config` | P0 | F006 | 租户/BU/项目、系统配置、通知、文件元数据 |
| F008 | `resource-inventory-quota` | P1 | F006 | 集群、节点、GPU/NPU、资源池、配额、存储池视图 |
| F009 | `data-source-dataset-foundation` | P0 | F006/F007 | 数据源、连接测试、数据集上传、版本、对象存储元数据 |
| F010 | `annotation-integration` | P1 | F009 | 标注任务、审核、Label Studio 适配、标注结果回写 |
| F011 | `data-portal-access-approval` | P0 | F009/F006 | 数据资产门户、搜索、访问申请、审批、授权到期 |
| F012 | `pipeline-operator-foundation` | P1 | F009/F008 | Pipeline、算子广场、运行历史、基础血缘 |
| F013 | `model-registry-market` | P0 | F009/F006 | 模型注册、版本、模型市场、模型授权、许可证/来源 |
| F014 | `model-evaluation-readiness` | P1 | F013 | 评估结果、指标展示、模型对比、发布门禁 |
| F015 | `edge-management-delivery` | P0 | F013/F008/F006 | 边端服务器、部署历史、模型下发、审批、完整性校验 |
| F016 | `dashboard-alert-report` | P1 | F006/F008/F009/F013/F015 | 工作台、调度中心、告警中心、报表中心 |
| F017 | `observability-production-hardening` | P0 | R1~R5 | 指标/日志/链路、压测、安全扫描、备份、发布/回滚手册 |
| F018 | `training-experiment-phase2` | P2 | F009/F013/F008 | 开发环境、训练任务、实验、MLflow、Argo Workflows |
| F019 | `inference-service-phase2` | P2 | F013/F014/F008 | KServe 在线推理、流量策略、回滚、API Key |
| F020 | `batch-inference-feedback-phase2` | P2 | F019/F009 | 批量推理、结果导出、推理结果回流 |

## 6. 依赖图

```text
R0 基线
  ├─ F003 backend-foundation
  ├─ F004 frontend-foundation
  └─ F005 deploy-foundation

F003 + F004
  └─ F006 identity/audit
      ├─ F007 organization/config
      ├─ F008 resource/quota
      ├─ F009 data-source/dataset
      │   ├─ F010 annotation
      │   ├─ F011 data portal/access
      │   └─ F012 pipeline/operator
      └─ F013 model registry/market
          ├─ F014 evaluation
          └─ F015 edge delivery

F006 + F008 + F009 + F013 + F015
  └─ F016 dashboard/alert/report
      └─ F017 production hardening

Phase 2:
F008 + F009 + F013 -> F018 training/experiment -> F019 inference -> F020 batch/feedback
```

## 7. 可并行工作流

| 并行组 | 可并行内容 | 前置条件 | 合并点 |
|---|---|---|---|
| P-A 工程底座 | F003 后端、F004 前端、F005 部署草案 | R0 | 统一 API envelope、健康检查、CI/gate |
| P-B 平台底座 | F006 权限审计、F007 组织配置 | F003/F004 | 登录后按租户/角色访问工作台 |
| P-C 数据域 | F009 数据集、F010 标注、F011 门户审批、F012 Pipeline | F006/F007 | 数据发布与访问授权闭环 |
| P-D 资产与边端 | F008 资源、F013 模型仓库、F015 边端下发 | F006 | 已发布模型可下发边端 |
| P-E 运营视图 | F016 工作台/告警/报表 | F006/F008/F009/F013/F015 | 一期演示与验收看板 |

## 8. 质量门禁

每个正式 feature 必须满足：

1. `plan.md` 已批准，且引用业务资料、原型页面和技术栈基线。
2. `TASK.md` 有稳定 AC-xx，且覆盖权限、审计、状态机、NFR 或说明不适用。
3. `contract.md` 状态为 frozen/implemented，包含 API、权限、审计事件、错误码和状态机。
4. `test-plan.md` 覆盖 happy path、权限失败、状态机错误、审计行为、回归风险。
5. 后端实现有单元/集成测试；前端实现有组件/E2E 或等价交互验证；AI adapter 有 compile/test。
6. `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/Fxxx-slug` 通过。
7. 若变更涉及原型复刻，`reports/` 中需保留截图、视觉差异说明或视觉验收记录。

## 9. 一期验收口径

一期不以“所有原型页面完全实现”为验收标准，而以核心闭环是否生产可用为准。

必须达成：

- 平台管理员可登录，完成租户/BU/用户/角色/权限管理。
- 数据管理员可接入数据源、创建数据集、上传/发布数据集版本。
- 标注/审核人员可完成标注任务创建、审核与结果回写。
- 工程师可在数据资产门户发现数据集并发起授权申请。
- 模型负责人可注册模型、发布模型版本、配置可下发资产。
- 边端应用 owner 授权后，模型可下发至边端服务器，且完整性校验与审计完整。
- 工作台、告警、报表能反映关键状态，且数据按租户/BU 隔离。
- 所有关键写操作和高风险操作可审计查询。

明确不作为一期强制目标：

- Jupyter/VSCode 开发环境。
- 训练任务与实验管理的完整生产化。
- 中心端 KServe 在线推理与 A/B 灰度。
- 批量推理生产调度。
- 自定义看板拖拽、收藏夹分组、贡献者排行榜等增强功能。

## 10. 关键风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 外部环境参数未确认 | 阻塞 LDAP、K8s、MinIO、Kafka、Argo、KServe 等联调 | 每个集成 feature 使用 `TODO_CONFIRM_*`，并在部署 feature 中集中确认 |
| 权限/审计后补导致返工 | 所有业务域都受影响 | F006 先交付权限审计底座；后续 feature 默认接入 |
| 前端按原型堆页面、后端按页面堆接口 | 领域边界混乱 | 后端按五大领域分包；前端页面必须通过 API contract 接入领域资源 |
| 数据/模型大文件进入数据库 | 性能和扩展性风险 | 强制对象存储 + 元数据表设计；测试覆盖大文件元数据边界 |
| MLOps 外部系统不可用 | 训练/标注/推理集成阻塞 | 主后端先冻结业务状态机；AI adapter 用测试替身服务验证契约 |
| NFR 未最终确认 | 性能、容量、合规验收不稳定 | R1~R3 期间持续维护 open questions；R6 前必须形成 NFR 冻结清单 |
| 一期范围膨胀 | 延期风险 | 严格遵守一期/二期边界；训练和中心推理默认二期 |

## 11. 决策记录（ADR 摘要）

### Decision

采用“平台治理底座 → 数据资产闭环 → 模型资产与边端下发 → 运营加固 → 二期训练/推理”的路线重建 SMP。

### Drivers

1. `open-questions.md` 已确认模型开发/训练和中心端推理服务放二期，但数据集门户和边端管理放一期。
2. 旧实现已清空，必须先恢复生产级工程骨架和权限/审计底座。
3. 数据、模型、边端下发都依赖租户/BU/owner/状态机/审计等平台治理能力。

### Alternatives Considered

- **先完整复刻 25 个前端页面**：拒绝。会形成大量无真实业务支撑的页面，无法证明生产可用。
- **先做训练/推理 MLOps 集成**：拒绝。训练和中心端推理已明确为二期，且依赖数据集、模型仓库、资源配额和权限审计。
- **先按五大域并行铺开所有功能**：暂缓。领域依赖复杂，容易造成契约漂移和重复实现。

### Consequences

- 一期会优先交付治理、数据、模型资产、边端和运营闭环；部分原型中的训练/中心推理能力会在二期交付。
- 后续所有 feature 需要遵守正式文档、冻结契约、测试计划和 gate 证据。
- R1 完成前 backend/frontend/deploy 仍保持待重建状态，当前只有 `ai-adapter/` 是可运行服务基线。

## 12. 下一步

1. 启动 F003 `backend-foundation`：重建 Spring Boot 后端工程骨架、OpenAPI、统一响应、Flyway、测试基线。
2. 并行启动 F004 `frontend-foundation`：重建 React/Ant Design 控制台骨架、路由、API client、权限菜单框架。
3. 启动 F005 `deploy-foundation`：重建 Docker/Helm/环境变量/健康检查和本地/测试部署说明。
4. R1 三个 feature 合并后，把 `ai-scaffold.config.json` 中 backend/frontend 改为 `enabled=true`，并补全真实 gate 命令。
5. 进入 F006 平台身份、权限和审计底座。
