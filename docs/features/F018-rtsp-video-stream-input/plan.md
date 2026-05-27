---
feature: F018-rtsp-video-stream-input
title: RTSP 视频流式输入接入
plan_status: approved
approved_at: "2026-05-27"
owner: codex
created_at: 2026-05-27
updated_at: 2026-05-27
---

# Plan: RTSP 视频流式输入接入

## 1. 背景与目标

用户在 F015 本地 mp4/mov/avi 视频上传产品化之后，继续提出“视频需要接入流式输入 RTSP 协议”。该需求的业务意图是把工业摄像头、视频网关或仿真 RTSP 源从外部地址纳入平台数据治理，使其能够通过连接测试、采样任务和数据集版本化，进入后续 F017 视频抽帧与标注准备链路。

业务来源：

- `docs/business/bizdocs/01-业务场景清单.md`：提到异构数据源、安全接入、流媒体、实时流式接入与数据血缘。
- `docs/business/bizdocs/02-01-业务流程-数据管理.md`：当前数据集内容类型主要围绕图片与影音；本 feature 聚焦影音输入。
- `docs/business/bizdocs/03-01-系统功能-数据管理.md`：既有阶段曾排除专用流媒体 connector，本 feature 作为新的显式范围重新规划。
- `docs/business/domain/01-领域对象-数据域.md`：`Dataset`、`DataLineage`、`DataSource` 等数据域对象。
- `docs/business/rules/01-数据管理规则.md`：DAT-002、DAT-005、DAT-007、DAT-009、DAT-012。

原型来源：

- `docs/prototype/SMP工业AI平台-原型v2.html`：数据源、数据集、上传向导、数据集详情、Pipeline 页面语义。
- `docs/prototype/screen-datasets.png`、`screen-upload.png`、`screen-dsdetail.png`、`screen-pipeline.png`。

规划证据归档：

- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`

目标结果：

1. 数据工程师可登记 RTSP 视频流为平台数据源。
2. 平台可对 RTSP 源进行连接测试、激活/禁用和诊断展示。
3. 用户可创建并运行 RTSP 采样任务，把视频流样本转化为 `RAW/AUDIO_VIDEO` 数据集。
4. 采样产物写入文件对象、数据集版本、文件绑定与 `RTSP_STREAM` 血缘。
5. RTSP 原始视频数据集保持不可直接标注，需通过 F017 抽帧生成 `IMAGE` 数据集后再标注。

## 2. 范围

### In Scope

- 新增 RTSP 视频流作为数据源接入类型，首选 `sourceType=RTSP_STREAM`。
- 数据源字段覆盖：名称、租户/项目、RTSP endpoint/port/path 或完整 URL、凭据模式、`secretRef`、共享范围、描述、状态、连接测试诊断。
- 连接测试：
  - sandbox/internal RTSP 源返回 `TESTED/OK`。
  - 未配置、协议非法、不可达、凭据缺失返回明确诊断。
  - 记录测试日志与审计。
- 采样任务：
  - 复用 data source sync task 控制面。
  - 一期以手动采样为主，可保留 scheduleMode 字段但不承诺生产调度。
  - 支持采样窗口/时长/目标名称等参数的 contract 固化。
- 采样成功后生成：
  - `RAW/AUDIO_VIDEO` 数据集。
  - 数据集版本。
  - `platform_file_object`。
  - `dataset_file` 绑定。
  - `data_lineage(sourceType=RTSP_STREAM, transformType=CAPTURE_SAMPLE)`。
- 前端在既有数据源/数据集 IA 内展示 RTSP 创建、测试、激活、采样任务与数据集跳转。
- 数据集详情展示 RTSP 来源、采样任务、文件元数据、抽帧提示与标注阻断。
- 权限、BU 隔离、凭据 masking、审计与失败诊断。

### Out of Scope / Non-goals

- 不实现浏览器直接播放 RTSP 或低延迟实时预览。
- 不新增 FFmpeg、GStreamer、OpenCV 等视频解码依赖。
- 不实现 7x24 连续录像、断流重连、云端转码、长周期保活、边缘摄像头设备管理。
- 不扩展 RTMP、HLS、WebRTC、ONVIF、GB28181、OPC-UA、MQTT、Modbus 等协议。
- 不新增独立一级菜单或平行“视频流中心”。
- 不允许 RTSP 原始 `AUDIO_VIDEO` 数据集直接进入图片标注任务。
- 不绕过内容安全、权限、BU 隔离、版本治理和血缘规则。

## 3. Decision Boundaries

- **sourceType 策略**：规划首选新增 `RTSP_STREAM`，语义上区别于 Kafka/RabbitMQ 类 `STREAM` 和 OPC-UA/MQTT 类 `INDUSTRIAL_PROTOCOL`；若实现阶段兼容成本过高，可退回 `STREAM + protocol=RTSP`，但必须在 contract 中记录兼容原因。
- **采样能力边界**：一期允许采用 sandbox 采样产物，不做真实生产级 RTSP 解码。真实采集适配器用 `TODO_CONFIRM_RTSP_CAPTURE_ADAPTER` 表达。
- **数据集输出**：默认输出 `datasetType=RAW`、`dataType=AUDIO_VIDEO`。
- **下游链路**：视频原始数据集不直接标注；默认走 F017 视频抽帧 Pipeline 输出 `IMAGE` 后再标注。
- **凭据策略**：只保存/返回 secret 引用或 masked 值；不得明文回显。
- **权限策略**：沿用数据源与数据集 BU 隔离；跨 BU 不泄露存在性。

## 4. 技术方案要点

### Backend

- 复用 `DataManagementController` 的数据源与同步任务 API surface：
  - `POST /api/v1/data-sources`
  - `POST /api/v1/data-sources/{id}/test`
  - `POST /api/v1/data-sources/{id}/activate`
  - `POST /api/v1/data-source-sync-tasks`
  - `POST /api/v1/data-source-sync-tasks/{id}/run`
- 扩展 `DataSourceRequest/Response` 表达 RTSP 所需字段；若现有字段不足，在 contract 阶段明确新增字段或 metadata JSON seam。
- 扩展连接测试器：
  - 校验 RTSP scheme、host、port、凭据模式。
  - sandbox/internal 地址走可验收成功路径。
  - 外部真实地址若无法安全探测，返回受控诊断而非阻塞系统。
- 扩展采样任务运行：
  - 读取 RTSP source 与采样参数。
  - sandbox 模式生成视频样例文件对象与 hash/size/contentType。
  - 创建 `dataset`、`dataset_version`、`platform_file_object`、`dataset_file`、`data_lineage`。
  - 记录审计事件。
- 错误码草案：
  - `RTSP_SOURCE_URL_INVALID`
  - `RTSP_SOURCE_UNCONFIGURED`
  - `RTSP_SOURCE_CREDENTIAL_REQUIRED`
  - `RTSP_STREAM_UNREACHABLE`
  - `RTSP_SAMPLE_FAILED`
  - `RTSP_SAMPLE_DATASET_CREATE_FAILED`

### Frontend

- 复用数据源管理页面，不新增一级菜单。
- 新建/编辑数据源时增加“RTSP 视频流”类型选项与 RTSP 专属表单提示。
- 连接测试后展示状态、延迟、诊断码、诊断消息。
- 数据源详情或同步任务区域支持创建/运行“采样任务”。
- 采样成功后提供目标数据集跳转。
- 数据集详情页展示来源为 RTSP、采样任务 ID、文件 contentType，并沿用视频数据集不可直接标注提示。

### Data / SQL

- 优先复用 `data_source`、`data_source_test_log`、`data_source_sync_task`、`dataset`、`dataset_version`、`dataset_file`、`data_lineage`。
- 如需新增 RTSP 采样参数或协议字段，优先评估是否通过 `sync_scope`/描述字段临时承载；若影响可维护性，再新增窄表或 metadata JSON 字段。
- SQL 必须归档在 `docs/features/F018-rtsp-video-stream-input/sql/`。

### AI Adapter / External Integration

- 本期不要求 ai-adapter 真实处理 RTSP。
- 真实 RTSP 捕获能力保留：`TODO_CONFIRM_RTSP_CAPTURE_ADAPTER`。
- sandbox 采样需可在无真实工厂网络下验收。

## Reuse Strategy / 复用策略

### Must Reuse

- F009 数据源、连接测试、同步任务、数据集、文件对象、血缘 seam。
- F015 `RAW/AUDIO_VIDEO` 视频数据集语义、标注阻断与文件治理经验。
- F017 视频抽帧 Pipeline 作为 RTSP 采样视频的后续处理入口。
- `DataManagementService` / `DataManagementController` / `DataDtos` 中现有数据管理 API 风格。
- `platform_file_object` 与 `dataset_file`，不得新增平行文件资产表。
- `data_lineage`，不得新增平行血缘模型。
- `tools/ai-scaffold` feature/artifact/gate 流程。

### Duplication Rejected

- 不复制旧已删除 backend/frontend 实现作为事实来源。
- 不新增独立“RTSP 数据集”模型替代 `Dataset`。
- 不新增独立“RTSP 任务”模型替代 `data_source_sync_task`，除非 contract 证明 sync task 无法承载必要状态。
- 不新增“视频标注入口”绕过 F017 抽帧与既有 Annotation 规则。

### Approved New Seams

- 可新增 `RTSP_STREAM` sourceType / 诊断码 / 审计事件。
- 可新增 RTSP 采样参数的 metadata seam，前提是 contract 明确字段、默认值、兼容策略。
- 可新增 sandbox capture adapter 接口，但不得引入真实解码依赖。

## 6. 权限、规则与审计

### 领域对象

- `DataSource`
- `DataSourceSyncTask`
- `Dataset`
- `DatasetVersion`
- `PlatformFileObject`
- `DatasetFile`
- `DataLineage`

### MUST 规则

- DAT-002：采样失败或内容安全未通过不得伪造成可用版本。
- DAT-005：版本不可原地修改；采样追加策略必须遵守当前版本规则。
- DAT-007：RTSP 采样产物必须写入血缘。
- DAT-009：RTSP 原始视频不可直接创建图片标注任务。
- DAT-012：BU 隔离。

### 权限

- 需要数据源管理权限创建/更新/测试/激活 RTSP 源。
- 需要数据集创建权限运行采样并生成数据集。
- 跨 BU 用户不得读取/运行其他 BU 的 RTSP 源或采样任务。
- 凭据引用不得向无权限用户泄露。

### 审计事件草案

- `RTSP_DATA_SOURCE_CREATED`
- `RTSP_DATA_SOURCE_UPDATED`
- `RTSP_DATA_SOURCE_TESTED`
- `RTSP_DATA_SOURCE_ACTIVATED`
- `RTSP_DATA_SOURCE_DISABLED`
- `RTSP_SAMPLE_TASK_CREATED`
- `RTSP_SAMPLE_TASK_RUN_STARTED`
- `RTSP_SAMPLE_TASK_RUN_SUCCEEDED`
- `RTSP_SAMPLE_TASK_RUN_FAILED`
- `RTSP_SAMPLE_DATASET_BOUND`

## 7. Exception Scenarios

- RTSP URL 不是 `rtsp://` 或 host 为空：创建/测试拒绝。
- 凭据模式要求 secretRef 但未提供：测试/激活拒绝。
- 地址不可达或非 sandbox 外部地址不允许探测：返回明确诊断，不创建数据集。
- 源已禁用：不能运行采样任务。
- 采样任务已运行中：重复运行返回冲突。
- 采样成功但内容安全 pending/blocked：数据集版本不得进入可用标注链路。
- 采样生成的 `AUDIO_VIDEO` 数据集直接创建标注任务：阻断并提示先抽帧。
- 跨 BU 查询 source/task/dataset：403/404，不泄露敏感信息。

