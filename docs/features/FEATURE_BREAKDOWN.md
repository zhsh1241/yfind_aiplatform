# SMP 功能拆解清单

> 状态：开发准备清单
> 日期：2026-05-15
> 适用范围：`docs/features/F{nnn}-{slug}/` 正式功能包创建、排期、并行开发与验收追踪
> 权威输入：`docs/business/`、`docs/prototype/`、`docs/architecture/00-project-understanding.md`、`docs/architecture/01-technology-stack-baseline.md`、`docs/architecture/02-project-goals-and-roadmap.md`

## 1. 编号规则

1. 功能包使用 `F{三位序号}-{slug}`，例如 `F003-backend-foundation`。
2. `F001`、`F002` 已用于重建基线与技术栈基线；后续正式开发从 `F003` 开始。
3. 本清单中的 `F003`～`F020` 为后续开发保留编号，不得随意复用或改号；若范围拆分/合并，需同步更新本清单和相关计划。
4. 子功能使用 `F{nnn}-C{两位序号}`，用于 `TASK.md`、`contract.md`、`test-plan.md` 中进一步转化为稳定 `AC-xx`。
5. 本清单只做功能拆解和编号准备，不代表 `plan.md` 已批准；进入开发前仍必须创建对应 feature 目录并完成 `plan.md` → `TASK.md` → `contract.md` → `test-plan.md`。
6. `docs/features/NEXT_FEATURE_NUMBER.txt` 当前值保持为 `3`；实际创建目录时按编号顺序使用 `init-feature` 或手工创建并递增。

## 2. 一期与二期边界

一期以生产可用闭环为验收：平台治理、数据资产、模型资产、边端下发、运营审计。

二期交付训练任务、开发环境、实验管理、中心端在线推理、批量推理、A/B 灰度和更完整 AI/MLOps 编排。该边界来自 `docs/business/open-questions.md` 中 SCO-01、SCO-02、SCO-03 的已解决结论。

## 3. 功能包总表

| 编号 | slug | 中文名称 | 阶段 | 领域 | 优先级 | 状态 | 主要依赖 |
|---|---|---|---|---|---|---|---|
| F001 | `smp-rebuild-scaffold-baseline` | 重建脚手架基线 | R0 | FOUNDATION | P0 | 已完成 | 无 |
| F002 | `technology-stack-baseline` | 技术栈基线 | R0 | FOUNDATION | P0 | 已完成 | F001 |
| F003 | `backend-foundation` | 后端工程底座 | R1 | FOUNDATION | P0 | 待规划 | F001、F002 |
| F004 | `frontend-foundation` | 前端工程底座 | R1 | FOUNDATION | P0 | 待规划 | F001、F002 |
| F005 | `deploy-foundation` | 部署工程底座 | R1 | FOUNDATION | P0 | 待规划 | F003、F004 |
| F006 | `platform-identity-audit` | 身份、权限与审计底座 | R2 | PLATFORM | P0 | 待规划 | F003、F004 |
| F007 | `platform-organization-config` | 组织、配置与文件元数据 | R2 | PLATFORM | P0 | 待规划 | F006 |
| F008 | `resource-inventory-quota` | 资源资产、资源池与配额 | R4 | RESOURCE | P1 | 待规划 | F006 |
| F009 | `data-source-dataset-foundation` | 数据源与数据集基础 | R3 | DATA | P0 | 待规划 | F006、F007 |
| F010 | `annotation-integration` | 标注任务、审核与 Label Studio 适配 | R3 | DATA | P1 | 待规划 | F009 |
| F011 | `data-portal-access-approval` | 数据资产门户与访问审批 | R3 | DATA | P0 | 待规划 | F006、F009 |
| F012 | `pipeline-operator-foundation` | Pipeline、算子广场与基础血缘 | R3 | DATA | P1 | 待规划 | F008、F009 |
| F013 | `model-registry-market` | 模型注册、版本与模型市场 | R5 | MODEL | P0 | 待规划 | F006、F009 |
| F014 | `model-evaluation-readiness` | 模型评估结果与发布门禁 | R5 | MODEL | P1 | 待规划 | F013 |
| F015 | `edge-management-delivery` | 边端服务器与模型下发 | R4 | INFERENCE | P0 | 待规划 | F006、F008、F013 |
| F016 | `dashboard-alert-report` | 工作台、调度、告警与报表 | R5 | PLATFORM | P1 | 待规划 | F006、F008、F009、F013、F015 |
| F017 | `observability-production-hardening` | 可观测、安全与生产加固 | R6 | FOUNDATION | P0 | 待规划 | R1～R5 |
| F018 | `training-experiment-phase2` | 开发环境、训练任务与实验管理（二期） | R7 | MODEL | P2 | 二期 | F008、F009、F013 |
| F019 | `inference-service-phase2` | 中心端在线推理服务（二期） | R7 | INFERENCE | P2 | 二期 | F008、F013、F014 |
| F020 | `batch-inference-feedback-phase2` | 批量推理与结果回流（二期） | R7 | INFERENCE | P2 | 二期 | F009、F019 |

