> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-rtsp-video-stream-input.md`
> Interview transcript: `.omx/interviews/rtsp-video-stream-input-20260527T014136Z.md`

# Deep Interview: F018 RTSP 视频流式输入接入

## Metadata
- Feature: F018-rtsp-video-stream-input
- Slug: rtsp-video-stream-input
- Profile: standard-autonomous
- Context type: brownfield
- Final ambiguity: 0.18
- Threshold: 0.20
- Context snapshot: .omx/context/rtsp-video-stream-input-20260527T013933Z.md
- Interview transcript: $interviewPath

## Clarity Breakdown

| Dimension | Score | Evidence / Gap |
|---|---:|---|
| Intent | 0.92 | 在离线视频上传之后补齐工业摄像头/视频流入口。 |
| Outcome | 0.86 | RTSP 源可配置、测试、采样并形成 RAW/AUDIO_VIDEO 数据资产。 |
| Scope | 0.84 | 一期限定控制面 + sandbox 采样，不做生产级解码/播放。 |
| Constraints | 0.86 | 不新增依赖，未知外部事实保留 TODO_CONFIRM，复用现有 seam。 |
| Success | 0.82 | 连接测试、采样任务、数据集/血缘/下游抽帧可验收。 |
| Context | 0.86 | 已定位 F009/F015/F017 可复用链路。 |

## Intent / Desired Outcome

用户希望新增一个独立 feature，让平台支持通过 RTSP 协议接入视频流。该能力应把工业摄像头/视频流从“外部地址”转化为平台内可治理、可追踪、可进入视频预处理/抽帧链路的 RAW/AUDIO_VIDEO 数据资产。

## In Scope

- 新建 F018-rtsp-video-stream-input 规划与后续交付目录。
- 在数据源管理中支持 RTSP 视频流数据源：名称、租户/项目、RTSP URL/host/port/path、凭据模式、secretRef、描述、共享范围、状态、连接测试诊断。
- 支持 RTSP 连接测试：
  - sandbox/internal 地址可返回可验收成功结果。
  - 未配置或不可达返回明确诊断。
  - 不明文回显凭据。
- 支持基于 RTSP 源创建采样/同步任务：手动采样为主，可预留定时采样字段。
- 采样成功后创建/更新 RAW/AUDIO_VIDEO 数据集、版本、文件对象、文件绑定与 RTSP_STREAM 血缘。
- 采样产物进入 F015/F017 一致的视频数据集语义：视频原始数据集不可直接标注，需先通过 F017 抽帧生成 IMAGE 数据集。
- 前端在现有数据源/上传/数据集信息架构中补齐 RTSP 入口、连接测试结果、采样任务状态与数据集跳转。
- 审计覆盖数据源创建/更新、连接测试、采样任务创建/运行、采样产物绑定、失败诊断。

## Out of Scope / Non-goals

- 不实现浏览器直接播放 RTSP 或低延迟实时预览。
- 不新增 FFmpeg/GStreamer/OpenCV 等视频解码依赖。
- 不实现真实生产级持续录制、断流重连、云端转码、长周期保活、边端摄像头管理。
- 不实现 OPC-UA/MQTT/Modbus 等工业协议；RTSP 是独立视频流协议入口。
- 不绕过内容安全、权限、BU 隔离、数据集版本治理。
- 不允许 RTSP 原始 AUDIO_VIDEO 数据集直接创建图片标注任务。

## Decision Boundaries

- 可新增明确的 sourceType=RTSP_STREAM，避免与通用 STREAM/INDUSTRIAL_PROTOCOL 混淆；如实现阶段发现枚举兼容成本过高，可用 STREAM + protocol=RTSP，但 contract 必须说明兼容策略。
- 一期可采用 sandbox 采样：生成平台可验收的视频文件对象/元数据，不做真实 RTSP 解码。
- 凭据只保存引用，前端和响应只展示 masked 值。
- 默认输出数据集类型为 RAW，数据内容类型为 AUDIO_VIDEO。
- 下游标注衔接只通过 F017 抽帧后的 IMAGE 数据集，不新增视频标注工作台。

## Constraints

- 所有正式文档中文。
- 规划必须引用 docs/business/、docs/prototype/ 与 F009/F015/F017 现有 feature 事实。
- 不新增依赖；外部采集/解码能力保留 TODO_CONFIRM_RTSP_CAPTURE_ADAPTER。
- 敏感信息不得明文回显或写入审计详情。
- 新 feature 必须通过计划审批后才可进入 /build-feature。

## Testable Acceptance Criteria Draft

- AC-01：数据源页面可创建 RTSP_STREAM 视频流源，并对 RTSP URL/host/port/凭据模式做基础校验。
- AC-02：连接测试对 sandbox/internal RTSP 源返回 TESTED/OK，不可达或未配置源返回明确诊断并记录审计。
- AC-03：用户可为 RTSP 源创建并运行采样任务；任务状态、诊断、最近运行时间可查询。
- AC-04：采样成功生成 RAW/AUDIO_VIDEO 数据集、版本、文件对象、文件绑定与 RTSP_STREAM 血缘。
- AC-05：RTSP 生成的视频数据集详情页展示来源、采样任务和文件元数据，直接标注入口被阻断并提示先抽帧。
- AC-06：跨 BU 访问、权限不足、凭据缺失、连接失败、采样失败均有明确错误码/诊断与审计。
- AC-07：前端保持原型数据管理信息架构，不新增一级菜单；E2E 覆盖创建源、测试连接、采样生成数据集、跳转详情。

## Assumptions Exposed + Resolutions

- 假设：RTSP 等同工业协议。Resolution：本 feature 独立建模为视频流入口，不扩展 OPC-UA/MQTT/Modbus。
- 假设：必须真实解码才算完成。Resolution：一期以平台治理 seam 和 sandbox 采样为验收边界，真实解码适配器后续确认。
- 假设：RTSP 视频可直接标注。Resolution：沿用 AUDIO_VIDEO 需先抽帧为 IMAGE 的产品规则。

## Brownfield Evidence vs Inference Notes

- Evidence：F009 已有数据源、连接测试、同步任务、数据集/血缘基础表和 API。
- Evidence：F015 已支持本地视频文件进入 RAW/AUDIO_VIDEO 数据集并阻断直接标注。
- Evidence：F017 已提供视频抽帧算子与 AUDIO_VIDEO -> IMAGE 预处理链路。
- Inference：RTSP 采样产物可复用 platform_file_object；实现时需在 contract 中固定 objectKey/size/hash 生成策略。

## Technical Context Findings

- Backend touchpoints: DataDtos.java, DataManagementController.java, DataManagementService.java, Flyway migrations, DataManagementControllerTest。
- Frontend touchpoints: rontend/src/features/data/DataPages.tsx, rontend/src/features/platform/platformApi.ts, rontend/e2e/*。
- Prototype touchpoints: screen-datasets.png, screen-upload.png, screen-dsdetail.png, screen-pipeline.png, 原型 v2 的数据源/数据集/上传/Pipeline 页面。
