---
feature: F015-local-dataset-upload
title: 本地图片上传创建数据集
plan_status: approved
approved_at: 2026-05-22
owner: codex
created_at: 2026-05-22
updated_at: 2026-05-22
---

# Plan: 本地图片上传创建数据集

## 1. 背景与目标

当前平台已经通过 F009 建立了数据源、数据集、版本、文件绑定和血缘的基础能力，但“新建数据集 / 上传向导”仍以“来源数据源”为主要入口。当前实现中，当租户下不存在 `ACTIVE + diagnosticCode=OK` 的可用数据源时，页面会呈现空白的来源数据源下拉，用户无法顺畅创建图片数据集。与此同时，业务文档已明确要求**支持本地数据集直接导入**，原型也已定义**数据集上传向导、文件拖拽和上传进度反馈**。

F015 的目标是在不破坏 F009/F012/F013/F014 既有链路的前提下，补齐“本地图片上传创建数据集”正式入口，使平台支持“数据源导入”和“本地上传图片”双路径创建，并保持平台作为数据、权限、版本、审计与血缘的唯一事实源。

- 业务来源：
  - `docs/business/bizdocs/01-业务场景清单.md`
  - `docs/business/bizdocs/02-01-业务流程-数据管理.md`
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md`
  - `docs/business/rules/01-数据管理规则.md`
  - `docs/business/问题记录.md`
- 原型来源：
  - `docs/prototype/SMP工业AI平台-原型v2.html`
  - `docs/prototype/SMP工业AI平台-原型v2-compiled.html`
  - 页面 key：`up`、`ds`、`dsdetail`、`ann`
- 规划证据：
  - `reports/planning/deep-interview.md`
  - `reports/planning/prd.md`
  - `reports/planning/test-spec.md`

## 2. Intent / Desired Outcome

### Intent

修复当前“创建数据集时数据源下拉为空白”的产品缺口，正式支持用户直接上传图片创建数据集，同时不把 Label Studio 变成平台外的主数据入口。

### Desired Outcome

F015 完成后，平台应具备：

1. 新建数据集时支持两条正式路径：`DATA_SOURCE_IMPORT` 与 `LOCAL_UPLOAD`。
2. 当不存在可用数据源时，页面显示明确空态并默认引导本地上传，而不是展示空白下拉框。
3. 用户可上传多张图片或 zip 包，系统生成 `RAW` 数据集、版本、文件对象绑定与 `LOCAL_UPLOAD` 血缘记录。
4. 上传过程展示阶段化进度：校验、上传、安全检测、索引/元数据、版本创建、完成。
5. 本地上传的数据进入平台版本治理，并在满足 DAT-002 / DAT-005 / DAT-009 / DAT-012 约束后，继续进入标注任务、Label Studio、训练格式导出链路。
6. 内容安全服务未配置、高风险内容、非法格式、跨 BU 访问、空会话提交等失败场景均有明确诊断与审计记录。

## 3. 范围

### In Scope

#### 3.1 创建方式双入口

- `DatasetUploadPage` 新增创建方式切换：
  - `DATA_SOURCE_IMPORT`
  - `LOCAL_UPLOAD`
- 有可用数据源时保留现有数据源导入路径。
- 无可用数据源时，默认引导本地上传图片。

#### 3.2 空态与引导优化

- 当数据源列表为空或没有 `ACTIVE + OK` 数据源时：
  - 不显示空白来源数据源下拉。
  - 展示空态说明：当前无可用数据源。
  - 提供 CTA：`直接上传图片`、`去创建数据源`。
- 文案需明确说明：本地上传创建的数据集后续同样可发起标注任务。

#### 3.3 本地上传会话（Upload Session）

- 新增 upload session 事实层，用于承载：
  - session 创建
  - 文件接收
  - 阶段进度
  - 失败诊断
  - commit 生命周期
- API 草案：
  - `POST /api/v1/dataset-upload-sessions`
  - `POST /api/v1/dataset-upload-sessions/{sessionId}/files`
  - `GET /api/v1/dataset-upload-sessions/{sessionId}`
  - `POST /api/v1/dataset-upload-sessions/{sessionId}/commit`

#### 3.4 文件对象与版本绑定

- 本地上传文件最终复用 `platform_file_object` 作为文件事实源。
- commit 后生成或确认：
  - `dataset`
  - `dataset_version`
  - `dataset_file`
  - `data_lineage(sourceType=LOCAL_UPLOAD)`
- `sourceId` 在本地上传模式下允许为空，但必须有可追溯 session / lineage 记录。

#### 3.5 上传类型与数据类型范围

- 本期只支持 `IMAGE` 数据集。
- 文件类型支持：常见图片格式与 zip 包。
- zip 解包后仍以图片集合为目标输入。

#### 3.6 内容安全前置

- 遵循 DAT-002：所有上传图片在进入可用数据集版本前必须经过内容安全检测。
- 高风险内容被拦截，不进入最终版本。
- 内容安全服务不可用时不得伪造成功，应进入 `SECURITY_PENDING` 或失败态。

#### 3.7 上传进度反馈

- 上传过程覆盖层显示阶段进度：
  1. 文件校验
  2. 文件上传
  3. 内容安全检测
  4. 元数据/索引
  5. 创建版本
  6. 完成跳转
- 文件列表展示名称、大小、状态、失败原因。

#### 3.8 后续标注链路兼容

- 本地上传生成的数据集达到可用状态后，需兼容：
  - F012 标注任务创建
  - F013 Label Studio 同步
  - F014 训练格式导出
- 不允许直接绕过平台 dataset/version 在 Label Studio 建立“平台外任务”。

#### 3.9 权限、审计与 BU 隔离

- 复用数据集创建/写权限、文件下载权限、租户上下文与审计底座。
- 上传 session、上传文件、commit、失败、内容安全拦截、跨 BU 拒绝必须写审计。
- DAT-012 继续约束 upload session 与最终数据集访问。

### Out of Scope / Non-goals

- 不直接在 Label Studio 上传图片并绕过平台数据集层。
- 不实现文本、结构化、CAD、3D、多模态等其他数据类型上传。
- 不实现超大文件断点续传、客户端切片、复杂压缩格式处理。
- 不实现已标注数据集导入解析与格式转换。
- 不实现训练任务创建、模型发布或对象存储生产优化。
- 不重做 F009/F012/F013/F014 的领域边界。

## 4. Decision Boundaries

Codex 可直接决定：

- `creationMode`、upload session 状态枚举、诊断码和 API 路径命名。
- 本地上传模式的前端交互形式、空态布局与文件列表展示。
- `LOCAL_UPLOAD` 血缘表示方式，例如 `sourceType=LOCAL_UPLOAD` + `sourceId=sessionId`。
- 图片/zip 上传的最小实现顺序和回归测试组织方式。

必须保留待确认：

- `TODO_CONFIRM_UPLOAD_MAX_FILES`
- `TODO_CONFIRM_UPLOAD_MAX_ZIP_SIZE_MB`
- `TODO_CONFIRM_IMAGE_FORMAT_ALLOWLIST`
- `TODO_CONFIRM_LOCAL_UPLOAD_OBJECT_KEY_STRATEGY`
- `TODO_CONFIRM_SECURITY_SCAN_SYNC_OR_ASYNC`
- 生产对象存储 bucket / TLS / KMS / 预签名 URL 细节

## 5. Exception Scenarios

- **无可用数据源**：显示空态与本地上传 CTA，而不是空白下拉。
- **非法格式文件**：文件被拒绝，返回格式不支持诊断，不生成绑定。
- **zip 中混入非法/损坏文件**：仅有效图片进入候选，其余记录失败原因。
- **内容安全高风险**：文件不进入最终版本，记录 `DATASET_SECURITY_BLOCKED`。
- **内容安全服务不可用**：不得伪造 READY/PUBLISHED，版本进入 `SECURITY_PENDING` 或失败。
- **空会话 commit**：拒绝提交，返回业务诊断。
- **跨 BU / 无权限访问 upload session**：返回 403/404，并写审计。
- **已发布版本后续修改**：继续遵守 DAT-005，通过新建版本而不是直接改已发布版本。

## Reuse Strategy

### Must Reuse

- F007：
  - `platform_file_object`
  - 文件 hash/size/object key seam
  - 下载 URL 与文件元数据基础能力
- F009：
  - `dataset`、`dataset_version`、`dataset_file`、`data_lineage`
  - 数据集上传向导页面骨架
  - 版本状态机与发布逻辑
- F012 / F013 / F014：
  - 数据集详情后续标注任务入口
  - Label Studio 联通链路
  - 训练格式导出链路
- F006：
  - 身份、权限、租户隔离、审计
- 现有前端基础：
  - `frontend/src/features/data/DataPages.tsx`
  - `frontend/src/features/platform/platformApi.ts`
  - TanStack Query / Ant Design 组件模式

### Duplication Rejected

- 不新增平行文件对象模型或“临时上传文件体系”。
- 不新增平台外的“直接标注上传入口”。
- 不复制 F009 的数据集、版本、血缘或发布逻辑。
- 不在前端伪造上传成功/版本成功。
- 不以 Label Studio 替代平台数据事实源。

### Approved New Seams

- `DatasetUploadSession`：当前 F009 只有“绑定已有 FileObject”的实现 seam，不能承载真实用户上传体验。
- `dataset_upload_session` / `dataset_upload_session_file`：用于跟踪上传进度、失败诊断与 commit 生命周期。
- upload session API：用于承载 multipart/zip 上传与进度轮询。

## 7. 交付方案

1. **契约设计**
   - 明确 upload session API、状态、错误码、审计事件、lineage 表示。
2. **测试设计**
   - 覆盖无数据源空态、本地上传成功、非法格式、安全拦截、commit、权限拒绝、数据源导入回归。
3. **实现**
   - 后端 upload session + FileObject/dataset 绑定
   - 前端双路径向导 + 进度覆盖层
4. **联调与 QA**
   - 校验 F009 原有数据源导入不回归
   - 校验后续标注入口兼容
5. **质量门禁**
   - ai-scaffold feature artifacts / build-feature prerequisites / lint / test / e2e / gate

## 8. 数据、权限与审计

- 领域对象：
  - `DatasetUploadSession`（新增）
  - `Dataset` / `DatasetVersion` / `DatasetFile` / `DataLineage`（复用）
  - `PlatformFileObject`（复用）
- MUST 规则：
  - DAT-002 内容安全前置
  - DAT-005 已发布版本不可变
  - DAT-009 标注任务仅可引用已激活数据集
  - DAT-012 BU 隔离
- 权限：
  - 复用 `data:dataset:write`、`data:dataset:read`、`platform:file:download` 等既有权限体系
- 审计事件建议：
  - `DATASET_UPLOAD_SESSION_CREATED`
  - `DATASET_UPLOAD_FILE_ACCEPTED`
  - `DATASET_UPLOAD_FILE_REJECTED`
  - `DATASET_UPLOAD_COMMITTED`
  - `DATASET_UPLOAD_FAILED`
  - `DATASET_SECURITY_BLOCKED`

## 9. 风险与未决问题

### Risks

- zip 解包与安全检测的边界复杂，可能带来较多异常路径。
- 内容安全服务不可用时，业务体验会受阻，需要明确 pending/fail 策略。
- 现有 F009 前端逻辑耦合在单页面内，局部改造需防回归。
- 上传量、大小阈值未冻结，可能影响最终体验和实现方式。

### Open Questions

- 是否首版就支持 zip，还是先做多图上传再补 zip。
- session commit 是同步创建版本还是异步创建版本。
- 高风险文件被拦截后，最终版本是否允许“部分成功”。
- 上传图片 object key 路径规范与保留期是否需要额外配置项。

## 10. 与后续 AC-xx / 测试追溯关系（草案）

- AC-01：无数据源时显示空态并提供本地上传入口。
- AC-02：支持本地上传图片/zip 并创建 upload session。
- AC-03：上传文件生成 FileObject 并绑定数据集版本。
- AC-04：内容安全失败文件不得进入最终可用版本。
- AC-05：上传成功后的数据集可在详情页查看并继续发起标注任务。
- AC-06：权限、跨 BU、失败路径均有审计和诊断。

## 11. 审批记录

- Reviewer:
- Decision:
