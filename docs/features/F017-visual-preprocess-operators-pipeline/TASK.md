# Task: 视觉预处理算子与预处理数据集闭环

## Metadata
- Feature: F017-visual-preprocess-operators-pipeline
- ID: TASK-visual-preprocess-operators-pipeline
- Status: approved-for-build
- Owner: codex
- Created: 2026-05-26
- Updated: 2026-05-26
- 前置：同目录 `plan.md` 已批准；`check-build-feature-prereqs` 已通过。

## 1. 需求摘要

### User Story
作为数据工程师或 BU 数据管理员，我想在 `Pipeline编辑器` 与 `算子广场` 中直接配置常见图片/视频预处理算子，并把运行结果沉淀为可激活、可追溯的 `PREPROCESSED` 数据集，以便后续标注团队直接复用这些预处理数据集开展打标任务。

### Business Value
- 把原型中的 Pipeline 与算子广场从通用示意升级为“视觉预处理闭环”，减少线下脚本和人工数据交接。
- 让图片/视频原始数据经平台预处理后直接成为可纳管、可血缘追溯的数据资产。
- 打通“源数据集 -> Pipeline -> 预处理数据集 -> 标注任务”主流程，缩短数据准备到标注启动的周期。

### Source References
- Business docs:
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md`：`FUNC-DATA-016`、`FUNC-DATA-041`、`FUNC-DATA-060`、`FUNC-DATA-064`、`FUNC-DATA-086`
  - `docs/business/bizdocs/02-01-业务流程-数据管理.md`：DATA-005 预处理数据集管理流程
  - `docs/business/rules/01-数据管理规则.md`：`DAT-005`、`DAT-007`、`DAT-009`、`DAT-012`
  - `docs/business/domain/01-领域对象-数据域.md`：`DataPipeline`、`Dataset`、`DataLineage`、`AnnotationTask`
  - `docs/business/问题记录.md`：已确认预处理数据集可作为标注输入（前提 ACTIVE）
- Prototype:
  - `docs/prototype/SMP工业AI平台-原型v2.html`：page key `pipeline`、`opmarket`、`ds`、`lineage`、`ann`

## 2. 范围

### In Scope
- [x] `/opmarket` 新增面向视觉预处理的图片处理 / 视频处理重点类目与首批内置算子。
- [x] 首批图片算子：图片加水印、图片质量提高（一期限定传统增强）、缩放、格式转换、去噪/锐化。
- [x] 首批视频算子：固定间隔抽帧、固定帧率抽帧、关键帧提取（次优先级）、视频分段、分辨率统一、帧率统一。
- [x] `/pipeline` 提供图片预处理模板、视频抽帧模板、视频抽帧转图片预处理模板。
- [x] `/pipeline` 增加加工任务列表入口，列表展示已有加工任务；新建加工任务时先选择 Pipeline 模板与输入数据集，创建后进入 Pipeline 编辑器查看 DAG、运行结果和处置状态。
- [x] Pipeline 运行成功后生成 `PREPROCESSED` 数据集、版本、结果摘要、文件清单与血缘。
- [x] 结果数据集采用“运行成功 -> 预览确认 -> 人工激活”的流程，不自动激活。
- [x] 激活后的预处理数据集可在标注任务创建阶段作为来源数据集被选择。
- [x] 结果页展示样例前后对比、处理数量、跳过数量、失败数量与失败原因摘要。

### Out of Scope
- 不新增独立“视觉预处理中心”一级菜单。
- 不覆盖音频、文本、结构化、多模态预处理。
- 不做任意脚本执行型自定义算子运行沙箱。
- 不承诺真实 GPU 视频超分/修复生产执行，仅保留执行器扩展 seam。
- 不重做标注工作台核心交互，仅打通来源数据集选择。

## 3. 技术分析

### Backend
- Module/API:
  - 复用 `PipelineController` / `PipelineService` / `PipelineDtos`，扩展视觉预处理算子目录、预处理结果摘要、结果激活动作。
  - 必要时扩展 `AnnotationController` / `AnnotationService` 的来源数据集筛选与校验响应，使 ACTIVE 的预处理数据集可选。
- Domain objects:
  - 复用 `Dataset`、`DatasetVersion`、`DataLineage`、`DataPipeline`。
  - 视觉预处理结果仍落 `Dataset.type = PREPROCESSED`。
- Business rules:
  - `DAT-005`：激活版本不可原地修改。
  - `DAT-007`：结果数据集必须带 `sourceDatasetId` 与处理参数，血缘不可缺失。
  - `DAT-009`：仅 ACTIVE 的原始/预处理数据集可用于标注任务。
  - `DAT-012`：BU 隔离与跨 BU 授权。

### Frontend
- Prototype page key:
  - `pipeline`、`opmarket`、`ds`、`ann`
- Pages/components:
  - 复用/扩展 `DataPages.tsx` 中 Pipeline、算子广场、数据集与标注任务相关页面。
  - 扩展视觉算子分类、模板卡片、结果摘要、激活入口与标注跳转入口。
- States/interactions:
  - 图片质量提高一期固定为传统增强。
  - 水印区分预览水印与产物水印，默认不允许进入标注链路的数据集写不可逆产物水印。
  - 视频抽帧结果默认按图片型预处理数据集展示。

### AI Adapter / Integration
- Adapter endpoint:
  - 本期不新增 AI adapter 必选接口。
- External system placeholders:
  - `TODO_CONFIRM_IMAGE_ENHANCE_ENGINE`
  - `TODO_CONFIRM_VIDEO_FRAME_OUTPUT_POLICY`
  - `TODO_CONFIRM_WATERMARK_USAGE_POLICY`

### Database
- Tables:
  - 优先复用现有 pipeline / dataset / lineage 表。
  - 仅在现有表不足以承载结果摘要/预览 manifest 时新增清晰命名字段或表。
- Migrations:
  - 若需新增视觉预处理 schema 或结果摘要字段，放入 F017 对应 migration。

## Reuse Plan

### Existing reference seams to reuse
- `docs/business/`：功能、流程、领域对象、规则、开放问题。
- `docs/prototype/SMP工业AI平台-原型v2.html`：`pipeline`、`opmarket`、`ds`、`lineage`、`ann` 原型语义。

### Existing service/scaffold seams to reuse
- F009/F010 数据集、版本、文件对象、血缘与 `PREPROCESSED` 数据集闭环。
- F011 Pipeline 编辑器、算子广场、算子目录、Pipeline run 控制面与相关 DTO / API。
- F012 标注任务创建与数据集选择、质量检查、标注数据集发布链路。
- F006/F007 平台权限、审计、身份、文件对象与对象存储 seam。
- 前端 `frontend/src/features/data/DataPages.tsx`、`frontend/src/features/platform/platformApi.ts`、现有 E2E helpers 与 route 结构。
- 质量门禁：`tools/ai-scaffold` 的 traceability / contract / gate / review verdict 检查。

### New seams allowed only if existing seams cannot be reused, because
- 若 F011 当前 Operator DTO 无法表达“预览水印 / 产物水印”“图片质量提高类型”“视频抽帧输出图片型结果”等视觉预处理专属参数，则允许新增 schema 字段。
- 若现有 Pipeline run 结果结构无法表达 before/after 预览 manifest、失败样本摘要、抽帧统计，则允许新增结果摘要结构。
- 不允许新增平行“预处理任务中心”数据模型或重复的结果数据集模型。

## 5. Acceptance Criteria
- [ ] AC-01：算子广场可展示并筛选图片/视频预处理算子。
- [ ] AC-02：Pipeline 可基于图片或视频数据集配置并运行预处理任务。
- [ ] AC-03：运行成功后生成 `PREPROCESSED` 数据集、版本、结果摘要与血缘。
- [ ] AC-04：未激活的预处理结果集不可被标注任务引用。
- [ ] AC-05：已激活的预处理结果集可在标注任务创建时作为来源数据集被选择。
- [ ] AC-06：失败样本、跳过样本和关键参数在结果页可追溯。
- [ ] AC-07：图片质量提高一期仅提供传统增强能力，不强依赖模型超分。
- [ ] AC-08：预览水印与产物水印分离；带不可逆产物水印的结果默认不可直接进入标注链路。
- [ ] AC-09：视频抽帧默认生成图片型预处理数据集并支持后续标注使用。
- [ ] AC-10：Pipeline 加工任务必须有列表入口；用户可从列表查看已有加工任务，从“新建加工任务”选择数据集创建，并在创建后进入 Pipeline 编辑器。

## 6. Definition of Done
- [ ] `plan.md` 已批准。
- [ ] `contract.md` 已冻结或实现态。
- [ ] `test-plan.md` 引用全部 AC-xx。
- [ ] 复用审查已完成。
- [ ] 权限、审计和 MUST 规则有验证证据。
- [ ] 后端测试、前端 lint/build/unit/E2E、ai-scaffold gate 通过或记录等价 CI 证据。
- [ ] code review 报告和 QA 报告已归档。

## 7. 风险与问题
- 图片质量提高二期若引入超分/AI 提升，需要额外执行器和资源策略。
- 视频抽帧可能造成文件数与存储量快速增长，需要阈值与命名规则确认。
- 产物水印对后续打标可用性有负面影响，本期默认阻断进入标注链路，但业务策略仍待最终确认。
- 若 F011 的 Pipeline 控制面在当前代码中仍有能力缺口，F017 需要先补足最小可运行闭环再叠加视觉预处理特性。
