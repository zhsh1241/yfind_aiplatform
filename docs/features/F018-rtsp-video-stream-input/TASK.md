# Task: RTSP 视频流式输入接入

## Metadata
- Feature: F018-rtsp-video-stream-input
- ID: TASK-rtsp-video-stream-input
- Status: draft
- Owner: codex
- Created: 2026-05-27
- Updated: 2026-05-27
- 前置：同目录 `plan.md` 已于 2026-05-27 获用户批准，可进入实现。

## 1. 需求摘要
### User Story
作为数据工程师或视觉质检算法工程师，我想要把工业摄像头或视频网关的 RTSP 视频流登记为平台数据源，并通过手动采样生成受治理的视频数据集，以便在没有本地视频文件的情况下把现场视频样本纳入后续抽帧、标注和模型训练链路。

### Business Value
- 补齐 F015 本地视频上传之外的“在线视频流输入”能力。
- 让 RTSP 来源的视频样本进入统一 `dataset/version/file/lineage` 治理，而不是绕过平台落散文件。
- 为 F017 视频抽帧 Pipeline 提供可追溯的 `RAW/AUDIO_VIDEO` 输入。
- 保持凭据 masking、BU 隔离、连接诊断与审计可追踪。

### Source References
- Business docs:
  - `docs/business/bizdocs/01-业务场景清单.md`
  - `docs/business/bizdocs/02-01-业务流程-数据管理.md`
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md`
  - `docs/business/domain/01-领域对象-数据域.md`
  - `docs/business/rules/01-数据管理规则.md`
- Prototype:
  - `docs/prototype/SMP工业AI平台-原型v2.html`
  - page key: `datasrc` / `ds` / `dsdetail` / `pipeline`
  - screenshots: `screen-datasets.png`、`screen-dsdetail.png`、`screen-pipeline.png`

## 2. 范围
### In Scope
- [ ] 数据源管理支持新增 `sourceType=RTSP_STREAM`（展示为“RTSP 视频流”）。
- [ ] RTSP 数据源创建/更新校验 endpoint、端口、凭据模式和 `secretRef` 引用。
- [ ] RTSP 连接测试支持 sandbox/internal 成功路径，并对非法 URL、未配置、凭据缺失、不可达输出明确诊断。
- [ ] 复用 `data_source_sync_task` 作为手动采样任务控制面，支持采样 scope 参数（如 `durationSeconds=10;sampleName=weld-line`）。
- [ ] 运行 RTSP 采样任务后生成 `RAW/AUDIO_VIDEO` 数据集、版本、`platform_file_object`、`dataset_file` 与 `data_lineage(sourceType=RTSP_STREAM, transformType=CAPTURE_SAMPLE)`。
- [ ] 数据集详情展示 RTSP 来源、视频文件 contentType 与“需先抽帧再标注”的阻断提示。
- [ ] 前端保持既有数据管理 IA，不新增一级菜单；E2E 覆盖创建源、连接测试、采样和详情阻断。

### Out of Scope
- 浏览器直接播放 RTSP、低延迟预览或实时监控墙。
- FFmpeg/GStreamer/OpenCV 等真实解码依赖与生产级采集器。
- 7x24 录像、断流重连、定时采样 SLA、边端设备管理。
- RTMP/HLS/WebRTC/ONVIF/GB28181/OPC-UA/MQTT/Modbus 等协议扩展。
- RTSP 原始视频直接创建图片标注任务。

## 3. 技术分析
### Backend
- Module/API:
  - `POST /api/v1/data-sources`
  - `POST /api/v1/data-sources/{id}/test`
  - `POST /api/v1/data-sources/{id}/activate`
  - `POST /api/v1/data-source-sync-tasks`
  - `POST /api/v1/data-source-sync-tasks/{id}/run`
  - `GET /api/v1/datasets/{id}`
  - `GET /api/v1/datasets/{id}/annotation-candidates`
- Domain objects:
  - `DataSource`、`DataSourceSyncTask`、`Dataset`、`DatasetVersion`、`PlatformFileObject`、`DatasetFile`、`DataLineage`
- Business rules:
  - DAT-002：采样失败不得伪造成可用版本。
  - DAT-005：采样生成新版本必须遵守版本不可原地修改。
  - DAT-007：必须写入血缘。
  - DAT-009：`AUDIO_VIDEO` 原始数据集不得直接标注。
  - DAT-012：BU 隔离。

### Frontend
- Prototype page key:
  - 数据源管理、数据集管理、数据集详情、Pipeline 编排。
- Pages/components:
  - `frontend/src/features/data/DataPages.tsx` 中 `DataSourceManagementPage`、`DatasetDetailPage`。
  - `frontend/src/features/platform/platformApi.ts` 继续复用 string sourceType DTO。
- States/interactions:
  - 新建 RTSP 数据源表单提示。
  - 连接测试消息/诊断展示。
  - RTSP sync task 按钮文案“立即采样”。
  - 采样成功后跳转数据集详情，并提示抽帧后标注。

### AI Adapter / Integration
- Adapter endpoint:
  - 本 feature 不新增 ai-adapter 主链路。
- External system placeholders:
  - `TODO_CONFIRM_RTSP_CAPTURE_ADAPTER`
  - `TODO_CONFIRM_RTSP_SAMPLE_LIMITS`
  - `TODO_CONFIRM_RTSP_URL_SECURITY_POLICY`
  - `TODO_CONFIRM_RTSP_CREDENTIAL_PROVIDER`
  - `TODO_CONFIRM_RTSP_SCHEDULE_SCOPE`

### Database
- Tables:
  - 复用 `data_source`、`data_source_test_log`、`data_source_sync_task`、`dataset`、`dataset_version`、`platform_file_object`、`dataset_file`、`data_lineage`、`platform_audit_log`。
- Migrations:
  - 不新增表；`source_type` 为字符串 seam，使用现有 Flyway `V5__data_source_dataset.sql` 表结构。

## Reuse Plan
- Existing reference seams to reuse:
  - `docs/business/bizdocs/02-01-业务流程-数据管理.md`
  - `docs/business/domain/01-领域对象-数据域.md`
  - `docs/business/rules/01-数据管理规则.md`
  - `docs/prototype/SMP工业AI平台-原型v2.html`
- Existing service/scaffold seams to reuse:
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementController.java`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java`
  - `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataDtos.java`
  - `backend/smp-app/src/main/resources/db/migration/V5__data_source_dataset.sql`
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java`
  - `frontend/src/features/data/DataPages.tsx`
  - `frontend/src/features/platform/platformApi.ts`
  - `frontend/e2e/helpers.ts`
  - `frontend/e2e/data-source-dataset-management.spec.ts` / 新增 RTSP E2E
  - `tools/ai-scaffold/dist/cli.js` feature gate、contract、traceability、review verdict 检查。