## 8. 风险与依赖

- RTSP 真实连接、编解码、网络安全、SSRF 防护复杂；一期必须明确 sandbox/adapter 边界。
- 如果新增 `RTSP_STREAM` sourceType，需同步前后端枚举、测试、文档与 E2E mock。
- 大视频采样产物的大小、时长、码率、保留策略尚未确认：`TODO_CONFIRM_RTSP_SAMPLE_LIMITS`。
- 内容安全对视频流采样产物的策略需要后续确认：`TODO_CONFIRM_VIDEO_CONTENT_SAFETY_POLICY`。
- 真实工厂网络访问通常需要边端代理或专线，本期不承诺：`TODO_CONFIRM_RTSP_NETWORK_ACCESS_MODEL`。

## 9. 开放问题

- `TODO_CONFIRM_RTSP_CAPTURE_ADAPTER`：真实 RTSP 采样由后端内置、ai-adapter、边端代理还是外部服务完成？
- `TODO_CONFIRM_RTSP_SAMPLE_LIMITS`：单次采样最大时长、最大文件大小、帧率/分辨率限制是多少？
- `TODO_CONFIRM_RTSP_URL_SECURITY_POLICY`：允许哪些网段/域名，是否必须 sandbox allowlist？
- `TODO_CONFIRM_RTSP_CREDENTIAL_PROVIDER`：secretRef 来源于平台配置、组织密钥还是外部 Vault？
- `TODO_CONFIRM_RTSP_SCHEDULE_SCOPE`：一期是否允许定时采样，还是只允许手动采样？

## 10. 验收项草案（后续 TASK.md 固化）

- AC-01：数据源页面可创建 `RTSP_STREAM` 视频流源，并对 RTSP URL/host/port/凭据模式做基础校验。
- AC-02：连接测试对 sandbox/internal RTSP 源返回 `TESTED/OK`，不可达或未配置源返回明确诊断并记录审计。
- AC-03：用户可为 RTSP 源创建并运行采样任务；任务状态、诊断、最近运行时间可查询。
- AC-04：采样成功生成 `RAW/AUDIO_VIDEO` 数据集、版本、文件对象、文件绑定与 `RTSP_STREAM` 血缘。
- AC-05：RTSP 生成的视频数据集详情页展示来源、采样任务和文件元数据，直接标注入口被阻断并提示先抽帧。
- AC-06：跨 BU 访问、权限不足、凭据缺失、连接失败、采样失败均有明确错误码/诊断与审计。
- AC-07：前端保持原型数据管理信息架构，不新增一级菜单；E2E 覆盖创建源、测试连接、采样生成数据集、跳转详情。

## 11. 交付方案

1. `/build-feature` Phase 1：基于本 plan 起草 `TASK.md`，固化 AC-xx。
2. 契约设计：冻结 RTSP sourceType、API 字段、错误码、审计事件、采样参数。
3. 测试设计：后端集成测试、前端 E2E、权限/安全/审计测试。
4. 后端实现：数据源/测试/采样任务/数据集产物/血缘。
5. 前端实现：RTSP 数据源表单、测试与采样交互、详情展示。
6. Review + QA：安全审查重点关注 SSRF、凭据 masking、跨 BU。
7. 门禁：`node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F018-rtsp-video-stream-input --skip-backend-integration`，前端变更后追加 `--run-e2e`。

## 12. 审批记录

- Reviewer: 待人审
- Decision: `plan_status: approved`，尚未批准，不得进入实现。
