> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage all`.
> Source: `.omx/specs/deep-interview-model-registry-foundation.md`
> Interview transcript: `.omx/interviews/model-registry-foundation-20260602T144542Z.md`

# Deep Interview Spec: F019 模型中心与模型版本基础

## Metadata

- Feature: F019-model-registry-foundation
- Slug: model-registry-foundation
- Profile: standard
- Context type: brownfield
- Rounds: 5 condensed from user-confirmed planning discussion and repository evidence
- Final ambiguity: 0.16
- Threshold: 0.20
- Context snapshot: .omx/context/model-registry-foundation-20260602T144542Z.md
- Transcript: .omx/interviews/model-registry-foundation-20260602T144542Z.md

## Clarity Breakdown

| Dimension | Score | Evidence / Gap |
| --- | ---: | --- |
| Intent | 0.95 | 用户要从模型开发模块规划下一步，已接受先做模型中心地基。 |
| Outcome | 0.90 | 输出正式 plan.md 与归档规划证据，不进入实现。 |
| Scope | 0.86 | F019 限定模型中心、版本、元数据、权限、文件绑定；后续 F020-F023 延后。 |
| Constraints | 0.82 | 必须遵守仓库 plan-feature 流程、业务文档和 MDL MUST 规则。 |
| Success | 0.84 | 以 plan 门禁、规划证据归档、后续可审查/批准为成功标准。 |
| Context | 0.88 | 已定位业务流程、功能清单、领域对象、规则与 API 占位。 |

## Intent

为平台内置模型开发域建立第一块可复用地基：模型注册中心与模型版本管理。后续开发环境、训练任务、评估、工程化、推理部署都应引用同一个模型与模型版本事实源，避免各模块重复定义模型文件、版本状态和权限规则。

## Desired Outcome

- 形成 docs/features/F019-model-registry-foundation/plan.md 草案。
- 明确模型中心范围、非目标、技术方案、复用策略、规则和验收草案。
- 归档规划证据：eports/planning/deep-interview.md、prd.md、	est-spec.md。
- 保持 plan_status: draft，等待人审批准后再进入 /build-feature。

## In Scope

- 模型列表、详情、搜索与筛选。
- 预训练模型选择器的基础数据来源。
- 模型导入：本地上传/训练中心发布 seam。
- 模型元数据：framework、taskType、inputFormat、outputFormat、runtimeRequirements、tags、source、owner、tenant/project/scope。
- 模型版本管理：版本号、文件对象绑定、指标摘要、状态流转 Development → Testing → Production → Deprecated。
- 模型权限：平台模型、团队/BU 模型、私有模型；跨 BU 访问申请/审批 seam。
- 模型文件绑定 MinIO / platform_file_object，不新增平行文件表。
- 审计事件：创建、导入、版本创建、状态变更、scope 变更、删除阻断、下载/查看等关键操作。

## Out-of-Scope / Non-goals

- 不实现训练任务调度、资源申请、训练日志、TensorBoard。
- 不实现模型开发环境 Notebook/VSCode/SSH。
- 不实现真实模型评估执行或多维评估报告生成。
- 不实现量化、剪枝、蒸馏、格式转换等模型工程化任务。
- 不实现推理服务部署、边端下发或流量治理。
- 不接入真实 MLflow/KServe/Argo Workflows/外部模型仓库。
- 不用 mock 模型绕过权限、文件对象、版本与审计治理。

## Decision Boundaries

- Agent 可规划模型/版本表结构、枚举、DTO、API 草案、前端 IA 与验收项。
- Agent 可规划初始预训练模型种子数据，但必须标记来源为内置示例或 TODO_CONFIRM_PRETRAINED_MODEL_SOURCE。
- Agent 不可猜测生产模型文件大小/格式白名单、安全扫描策略、真实模型来源授权、跨 BU 审批级别。
- Agent 不可把 F019 扩展成训练/评估/工程化实现。
- 如果 MDL 领域文档中的 DRAFT/RELEASED/ARCHIVED 与规则文档中的 Development/Testing/Production/Deprecated 冲突，F019 计划以规则文档 MDL-009 为状态机约束，并在 contract 阶段做兼容映射。

## Constraints

- 正式依据：docs/business/ 与 docs/prototype/。
- API 使用 /api/v1 与统一 envelope。
- 文件复用 platform_file_object / MinIO；不得新建模型文件平行存储。
- 权限复用平台 RBAC/组织/用户体系，跨 BU 规则遵守 MDL-004。
- 发布遵守 MDL-006：没有通过评估记录不得进入 Production。
- 删除遵守 MDL-003：活跃推理引用的模型版本不得删除。
- 状态流转遵守 MDL-009。

## Testable Acceptance Criteria

- AC-01：可按关键词、标签、框架、任务类型、scope、状态筛选模型列表。
- AC-02：可创建模型并新增版本，版本绑定已有或新上传的 platform_file_object。
- AC-03：版本状态只能按 Development → Testing → Production → Deprecated 合法流转。
- AC-04：未通过评估的版本不能发布到 Production。
- AC-05：存在活跃推理引用的版本删除被阻断并返回引用列表。
- AC-06：跨 BU 模型访问无授权时返回 403 或不泄露存在性；scope 变更需审批 seam。
- AC-07：模型详情展示版本历史、文件、指标摘要、权限、审计记录。
- AC-08：预训练模型选择器可复用模型中心数据，并仅展示有权限且可用版本。

## Assumptions Exposed + Resolutions

- Assumption: 先做模型中心足以支撑模型开发模块下一步。Resolution: 成立，因为训练、开发环境、评估、工程化均需要模型版本事实源。
- Assumption: 评估未实现会阻断发布。Resolution: F019 提供评估通过检查 seam 与导入证明字段，真实评估任务后续 F022 实现。
- Assumption: 模型文件可以独立建表。Resolution: 拒绝；必须复用平台文件对象和 MinIO。

## Pressure-pass Findings

针对“是否需要直接做训练/评估”的初始倾向进行压力测试：若跳过模型注册中心直接做训练任务，会导致输出模型、预训练模型、版本状态、发布权限和推理引用各模块重复定义。因此先做 F019 是更低风险路径。

## Brownfield Evidence vs Inference Notes

Evidence:
- docs/business/bizdocs/02-02-业务流程-模型开发与训练.md 的 MODEL-003。
- docs/business/bizdocs/03-02-系统功能-模型开发.md 的 FUNC-MODEL-020~026。
- docs/business/domain/02-领域对象-模型域.md 的 Model / ModelVersion。
- docs/business/rules/02-模型开发规则.md 的 MDL-003/004/006/009。
- docs/business/api/01-API接口规范.md 的 /models 与 /models/{id}/versions 占位。

Inference:
- F019 应先于训练任务和开发环境交付，因为这些模块都依赖可引用的模型版本。
