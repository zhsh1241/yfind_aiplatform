# YFI 工业 AI 小模型平台 AI 执行计划

## 1. 使用方式

本文档把 6 个月 MVP 拆成 AI agent 可逐步执行的工作包。每个工作包必须先在 `docs/features/Fxxx-*` 下生成 feature 文档，再进入实现。

执行原则：

- 每次只执行一个工作包，除非任务明确可并行且写入范围互不冲突。
- 每个工作包开始前先读：
  - `docs/architecture/01-functional-breakdown.md`
  - `docs/architecture/02-technical-roadmap.md`
  - `docs/architecture/03-project-plan.md`
  - 当前工作包对应的 `docs/features/Fxxx-*/plan.md`
- 每个工作包完成后必须更新对应 `TASK.md`、测试证据和已知风险。
- 未确认的外部事实必须写入 `待确认事项`，不得用猜测值落代码。
- 所有业务代码变更必须绑定 feature 文档，通过 scaffold work-item link 检查。

标准执行命令：

```powershell
npm --prefix tools/ai-scaffold run build
node tools/ai-scaffold/dist/cli.js doctor
node tools/ai-scaffold/dist/cli.js check-work-item-link --stdin
npm --prefix tools/ai-scaffold test
```

业务工程创建后追加：

```powershell
# backend
<backend compile command>
<backend test command>

# frontend
<frontend lint command>
<frontend test command>
<frontend build command>
```

## 2. 全局执行阶段

| 阶段 | 顺序 | 目标 | 退出标准 |
| --- | --- | --- | --- |
| Phase A | 1 | 文档和工程基线 | feature 文档、工程结构、配置和 CI 基线完成 |
| Phase B | 2 | 平台底座 | 登录、组织、权限、菜单、审计可用 |
| Phase C | 3 | 数据闭环 | 数据源、数据集、对象存储、标注、审核闭环可用 |
| Phase D | 4 | 模型闭环 | 训练、调优、模型注册、评估闭环可用 |
| Phase E | 5 | 部署闭环 | KServe 推理和边端下发闭环可用 |
| Phase F | 6 | 运维补强 | 资源、监控、日志、审计、安全基线可用 |
| Phase G | 7 | UAT 上线 | MVP 主线通过 UAT，交付材料完成 |

## 3. 工作包总览

| 工作包 | Feature | AI 角色建议 | 依赖 | 可并行性 |
| --- | --- | --- | --- | --- |
| WP-001 | F001-platform-architecture-baseline | architect + executor | 无 | 与 WP-002 的需求文档可并行，代码不可并行 |
| WP-002 | F002-identity-org-permission | backend + frontend + security reviewer | WP-001 | 前后端可并行 |
| WP-003 | F003-dataset-asset-mvp | backend + frontend + test engineer | WP-002 | 对象存储 PoC 可先行 |
| WP-004 | F004-labeling-workflow-mvp | backend + frontend + integration checker | WP-003 | Label Studio PoC 可并行 |
| WP-005 | F005-training-job-mvp | backend + mlops + test engineer | WP-003 | Kubeflow/Argo PoC 可并行 |
| WP-006 | F006-model-registry-evaluation | backend + mlops + frontend | WP-005 | MLflow PoC 可与 WP-005 并行 |
| WP-007 | F007-inference-service-mvp | backend + mlops + frontend | WP-006 | KServe PoC 可提前 |
| WP-008 | F008-edge-server-deployment | backend + edge agent + security reviewer | WP-006 | edge-agent PoC 可提前 |
| WP-009 | F009-resource-monitoring-audit | platform + backend + frontend | WP-002 | 监控 PoC 可提前 |
| WP-010 | MVP-UAT-release | qa + product + release engineer | WP-001 至 WP-009 | 不并行，作为收口阶段 |

## 4. WP-001 平台架构基线

### 4.1 目标

建立项目可执行工程基线：后端、前端、部署、配置、AI scaffold、feature backlog 和组件版本矩阵。

### 4.2 前置条件

- 当前三份架构文档已存在。
- 技术路线默认采用 Spring Boot、React、Kubernetes、MinIO/S3、MLflow、KServe、Label Studio。
- 未确认的企业标准以 `TODO_` 占位，不落死值。

### 4.3 输入

- `docs/architecture/01-functional-breakdown.md`
- `docs/architecture/02-technical-roadmap.md`
- `docs/architecture/03-project-plan.md`
- `ai-scaffold.config.json`

### 4.4 输出

