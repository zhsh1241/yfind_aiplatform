# F014 待确认项确认记录（2026-05-21）

## 1. 结论摘要

本轮基于 `docs/business/`、`docs/prototype/`、`docs/architecture/`、既有 Flyway/后端实现、本地部署脚本与用户在 2026-05-21 的补充确认，对 F014 开放问题做二次确认。结论分为“已可确认并进入 F014 约束”和“仍需外部/生产环境确认”。

## 2. 已确认项

| 项 | 确认结论 | 证据 |
| --- | --- | --- |
| 正式训练格式清单 | F014 已确认支持清单为：`SMP_JSONL`、`LABEL_STUDIO_JSON`、`COCO_DETECTION`、`YOLO_DETECTION`、`VOC_DETECTION`；图片分割保留 `SEGMENTATION_MASK_MANIFEST` P1 seam，PNG mask 具体结构仍待确认。 | `docs/business/bizdocs/05-03-系统功能-通知与文件管理.md` 标注产物导出要求 COCO/YOLO/VOC/自定义 JSON；F013 已落 Label Studio JSON seam；原型多处出现 COCO/YOLO 与“标注格式 COCO JSON”。 |
| 自定义 JSON 的平台解释 | “自定义 JSON”在 F014 内收敛为平台规范 `SMP_JSONL`，避免引入不可测试的任意 JSON schema。 | F012 标注结果文件使用平台文件对象保存；F014 PRD 已将 `SMP_JSONL` 作为 P0。 |
| 导出产物保存与下载 seam | 导出产物必须保存为 `platform_file_object`，下载复用 `/api/v1/platform/files/{fileId}/download-url` 与 `platform:file:download`，不得返回真实对象存储路径。 | F009/F012 规划、`PlatformOrganizationConfigController`、`PlatformOrganizationConfigService.downloadUrl`、`V3__platform_organization_config_file.sql`。 |
| 本地/实验室 bucket | 本地实验室环境 bucket 为 `smp-datasets`；F014 不应硬编码 bucket，而应复用 `storage.bucket` 配置。配置缺失或仍为 TODO 时继续返回 `TODO_CONFIRM_MINIO_BUCKET`/下载诊断。 | `deploy/README.md`、`deploy/local/lab/seed/seed_platform_lab.sql`、`DataManagementService.datasetBucket()`。 |
| 是否新增导出权限 | 需要新增 `data:annotation:export`，用于把“生成训练格式导出”与 `data:annotation:publish` 区分开；下载仍需 `data:dataset:download` + `platform:file:download`。建议授予 BU 管理员和模型训练工程师，避免模型训练工程师必须具备发布权限。 | 既有 `MODEL_TRAINER` 仅有 `data:annotation:read` 与 `data:dataset:download`；F014 persona 包含模型训练工程师下载训练格式产物。 |
| 导出包是否应绕过平台下载 | 已确认不得绕过。即使对象存储已配置，也只能暴露平台 download-url seam。 | F009/F014 复用策略与 PLT 权限审计规则。 |
| COCO/YOLO/VOC/Mask 包结构 | 已确认导出包必须包含图片副本；包内同时保留 `metadata.json`、格式文件和 source dataset/version/task/export 元数据。 | 用户 2026-05-21 补充确认。 |
| 异步导出阈值 | 已确认导出文件预估或生成后超过 200 MB 时走异步导出；200 MB 及以下可同步生成，但 API 状态仍保持异步兼容。 | 用户 2026-05-21 补充确认。 |
| 导出文件保留期 | 已确认导出文件保留 3 个月。实现建议按日历月计算到期；若只能以天数配置，则使用 90 天并在配置说明中标注“三个月近似”。 | 用户 2026-05-21 补充确认。 |
| 生产 MinIO 配置基线 | 已确认生产环境当前按测试环境 Docker 配置执行，即 MinIO S3 兼容对象存储、bucket `smp-datasets`、本地 Compose/seed 同源配置；真实密码/网络/TLS 仍不得写入代码。 | 用户 2026-05-21 补充确认；`deploy/README.md`、`deploy/local/docker-compose.yml`、`deploy/local/lab/seed/seed_platform_lab.sql`。 |
| 训练环境图片访问策略 | 推荐 F014 默认采用“自包含导出包”：COCO/YOLO/VOC/Mask 包内包含图片副本和标注文件，训练任务只依赖导出包；同时在 `metadata.json` 保留原始 `fileId/objectKey/sha256` 用于追溯。后续大规模场景可增加 MinIO 数据集挂载/内网只读 URL 优化，但不是本期默认。 | 用户要求推荐；结合 200 MB 异步阈值、权限审计与训练可复现性选择。 |

## 3. 仍需保留 TODO_CONFIRM 的项

| TODO | 当前状态 | 原因/处理 |
| --- | --- | --- |
| `TODO_CONFIRM_EXPORT_PACKAGE_STRUCTURE` | 大部分已确认 | 已确认 COCO/YOLO/VOC/Mask 导出包必须包含图片副本、`metadata.json`、格式文件和 source dataset/version/task/export 元数据；仍需在实现阶段固化各格式目录名和文件名细节。推荐：`images/`、`annotations/`、`labels/`、`masks/`、`metadata.json`。 |
| `TODO_CONFIRM_EXPORT_ASYNC_THRESHOLD` | 已确认 | 超过 200 MB 的导出文件走异步导出；200 MB 及以下可同步生成，API 状态仍兼容异步。 |
| `TODO_CONFIRM_EXPORT_RETENTION_DAYS` | 已确认 | 导出文件保留 3 个月；实现配置可用 `export.retention.months=3`，如仅支持天数则用 90 天近似并在诊断中标注。 |
| `TODO_CONFIRM_MINIO_BUCKET` / 预签名 URL 策略 | 部分确认 | 当前生产按测试环境 Docker MinIO 配置执行，bucket 为 `smp-datasets`；真实密码、TLS、网络域名、KMS 与签名有效期仍不得硬编码，download-url seam 继续屏蔽底层路径。 |
| `TODO_CONFIRM_DATASET_IMAGE_PUBLIC_ACCESS_POLICY` | 已给出推荐 | 推荐默认“自包含导出包（含图片副本）”；训练任务读取导出包，不直接依赖平台在线鉴权。后续大规模/低冗余场景可扩展 MinIO 只读挂载或内网 URL。 |
| 分割 PNG mask 目录/像素编码 | 部分确认 | 已确认 Mask 包含图片副本和 mask 产物；mask PNG palette、类别编码与像素值规范仍需在实现阶段按标签模板生成并写入 `metadata.json`。 |

## 4. 对 F014 文档的更新要求

- 将 `VOC_DETECTION` 纳入训练格式清单。
- 将 `TODO_CONFIRM_TRAINING_EXPORT_FORMATS` 从“整体未确认”改为“超出已确认清单的格式仍待确认”。
- 将对象存储结论改为“复用 `storage.bucket`，本地 seed 为 `smp-datasets`，生产与签名策略仍 TODO”。
- 将权限开放问题改为确认新增 `data:annotation:export`。
- 已按用户确认更新包结构、异步阈值、保留期、生产 MinIO 基线与图片访问推荐；仅保留格式目录细节、真实签名/TLS/KMS、mask 像素编码等实现级细节。
