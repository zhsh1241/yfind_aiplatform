> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-local-dataset-upload.md`

# RALPLAN PRD: 本地图片上传创建数据集

## 1. RALPLAN-DR Summary

### Principles

1. **Dataset-first, not Label-Studio-first**：上传图片先进入平台数据集/版本，再进入标注链路。
2. **Dual-entry creation**：数据源导入与本地上传是并列正式入口，不再把数据源作为唯一入口。
3. **FileObject reuse**：上传文件最终仍沉淀为 `platform_file_object`，不新增平行文件事实源。
4. **Security before activation**：内容安全检测是上传数据进入可用版本前的强制前置步骤。
5. **Minimal additive seam**：通过 upload session 补齐上传体验，尽量不推翻 F009/F007/F014 已有模型。

### Decision Drivers

1. 用户在创建数据集时看到“数据源为空白”，实际阻断业务流程。
2. 业务文档已明确支持本地数据集直接导入，原型已定义上传向导和进度反馈。
3. 平台必须保留版本、权限、审计、血缘和后续标注/导出链路。

### Viable Options

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| A. 在现有 F009 上传向导内增加 `LOCAL_UPLOAD` 模式和 upload session | 最大化复用现有 dataset/version/file seam；改动可控 | 需新增 upload session API 与状态管理 | **Chosen** |
| B. 直接在 Label Studio 上传图片并事后回补平台数据集 | 用户感知简单 | 破坏平台数据事实源、版本、审计、权限闭环 | Rejected |
| C. 保持现状，仅把空白 Select 改提示文案 | 成本最低 | 仍无法真正上传图片建集，不满足业务目标 | Rejected |

## 2. Product Scope

### Personas

- 数据标注工程师：快速上传现场图片并开始后续标注流程。
- 数据管理员 / BU 管理员：管理数据集、权限、内容安全与审计。
- 模型训练工程师：后续消费由上传生成的数据集与标注产物。

### User Stories

1. 作为数据标注工程师，我希望没有可用数据源时也能直接上传图片创建数据集，避免流程中断。
2. 作为数据管理员，我希望本地上传后的数据仍然遵循平台版本、权限、审计和血缘规则。
3. 作为平台管理员，我希望上传数据在进入可用版本前完成内容安全检测，并保留失败处置证据。

## 3. Functional Requirements

### FR-01 创建方式双入口

- `DatasetUploadPage` 第一步新增创建方式：
  - `DATA_SOURCE_IMPORT`
  - `LOCAL_UPLOAD`
- 有可用数据源时默认可选数据源导入；无可用数据源时默认引导本地上传。
- 数据源导入模式保留现有 sourceId 逻辑；本地上传模式不展示 sourceId 下拉。

### FR-02 空态与引导

- 当 `sources.data` 为空或无 `ACTIVE + OK` 数据源时：
  - 不显示空白 Select；
  - 显示“当前无可用数据源”空态；
  - 提供 CTA：`直接上传图片`、`去创建数据源`。
- 空态说明需明确：本地上传后同样可创建标注任务。

### FR-03 Upload Session

- 新增 upload session 概念，建议 API：
  - `POST /api/v1/dataset-upload-sessions`
  - `POST /api/v1/dataset-upload-sessions/{sessionId}/files`
  - `GET /api/v1/dataset-upload-sessions/{sessionId}`
  - `POST /api/v1/dataset-upload-sessions/{sessionId}/commit`
- session 负责：
  - 接收 dataset metadata 与 `creationMode=LOCAL_UPLOAD`
  - 接收图片/zip 文件
  - 跟踪阶段进度与失败原因
  - 在 commit 时生成/确认 dataset/version/file bindings

### FR-04 文件与版本绑定

- 本地上传模式下，系统自动将上传文件转为 `platform_file_object`。
- commit 后生成：
  - `dataset`
  - `dataset_version`
  - `dataset_file`
  - `data_lineage(sourceType=LOCAL_UPLOAD)`
- 上传 session 与 dataset/version 必须具备 tenantId、operatorId、audit trace。

### FR-05 内容安全与状态机

- 上传完成后进入内容安全检测。
- 结果处理：
  - 安全/低风险：允许继续进入 READY/可发布流程
  - 高风险：文件被拦截，不进入最终版本
  - 服务不可用：不得假成功，版本进入 `SECURITY_PENDING` 或提交失败
- 与 F009 状态机保持一致：`DRAFT`、`SECURITY_PENDING`、`READY`、`PUBLISHED`。

### FR-06 前端进度反馈

- 上传过程覆盖层需展示阶段性进度：
  1. 文件校验
  2. 文件上传
  3. 内容安全检测
  4. 元数据/索引
  5. 创建版本
  6. 完成跳转
- Step 2 需展示文件列表、状态、大小、失败原因。

### FR-07 后续标注链路兼容

- 上传生成的数据集在达到 ACTIVE/可用后，应可继续：
  - 从数据集详情创建标注任务（F012/F014）
  - 进入 Label Studio 同步链路（F013）
  - 进入训练格式导出链路（F014）
- 不允许创建“平台外”临时任务绕过 dataset/version。

### FR-08 权限与审计

- 上传 session 创建、文件接收、commit、失败、拦截、跨 BU 拒绝都必须写审计。
- 复用现有数据集写权限、文件下载权限和租户隔离。
- 新增/扩展审计事件建议：
  - `DATASET_UPLOAD_SESSION_CREATED`
  - `DATASET_UPLOAD_FILE_ACCEPTED`
  - `DATASET_UPLOAD_FILE_REJECTED`
  - `DATASET_UPLOAD_COMMITTED`
  - `DATASET_UPLOAD_FAILED`
  - `DATASET_SECURITY_BLOCKED`

## 4. Data / API Design

### New table suggestion

```sql
CREATE TABLE dataset_upload_session (
  session_id VARCHAR(96) PRIMARY KEY,
  dataset_id VARCHAR(96),
  version_id VARCHAR(96),
  tenant_id VARCHAR(64) NOT NULL REFERENCES platform_tenant(id),
  project_id VARCHAR(64) REFERENCES platform_tenant(id),
  creation_mode VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  total_files INT NOT NULL DEFAULT 0,
  accepted_files INT NOT NULL DEFAULT 0,
  rejected_files INT NOT NULL DEFAULT 0,
  diagnostic_code VARCHAR(96),
  diagnostic_message VARCHAR(1000),
  created_by VARCHAR(64) NOT NULL REFERENCES platform_user(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  committed_at TIMESTAMP WITH TIME ZONE
);
```

Optional child table:

```sql
CREATE TABLE dataset_upload_session_file (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(96) NOT NULL REFERENCES dataset_upload_session(session_id),
  file_name VARCHAR(255) NOT NULL,
  file_id VARCHAR(96),
  status VARCHAR(32) NOT NULL,
  size_bytes BIGINT,
  diagnostic_code VARCHAR(96),
  diagnostic_message VARCHAR(1000)
);
```

### DTO sketch

```json
{
  "sessionId": "DUS-001",
  "datasetId": "DATASET-WELD-UPLOAD-001",
  "versionId": "DVER-WELD-UPLOAD-001",
  "status": "PROCESSING",
  "progress": {
    "phase": "SECURITY_SCAN",
    "percent": 64
  },
  "summary": {
    "totalFiles": 30,
    "acceptedFiles": 28,
    "rejectedFiles": 2
  }
}
```

## 5. Frontend UX Requirements

- `DatasetUploadPage`：
  - Step 1：增加创建方式切换；sourceId 仅在数据源模式显示。
  - Step 2：本地上传模式显示 Upload/Dragger、文件列表、状态与失败原因。
  - Step 3：显示样本统计、大小、异常数、版本确认。
  - Progress Overlay：分阶段进度与成功跳转。
- `DatasetManagementPage`：保持“上传”入口语义不变，但落到双路径向导。
- `DatasetDetailPage`：无需大改，但要兼容本地上传创建的数据集文件预览与后续标注入口。

## 6. Non-functional Requirements

- 安全：上传文件必须经内容安全检测；不得暴露真实对象存储路径。
- 可观测：session 状态、失败原因、审计、诊断码可查询。
- 可扩展：未来可扩展到影音、文件夹上传、断点续传，但本期不强依赖。
- 性能：MVP 支持常规图片/zip；超限策略保留配置项与明确诊断。

## 7. Reuse Strategy

### Must Reuse

- F007 `platform_file_object`、文件 hash/size/object key seam。
- F009 dataset / dataset_version / dataset_file / data_lineage / publish state machine。
- F012/F014 数据集详情与标注任务入口。
- F006 权限、租户、审计底座。
- 前端现有 `platformApi.ts`、TanStack Query、Ant Design。

### Explicitly forbidden duplication

- 不新增平行文件对象模型。
- 不复制一个“上传后临时数据集”体系。
- 不把 Label Studio 当作主数据入口。
- 不在前端直接伪造 upload success / publish success。

### New seams justified

- `DatasetUploadSession`：现有 F009 只有“选择已有 FileObject 绑定” seam，不足以承载真实用户上传体验。
- `dataset_upload_session(_file)`：需要阶段进度、失败诊断和 commit 生命周期记录。

## 8. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| zip 解包与安全扫描复杂 | 失败率高、实现边界模糊 | MVP 仅支持常见图片/zip，失败给出明确诊断；复杂压缩格式延后。 |
| 内容安全服务不可用 | 上传链路阻断 | 明确进入 `SECURITY_PENDING` 或失败，不伪造成功。 |
| 现有 F009 页面逻辑耦合高 | 前端改动容易回归 | 通过 creationMode 分支最小侵入修改，并保留数据源导入路径回归测试。 |
| 上传量过大 | 性能与存储压力 | 上传大小/文件数阈值保留配置项，超限明确拒绝。 |
| 血缘表达不清 | 后续追溯困难 | 固定 `sourceType=LOCAL_UPLOAD` 与 sessionId/source metadata。 |

## 9. Architect Review

- 该方案是对 F009 的自然补完，而不是新建独立上传子系统。
- 最重要的架构边界是“先平台数据集，后 Label Studio”，必须在 plan / contract / implementation 中持续保持。
- 建议优先实现图片多文件上传，再补 zip 解包；但 contract 可先同时预留二者能力。