- `docs/features/F001-platform-architecture-baseline/`
- `backend/` 工程骨架。
- `frontend/` 工程骨架。
- `ai-adapter/` FastAPI AI/MLOps 适配层骨架。
- `deploy/` 部署骨架。
- `docs/architecture/component-version-matrix.md`
- 更新后的 `ai-scaffold.config.json`

### 4.5 子任务

| 任务 | 说明 | 输出 | 验收 |
| --- | --- | --- | --- |
| WP-001-01 | 创建 feature 文档 | `F001` plan/TASK/contract/test-plan | 文档包含范围、契约、测试计划 |
| WP-001-02 | 初始化后端骨架 | Spring Boot 项目、基础 health API | `GET /actuator/health` 可运行 |
| WP-001-03 | 初始化 AI Adapter 骨架 | FastAPI 项目、内部 health/capabilities API | `GET /internal/health` 可运行 |
| WP-001-04 | 初始化前端骨架 | React + TypeScript + Ant Design Pro | 首页可运行，含登录占位 |
| WP-001-05 | 初始化部署骨架 | `deploy/helm`、`deploy/env`、README | 本地/测试环境变量有模板 |
| WP-001-06 | 配置 scaffold adapter | 更新真实 backend/ai-adapter/frontend 命令 | `doctor` 显示真实路径 |
| WP-001-07 | 组件版本矩阵 | 记录 Java/Python/Node/K8s/MLflow/KServe 等版本 | 每个组件有推荐版本和待确认项 |
| WP-001-08 | CI 基线 | 构建、测试、文档检查 | CI 或本地等价命令可运行 |

### 4.6 完成标准

- 后端、AI Adapter、前端、部署目录存在且可构建。
- `ai-scaffold.config.json` 不再使用 `TODO_BACKEND_PATH` 和 `TODO_FRONTEND_PATH`。
- F001 feature 文档完整。
- 本地基础检查通过。

## 5. WP-002 身份、组织、权限、审计

### 5.1 目标

实现平台权限底座：登录、组织树、用户、角色、菜单权限、资源权限、审计日志。

### 5.2 输出

- `docs/features/F002-identity-org-permission/`
- 后端 identity/audit 模块。
- 前端登录、组织、用户、角色、权限页面。
- 权限模型和审计事件契约。

### 5.3 子任务

| 任务 | 说明 | 输出 | 验收 |
| --- | --- | --- | --- |
| WP-002-01 | 设计权限模型 | 组织、用户、角色、权限、策略、资源关系 | ER 图或 schema 草案 |
| WP-002-02 | SSO/Keycloak PoC | OIDC 登录、token 校验、用户映射 | 测试用户可登录 |
| WP-002-03 | 后端鉴权拦截 | API 权限、资源归属、角色判断 | 越权请求返回 403 |
| WP-002-04 | 组织与用户管理 | CRUD、组织树、用户归属 | 超级管理员可维护组织用户 |
| WP-002-05 | 角色与权限管理 | 角色授权、菜单权限、资源权限 | BU 管理员只管理 BU 内资源 |
| WP-002-06 | 前端权限菜单 | 动态菜单、按钮权限、路由守卫 | 不同角色菜单不同 |
| WP-002-07 | 审计日志基线 | 登录、授权、用户变更、资源访问审计 | 审计可按用户/时间查询 |
| WP-002-08 | 权限测试 | 单元、接口、E2E、越权场景 | 越权用例全部通过 |

### 5.4 完成标准

- 超级管理员、BU 子管理员、普通用户三类账号可验证。
- RBAC + 资源归属控制可用。
- 关键操作产生审计日志。
- 前端菜单和后端 API 权限一致。

## 6. WP-003 数据资产 MVP

### 6.1 目标

实现数据源登记、数据集上传、对象存储、元数据、版本、权限申请、检索和预览。

### 6.2 输出

- `docs/features/F003-dataset-asset-mvp/`
- dataset/storage/access 模块。
- 数据集门户、详情、上传、权限申请页面。
- 对象存储适配器。

### 6.3 子任务

| 任务 | 说明 | 输出 | 验收 |
| --- | --- | --- | --- |
| WP-003-01 | 设计数据集模型 | 数据集、版本、文件、标签、权限、血缘 | schema 和 API contract |
| WP-003-02 | 对象存储 PoC | 上传、下载、预签名 URL、hash 校验 | 大文件上传下载成功 |
| WP-003-03 | 数据源登记 | 文件、对象存储、基础 API 类型 | 可登记和测试连接 |
| WP-003-04 | 数据集上传 | 本地上传、对象引用、元数据保存 | 生成数据集 v1 |
| WP-003-05 | 数据集版本 | 新版本、版本状态、变更说明 | 多版本可查询 |
| WP-003-06 | 权限申请 | 申请、审批、授权、过期时间 | 未授权不可下载 |
| WP-003-07 | 数据集门户 | 列表、搜索、筛选、详情、样例预览 | 用户可检索和查看授权数据 |
| WP-003-08 | 数据血缘基线 | 原始、预处理、标注数据集关系 | 血缘可用列表展示 |
| WP-003-09 | 测试和审计 | 上传、下载、审批、删除审计 | 操作可追溯 |

