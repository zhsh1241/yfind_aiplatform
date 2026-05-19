> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-label-studio-production-integration.md`
> Interview transcript: `.omx/interviews/label-studio-production-integration-20260519T062204Z.md`

﻿# Deep Interview Spec: F013 Label Studio 生产化联通

## Metadata

- Feature: `F013-label-studio-production-integration`
- Slug: `label-studio-production-integration`
- Profile: standard
- Context type: brownfield
- Final ambiguity: 0.16
- Threshold: 0.20
- Context snapshot: `.omx/context/label-studio-production-integration-20260519T062042Z.md`
- Transcript: `.omx/interviews/label-studio-production-integration-*.md`

## Clarity Breakdown

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Intent | 0.95 | F012 seam 后推进真实 Label Studio API 联通，避免停留在 `UNCONFIGURED`。 |
| Outcome | 0.90 | 配置存在时可同步项目/任务/结果，配置或调用失败时可诊断。 |
| Scope | 0.86 | 限定 adapter、配置、状态、审计、本地验证、前端状态展示。 |
| Constraints | 0.86 | 复用 F012/F006/F009；secretRef；不新增依赖；TODO_CONFIRM 外部参数。 |
| Success | 0.84 | 后端、前端、E2E、Docker sandbox 与 scaffold gate 可验证。 |
| Context | 0.92 | 已定位 `LabelStudioAnnotationAdapter`、`annotation_external_binding`、Compose 与 E2E seam。 |

## Intent / Desired Outcome

F013 的意图是在 F012 已完成的标注控制面、标签模板、工作台、审核、数据集发布与 `LabelStudioAnnotationAdapter` seam 之上，补齐真实 Label Studio 生产化联通能力：当配置存在且凭据有效时，平台能通过后端 adapter 创建/复用 Label Studio project、导入 work item 为 Label Studio task、生成可打开的 launch URL、导入标注结果并回写 SMP 标注工作项；当配置缺失或外部 API 失败时，必须返回明确诊断并写审计，不能伪造同步成功。

## In Scope

- 配置驱动的 `HttpLabelStudioAnnotationAdapter`，支持 `baseUrl`、token `secretRef`、workspace/project 策略、超时、启停开关。
- 本地 Docker Label Studio sandbox 联通路径，使用 env/secretRef 或本地开发 secret 文件，不把 token 明文写入数据库或响应。
- `sync-project`：按 F012 标签模板 `labelStudioConfigXml` 创建或复用 Label Studio project，持久化 external project id、URL、launch URL、诊断状态。
- `sync-task`：将 annotation work item 的样本 payload 转成 Label Studio task data，并持久化 external task 映射；支持幂等重试。
- `import-results`：从 Label Studio 导入已完成 annotation，转换并回写 `annotation_work_item.annotation_json`，沿用 F012 审核/质量检查/发布流程。
- 状态与诊断：`UNCONFIGURED`、`CONFIGURED`、`PROJECT_SYNCED`、`TASK_SYNCED`、`RESULT_IMPORTED`、`AUTH_FAILED`、`SYNC_FAILED`、`IMPORT_FAILED` 等可审计状态。
- 前端 `/ann`、`/annwork`、`/annreview` 中 Label Studio 状态 Banner、同步操作反馈、打开外部项目/任务入口、失败诊断展示；保持原型 IA 与 F012 页面语义。
- 后端单元/集成测试、前端 E2E、Docker sandbox 验证和 scaffold gate 证据。

## Out of Scope / Non-goals

- 不负责生产 Label Studio 服务部署、运维、备份、升级和高可用编排；本仓库只保留本地 Compose sandbox。
- 不实现企业 SSO / SCIM / 用户组深度同步；本期使用平台侧权限控制和 Label Studio token/API key。
- 不实现 Label Studio ML Backend 或真实 AI 预标注模型。
- 不新增独立标注画布，不替代 Label Studio UI。
- 不实现复杂视频/CAD/三维专用标注能力；仅保证 F012 支持场景的 label config/task/result 映射。
- 不改变 F012 的 DAT-003/004/009/010 规则，不绕过审核、质量检查和数据集发布。
- 不做训练任务消费标注数据集的下游功能。

## Decision Boundaries

Codex 可自主决定：

- adapter 类拆分、配置属性命名、错误码/诊断码、状态枚举和数据库扩展字段。
- 是否新增 `annotation_external_task_binding` 或扩展 `annotation_work_item` 以保存 external task id。
- 使用 Spring Boot 4 自带 HTTP client / RestClient 的具体封装方式，不新增 SDK 依赖。
- 本地 sandbox token 注入方式、测试替身、mock server 或真实容器验证组合。
- 前端状态展示组件和 E2E mock/真实联通覆盖方式。

必须保留为待确认或配置项：

- `TODO_CONFIRM_LABEL_STUDIO_BASE_URL`
- `TODO_CONFIRM_LABEL_STUDIO_TOKEN_SECRET`
- `TODO_CONFIRM_LABEL_STUDIO_WORKSPACE_POLICY`
- `TODO_CONFIRM_LABEL_STUDIO_STORAGE_POLICY`
- `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`
- 生产网络、TLS、代理、证书和跨域策略。

## Constraints

- token/API key 只能通过 `secretRef` 或运行时环境注入；数据库、日志、API 响应、前端不得出现明文 token。
- 写操作必须进行 SMP 平台权限校验和 BU 隔离；Label Studio 调用不能扩大用户在 SMP 内的可见范围。
- 外部调用失败不得影响 F012 手工标注路径；应允许继续使用平台内人工提交/审核。
- 所有 Label Studio 同步、导入失败和跨 BU 拒绝必须写审计。
- 复用 F012 `AnnotationController` / `AnnotationService` / DTO / SQL 基座，避免平行实现第二套标注任务模型。

## Exception Scenarios

- Label Studio 未配置：返回 `UNCONFIGURED` 和 `TODO_CONFIRM_*`，不调用外部 API。
- token 缺失或 secretRef 解析失败：返回 `AUTH_UNCONFIGURED`，写审计。
- token 无效 / 401 / 403：返回 `AUTH_FAILED`，写审计，不保存成功状态。
- baseUrl 不可达或超时：返回 `CONFIGURED_BUT_UNREACHABLE` / `TIMEOUT`。
- label config 非法：阻断 project sync，返回 `LABEL_CONFIG_INVALID`。
- task payload 与 label config 不匹配：返回 `TASK_SYNC_FAILED`，保留可重试状态。
- Label Studio 结果为空、未完成或格式不可转换：返回 `IMPORT_NOT_READY` / `IMPORT_FORMAT_UNSUPPORTED`。
- 同步重复调用：应幂等复用 external project/task id，不重复创建不可控外部资源。
- 跨 BU 或无权限触发同步/导入：403 或不可见，并写审计。

## Testable Acceptance Criteria Draft

- AC-01：后端在本地配置 `LABEL_STUDIO_BASE_URL` 与 token secretRef 后，`sync-project` 能创建或复用 project，并持久化 external project id 与 launch URL。
- AC-02：`sync-task` 能把 SMP work item 转成 Label Studio task，保存 external task id，重复调用保持幂等。
- AC-03：`import-results` 能读取 Label Studio annotation 并回写 work item，随后沿用 F012 审核/质量检查/发布链路。
- AC-04：配置缺失、认证失败、网络失败、格式失败均返回可区分诊断码并写审计，不伪造成功。
- AC-05：token 不入库、不入响应、不入前端；仅保存 secretRef 或脱敏标识。
- AC-06：前端展示 Label Studio 已配置/已同步/失败诊断和打开入口，保留 `/ann`、`/annwork` 原型语义。
- AC-07：本地 Docker Label Studio sandbox 有可复现验证脚本或测试证据。
- AC-08：通过 `check-build-feature-prereqs`、后端测试、前端测试/E2E、`ai-scaffold gate`。

## Brownfield Evidence vs Inference

- Evidence: F012 已有 `LabelStudioAnnotationAdapter` 接口和未配置实现；`AnnotationController` 已暴露 status/sync-project/sync-task/import-results API；`annotation_external_binding` 已保存 provider/project/url/diagnostic；前端已展示 `UNCONFIGURED` Banner；本地 Compose 已加入 Label Studio。
- Inference: F013 可在不改变前端 IA 的前提下替换 adapter 实现并扩展持久化映射；生产 secret 管理可先按项目既有 `secretRef` 语义落地，不必引入外部 Vault SDK。

## Pressure-pass Findings

关键压力点是“生产化联通”不能把未配置或失败包装为成功。规划要求只有获得 Label Studio API 明确响应并持久化映射后才更新成功状态；其他情况一律返回失败诊断并写审计，同时保留 F012 平台内手工标注路径。
