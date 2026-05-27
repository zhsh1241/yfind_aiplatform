# Code Review Report: F015 本地图片/视频上传创建数据集

## Verdict
- Verdict: PASS

## Review Rounds

### Round 1 - CHANGES_REQUIRED
- 视频数据集被阻断标注时，真实后端缺少“先抽帧为 IMAGE 再标注”引导。
- 前端可进入“视频 + APPEND_VERSION”非法组合。
- `TASK.md` AC-01 仍保留旧“直接上传图片”文案。

### Round 2 - CHANGES_REQUIRED
- Round 1 问题已修复。
- 新发现：`AUDIO_VIDEO` session 可通过 `.zip` 分支绕过后端 allowlist。

### Round 3 - PASS
- 后端 zip 分支已按 `session.dataType` 拦截，非 `IMAGE` zip 直接拒绝。
- 新增 `localVideoDatasetUploadRejectsZipEvenWhenZipContainsVideo` 回归测试。
- 正向 mp4/mov/avi、非视频拒绝、zip 绕过拒绝均已覆盖。

## Evidence
- Reviewer verdict: PASS（subagent `019e64fd-a017-75e1-ae4c-5438da4adcef`）
- Backend targeted test: `mvn -pl smp-app '-Dtest=DataManagementControllerTest#localVideoDatasetUploadSessionAcceptsMp4MovAviAndCommitsAudioVideoDataset+localVideoDatasetUploadRejectsNonVideoFile+localVideoDatasetUploadRejectsZipEvenWhenZipContainsVideo' test` -> PASS, 3/3 tests.
- Full feature gate with E2E run later in final DoD evidence.

## Remaining Risks
- 视频内容校验首期仅做扩展名/content-type/非空校验，不做真实解码；生产级编解码探测仍需后续能力或外部扫描服务。
- 单文件 100MB / zip 500MB 阈值已按产品要求固化；超大文件断点续传、客户端切片仍是后续能力。