- New seams allowed only if existing seams cannot be reused, because:
  - 可新增 `RTSP_STREAM` 枚举值、诊断码、审计 action 与 sandbox capture 分支；不新增独立 RTSP 表或菜单，因为现有数据源/同步任务/数据集/血缘模型已能承载一期产品化范围。
  - 真实采集器保留为 `TODO_CONFIRM_RTSP_CAPTURE_ADAPTER`，不引入新依赖。

## 5. Acceptance Criteria
- [ ] AC-01: 数据源页面可创建 `RTSP_STREAM` 视频流源，并对 `rtsp://` URL/host/port/凭据模式做基础校验，secret 仅以引用或 masked 形式保存/返回。
- [ ] AC-02: RTSP 连接测试对 sandbox/internal 源返回 `TESTED/OK`，对非法 URL、未配置、凭据缺失或不可达源返回明确诊断并记录审计。
- [ ] AC-03: 用户可为 ACTIVE/TESTED 的 RTSP 源创建并运行手动采样任务；任务状态、诊断、最近运行时间可在列表查看。
- [ ] AC-04: RTSP 采样成功后生成 `RAW/AUDIO_VIDEO` 数据集、版本、文件对象、文件绑定与 `RTSP_STREAM` 血缘，`transformType=CAPTURE_SAMPLE`。
- [ ] AC-05: RTSP 生成的视频数据集详情页展示来源、采样任务和文件元数据；直接标注入口被阻断并提示先通过抽帧 Pipeline 生成 `IMAGE` 数据集。
- [ ] AC-06: 跨 BU 访问、权限不足、凭据缺失、连接失败、禁用源采样失败均有明确错误码/诊断与审计，不泄露明文凭据。
- [ ] AC-07: 前端保持原型数据管理信息架构，不新增一级菜单；E2E 覆盖 RTSP 创建、测试连接、采样生成数据集、跳转详情与抽帧提示。

## 6. Definition of Done
- [ ] plan.md 已批准。
- [ ] contract.md 已冻结或实现态。
- [ ] test-plan.md 引用全部 AC-xx。
- [ ] 复用审查已完成。
- [ ] 权限、审计和 MUST 规则有验证证据。
- [ ] 质量门禁通过或记录等价 CI 证据。

## 7. 风险与问题
- 真实 RTSP 网络访问涉及 SSRF、防火墙、凭据 Vault 和边端代理，本期仅承诺 sandbox/internal 验收路径。
- 采样时长、文件大小、帧率/码率阈值尚未业务确认：`TODO_CONFIRM_RTSP_SAMPLE_LIMITS`。
- 生产采集器位置未确认：`TODO_CONFIRM_RTSP_CAPTURE_ADAPTER`。
- URL allowlist/denylist 需要安全评审后进一步固化：`TODO_CONFIRM_RTSP_URL_SECURITY_POLICY`。