## 4. 功能包参考文档与原型页面索引

> 所有原型页面均以 `docs/prototype/SMP工业AI平台-原型v2.html`（JSX 源）和 `docs/prototype/SMP工业AI平台-原型v2-compiled.html`（可运行编译版）为准；截图资产用于视觉验收和页面复刻比对。若表中写“无专属页面”，表示该功能以工程/部署/横切能力为主，应参考全局原型信息架构、API 规范和相关页面接入点。

| 编号 | 参考文档 | 原型页面 / 页面 key | 截图或视觉资产 |
|---|---|---|---|
| F001 | `docs/business/`、`docs/prototype/`、`tools/ai-scaffold/`、`AGENTS.md`、`project.md` | 全局信息架构；无专属业务页面 | 全局原型与截图资产 |
| F002 | `docs/architecture/01-technology-stack-baseline.md`、`ai-scaffold.config.json`、`docs/business/arch/01-部署架构.md`、`docs/business/api/01-API接口规范.md` | 全局技术基线；无专属业务页面 | 无专属截图 |
| F003 | `docs/architecture/01-technology-stack-baseline.md`、`docs/business/api/01-API接口规范.md`、`docs/business/domain/`、`docs/business/rules/` | 后端 API 与领域底座；无专属页面 | 无专属截图 |
| F004 | `docs/prototype/SMP工业AI平台-原型v2.html`、`docs/prototype/SMP工业AI平台-原型v2-compiled.html`、`docs/business/原型页面完成度清单.md`、`docs/business/SMP平台-原型与规格综合评审报告.md` | 全部 25 个主导航页面：`dash`、`ds`、`ann`、`datasrc`、`annreview`、`lineage`、`pipeline`、`opmarket`、`portal`、`devenv`、`train`、`exp`、`eval`、`hub`、`infer`、`batch`、`sched`、`edge`、`report`、`resource`、`usermgmt`、`org`、`perm`、`alert`、`sys` | `dashboard.png`、`screen-*.png`、`light-*.png`、`sb*.png` |
| F005 | `docs/business/arch/01-部署架构.md`、`docs/architecture/01-technology-stack-baseline.md`、`ai-scaffold.config.json`、`docs/business/open-questions.md` | 部署底座；无专属业务页面 | 无专属截图 |
| F006 | `docs/business/bizdocs/03-04-系统功能-平台管理.md`、`docs/business/bizdocs/05-01-系统功能-平台基础.md`、`docs/business/bizdocs/05-02-系统功能-国际化与审计日志.md`、`docs/business/domain/04-领域对象-平台域.md`、`docs/business/rules/05-平台与权限规则.md` | 登录页、`usermgmt` 用户管理、`perm` 权限管理；审计查询入口按平台管理/系统配置承载 | `screen-perm.png`、`screen-sys.png` |
| F007 | `docs/business/bizdocs/03-04-系统功能-平台管理.md`、`docs/business/bizdocs/05-03-系统功能-通知与文件管理.md`、`docs/business/domain/04-领域对象-平台域.md`、`docs/business/rules/05-平台与权限规则.md` | `org` 组织管理、`sys` 系统配置 | `screen-org.png`、`screen-sys.png` |
| F008 | `docs/business/bizdocs/02-04-业务流程-平台运营.md`、`docs/business/bizdocs/03-04-系统功能-平台管理.md`、`docs/business/domain/03-领域对象-资源域.md`、`docs/business/rules/04-资源管理规则.md` | `resource` 资源管理、`sched` 调度中心资源视图 | `screen-train.png`（资源曲线参考）、调度/资源页面以编译原型为准 |
| F009 | `docs/business/bizdocs/02-01-业务流程-数据管理.md`、`docs/business/bizdocs/03-01-系统功能-数据管理.md`、`docs/business/domain/01-领域对象-数据域.md`、`docs/business/rules/01-数据管理规则.md` | `datasrc` 数据源管理、`ds` 数据集管理、数据集详情、数据集上传向导 | `screen-datasets.png`、`screen-dsdetail.png`、`screen-upload.png`、`light-ds.png` |
| F010 | `docs/business/bizdocs/02-01-业务流程-数据管理.md`、`docs/business/bizdocs/03-01-系统功能-数据管理.md`、`docs/business/domain/01-领域对象-数据域.md`、`docs/business/rules/01-数据管理规则.md`、`docs/business/open-questions.md` | `ann` 标注任务、`annreview` 标注审核、标注工作台 | `screen-annotation.png`、`screen-annwork.png` |
| F011 | `docs/business/bizdocs/03-01-系统功能-数据管理.md`、`docs/business/domain/01-领域对象-数据域.md`、`docs/business/rules/01-数据管理规则.md`、`docs/business/rules/05-平台与权限规则.md` | `portal` 数据资产门户、`perm` 授权/审批入口、数据集详情权限 Tab | `screen-datasets.png`、`screen-dsdetail.png`、`screen-perm.png` |
| F012 | `docs/business/bizdocs/02-01-业务流程-数据管理.md`、`docs/business/bizdocs/03-01-系统功能-数据管理.md`、`docs/business/domain/01-领域对象-数据域.md`、`docs/business/rules/01-数据管理规则.md`、`docs/business/open-questions.md` | `pipeline` Pipeline 编辑器、`opmarket` 算子广场、`lineage` 数据血缘图 | `screen-pipeline.png`、`screen-lineage.png`、`screen-lineage-detail.png` |
| F013 | `docs/business/bizdocs/02-02-业务流程-模型开发与训练.md`、`docs/business/bizdocs/03-02-系统功能-模型开发.md`、`docs/business/domain/02-领域对象-模型域.md`、`docs/business/rules/02-模型开发规则.md` | `hub` 模型市场；模型详情/在线体验/部署入口 | `screen-hub.png` |
| F014 | `docs/business/bizdocs/03-02-系统功能-模型开发.md`、`docs/business/domain/02-领域对象-模型域.md`、`docs/business/rules/02-模型开发规则.md` | `eval` 模型评估、模型对比 Tab | `screen-eval.png`、`light-eval.png` |
| F015 | `docs/business/bizdocs/02-03-业务流程-模型部署与推理.md`、`docs/business/bizdocs/03-03-系统功能-模型部署.md`、`docs/business/domain/05-领域对象-推理域.md`、`docs/business/rules/03-推理部署规则.md`、`docs/business/open-questions.md` | `edge` 边端管理、`hub` 模型下发入口 | 编译原型 `edge` 页面；`screen-hub.png` |
| F016 | `docs/business/bizdocs/03-05-系统功能-告警管理.md`、`docs/business/bizdocs/05-05-系统功能-报表与看板.md`、`docs/business/bizdocs/07-工作台与调度中心.md`、`docs/business/domain/04-领域对象-平台域.md`、`docs/business/rules/05-平台与权限规则.md` | `dash` 工作台、`sched` 调度中心、`alert` 告警中心、`report` 报表中心 | `dashboard.png`、`light-dashboard.png`、`screen-alert.png` |
| F017 | `docs/business/bizdocs/06-非功能性需求.md`、`docs/business/arch/01-部署架构.md`、`docs/architecture/01-technology-stack-baseline.md`、`docs/business/open-questions.md` | 可观测/安全/生产加固横切能力；关联 `alert`、`sched`、`report` | `screen-alert.png`；其他以运行证据和看板截图为准 |
| F018 | `docs/business/bizdocs/02-02-业务流程-模型开发与训练.md`、`docs/business/bizdocs/03-02-系统功能-模型开发.md`、`docs/business/domain/02-领域对象-模型域.md`、`docs/business/rules/02-模型开发规则.md`、`docs/business/open-questions.md` | `devenv` 开发环境、`train` 训练监控、`exp` 实验管理 | `screen-train.png`、`screen-exp.png`、`light-train.png` |
| F019 | `docs/business/bizdocs/02-03-业务流程-模型部署与推理.md`、`docs/business/bizdocs/03-03-系统功能-模型部署.md`、`docs/business/domain/05-领域对象-推理域.md`、`docs/business/rules/03-推理部署规则.md` | `infer` 推理服务、`hub` 部署为推理服务入口 | `screen-infer.png`、`screen-hub.png` |
| F020 | `docs/business/bizdocs/02-03-业务流程-模型部署与推理.md`、`docs/business/bizdocs/03-03-系统功能-模型部署.md`、`docs/business/domain/05-领域对象-推理域.md`、`docs/business/rules/03-推理部署规则.md`、`docs/business/bizdocs/07-工作台与调度中心.md` | `batch` 批量推理、`infer` 批量任务 Tab、`sched` 调度中心 | `screen-infer.png`；`batch` 页面以编译原型为准 |