### 6.4 完成标准

- 用户可上传数据集并生成版本。
- 数据集文件存对象存储，数据库只存元数据。
- 未授权用户无法下载。
- 数据集变更、下载、审批均有审计。

## 7. WP-004 标注与审核 MVP

### 7.1 目标

集成成熟标注工具，完成标注任务创建、分配、执行、结果回收和审核。

### 7.2 输出

- `docs/features/F004-labeling-workflow-mvp/`
- labeling 模块。
- Label Studio 集成适配器。
- 标注任务、标签模板、审核页面。

### 7.3 子任务

| 任务 | 说明 | 输出 | 验收 |
| --- | --- | --- | --- |
| WP-004-01 | 标注任务模型 | 任务、样本、标签模板、分配、状态 | schema 和状态机 |
| WP-004-02 | Label Studio PoC | 创建项目、导入样本、导出结果 | 可回收标注结果 |
| WP-004-03 | 标签模板管理 | 标签层级、类型、复用 | 模板可 CRUD |
| WP-004-04 | 标注任务创建 | 从数据集选择样本，绑定模板和人员 | 标注任务进入待标注 |
| WP-004-05 | 标注入口 | 平台跳转或嵌入标注工具 | 标注人员可进入任务 |
| WP-004-06 | 结果回收 | 导入标注结果，生成标注数据集版本 | 结果关联源数据 |
| WP-004-07 | 审核流程 | 通过、退回、意见、质量记录 | 审核影响任务状态 |
| WP-004-08 | 测试和审计 | 分配、标注、审核、退回 | 全流程可追溯 |

### 7.4 完成标准

- 一个数据集可创建标注任务。
- 标注结果可回收到平台。
- 审核通过后生成可训练的标注数据集版本。
- 标注和审核操作有审计。

## 8. WP-005 训练任务 MVP

### 8.1 目标

实现训练任务创建、资源申请、数据挂载、K8s 提交、日志查看、指标记录和产物归档。

### 8.2 输出

- `docs/features/F005-training-job-mvp/`
- training 模块。
- Kubeflow/Argo 任务适配器。
- 训练任务页面。

### 8.3 子任务

| 任务 | 说明 | 输出 | 验收 |
| --- | --- | --- | --- |
| WP-005-01 | 训练任务模型 | 任务、参数、镜像、资源、状态、日志、artifact | schema 和状态机 |
| WP-005-02 | Kubeflow/Argo PoC | 提交最小训练任务 | K8s 中任务可运行 |
| WP-005-03 | 数据集挂载设计 | 数据集版本到训练容器挂载方式 | 可读训练数据 |
| WP-005-04 | 镜像选择 | 预置训练镜像登记和选择 | 可选择镜像启动任务 |
| WP-005-05 | 资源申请 | CPU/GPU/NPU/内存参数和配额校验 | 超配额不可提交 |
| WP-005-06 | 任务提交 | 后端创建 K8s/Kubeflow 任务 | 任务状态同步 |
| WP-005-07 | 日志和指标 | 实时日志、持久化日志、训练指标 | 前端可查看 |
| WP-005-08 | 产物归档 | artifact 上传对象存储 | 训练完成有产物 |
| WP-005-09 | 测试和审计 | 创建、启动、停止、失败重试 | 状态变化可追溯 |

### 8.4 完成标准

- 可提交一个训练任务并完成运行。
- 任务日志、指标、状态可查询。
- 训练产物进入对象存储。
- 资源配额和权限校验生效。

## 9. WP-006 模型注册与评估

### 9.1 目标

实现模型注册、版本、元数据、评估指标、权限和导出。

### 9.2 输出

- `docs/features/F006-model-registry-evaluation/`
- model/evaluation 模块。
- MLflow 集成适配器。
- 模型中心页面。

### 9.3 子任务

