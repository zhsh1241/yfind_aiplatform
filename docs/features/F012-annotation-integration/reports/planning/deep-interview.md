> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-annotation-integration.md`
> Interview transcript: `.omx/interviews/annotation-integration-20260519T013921Z.md`
> 说明：该归档副本于 2026-05-19 根据已批准的 `plan.md` 章节规范化，原因是原始终端采集文本存在编码替换字符。

# Deep Interview Spec: F012 annotation-integration

## Metadata

- Feature: `F012-annotation-integration`
- Title: 标注任务、标注审核与 Label Studio 适配
- Profile: standard
- Context type: brownfield
- Rounds: 5
- Final ambiguity: 0.12
- Threshold: 0.20
- Context snapshot: `.omx/context/annotation-integration-20260519T013921Z.md`
- Interview transcript: `.omx/interviews/annotation-integration-20260519T013921Z.md`

## Clarity breakdown

| Dimension | Score | Gap closed |
| --- | ---: | --- |
| Intent | 0.94 | 见下方已批准计划第 2 节。 |
| Outcome | 0.90 | 见下方已批准计划第 2 节。 |
| Scope | 0.86 | 见下方已批准计划第 3 节。 |
| Constraints | 0.88 | 见下方决策边界与 `TODO_CONFIRM_*` 清单。 |
| Success | 0.84 | 见下方验收草案。 |
| Context | 0.90 | Brownfield 复用策略已在批准计划中收敛。 |

## 规范化访谈结果

## 2. Intent / Desired Outcome

本功能意图不是把原型中的标注页面做成静态展示，而是实现可验收的标注控制面：任务、模板、分配、工作项、审核、外部工具状态、预标注状态、质量检查、数据集发布、权限、BU 隔离和审计均由后端契约驱动，前端保持原型信息架构和文案语义。

完成后，典型业务闭环应为：

1. 管理员进入 `/ann` 查看任务总览、统计、Tab 和任务列表。
2. 管理员创建标注任务：选择 ACTIVE 数据集、标注场景、PUBLISHED 标签模板、审核策略、AI 预标注配置、Label Studio 配置策略、标注员和截止时间。
3. 标注员进入 `/annwork` 查看样本队列、标签模板、预标注摘要和 Label Studio 配置状态，提交标注结果。
4. 若任务启用审核，审核工程师在 `/annreview` 通过/驳回；若不启用审核，则提交结果直接进入完成检查。
5. 任务达到完成条件后运行质量检查；通过后发布 `ANNOTATED` 数据集并写入血缘。
6. `/dsdetail` 与 `/lineage` 能看到标注数据集、标注任务节点和标注事件。

## 3. 范围

### In Scope

- **标注任务管理 `/ann`**
  - 标题、统计卡、任务 Tab、任务列表、状态筛选与操作入口。
  - 新建标注任务向导：选择数据集、标注配置、分配团队。
  - 任务状态机：`DRAFT`、`ASSIGNED`、`IN_PROGRESS`、`PENDING_REVIEW`、`REJECTED`、`APPROVED`、`COMPLETED`、`PAUSED`、`CANCELLED`。

- **标签模板管理**
  - 模板 CRUD、标签层级、发布/归档。
  - `PUBLISHED` 模板才可用于标注任务。
  - 支持按场景生成 Label Studio label config seam。

- **标注工作台 `/annwork`**
  - 任务详情、样本队列、标签模板、预标注摘要、Label Studio 状态、草稿保存、提交标注结果。
  - AI 预标注 seam：保存模型来源、置信度、状态、预测摘要，不实现真实模型服务。

- **标注审核 `/annreview`**
  - 待审核列表、通过/驳回、驳回原因、审核状态更新。
  - 强制 DAT-004：同一标注记录提交人与审核人不得相同。

- **Label Studio adapter seam**
  - 返回 provider、project/task 映射、label config 状态、launch URL、同步状态和诊断。
  - 未配置生产参数时明确返回 `UNCONFIGURED`/`TODO_CONFIRM_*`。
  - 使用 `secretRef`，不得保存明文 token。

- **标注数据集生成**
  - 完整性、格式、覆盖率质量检查。
  - 生成 `ANNOTATED` 数据集、版本、结果文件和 `ANNOTATION` 血缘。
  - 在数据集详情和血缘页呈现标注结果关系。

- **权限、BU 隔离与审计**
  - 新增菜单和操作权限。
  - 任务创建、分配、提交、审核、驳回、发布、同步失败、跨 BU 拒绝等写审计。
  - 账号停用时可扫描进行中的标注/审核任务并提示处理。

### Out of Scope / Non-goals

- 不部署生产 Label Studio，不猜测 Label Studio URL/token/workspace/storage。
- 不新增 `label-studio-sdk` 或其他新依赖；本期只做 adapter seam。
- 不实现完整 Label Studio ML Backend 或真实 AI 预标注模型。
- 不实现模型训练、模型市场、推理消费标注数据集。
- 不重写 F009 数据集/文件/血缘、F006 权限审计、F011 Pipeline/算子市场。
- 不复制原型 JSX，不恢复旧已删除 backend/frontend 实现。
- 不覆盖所有 CAD/音频/视频复杂标注工具细节；本期以控制面、样本队列和外部适配边界为主。

## 4. Decision Boundaries

Codex 可自主决定：

- 新增 `AnnotationController`、`AnnotationService`、`AnnotationDtos`、`LabelStudioAnnotationAdapter` 等命名和拆分方式。
- Flyway 表结构、DTO 字段、错误码和状态枚举的具体实现，只要映射业务对象并满足规则。
- 前端组件拆分、TanStack Query key、E2E mock 和页面状态管理方式。
- Label Studio adapter 的未配置/失败诊断结构、同步任务边界和 launch URL 呈现方式。
- seed 数据和测试 fixture，只要不替代核心业务规则校验。

需要后续确认并保持 `TODO_CONFIRM_*`：

- `TODO_CONFIRM_LABEL_STUDIO_BASE_URL`
- `TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET`
- `TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY`
- `TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY`
- `TODO_CONFIRM_PRELABEL_MODEL_SOURCE`
- `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`

## 11. 验收草案（AC）

- **AC-01**：`/ann` 按原型展示标注任务管理、统计、任务 Tab、任务列表、标签模板和新建标注任务入口。
- **AC-02**：创建标注任务时只能选择 ACTIVE 数据集和 PUBLISHED 标签模板；违反 DAT-009/DAT-003 时后端拒绝并前端提示。
- **AC-03**：标签模板可维护、发布并生成 Label Studio label config seam。
- **AC-04**：`/annwork` 可查看分配任务、样本队列、预标注摘要、Label Studio 配置状态，并提交标注结果。
- **AC-05**：`/annreview` 可审核通过/驳回标注结果；审核自己提交的结果被 DAT-004 阻断。
- **AC-06**：Label Studio adapter 在未配置外部参数时返回 `UNCONFIGURED`/`TODO_CONFIRM_*`，配置失败和同步失败可见且审计。
- **AC-07**：任务完成并质量检查通过后生成 `ANNOTATED` 数据集、版本、结果文件和 `ANNOTATION` 血缘；质量检查失败时阻断发布。
- **AC-08**：权限不足、跨 BU 访问、非法状态流转、被停用用户任务处理均有可测失败路径与审计证据。

## Label Studio 官方文档要点

- 官方 API 文档要求多数操作携带 token/API key 认证头与 project ID。
- Project 创建接口接受 label configuration，并返回项目/任务计数等信息。
- Task 创建接口使用受项目 label config 约束的 `data` payload，并包含 predictions/review 相关字段。
- Export 文档区分 UI/API/console/snapshot 导出路径，并提示规模与超时风险。

来源：

- https://labelstud.io/guide/api.html
- https://api.labelstud.io/api-reference/api-reference/projects/create
- https://api.labelstud.io/api-reference/api-reference/tasks/create
- https://labelstud.io/guide/export.html