## 5. 推荐开发顺序

```text
R0 已完成：
  F001 -> F002

R1 工程底座：
  F003 + F004 -> F005

R2 平台治理：
  F006 -> F007

R3 数据域 MVP：
  F009 -> F010
  F009 + F006 -> F011
  F009 + F008 -> F012

R4 资源与边端：
  F006 -> F008
  F006 + F008 + F013 -> F015

R5 模型资产与运营：
  F009 + F006 -> F013 -> F014
  F006 + F008 + F009 + F013 + F015 -> F016

R6 生产加固：
  R1~R5 -> F017

R7 二期：
  F018 -> F019 -> F020
```

## 6. 功能包详细拆解

### F003 `backend-foundation`：后端工程底座

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F003-C01 | Spring Boot 4.0.x + Java 21 多模块工程骨架 | `backend/`、Maven 父工程、模块边界说明 |
| F003-C02 | `/api/v1` 统一响应 envelope、错误码和异常处理 | OpenAPI 示例、错误码清单、全局异常测试 |
| F003-C03 | 基础领域分包：`data`、`model`、`inference`、`resource`、`platform` | 包结构与边界说明 |
| F003-C04 | Flyway、JPA、审计字段、乐观锁和软删除基础约定 | 初始 migration、实体基类或约定文档 |
| F003-C05 | 后端测试基线 | JUnit 5、Mockito、MockMvc、Testcontainers 示例 |
| F003-C06 | 健康检查与运行时配置 | `/actuator/health`、profile、`TODO_CONFIRM_*` 配置模板 |

