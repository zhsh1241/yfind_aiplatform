> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-rtsp-video-stream-input.md`

# PRD: F018 RTSP 视频流式输入接入

## 用户价值

- 数据工程师可以把工厂摄像头、视频网关或仿真 RTSP 源登记为平台数据源，不再只依赖离线 mp4/mov/avi 文件上传。
- 平台可通过连接测试和采样任务，把视频流转化为受治理的 RAW/AUDIO_VIDEO 数据集，后续沿用 F017 抽帧生成可标注图片数据集。
- 管理员可追踪 RTSP 来源、采样任务、文件对象、数据集版本和血缘，满足数据治理、审计与 BU 隔离要求。

## 核心能力

1. RTSP 视频流数据源
   - sourceType 首选 RTSP_STREAM。
   - 支持 endpoint/port/path 或完整 RTSP URL 的录入策略。
   - 支持凭据模式：NONE、SECRET_REF；响应只返回 secretRefMasked。
   - 支持状态：DRAFT、TESTED、ACTIVE、DISABLED、UNCONFIGURED。
2. 连接测试与诊断
   - sandbox/internal RTSP 源可返回 TESTED/OK。
   - 未配置、协议不合法、连接不可达、凭据缺失返回明确诊断码。
   - 每次测试写入 data_source_test_log 与平台审计。
3. RTSP 采样任务
   - 复用 data_source_sync_task 作为采样/同步任务控制面。
   - 一期支持手动运行；可预留 scheduleMode 但不承诺生产调度。
   - syncScope 可承载采样窗口、时长、目标文件名/场景标签等 JSON 或约定字符串，contract 阶段固定格式。
4. 采样产物入库
   - 采样成功后生成 RAW/AUDIO_VIDEO 数据集或追加到指定数据集的新版本（实现阶段如范围过大，可先只支持创建新数据集）。
   - 产物登记 platform_file_object，绑定 dataset_file，写入 data_lineage(sourceType=RTSP_STREAM, sourceId=<sourceId/taskId>, transformType=CAPTURE_SAMPLE)。
   - 内容安全与版本状态沿用 F015/F009 数据集规则。
5. 下游衔接
   - RTSP 原始视频数据集不可直接创建图片标注任务。
   - 页面提示“需先通过视频抽帧 Pipeline 生成 IMAGE 数据集后再标注”。
   - 可从详情页跳转/引导到 F017 视频抽帧 Pipeline。

## 目标流程

1. 用户进入数据源管理页，选择“RTSP 视频流”。
2. 用户填写名称、RTSP 地址、端口/路径、凭据引用、租户/项目、描述。
3. 用户点击连接测试，系统返回 TESTED/OK 或诊断信息。
4. 用户激活数据源，并创建“视频流采样任务”。
5. 用户手动运行采样任务；sandbox 模式生成可验收视频样例文件对象。
6. 系统创建 RAW/AUDIO_VIDEO 数据集、版本、文件绑定和 RTSP 血缘。
7. 用户进入数据集详情，查看 RTSP 来源、采样任务、文件元数据与抽帧提示。
8. 用户后续通过 F017 视频抽帧 Pipeline 生成 IMAGE 数据集，再进入标注链路。

## In Scope

- 数据源类型扩展与前端表单入口。
- RTSP URL 基础校验、凭据引用、连接测试诊断。
- RTSP 采样任务创建/运行/状态查询。
- sandbox 采样产物生成数据集闭环。
- 数据集详情与血缘展示对 RTSP 来源友好。
- 权限、审计、BU 隔离、失败诊断。

## Out of Scope

- 浏览器 RTSP 播放/预览。
- 真实 FFmpeg/GStreamer/OpenCV 解码与转码。
- 7x24 持续录像、断流重连、边端摄像头生命周期管理。
- RTMP/HLS/WebRTC/ONVIF/GB28181 等协议。
- 视频原始数据直接标注。

## RALPLAN-DR Summary

### Principles
- 复用现有数据治理 seam，不新建平行数据资产模型。
- RTSP 作为视频流入口，不扩大到所有工业协议。
- 控制面先行，真实解码能力通过适配器 seam 后续接入。
- 凭据与跨 BU 安全优先于演示便利。
- 采样输出必须能接入 F017 抽帧，而不是孤立页面能力。

### Decision Drivers
1. 当前仓库已有 F009 数据源/同步任务与 F015/F017 视频数据链路。
2. 无新增依赖与未知 RTSP 运行环境限制。
3. 用户明确要求新 feature 产品化，而非临时脚本。

### Viable Options

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| A. 新增 RTSP_STREAM sourceType + 复用 sync task/dataset seam | 语义清晰，便于血缘与 UI 识别，风险可控 | 需要迁移/前端枚举扩展 | 推荐 |
| B. 复用 STREAM 并以 protocol=RTSP 区分 | 对旧枚举侵入小 | 容易和 Kafka/RabbitMQ 混淆，血缘不清 | 备选 |
| C. 直接做真实 RTSP 解码服务 | 用户价值完整 | 新依赖与运行环境风险高，不适合当前规划边界 | 拒绝 |

## 依赖与前置

- F009 数据源、同步任务、数据集与血缘基础能力。
- F015 RAW/AUDIO_VIDEO 视频数据集与标注阻断文案。
- F017 视频抽帧 Pipeline 作为下游处理路径。
- TODO_CONFIRM_RTSP_CAPTURE_ADAPTER：真实采集/解码适配器。
- TODO_CONFIRM_RTSP_SAMPLE_LIMITS：采样时长、码率、最大文件大小和保留策略。

## Follow-up Staffing Guidance

- Backend executor：数据源类型、连接测试、采样任务、数据集生成、迁移、审计。
- Frontend executor：数据源表单、测试结果、采样任务操作、详情页 RTSP 来源展示。
- Test engineer：后端集成测试与 Playwright E2E。
- Security reviewer：RTSP URL SSRF 风险、凭据 masking、跨 BU 权限。
