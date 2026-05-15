# yfind_aiplatform

本仓库承载 **YFI / 延锋 SMP 工业 AI 小模型平台** 的需求资料、交互原型、AI 工程脚手架与后续实现工作面。旧版业务实现已清空，当前实现必须以 `docs/business/` 和 `docs/prototype/` 为权威输入，后续功能必须先规划再实现。

## 当前仓库状态

- **权威业务资料**：`docs/business/`
- **权威交互原型**：`docs/prototype/SMP工业AI平台-原型v2.html` 与 `SMP工业AI平台-原型v2-compiled.html`
- **后端工程骨架**：`backend/`（Java 21 / Spring Boot 4.0.x 多模块最小底座）
- **前端工程骨架**：`frontend/`（React 19 / TypeScript 6 / Vite 8 / Ant Design 6 管理台骨架）
- **部署工程骨架**：`deploy/`（Docker、Compose、Helm 草案，外部参数保留 `TODO_CONFIRM_*`）
- **仍保留可验证服务**：`ai-adapter/`（内部 Python/FastAPI AI/MLOps 适配器基线）
- **AI 脚手架**：`tools/ai-scaffold/`、`.agents/`、`.codex/`

## 项目理解速览

SMP 是面向工业场景的小模型平台，目标覆盖从数据接入、数据加工、标注、训练/调优、评估、模型市场、推理服务、边端下发，到监控、权限、审计与运营报表的完整闭环。

总体目标、阶段路线图和功能包拆分已沉淀在 `docs/architecture/02-project-goals-and-roadmap.md`，后续功能规划应以该文档、技术栈基线和业务/原型资料共同作为输入。

## 技术栈基线

完整技术栈已锁定在 `docs/architecture/01-technology-stack-baseline.md`，并同步到 `ai-scaffold.config.json` 的 `technologyStack`。当前基线：

| 层级 | 已确定技术栈 |
|---|---|
| 主后端 | Java 21 LTS + Spring Boot 4.0.x + Spring Data JPA/Hibernate + Flyway + OpenAPI 3.1 |
| 前端 | React 19 + TypeScript 6.x + Vite 8 + Ant Design 6 + TanStack Query 5 + Zustand 5 |
| AI 适配器 | Python 3.12 + FastAPI 0.136.x + Pydantic 2.13.x + Uvicorn + uv |
| 数据/中间件 | PostgreSQL 18 + Valkey 8.1 + Kafka 4.0 + MinIO(S3) + OpenSearch 3.x |
| MLOps | Label Studio + MLflow 3.x + Argo Workflows 4.x + KServe 0.16+ |
| 部署运维 | Docker/OCI + Kubernetes 1.35.x + Helm 4 + Argo CD 3.x + OpenTelemetry/Prometheus/Grafana/Loki |
| 身份安全 | YF LDAP + Spring Security + RBAC/必要 ABAC + 审计不可篡改 |

> 注意：当前 `backend/`、`frontend/`、`deploy/` 仅为重建后的最小工程骨架；旧实现仍不得作为事实来源。

### 五大业务域

| 领域 | 主要能力 | 关键资料 |
|---|---|---|
| 数据域 DATA | 数据源、数据集、标注、审核、血缘、Pipeline、算子、数据资产门户 | `docs/business/bizdocs/03-01-系统功能-数据管理.md`、`docs/business/domain/01-领域对象-数据域.md`、`docs/business/rules/01-数据管理规则.md` |
| 模型域 MODEL | 开发环境、训练、实验、评估、模型市场、模型工程化 | `docs/business/bizdocs/03-02-系统功能-模型开发.md`、`docs/business/domain/02-领域对象-模型域.md`、`docs/business/rules/02-模型开发规则.md` |
| 推理域 INFERENCE | 在线推理、批量推理、边端管理、第三方服务纳管、灰度与回滚 | `docs/business/bizdocs/03-03-系统功能-模型部署.md`、`docs/business/domain/05-领域对象-推理域.md`、`docs/business/rules/03-推理部署规则.md` |
| 资源域 RESOURCE | 集群、GPU/NPU、资源池、存储、镜像、安全扫描、调度策略 | `docs/business/domain/03-领域对象-资源域.md`、`docs/business/rules/04-资源管理规则.md` |
| 平台域 PLATFORM | 多租户、用户、角色、权限、SSO、审计、通知、系统配置、报表 | `docs/business/bizdocs/03-04-系统功能-平台管理.md`、`docs/business/domain/04-领域对象-平台域.md`、`docs/business/rules/05-平台与权限规则.md` |

### 原型覆盖

`docs/prototype/SMP工业AI平台-原型v2.html` 是 JSX 源原型，`SMP工业AI平台-原型v2-compiled.html` 是可直接打开的编译版。主导航共 25 个页面：

- 工作台：`dash`
- 数据管理：`ds`、`ann`、`datasrc`、`annreview`、`lineage`、`pipeline`、`opmarket`、`portal`
- 模型开发：`devenv`、`train`、`exp`、`eval`、`hub`、`infer`、`batch`
- 运营中心：`sched`、`edge`、`report`
- 平台管理：`resource`、`usermgmt`、`org`、`perm`、`alert`、`sys`

截图资产位于 `docs/prototype/*.png`，用于视觉验收和后续前端复刻。

## 重要约束

- 所有正式文档、计划、报告、评审说明和交付内容默认使用中文。
- 不得再把旧 `backend/` / `frontend/` 代码当作复用事实；当前只有业务资料、原型、AI 脚手架和 `ai-adapter/` 是有效基线。
- 未确认外部系统参数必须保留 `TODO_CONFIRM_*`，不得臆造。
- 后续正式功能仍使用 `docs/features/F{nnn}-{slug}/`，但需要先恢复/创建对应 feature 模板和编号文件。
- `docs/business/` 与 `docs/prototype/` 是 reference roots，不应被 `check-work-item-link` 当成代码改动强制绑定 feature。

## 常用命令

```powershell
# 查看脚手架对当前基线的理解
node tools/ai-scaffold/dist/cli.js scaffold-status
node tools/ai-scaffold/dist/cli.js doctor

# 验证 AI 脚手架自身
npm --prefix tools/ai-scaffold run build
npm --prefix tools/ai-scaffold test

# 验证当前仍启用的 ai-adapter
Push-Location ai-adapter
python -m compileall app tests
python -m unittest discover -s tests -v
Pop-Location

# 当前 gate：执行 backend/frontend/ai-adapter 已启用门禁
node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration
```

## 下一步建议

1. 以 F006 `platform-identity-audit` 为下一阶段入口，先补齐身份、权限与审计底座。
2. 后续业务功能按 `docs/features/FEATURE_BREAKDOWN.md` 的编号和依赖顺序逐项规划。
3. 每个功能按 `plan.md` → `TASK.md` → `contract.md` → `test-plan.md` → 实现 → review/QA/gate 的顺序推进。