### F004 `frontend-foundation`：前端工程底座

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F004-C01 | React 19 + TypeScript 6 + Vite 8 管理台骨架 | `frontend/`、路由、构建命令 |
| F004-C02 | Ant Design 6 主题、布局、菜单与 25 个原型页面占位路由 | 主导航与页面 key 映射 |
| F004-C03 | API client、统一 envelope、traceId、鉴权头和错误处理 | `apiClient`、错误展示组件 |
| F004-C04 | TanStack Query + Zustand 状态基线 | 查询缓存、用户会话状态 |
| F004-C05 | 前端测试基线 | Vitest、React Testing Library、Playwright smoke |
| F004-C06 | 原型视觉验收入口 | 截图保存路径和视觉差异报告模板 |

### F005 `deploy-foundation`：部署工程底座

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F005-C01 | 后端、前端、AI adapter Dockerfile | OCI 镜像构建脚本 |
| F005-C02 | Helm chart 草案与环境变量模板 | `deploy/helm`、values 示例 |
| F005-C03 | 本地/测试环境 compose 或等价启动说明 | PostgreSQL、Valkey、Kafka、MinIO、OpenSearch 占位 |
| F005-C04 | 健康检查、日志目录、配置注入约定 | readiness/liveness 设计 |
| F005-C05 | `ai-scaffold.config.json` backend/frontend 启用准备 | gate 命令草案 |

### F006 `platform-identity-audit`：身份、权限与审计底座

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F006-C01 | YF LDAP 登录占位与本地测试认证模式 | 登录 API、会话/token 设计 |
| F006-C02 | 用户、角色、权限、菜单可见性 | 用户管理与权限矩阵契约 |
| F006-C03 | RBAC + 必要 ABAC 服务端强制校验 | 权限注解/拦截器/策略测试 |
| F006-C04 | 审计日志事实表与审计事件发布 | 审计事件命名、查询 API |
| F006-C05 | 平台安全 MUST 规则 | 最后超管不可停用、用户至少一个角色、连续失败锁定 |
| F006-C06 | 前端登录、用户管理、权限管理页面接入 | 原型 key：`login`、`usermgmt`、`perm` |

