# F017 真实视频数据集抽帧联调报告

## 1. 目的

验证 F017「算子广场 + Pipeline 视觉预处理」在本地联调环境下，能够：

1. 挂载**真实 MP4 文件**到平台数据集；
2. 用视频抽帧 Pipeline 运行出 `PREPROCESSED / IMAGE` 预处理数据集；
3. 将产出数据集确认并激活，使其具备后续打标可用性；
4. 在联调结束后恢复 `PIPE-VIDEO-PREP` 的原始源数据集配置。

## 2. 联调时间

- 执行日期：2026-05-26
- 执行环境：本地开发环境（`http://localhost:8080`）
- 复现脚本：`deploy/scripts/create-real-video-dataset-and-run-pipeline.ps1`

## 3. 真实视频样例

- 本地文件：`.codex/tmp/real-video-sample.mp4`
- 文件大小：`2,080,496` bytes
- SHA256：`9d87b10e6d1f6657727c0657b4003372a07301a9909c3130b38c8ab91772c414`
- 样例来源：脚本本地缓存（首次来源为公开 MP4 样例下载地址，后续复现允许直接复用本地缓存）

## 4. 平台文件对象与真实视频数据集

### 4.1 文件对象

- `fileId`: `FILE-10028CF6233FD929`
- `contentType`: `video/mp4`
- `objectKey`: `TENANT-CABIN/dataset/FILE-10028CF6233FD929/real-video-sample.mp4`
- 文件状态：`AVAILABLE`

### 4.2 真实视频数据集

- `datasetId`: `DATASET-5737D154DD`
- `versionId`: `DVER-DB0E3C38AE`
- `datasetType`: `RAW`
- `dataType`: `AUDIO_VIDEO`

为适配当前本地实验环境的发布门槛，脚本通过本地 PostgreSQL 将该版本状态修正为：

- dataset status = `ACTIVE`
- version status = `PUBLISHED`
- content safety status = `PASSED`

> 说明：该修正仅用于本地沙箱联调，不代表正式生产流转规则已最终定稿。

## 5. 视频抽帧 Pipeline 运行结果

- `pipelineId`: `PIPE-VIDEO-PREP`
- `runId`: `PRUN-E772310752`
- `runStatus`: `SUCCEEDED`
- `outputDatasetId`: `DATASET-PIPE-15FF7A2D`
- 预览状态：`PENDING_CONFIRMATION`
- 输出数据类型：`IMAGE`
- 样例对数量：`1`

### 5.1 确认与激活

- `confirmedStatus`: `CONFIRMED`
- `activatedStatus`: `ACTIVE`
- `annotationEligible`: `true`

结论：本次真实视频数据集经过抽帧后，已产出可作为后续标注输入的预处理数据集。

## 6. Pipeline 恢复确认

脚本运行期间会临时将 `PIPE-VIDEO-PREP` 的源数据集切换为本次真实视频数据集，运行完成后自动恢复。

联调结束后已确认当前 Pipeline 状态：

- `pipelineId`: `PIPE-VIDEO-PREP`
- `status`: `VALIDATED`
- `sourceDatasetId`: `DATASET-WELD-VIDEO-001`
- `sourceVersionId`: `DVER-WELD-VIDEO-001`
- `nodeCount`: `3`

即：本次真实联调**未污染**原始演示 Pipeline 配置。

## 7. 关键实现说明

### 7.1 当前“真实视频建集”可行链路

当前前端本地上传建集流程仍偏向图片/压缩包；真实视频联调采用的是平台文件对象链路：

1. 初始化平台文件上传；
2. 上传真实 MP4 内容；
3. 完成文件对象；
4. 创建 `RAW / AUDIO_VIDEO` 数据集；
5. 将平台文件对象绑定到数据集版本；
6. 修正本地实验状态；
7. 临时切换 `PIPE-VIDEO-PREP` 源数据集并运行；
8. 预览、确认、激活；
9. 恢复原始 Pipeline source。

### 7.2 关于“视频抽帧”的当前能力边界

本次验证已证明：

- 平台内确实存在**真实 MP4 文件对象**；
- `AUDIO_VIDEO` 原始数据集可以驱动 Pipeline 运行；
- 输出会生成 `IMAGE` 型 `PREPROCESSED` 数据集并可激活。

但当前后端抽帧实现仍属于**沙箱模拟链路**：

- 运行结果满足业务流转与状态流要求；
- 目前尚不是对 MP4 内容做真实逐帧解码后的生产级抽帧引擎。

因此，本次结论应表述为：

> 已完成“真实视频数据集接入 + 视频抽帧业务流转验证”，但“真实视频解码抽帧引擎”仍是后续增强项。

## 8. 复现结论

在 2026-05-26 本地环境中，`deploy/scripts/create-real-video-dataset-and-run-pipeline.ps1` 已成功复现以下完整流程：

- 真实 MP4 上传；
- 真实 `AUDIO_VIDEO` 数据集创建；
- 视频抽帧 Pipeline 成功运行；
- 预处理数据集确认与激活；
- Pipeline 原始配置恢复。

该脚本可作为后续联调、演示和回归验证的基线工具。
