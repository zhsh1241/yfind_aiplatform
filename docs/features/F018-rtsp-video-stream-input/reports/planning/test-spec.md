> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-rtsp-video-stream-input.md`

# Test Spec: F018 RTSP 视频流式输入接入

## 后端测试

- 数据源 API
  - 创建 RTSP_STREAM 数据源成功，响应中不回显 secretRef 明文。
  - 非 RTSP URL / 空 endpoint / 非法端口返回 422 与诊断码。
  - 跨 BU 查询或操作返回 403/404。
- 连接测试
  - sandbox/internal RTSP 地址返回 TESTED/OK，写入 data_source_test_log。
  - 未配置地址返回 DATA_SOURCE_UNCONFIGURED。
  - 不可达地址返回 RTSP_STREAM_UNREACHABLE 或统一连接失败诊断。
  - 凭据模式为 SECRET_REF 但缺失 secretRef 时拒绝测试/激活。
- 采样任务
  - 为 ACTIVE/TESTED RTSP 源创建采样任务成功。
  - DISABLED/UNCONFIGURED 源运行采样失败并记录诊断。
  - 手动运行采样任务后生成 RAW/AUDIO_VIDEO 数据集、版本、文件对象和 RTSP_STREAM lineage。
  - 采样失败不生成可用版本，不伪造 ACTIVE/READY 状态。
- 下游规则
  - RTSP 生成的 AUDIO_VIDEO 数据集直接创建标注任务时被阻断。
  - RTSP 数据集可作为 F017 视频抽帧 Pipeline 的源数据集。
- 审计
  - 数据源创建/更新/测试/激活/禁用。
  - 采样任务创建/运行成功/运行失败。
  - 数据集产物绑定与失败诊断。

## 前端测试

- 数据源管理页可选择“RTSP 视频流”并填写 RTSP 地址。
- 连接测试成功后展示 TESTED/OK、延迟和诊断。
- 连接失败/凭据缺失时展示明确错误，不允许误激活。
- 可创建并运行 RTSP 采样任务，看到运行状态和目标数据集跳转。
- 数据集详情展示来源为 RTSP、采样任务 ID、文件 contentType，并禁用直接标注入口。
- E2E 覆盖：创建 RTSP 源 -> 测试连接 -> 激活 -> 运行采样 -> 跳转数据集详情 -> 看到抽帧提示。

## 规则与安全验证

- DAT-002：内容安全未通过或采样失败不得伪造成可用版本。
- DAT-005：版本不可原地修改，采样追加策略需遵守当前版本规则。
- DAT-007：RTSP 采样数据必须写入血缘。
- DAT-009：仅符合条件的 IMAGE/预处理结果可进入标注；RTSP 原始视频需先抽帧。
- DAT-012：BU 隔离。
- SSRF 防护：禁止或诊断危险地址段的策略需在 contract 阶段明确；若一期只做 sandbox allowlist，也必须测试非 sandbox 外部地址的受控失败。

## 质量门禁建议

- mvn -pl smp-app -Dtest=DataManagementControllerTest#<rtsp-tests> test
- 
pm run build（frontend）
- 
pm run e2e -- <rtsp spec>（前端行为变化时）
- 
ode tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F018-rtsp-video-stream-input --skip-backend-integration
- 前端改动后追加 --run-e2e。

## 验收矩阵草案

| AC | Backend | Frontend | E2E |
|---|---|---|---|
| AC-01 创建 RTSP 源 | API 422/200 | 表单校验 | 创建入口可见 |
| AC-02 连接测试 | test log + audit | 状态展示 | 测试成功/失败 |
| AC-03 采样任务 | sync task run | 操作按钮/状态 | 运行采样 |
| AC-04 数据集产物 | dataset/version/file/lineage | 跳转详情 | 详情可见 |
| AC-05 标注阻断 | annotationCandidate | 禁用按钮/提示 | 阻断可见 |
| AC-06 权限审计 | 403/404 + audit | 错误提示 | 可选 |
| AC-07 原型 IA | API compatibility | 页面不新增一级菜单 | 导航路径 |