### F007 `platform-organization-config`：组织、配置与文件元数据

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F007-C01 | 集团、BU、项目组织树与租户隔离 | 组织模型、租户/BU API |
| F007-C02 | 组织成员、组织角色和作用域授权 | 成员管理契约 |
| F007-C03 | 系统配置分组 | 基础、存储、通知、认证集成、数据安全配置 |
| F007-C04 | 文件元数据与对象存储 key 管理 | 文件元数据表、hash、bucket/key 约定 |
| F007-C05 | 通知渠道与配置测试 | 通知配置 API 与审计 |
| F007-C06 | 前端组织管理与系统配置接入 | 原型 key：`org`、`sys` |

### F008 `resource-inventory-quota`：资源资产、资源池与配额

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F008-C01 | 集群、节点、GPU/NPU、驱动和标签资产 | 资源资产领域模型 |
| F008-C02 | 资源池、存储池和镜像仓库视图 | 资源池 API 与页面 |
| F008-C03 | BU/项目配额、用量统计和超额校验 | 配额规则测试 |
| F008-C04 | 资源监控指标接入占位 | Prometheus 指标映射 |
| F008-C05 | 资源申请流程 open question 挂账 | `TODO_CONFIRM_RESOURCE_REQUEST_FLOW` |
| F008-C06 | 前端资源管理接入 | 原型 key：`resource` |

### F009 `data-source-dataset-foundation`：数据源与数据集基础

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F009-C01 | 数据源元数据、连接类型和连接测试 | 数据源 API、连接测试契约 |
| F009-C02 | 数据集创建、上传、元数据和标签 | 数据集 API、对象存储元数据 |
| F009-C03 | 数据集版本、发布、不可变和回收规则 | 版本状态机与规则测试 |
| F009-C04 | 数据文件安全检测与 hash 校验占位 | `TODO_CONFIRM_CONTENT_SAFETY_API` |
| F009-C05 | 数据集详情、文件、版本、权限基础视图 | 原型 key：`ds`、`datasrc`、数据集详情、上传向导 |
| F009-C06 | 删除前引用检查接口 | 训练/模型/推理引用查询契约 |

### F010 `annotation-integration`：标注任务、审核与 Label Studio 适配

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F010-C01 | 标注任务创建、分配、状态机 | 标注任务 API 与状态规则 |
| F010-C02 | 标注审核、驳回、通过和结果回写 | 审核 API、审计事件 |
| F010-C03 | 标签模板管理 | 标签模板 API 与页面 |
| F010-C04 | Label Studio 适配器契约 | AI adapter 接口、`TODO_CONFIRM_LABEL_STUDIO_*` |
| F010-C05 | AI 辅助预标注入口 | 在线/离线预标注契约 |
| F010-C06 | 前端标注任务、审核、标注工作台接入 | 原型 key：`ann`、`annreview`、标注工作台 |

### F011 `data-portal-access-approval`：数据资产门户与访问审批

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F011-C01 | 数据资产门户搜索、筛选、详情 | 门户 API、搜索索引策略 |
| F011-C02 | 数据访问申请、审批、拒绝、撤销 | 申请状态机与权限规则 |
| F011-C03 | 跨 BU 受限数据审批 | 授权范围、有效期、审计事件 |
| F011-C04 | 授权到期、续期和访问回收 | 定时任务/事件设计 |
| F011-C05 | 我的申请与审批历史 | 前端门户和审批页 |
| F011-C06 | 前端数据资产门户接入 | 原型 key：`portal`、`perm` |

### F012 `pipeline-operator-foundation`：Pipeline、算子广场与基础血缘

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F012-C01 | Pipeline 定义、版本、运行记录 | Pipeline API 与状态机 |
| F012-C02 | 算子广场、算子元数据、分类和详情 | 算子 API 与页面 |
| F012-C03 | 预置算子清单占位 | `TODO_CONFIRM_OPERATOR_CATALOG` |
| F012-C04 | Pipeline 运行、停止、日志和失败重试 | 调度/事件契约 |
| F012-C05 | 数据血缘节点、边、基础查询 | 血缘 API 与可视化数据格式 |
| F012-C06 | 前端 Pipeline、算子、血缘接入 | 原型 key：`pipeline`、`opmarket`、`lineage` |

