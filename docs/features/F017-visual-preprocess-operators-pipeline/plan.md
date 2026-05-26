---
feature: F017-visual-preprocess-operators-pipeline
title: 视觉预处理算子与预处理数据集闭环
plan_status: approved
approved_at: "2026-05-26"
owner: codex
created_at: 2026-05-26
updated_at: 2026-05-26
---

# Plan: 视觉预处理算子与预处理数据集闭环

## 1. 背景与目标

业务上，当前平台已经具备数据集、Pipeline、算子广场、标注任务等骨架，但用户进一步明确了一个更聚焦的落地诉求：在 `算子广场` 和 `Pipeline编辑器` 中补齐常用的图片/视频预处理算子，例如图片加水印、图片质量提高、视频抽帧等，并把运行结果沉淀为可继续流向标注的 `PREPROCESSED` 数据集。

业务来源：

- `docs/business/bizdocs/03-01-系统功能-数据管理.md`：`FUNC-DATA-016`、`FUNC-DATA-041`、`FUNC-DATA-060`、`FUNC-DATA-064`、`FUNC-DATA-086`。
- `docs/business/bizdocs/02-01-业务流程-数据管理.md`：DATA-005 预处理数据集管理流程。
- `docs/business/rules/01-数据管理规则.md`：`DAT-005`、`DAT-007`、`DAT-009`、`DAT-012`。
- `docs/business/domain/01-领域对象-数据域.md`：`DataPipeline`、`Dataset`、`DataLineage`、`AnnotationTask`。
- `docs/business/问题记录.md`：已确认“标注任务既可以来源于原始数据集，也可以来源于已激活的预处理数据集”。

原型来源：

- `docs/prototype/SMP工业AI平台-原型v2.html`：`pipeline`、`opmarket`、`ds`、`lineage`、`ann` 页面语义。
- 原型已体现 Pipeline 画布、算子库、算子广场分类浏览、预处理数据集 Tab、血缘链路和标注任务入口，本功能应在这些既有信息架构内补齐真实业务闭环。

