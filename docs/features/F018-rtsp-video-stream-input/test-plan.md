# Test Plan: RTSP 视频流式输入接入

## 1. Test Scope
- Feature: F018-rtsp-video-stream-input
- Contract version: v1
- Business references: `docs/business/bizdocs/01-业务场景清单.md`、`docs/business/bizdocs/02-01-业务流程-数据管理.md`、`docs/business/bizdocs/03-01-系统功能-数据管理.md`、`docs/business/domain/01-领域对象-数据域.md`、`docs/business/rules/01-数据管理规则.md`
- Prototype references: `docs/prototype/SMP工业AI平台-原型v2.html` page key `datasrc`、`ds`、`dsdetail`、`pipeline`

## 2. P0 - Blocking
| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-01/AC-02 | 后端创建并测试 sandbox RTSP 源 | `POST /data-sources` with `sourceType=RTSP_STREAM`、`rtsp://camera.sandbox.internal/live/weld`、`secretRef`；随后 test | 返回 `sourceType=RTSP_STREAM`、secret masked；测试 `SUCCESS/TESTED/OK` 且诊断含 `SANDBOX RTSP_STREAM connector verified` |
| T-P0-02 | AC-03/AC-04 | 后端运行 RTSP 手动采样任务 | activate 源，创建 sync task，run task，查询 dataset detail | 任务 `SUCCEEDED`；生成 `RAW/AUDIO_VIDEO` dataset、`video/mp4` file、`RTSP_STREAM` lineage、`CAPTURE_SAMPLE` transform |
| T-P0-03 | AC-05 | RTSP 视频数据集直接标注阻断 | 对采样生成 dataset 调用 `/annotation-candidates` | `eligible=false`，`diagnosticCode=ANNOTATION_DATASET_TYPE_UNSUPPORTED`，文案提示抽帧 |
| T-P0-04 | AC-07 | 前端 RTSP 创建/测试/采样/详情链路 | E2E 登录，进入数据源管理，新建 RTSP 源，测试连接，创建/运行采样任务，查看详情 | 保持数据管理 IA；看到“RTSP 视频流”“立即采样”“SANDBOX_RTSP_STREAM_SAMPLE_READY”“需先经过抽帧预处理” |

## 3. P1 - Important
| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-01/AC-02/AC-06 | 非 RTSP URL 被拒绝或测试失败 | 创建 `sourceType=RTSP_STREAM` 且 endpoint=`http://camera/live` | 返回 422 或测试 `RTSP_SOURCE_URL_INVALID`，不允许激活 |
| T-P1-02 | AC-01/AC-02/AC-06 | 缺少凭据引用 | 创建或测试 `credentialMode=SECRET_REF` 且 `secretRef` 为空 | 返回 `RTSP_SOURCE_CREDENTIAL_REQUIRED`，不泄露明文凭据 |
| T-P1-03 | AC-06 | 禁用源不可采样 | disable RTSP 源后创建/运行采样任务 | 返回 `DATA_SYNC_TASK_SOURCE_REJECTED`，记录审计 |
| T-P1-04 | AC-06 | 跨 BU 不可读/不可写 | QE 用户访问 CABIN RTSP source/task/dataset | 读返回 404 或写返回 403，不泄露 secretRef |

## 4. P2 - Nice to Have
| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-03 | syncScope 采样参数透传 | `syncScope=durationSeconds=10;sampleName=weld-line` | 任务列表和描述保留 scope，dataset description 含 scope |
| T-P2-02 | AC-04 | 数据标准 source type 兼容 | 对 RTSP 采样 dataset 查询 standard profile | sourceType 显示 `RTSP_STREAM` 或可识别视觉标准 |
| T-P2-03 | AC-07 | 前端表单文案 | 打开新建数据源 Modal 选择 RTSP | endpoint placeholder 显示 `rtsp://camera.sandbox.internal/live/weld`，采样说明显示 `durationSeconds=10;sampleName=weld-line` |

## 5. Cross-cutting Verification
- Permission: `data:source:write/read/test/activate`、`data:sync-task:write/read`、`data:dataset:read`，覆盖跨 BU 404/403。
- Audit: RTSP source created/tested/activated、sample task created/run succeeded/failed、dataset bound。
- Business rules: DAT-002、DAT-005、DAT-007、DAT-009、DAT-012。
- NFR/Security: 不引入 FFmpeg/GStreamer/OpenCV；不真实探测未确认外部 RTSP allowlist；凭据只保存 secretRef/masked；保留 `TODO_CONFIRM_RTSP_URL_SECURITY_POLICY`。
- Frontend visual/prototype parity: 复用原数据源管理、同步任务、数据集详情、Pipeline 抽帧提示，不新增一级菜单。

## 6. Traceability
- AC-01 -> T-P0-01, T-P1-01, T-P1-02, T-P2-03
- AC-02 -> T-P0-01, T-P1-01, T-P1-02
- AC-03 -> T-P0-02, T-P1-03, T-P2-01
- AC-04 -> T-P0-02, T-P2-02
- AC-05 -> T-P0-03, T-P0-04
- AC-06 -> T-P1-01, T-P1-02, T-P1-03, T-P1-04
- AC-07 -> T-P0-04, T-P2-03