### F013 `model-registry-market`：模型注册、版本与模型市场

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F013-C01 | 模型注册、模型版本、来源、许可证 | 模型仓库领域模型 |
| F013-C02 | 模型文件元数据、hash、对象存储 key | 模型产物元数据契约 |
| F013-C03 | 模型市场搜索、标签、详情和下载授权 | 市场 API 与权限 |
| F013-C04 | owner 授权、BU 可见性和跨 BU 访问 | 授权规则测试 |
| F013-C05 | 模型版本状态机与删除前引用检查 | 发布/下架/删除规则 |
| F013-C06 | 前端模型市场接入 | 原型 key：`hub` |

### F014 `model-evaluation-readiness`：模型评估结果与发布门禁

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F014-C01 | 模型评估任务元数据与评估结果导入 | 评估结果 API |
| F014-C02 | 指标展示、PR 曲线、混淆矩阵、模型对比 | 前端评估视图 |
| F014-C03 | 评估通过后才能发布的门禁规则 | 发布规则测试 |
| F014-C04 | 评测数据集权限与下载控制 | 权限与审计契约 |
| F014-C05 | 样本级失误案例扩展点 | 二期/增强项挂账 |
| F014-C06 | 前端模型评估接入 | 原型 key：`eval` |

### F015 `edge-management-delivery`：边端服务器与模型下发

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F015-C01 | 边端服务器注册、状态、心跳和详情 | EdgeServer API |
| F015-C02 | 边端模型下发申请与 owner 授权 | 下发审批状态机 |
| F015-C03 | 模型下发、部署历史和回滚记录 | EdgeDeployment API |
| F015-C04 | 下发文件 hash 校验与失败阻断 | 完整性测试与审计 |
| F015-C05 | 中心-边端 HTTPS/mTLS 参数挂账 | `TODO_CONFIRM_EDGE_MTLS_*` |
| F015-C06 | 前端边端管理接入 | 原型 key：`edge` |

### F016 `dashboard-alert-report`：工作台、调度、告警与报表

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F016-C01 | 工作台总览、待办、快捷入口和域级统计 | Dashboard API |
| F016-C02 | 调度中心任务列表、队列、失败详情 | 调度 API 与任务状态 |
| F016-C03 | 告警中心、告警规则、处理闭环 | 告警 API、规则配置、审计 |
| F016-C04 | 报表中心、导出和权限隔离 | 报表 API 与导出策略 |
| F016-C05 | 运营数据按租户/BU 隔离 | 权限测试 |
| F016-C06 | 前端工作台/调度/告警/报表接入 | 原型 key：`dash`、`sched`、`alert`、`report` |

### F017 `observability-production-hardening`：可观测、安全与生产加固

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F017-C01 | OpenTelemetry trace/log/metric 采集 | 观测配置与示例 trace |
| F017-C02 | Prometheus、Grafana、Loki、OpenSearch 看板与检索 | 看板清单、日志索引约定 |
| F017-C03 | 安全扫描、依赖扫描、基础镜像扫描 | 安全报告 |
| F017-C04 | 性能压测与容量基线 | 压测脚本和报告 |
| F017-C05 | 备份、发布、回滚、运维手册 | 生产运行文档 |
| F017-C06 | R6 试运行验收包 | 验收 checklist |

### F018 `training-experiment-phase2`：开发环境、训练任务与实验管理（二期）

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F018-C01 | Jupyter/VSCode 开发环境任务 | 开发环境 API 与资源挂载 |
| F018-C02 | 训练任务创建、暂停、中止、克隆和日志 | 训练状态机 |
| F018-C03 | 数据集挂载、镜像选择和资源配额校验 | 资源校验测试 |
| F018-C04 | 实验管理、AutoML 和指标记录 | MLflow 适配契约 |
| F018-C05 | Argo Workflows 训练/评估编排 | `TODO_CONFIRM_ARGO_*` |
| F018-C06 | 前端开发环境、训练监控、实验管理接入 | 原型 key：`devenv`、`train`、`exp` |