| 任务 | 说明 | 输出 | 验收 |
| --- | --- | --- | --- |
| WP-006-01 | 模型元数据设计 | 模型、版本、artifact、指标、权限、生命周期 | schema 和 API contract |
| WP-006-02 | MLflow PoC | experiment、run、artifact、model registry | 指标和模型版本可查询 |
| WP-006-03 | 训练产物注册 | 从训练任务生成模型版本 | 模型版本关联训练任务 |
| WP-006-04 | 手动模型导入 | 上传本地模型包或引用对象存储 | 模型可导入 |
| WP-006-05 | 评估指标管理 | 指标定义、结果记录、报告展示 | 模型版本显示评估报告 |
| WP-006-06 | 模型权限 | 平台模型、团队模型、授权申请 | 未授权不可部署/下载 |
| WP-006-07 | 模型检索 | 列表、筛选、版本详情 | 用户可检索可见模型 |
| WP-006-08 | 模型导出 | 下载或生成部署包 | 导出操作审计 |

### 9.4 完成标准

- 训练产物可注册为模型版本。
- 模型版本有指标、artifact、权限和生命周期。
- 模型可授权、检索、导出。

## 10. WP-007 中心端推理服务 MVP

### 10.1 目标

通过 KServe 部署模型推理服务，支持服务创建、上线、下线、探活、调用测试、日志和监控。

### 10.2 输出

- `docs/features/F007-inference-service-mvp/`
- inference 模块。
- KServe 适配器。
- 推理服务页面。

### 10.3 子任务

| 任务 | 说明 | 输出 | 验收 |
| --- | --- | --- | --- |
| WP-007-01 | 推理服务模型 | 服务、版本、模型版本、资源、状态、访问策略 | schema 和状态机 |
| WP-007-02 | KServe PoC | 部署最小模型服务 | HTTP 调用成功 |
| WP-007-03 | 服务创建 | 选择模型版本、镜像、资源、协议 | 创建 KServe InferenceService |
| WP-007-04 | 服务状态同步 | Ready、Failed、Scaling、Stopped | 状态准确展示 |
| WP-007-05 | 探活和拨测 | 手动调用测试和健康检查 | 拨测结果可查看 |
| WP-007-06 | 调用权限 | API token、访问时长、权限校验 | 未授权不可调用 |
| WP-007-07 | 日志和指标 | 调用量、错误率、延迟、资源 | 前端可查看 |
| WP-007-08 | 下线和回滚 | 服务下线、版本切换 | 操作可审计 |

### 10.4 完成标准

- 一个模型版本可部署为 HTTP 推理服务。
- 服务可调用、探活、下线。
- 调用和部署操作有权限和审计。

## 11. WP-008 边端服务器与模型下发

### 11.1 目标

实现边端服务器登记、edge-agent、模型包下发、部署状态回传、版本记录和回滚基线。

### 11.2 输出

- `docs/features/F008-edge-server-deployment/`
- edge 模块。
- edge-agent 最小实现。
- 边端服务器和部署记录页面。

### 11.3 子任务

| 任务 | 说明 | 输出 | 验收 |
| --- | --- | --- | --- |
| WP-008-01 | 边端模型设计 | 服务器、agent、模型包、部署任务、状态 | schema 和 API contract |
| WP-008-02 | edge-agent PoC | agent 注册、心跳、拉取任务、回传状态 | agent 可在线 |
| WP-008-03 | 服务器登记 | 服务器信息、标签、资源、网络状态 | 可登记和编辑 |
| WP-008-04 | 模型包生成 | 模型版本生成边端部署包 | 包有版本和 hash |
| WP-008-05 | 下发任务 | 创建下发任务，agent 拉取并执行 | 状态从 pending 到 success |
| WP-008-06 | 状态回传 | 日志、进度、错误码、健康检查 | 前端可查看 |
| WP-008-07 | 回滚基线 | 记录上一版本，支持回滚任务 | 回滚状态可追踪 |
| WP-008-08 | 安全基线 | agent token、包校验、审计 | 未授权 agent 不可接入 |

### 11.4 完成标准

- 边端服务器可登记并保持心跳。
- 模型包可下发到边端并回传成功/失败。
- 部署记录可追溯，支持基础回滚。

## 12. WP-009 资源、监控、安全、审计补强

### 12.1 目标

补齐资源池、配额、监控、日志、审计、安全基线，使 MVP 可运维、可追溯。

### 12.2 输出

- `docs/features/F009-resource-monitoring-audit/`
- resource/audit/ops 模块。
- 资源、监控、日志、审计页面。
- 运维和安全基线文档。

### 12.3 子任务