规划证据归档：

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`

目标结果：

1. 数据工程师可对图片/视频数据集配置预处理 Pipeline。
2. 算子广场内可浏览、筛选并选用常见视觉预处理算子。
3. Pipeline 运行成功后沉淀为 `PREPROCESSED` 数据集、版本、产物清单与血缘。
4. 结果数据集在激活后可作为后续标注任务的数据来源。
5. 本期默认固定：图片质量提高先做传统增强；视频抽帧默认输出图片型预处理数据集；运行成功后人工确认再激活。

## 2. 范围

### In Scope

- 在 `/opmarket` 新增“图片处理”“视频处理”重点类目与首批内置算子。
- 首批内置算子至少覆盖：
  - 图片：图片加水印、图片质量提高、缩放、格式转换、去噪/锐化。
  - 视频：视频抽帧、关键帧提取、视频分段、帧率统一、分辨率统一。
- 在 `/pipeline` 提供针对 `IMAGE` / `AUDIO_VIDEO` 数据集的模板化起步能力：
  - 图片预处理模板。
  - 视频抽帧模板。
  - 视频抽帧后转图片预处理模板。
- Pipeline 运行结果自动生成：
  - `PREPROCESSED` 数据集。
  - 新版本记录。
  - 文件清单 / 产物摘要。
  - 处理参数快照。
  - `data_lineage` 血缘记录。
- 结果集需经过“确认/激活”步骤，激活后才能进入标注数据集选择列表。
- 标注任务页面复用现有选择逻辑，允许 ACTIVE 的预处理数据集作为输入。
- 结果预览至少提供样例前后对比、处理数量、跳过数量、失败数量与失败原因摘要。
- 一期默认决策：
  - 图片质量提高仅覆盖传统增强：锐化、去噪、亮度/对比度优化。
  - 水印分为预览水印与产物水印；进入标注链路的数据集默认不写产物水印。
  - 视频处理优先级先做固定间隔抽帧与固定帧率抽帧，关键帧提取列入次优先级。
  - 视频抽帧结果默认转为图片型预处理数据集。

### Out of Scope

- 不新增独立“视觉预处理中心”或新的一级菜单。
- 不覆盖音频、文本、结构化、多模态预处理。
- 不在本期引入任意脚本执行型自定义算子运行沙箱。
- 不承诺真实大规模 GPU 视频超分 / 修复生产执行，仅保留可替换执行器 seam。
- 不重做标注工作台与审核工作台主体交互。

## Reuse Strategy

### Must Reuse

- 业务资料：`docs/business/` 中已存在的 Pipeline、预处理数据集、标注规则与领域对象定义。
- 原型资料：`docs/prototype/SMP工业AI平台-原型v2.html` 中 `pipeline` / `opmarket` / `ds` / `lineage` / `ann` 信息架构。
- F009 / F010 数据集、版本、文件对象、血缘底座；输出结果继续使用 `Dataset.type = PREPROCESSED`。
- F011 的 Pipeline 编辑器、算子广场、算子目录与运行控制面，不再建立平行实现。
- F012 的标注任务数据集选择、质量检查、标注数据集发布契约，仅扩展来源列表支持 ACTIVE 的预处理数据集。
- 现有权限、BU 隔离、审计与 API Response 规范。

### Duplication Rejected

- 不复制一个新的“预处理任务中心”后端表和页面体系去替代 F011 Pipeline。
- 不新建与 `dataset` / `dataset_version` / `data_lineage` 平行的结果资产模型。
- 不复制标注任务创建页面，仅为了支持预处理数据集而单独造一个“预处理标注入口”。
- 不把原型 JSX 直接复制进前端正式代码。

### Approved New Seams

- 允许在现有算子目录中新增“视觉预处理算子 schema / preset”字段，以承载图片/视频处理参数。
- 允许补充“预处理结果摘要 / 样例预览 manifest”模型，因为当前 F011/F010 计划未细化图片/视频 before-after 与抽帧摘要。
- 允许新增用于图片质量提高、视频抽帧等执行器适配的 `TODO_CONFIRM_*` 配置 seam，但不得伪造外部引擎事实来源。

## 4. 交付方案

1. **契约设计**
   - 扩展 Pipeline / Operator API，支持视觉预处理算子分类、参数 schema、结果摘要与激活动作。
   - 明确预处理结果数据集的发布/激活契约，以及与标注任务的数据集选择契约衔接。
2. **测试设计**
   - 覆盖图片/视频算子筛选、Pipeline 运行、结果数据集生成、激活约束、标注可选性。
3. **实现**
   - 前端：`/pipeline`、`/opmarket`、标注数据集选择页最小扩展。
   - 后端：Pipeline run 结果沉淀、PREPROCESSED 数据集版本化、血缘与审计。
4. **联调与 QA**
   - 验证从源数据集 → Pipeline → 预处理数据集 → 标注任务引用的主链路。
5. **质量门禁**
   - 执行前端/后端测试与 AI scaffold gate；功能完成前不得绕过 DAT-005 / DAT-007 / DAT-009 / DAT-012 规则验证。

## 5. 技术方案要点

### 5.1 业务流程建议

建议将本功能收敛为以下标准流程：

1. 在数据集列表或 Pipeline 页选择一个源数据集。
2. 系统根据数据集 `dataType` 推荐图片或视频预处理模板。
3. 用户从算子广场或侧边栏选择算子，配置参数并校验 DAG。
4. Pipeline 运行后生成结果摘要与预览。
5. 系统自动创建 `PREPROCESSED` 数据集草稿版本并写入血缘；若源数据为视频且执行抽帧，默认生成图片型结果集。
6. 用户确认结果后执行“激活数据集”。
7. 标注任务创建页面可选择该 ACTIVE 预处理数据集作为输入。

### 5.2 算子目录规划

建议首批算子按两级展示：

- 图片处理
  - 图片加水印（预览水印 / 产物水印分离）
  - 图片质量提高（一期限定传统增强）
  - 图片缩放
  - 图像格式转换
  - 去噪/锐化
- 视频处理
  - 视频抽帧（固定间隔 / 固定帧率优先）
  - 视频关键帧提取（次优先级）
  - 视频分段
  - 帧率统一
  - 分辨率统一

其中“图片加水印”需单独标注风险提示：若结果将用于后续人工标注，应明确告知可能影响目标可见性与标注质量；默认不允许带不可逆产物水印的结果集直接进入标注链路。

### 5.3 数据与状态约束

- 输出数据集类型固定为 `PREPROCESSED`。
- 结果版本必须记录 `sourceDatasetId`、算子链、参数快照、输入输出数量、失败数量、预览摘要。
- 视频抽帧型结果默认按图片型数据集纳管，便于后续标注与样本预览。
- 已激活版本不可原地修改，变更必须新建版本（DAT-005）。
- 无血缘信息的预处理结果不得发布/激活（参考 DAT-007）。
- 标注任务仅能引用 ACTIVE 的原始/预处理数据集（DAT-009）。
- 所有查询与访问仍受 BU 隔离（DAT-012）。

### 5.4 与后续标注的衔接

- 本功能不直接创建标注任务，但应提供明确的“去创建标注任务”跳转入口。
- 标注任务数据集选择器应新增/复用筛选项：`原始数据集`、`预处理数据集`。
- 若结果数据集未激活、被归档或跨 BU 无授权，则不得出现在标注来源列表中。

## 6. 数据、权限与审计

- 领域对象：`DataPipeline`、`Dataset`、`DatasetVersion`、`DataLineage`、`AnnotationTask`。
- MUST 规则：
  - `DAT-005` 已发布版本不可修改。
  - `DAT-007` 结果数据集必须关联源数据集和处理参数，血缘不可缺失。
  - `DAT-009` 仅 ACTIVE 的原始/预处理数据集可用于标注任务。
  - `DAT-012` 数据集访问遵循 BU 数据隔离。
- 权限建议：
  - `data:pipeline:read`
  - `data:pipeline:write`
  - `data:pipeline:run`
  - `data:pipeline:publish`
  - `data:operator:read`
  - `data:annotation:write`（用于创建标注任务时选择数据集）
- 审计事件建议：
  - `PIPELINE_PREPROCESS_CREATED`
  - `PIPELINE_PREPROCESS_RUN_STARTED`
  - `PIPELINE_PREPROCESS_RUN_SUCCEEDED`
  - `PIPELINE_PREPROCESS_RUN_FAILED`
  - `PREPROCESSED_DATASET_CREATED`
  - `PREPROCESSED_DATASET_ACTIVATED`
  - `ANNOTATION_TASK_SOURCE_SELECTED`

## 7. 风险与未决问题

- `图片质量提高` 一期虽然限定为传统增强，但二期若扩展超分/AI 清晰度提升，仍需确认执行引擎（`TODO_CONFIRM_IMAGE_ENHANCE_ENGINE`）。
- `视频抽帧` 对存储量与文件数量冲击较大，需要确认最大帧数阈值、命名规则与目录结构（`TODO_CONFIRM_VIDEO_FRAME_OUTPUT_POLICY`）。
- `图片加水印` 已默认不进入标注链路，但对“非标注型结果集是否允许产物水印”仍需业务确认（`TODO_CONFIRM_WATERMARK_USAGE_POLICY`）。
- 若 F011 的可运行 Pipeline 控制面尚未完全实现，则 F017 的落地会依赖 F011 先补足最小运行闭环。

## 8. 验收草案（供后续 TASK.md 细化）

- AC-01：算子广场可展示并筛选图片/视频预处理算子。
- AC-02：Pipeline 可基于图片或视频数据集配置并运行预处理任务。
- AC-03：运行成功后生成 `PREPROCESSED` 数据集、版本、结果摘要与血缘。
- AC-04：未激活的预处理结果集不可被标注任务引用。
- AC-05：已激活的预处理结果集可在标注任务创建时作为来源数据集被选择。
- AC-06：失败样本、跳过样本和关键参数在结果页可追溯。

## 9. 审批记录

- Reviewer:
- Decision:
