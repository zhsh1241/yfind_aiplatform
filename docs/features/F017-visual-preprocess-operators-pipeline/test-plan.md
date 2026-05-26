# Test Plan: 视觉预处理算子与预处理数据集闭环

## 1. Test Scope
- Feature: F017-visual-preprocess-operators-pipeline
- Contract version: v1 frozen
- Business references:
  - `docs/business/bizdocs/02-01-业务流程-数据管理.md` DATA-005
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md` FUNC-DATA-016、FUNC-DATA-041、FUNC-DATA-060、FUNC-DATA-064、FUNC-DATA-086
  - `docs/business/rules/01-数据管理规则.md` DAT-005、DAT-007、DAT-009、DAT-012
  - `docs/business/domain/01-领域对象-数据域.md` DataPipeline、Dataset、DataLineage、AnnotationTask
- Prototype references:
  - `docs/prototype/SMP工业AI平台-原型v2.html` page key `pipeline`、`opmarket`、`ds`、`lineage`、`ann`
- Frozen default decisions:
  1. 图片质量提高一期仅传统增强。
  2. 预览水印 / 产物水印分离。
  3. 视频抽帧默认输出图片型 `PREPROCESSED` 数据集。
  4. Pipeline 运行成功后必须人工确认，确认后方可激活。

## 2. P0 - Blocking

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-01 | 算子广场展示视觉预处理算子 | 登录后进入 `/opmarket`，筛选 `VISUAL_PREPROCESS` | 可见图片处理/视频处理分类，图片加水印、图片质量提高、缩放、格式转换、去噪/锐化、固定间隔抽帧、固定帧率抽帧、关键帧提取、视频分段、分辨率统一、帧率统一 |
| T-P0-02 | AC-01 AC-07 | 图片质量提高算子一期仅传统增强 | 调用 `GET /api/v1/operators` 与 `GET /api/v1/operators/{operatorId}` 查询图片质量提高算子 | 返回 `enhancementMode=TRADITIONAL_ONLY`，不暴露 AI 超分/生成式修复选项，界面显示一期传统增强说明 |
| T-P0-03 | AC-02 AC-09 | 以视频数据集配置“抽帧转图片预处理” Pipeline 并校验成功 | 创建/保存 `VIDEO_FRAME_TO_IMAGE_PREPROCESS` Pipeline，输入 ACTIVE 视频数据集并调用 validate | 校验通过，警告明确“视频抽帧默认输出图片型 PREPROCESSED 数据集”，结果配置 `datasetDataType=IMAGE` |
| T-P0-04 | AC-02 AC-03 | 运行视觉预处理成功后生成待确认结果数据集与血缘 | 调用 `POST /api/v1/pipelines/{pipelineId}/runs`，再查询 run 详情 | 返回 `status=SUCCEEDED`，生成 `PREPROCESSED` 数据集/版本、结果摘要、preview manifest、sourceDatasetId/sourceVersionId/operatorChain 血缘齐全 |
| T-P0-05 | AC-03 AC-06 | 结果预览页展示前后对比、处理数量、跳过/失败摘要与关键参数 | 调用 `GET /api/v1/preprocessed-datasets/{datasetId}/preview` 并打开 `/pipeline` 结果页 | 可见 before/after 样例、总数、成功/跳过/失败、失败原因摘要、抽帧数量、关键算子参数，信息与 run 详情一致 |
| T-P0-06 | AC-04 | 未确认/未激活的预处理结果不可用于标注来源 | 运行成功后不确认不激活，查询 `GET /api/v1/annotation/source-datasets` 并尝试创建标注任务 | 来源列表不返回该结果集，直接创建返回 422，消息指向仅 ACTIVE 且已确认数据集可用于标注 |
| T-P0-07 | AC-05 | 人工确认后激活成功，并可进入标注来源选择 | 依次调用 `POST /preprocessed-datasets/{datasetId}/confirm` 与 `/activate`，随后查询标注来源列表 | 激活结果 `status=ACTIVE`、`confirmed=true`、`annotationEligible=true`；标注来源列表出现该 `PREPROCESSED` 数据集 |
| T-P0-08 | AC-08 | 预览水印与产物水印分离 | 配置图片加水印算子，开启预览水印，关闭产物水印，运行并查询详情/预览 | `previewWatermarkApplied=true`、`artifactWatermarkApplied=false`；预览可见防泄漏水印，但产物未被不可逆写入 |
| T-P0-09 | AC-08 | 带不可逆产物水印的结果默认不可进入标注链路 | 配置 `artifactWatermarkEnabled=true` 运行成功并确认激活，查询标注来源或直接创建标注任务 | 结果集 `annotationEligible=false`，来源列表过滤或明确不可选；创建标注任务返回 409/422，审计记录阻断原因 |
| T-P0-10 | AC-09 | 视频抽帧结果以图片型预处理数据集进入后续标注链路 | 使用 ACTIVE 视频数据集抽帧并激活结果，再创建图片型标注任务 | 结果数据集 `datasetType=PREPROCESSED`、`datasetDataType=IMAGE`，可被图片标注任务成功引用 |
| T-P0-11 | AC-02 AC-07 | 请求 AI 超分或未知增强模式被拒绝 | 提交图片质量提高 Pipeline/save request，传 `enhancementMode=AI_SUPER_RESOLUTION` 或未知值 | API 返回 422，消息指向一期仅支持传统增强，不落库/不启动运行 |
| T-P0-12 | AC-03 AC-04 | DAT-005 已激活预处理版本不得原地修改 | 激活结果集后尝试修改该版本关联的处理参数/文件内容或复用原版本再次写入 | API 返回 409，拒绝修改已激活版本，要求重新运行生成新版本 |
| T-P0-13 | AC-03 | DAT-007 缺少血缘或处理参数快照时拒绝激活 | 模拟结果集缺少 `sourceDatasetId`、`sourceVersionId`、operatorChain 或参数快照，再调用 activate | API 返回 422，提示血缘/参数不完整，不允许激活 |
| T-P0-14 | AC-04 AC-05 | DAT-009 仅 ACTIVE 数据集可进入标注任务 | 分别以 `PENDING_CONFIRMATION`、`CONFIRMED未激活`、`ARCHIVED`、`ACTIVE` 结果集查询来源并创建任务 | 仅 `ACTIVE` 数据集可见且可创建；其他状态均被过滤或返回 422 |
| T-P0-15 | AC-01 AC-02 AC-03 AC-04 AC-05 AC-06 AC-08 AC-09 | DAT-012 BU 隔离覆盖全链路 | 使用跨 BU 用户访问算子详情、Pipeline、预览、确认/激活、标注来源与任务创建 | 跨 BU 未授权访问返回 404/403，不泄露资源存在性，写跨租户拒绝审计 |

## 3. P1 - Important

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-01 | 算子广场支持按图片/视频类型筛选 | 在 `/opmarket` 依次按 `IMAGE`、`AUDIO_VIDEO` 筛选 | 图片筛选仅显示图片处理算子，视频筛选仅显示视频处理算子 |
| T-P1-02 | AC-02 | 图片数据集可配置图片预处理模板并运行 | 选择 ACTIVE 图片数据集创建图片预处理模板，保存并运行 | Pipeline 成功运行，结果集类型为 `PREPROCESSED`，摘要统计正确 |
| T-P1-03 | AC-03 AC-06 | 结果页失败样本与跳过样本支持追溯摘要 | 打开结果页并展开失败/跳过区块 | 可见 reasonCode、reasonMessage、数量汇总和样本标识，支持定位失败来源 |
| T-P1-04 | AC-04 | 人工确认是激活前置步骤 | 不执行 confirm，直接调用 activate 或前端点击激活 | API/前端阻止操作，返回“必须人工确认后再激活” |
| T-P1-05 | AC-05 | 标注任务创建页区分原始数据集与预处理数据集来源 | 打开 `/ann` 新建标注任务并查询来源数据集 | 可见 `PREPROCESSED` 来源标识、源数据集信息、预览可用标识 |
| T-P1-06 | AC-06 AC-08 | 预览接口返回独立水印策略说明 | 查询 preview 接口 | 返回 `previewWatermarkEnabled`、`artifactWatermarkEnabled`、`artifactWatermarkBlocksAnnotation`，与界面说明一致 |
| T-P1-07 | AC-09 | 视频抽帧结果在数据集详情/血缘页可见为图片型结果 | 运行并激活视频抽帧结果后进入 `/ds`、`/lineage` | 数据集详情显示 `PREPROCESSED/IMAGE`，血缘展示源视频数据集与算子链 |
| T-P1-08 | AC-02 AC-03 | 后端集成测试校验运行审计事件完整 | 运行创建/校验/启动/成功链路 | `PIPELINE_PREPROCESS_CREATED`、`UPDATED`、`RUN_STARTED`、`RUN_SUCCEEDED`、`PREPROCESSED_DATASET_CREATED` 审计存在 |
| T-P1-09 | AC-04 AC-05 AC-08 | 后端集成测试校验确认/激活/阻断审计 | 分别覆盖确认成功、激活成功、产物水印阻断标注 | 审计存在 `PREPROCESSED_DATASET_CONFIRMED`、`PREPROCESSED_DATASET_ACTIVATED`、`PREPROCESSED_DATASET_ANNOTATION_BLOCKED` |
| T-P1-10 | AC-01 AC-02 AC-05 | 权限不足时前端页面与按钮按角色收敛 | 使用无 `data:pipeline:run` 或无 `data:annotation:write` 权限用户进入页面 | 不展示或禁用运行/激活/创建标注任务按钮；直调 API 返回 403 |

## 4. P2 - Nice to Have

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-01 | 原型语义文案与分类完整性 | 检查 `/opmarket`、`/pipeline` 页面文案 | `图片处理`、`视频处理`、`图片质量提高`、`视频抽帧` 等原型语义一致 |
| T-P2-02 | AC-02 AC-09 | 视频抽帧模板默认说明可见 | 创建视频抽帧模板 | 页面或接口警告明确“默认输出图片型 PREPROCESSED 数据集” |
| T-P2-03 | AC-06 | 结果页样例对比数量不足时保留降级说明 | 构造低样本结果集并查看结果页 | 若前后对比不足，页面展示降级提示，不伪造样例数量 |
| T-P2-04 | AC-07 | 冻结能力说明可见且不伪造二期能力 | 查看图片质量提高算子详情 | 明示传统增强范围，不出现 AI 超分、生成式修复、外部模型能力文案 |
| T-P2-05 | AC-08 | 预览水印仅用于界面预览说明可见 | 查看结果预览帮助提示或水印说明 | 用户可理解预览水印与产物水印差异及对标注链路的影响 |
| T-P2-06 | AC-05 | 标注来源列表支持按 `sourceType=PREPROCESSED` 筛选 | 在任务创建来源弹窗筛选预处理数据集 | 列表只显示已激活且可标注的预处理数据集 |

## 5. Cross-cutting Verification

- Frontend E2E:
  - 覆盖 `/opmarket` 视觉算子筛选、`/pipeline` 创建/运行/结果预览/确认/激活、`/ann` 来源选择与阻断提示。
  - 至少包含：未激活不可选、确认后激活、激活后可选、产物水印阻断、视频抽帧进入图片标注。
- Backend API / integration:
  - 控制器/API 测试覆盖 `/api/v1/operators`、`/api/v1/pipelines`、`/api/v1/pipeline-runs/{runId}`、`/api/v1/preprocessed-datasets/{datasetId}/preview|confirm|activate`、`/api/v1/annotation/source-datasets`、`/api/v1/annotation/tasks`。
  - 集成测试断言 `dataset` / `dataset_version` / `data_lineage` / 审计表落库结果与状态流转。
- Permission:
  - 覆盖 `data:operator:read`、`data:pipeline:read`、`data:pipeline:write`、`data:pipeline:run`、`data:dataset:publish`、`data:annotation:write`。
  - 覆盖 `menu:opmarket`、`menu:pipeline`、`menu:ds`、`menu:ann` 页面级可见性。
- Audit:
  - 断言 `PIPELINE_PREPROCESS_CREATED`、`PIPELINE_PREPROCESS_UPDATED`、`PIPELINE_PREPROCESS_VALIDATION_FAILED`、`PIPELINE_PREPROCESS_RUN_STARTED`、`PIPELINE_PREPROCESS_RUN_SUCCEEDED`、`PIPELINE_PREPROCESS_RUN_FAILED`、`PREPROCESSED_DATASET_CREATED`、`PREPROCESSED_DATASET_CONFIRMED`、`PREPROCESSED_DATASET_ACTIVATED`、`PREPROCESSED_DATASET_ACTIVATION_REJECTED`、`PREPROCESSED_DATASET_ANNOTATION_BLOCKED`、`ANNOTATION_TASK_SOURCE_SELECTED`、`DATASET_CROSS_TENANT_DENIED`。
- Business rules:
  - 必须有显式用例覆盖 `DAT-005`、`DAT-007`、`DAT-009`、`DAT-012`。
- NFR / compatibility:
  - API 保持 `/api/v1` envelope；错误信息不泄露 token/secret/跨 BU 资源标识。
  - 不伪造 `TODO_CONFIRM_*` 外部执行器能力，不把二期 AI 增强能力写成本期已支持。

## 6. Traceability

- AC-01 -> T-P0-01, T-P0-02, T-P0-15, T-P1-01, T-P1-10, T-P2-01
- AC-02 -> T-P0-03, T-P0-04, T-P0-11, T-P1-02, T-P1-08, T-P2-02
- AC-03 -> T-P0-04, T-P0-05, T-P0-12, T-P0-13, T-P1-03, T-P1-08
- AC-04 -> T-P0-06, T-P0-12, T-P0-14, T-P1-04, T-P1-09
- AC-05 -> T-P0-07, T-P0-14, T-P1-05, T-P1-10, T-P2-06
- AC-06 -> T-P0-05, T-P0-15, T-P1-03, T-P1-06, T-P2-03
- AC-07 -> T-P0-02, T-P0-11, T-P2-04
- AC-08 -> T-P0-08, T-P0-09, T-P0-15, T-P1-06, T-P1-09, T-P2-05
- AC-09 -> T-P0-03, T-P0-10, T-P1-07, T-P2-02

## 7. Required commands

```powershell
$env:JAVA_HOME='C:\java\jdk-25'; $env:Path="$env:JAVA_HOME\bin;$env:Path"
mvn -q -f backend/pom.xml -pl smp-app test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
npm --prefix frontend run e2e
node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F017-visual-preprocess-operators-pipeline
node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F017-visual-preprocess-operators-pipeline
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F017-visual-preprocess-operators-pipeline --run-e2e
```