| 任务 | 说明 | 输出 | 验收 |
| --- | --- | --- | --- |
| WP-009-01 | 资源模型设计 | 集群、节点、资源池、配额、用量 | schema 和 API contract |
| WP-009-02 | K8s 资源采集 | CPU/GPU/NPU/内存/节点状态 | 页面可查看资源 |
| WP-009-03 | 配额管理 | BU/项目配额、任务提交校验 | 超配额拦截 |
| WP-009-04 | Prometheus/Grafana PoC | 应用和 K8s 指标采集 | 仪表盘可访问 |
| WP-009-05 | 日志查询 | 应用日志、训练日志、推理日志 | 可按任务查询 |
| WP-009-06 | 审计查询 | 用户、资源、时间、动作筛选 | 高风险操作可追溯 |
| WP-009-07 | 安全基线 | 密钥、传输、存储、下载审批 | 文档和配置模板完成 |
| WP-009-08 | 告警基线 | 任务失败、服务异常、资源不足 | 告警规则有模板 |

### 12.4 完成标准

- 资源、配额、日志、审计可在平台查看。
- 训练、推理、边端关键操作都可追溯。
- 运维、安全和告警基线文档完成。

## 13. WP-010 MVP UAT 与上线准备

### 13.1 目标

完成端到端 UAT、性能基线、缺陷收敛、上线材料和运维交接。

### 13.2 输出

- `docs/features/F010-mvp-uat-release/`
- UAT 测试报告。
- 性能测试报告。
- 部署手册。
- 运维手册。
- 上线 checklist。
- 已知问题和二期 backlog。

### 13.3 子任务

| 任务 | 说明 | 输出 | 验收 |
| --- | --- | --- | --- |
| WP-010-01 | UAT 场景设计 | 覆盖 MVP 主线和角色权限 | UAT 用例评审通过 |
| WP-010-02 | 测试数据准备 | BU、用户、数据集、模型样例 | 数据可重复导入 |
| WP-010-03 | 端到端执行 | 从登录到边端下发完整走通 | 主线通过 |
| WP-010-04 | 性能基线 | 登录、检索、上传、日志、推理调用 | 报告记录瓶颈 |
| WP-010-05 | 安全检查 | 越权、下载、token、agent 接入 | 高风险问题关闭 |
| WP-010-06 | 缺陷收敛 | P0/P1 清零，P2 有处置计划 | 缺陷清单评审 |
| WP-010-07 | 上线材料 | 部署、回滚、监控、运维、账号 | 运维可接手 |
| WP-010-08 | 二期 backlog | 延后项和新增需求归档 | backlog 可排期 |

### 13.4 完成标准

- MVP 主线通过业务 UAT。
- P0/P1 缺陷清零。
- 部署和回滚手册可执行。
- 二期 backlog 明确，不阻塞 MVP 上线。

## 14. AI Agent 执行模板

每个工作包执行时使用以下模板创建任务说明：

```text
目标：
  实现 <WP 编号 + 名称>，范围限定在 <feature dir>。

必须阅读：
  - docs/architecture/01-functional-breakdown.md
  - docs/architecture/02-technical-roadmap.md
  - docs/architecture/03-project-plan.md
  - docs/architecture/04-ai-execution-plan.md
  - docs/features/<feature>/plan.md
  - docs/features/<feature>/TASK.md

写入范围：
  - <backend/ai-adapter/frontend/deploy/docs 的明确路径>

禁止：
  - 不要修改无关 feature。
  - 不要引入未经确认的新依赖。
  - 不要把密钥、账号、环境地址写入代码。
  - 不要把 TODO 外部事实伪造为确定值。

完成标准：
  - 功能满足 TASK.md 的验收标准。
  - 单元/集成/E2E 或文档验收通过。
  - 更新 TASK.md 测试证据和已知风险。
  - git diff 只包含本工作包相关变更。
```

## 15. 跨工作包 Definition of Done

每个工作包必须满足：

- 有对应 `docs/features/Fxxx-*` 文档。
- 明确复用现有模块、组件和接口。
- 明确 API contract 或 schema 变化。
- 权限、审计、错误处理和状态机有验收标准。
- 后端、前端、部署和测试证据同步更新。
- 通过 scaffold 检查。
- 没有未记录的外部假设。

## 16. 当前下一步建议

建议立即执行：

1. 创建 `F001-platform-architecture-baseline` feature 文档。
2. 确认 Spring Boot、FastAPI AI Adapter、React、deploy 目录初始化方式。
3. 建立组件版本矩阵。
4. 初始化后端、AI Adapter、前端和部署骨架。
5. 用真实路径替换 `ai-scaffold.config.json` 中的 backend/ai-adapter/frontend TODO。