### F019 `inference-service-phase2`：中心端在线推理服务（二期）

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F019-C01 | 推理服务创建、版本、扩缩容和健康检查 | InferenceService API |
| F019-C02 | KServe 部署、流量策略和自动回滚 | `TODO_CONFIRM_KSERVE_*` |
| F019-C03 | API Key、IP 白名单、限流和在线调试 | 安全契约 |
| F019-C04 | A/B 流量权重总和 100% 规则 | 状态机与规则测试 |
| F019-C05 | 推理日志、指标和审计 | 观测与审计事件 |
| F019-C06 | 前端推理服务接入 | 原型 key：`infer` |

### F020 `batch-inference-feedback-phase2`：批量推理与结果回流（二期）

| 子功能编号 | 子功能 | 开发准备输出 |
|---|---|---|
| F020-C01 | 批量推理任务创建、调度、取消和重试 | 批量任务 API |
| F020-C02 | 定时调度、优先级和资源占用 | 调度规则测试 |
| F020-C03 | 结果导出到 CSV/JSON/对象存储/Webhook | 导出契约 |
| F020-C04 | 推理结果回流数据集或业务系统 | 回流状态机 |
| F020-C05 | 历史任务归档和检索 | 归档策略 |
| F020-C06 | 前端批量推理接入 | 原型 key：`batch` |

## 7. 业务资料与原型映射索引

| 领域 | 主要 feature | 业务资料 | 原型 key |
|---|---|---|---|
| FOUNDATION | F003、F004、F005、F017 | `docs/architecture/`、`docs/business/arch/`、`docs/business/api/` | 全局 |
| PLATFORM | F006、F007、F016 | `docs/business/domain/04-领域对象-平台域.md`、`docs/business/rules/05-平台与权限规则.md` | `login`、`usermgmt`、`org`、`perm`、`sys`、`dash`、`alert`、`report` |
| RESOURCE | F008 | `docs/business/domain/03-领域对象-资源域.md`、`docs/business/rules/04-资源管理规则.md` | `resource`、`sched` |
| DATA | F009、F010、F011、F012 | `docs/business/bizdocs/03-01-系统功能-数据管理.md`、`docs/business/domain/01-领域对象-数据域.md`、`docs/business/rules/01-数据管理规则.md` | `datasrc`、`ds`、`ann`、`annreview`、`lineage`、`pipeline`、`opmarket`、`portal` |
| MODEL | F013、F014、F018 | `docs/business/bizdocs/03-02-系统功能-模型开发.md`、`docs/business/domain/02-领域对象-模型域.md`、`docs/business/rules/02-模型开发规则.md` | `hub`、`eval`、`devenv`、`train`、`exp` |
| INFERENCE | F015、F019、F020 | `docs/business/bizdocs/03-03-系统功能-模型部署.md`、`docs/business/domain/05-领域对象-推理域.md`、`docs/business/rules/03-推理部署规则.md` | `edge`、`infer`、`batch` |

## 8. 每个功能包创建时必须补齐的文件

创建 `docs/features/F{nnn}-{slug}/` 后，至少包含：

```text
docs/features/F{nnn}-{slug}/
  plan.md
  TASK.md
  contract.md
  test-plan.md
  reports/
    planning/
    review/
    qa/
    verification/
  sql/
```

每个功能包进入实现前必须满足：

1. `plan.md` 标记 `plan_status: approved`。
2. `TASK.md` 将本清单的子功能编号转化为可验证 `AC-xx`。
3. `contract.md` 明确 API、权限、审计事件、错误码、状态机和外部系统 TODO。
4. `test-plan.md` 覆盖 happy path、权限失败、状态机错误、审计行为和 NFR。
5. `reports/` 保存规划、评审、联调、QA 和质量门禁证据。

## 9. 下一步建议

1. 先创建并规划 F003 `backend-foundation`，恢复后端生产级最小骨架。
2. 并行创建并规划 F004 `frontend-foundation`，恢复前端管理台骨架和原型页面路由。
3. 在 F003/F004 骨架稳定后创建 F005 `deploy-foundation`，让 backend/frontend/deploy 重新进入 `ai-scaffold` gate。
4. F003～F005 完成后进入 F006 `platform-identity-audit`，避免后续业务功能重复补权限和审计。
