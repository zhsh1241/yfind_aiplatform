# Test Plan: F016 数据集生命周期管理增强

## 1. 测试范围与目标

- Feature：`F016-dataset-lifecycle-management`
- Contract version：`v1`（`docs/features/F016-dataset-lifecycle-management/contract.md`，状态：frozen）
- TASK：`docs/features/F016-dataset-lifecycle-management/TASK.md`
- Planning refs：
  - `docs/features/F016-dataset-lifecycle-management/plan.md`
  - `docs/features/F016-dataset-lifecycle-management/reports/planning/prd.md`
  - `docs/features/F016-dataset-lifecycle-management/reports/planning/test-spec.md`
- 复用测试基座：
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java`
  - `frontend/e2e/data-source-dataset-management.spec.ts`
  - `frontend/e2e/local-dataset-upload.spec.ts`

### 1.1 测试目标

验证 F016 在不新增平行数据模型的前提下，能够以 `dataset` / `dataset_version` / `dataset_file` / `platform_file_object` 为唯一事实源，完成以下正式生命周期能力：

1. 数据集元信息编辑
2. 多版本创建、切换、删除与当前版本回退
3. 当前版本追加文件、解绑文件
4. 数据集归档与管理员硬删除
5. 上传向导追加到既有版本
6. DAT-002 / DAT-005 / DAT-011 / DAT-012 规则、权限与审计闭环

### 1.2 测试策略

- **后端 TDD**：以 `DataManagementControllerTest` 为主集成测试落点，先写失败用例，再补 service/controller/repository 实现；必要时补充 service 级单测，但不得替代控制器级契约断言。
- **前端交互测试**：优先复用现有数据集管理与上传 E2E spec，验证页面信息架构、按钮显隐、错误反馈、版本上下文切换。
- **Playwright E2E**：覆盖真实用户主路径与关键负路径，确保列表、详情、上传向导、归档/删除入口串联一致。
- **回归测试**：确保 F009 数据集发布/引用/详情、F015 本地上传创建数据集、标注与下游入口能力不回退。

### 1.3 发布阻塞定义

以下任一失败均阻塞发布：

- 任一 P0 用例失败
- 任一 AC 未被测试覆盖
- 任一 MUST 规则（DAT-002 / DAT-005 / DAT-011 / DAT-012）缺少自动化验证
- 权限越权、跨 BU 泄露资源存在性、审计事件缺失或错误码与冻结 contract 不一致
- 上传追加误创建新数据集/新版本，或解绑/删版本误删 `platform_file_object`

## 2. 测试数据与角色准备

### 2.1 账号与权限

| 角色 | 建议账号 | 关键权限/用途 |
| --- | --- | --- |
| 超级管理员 | `admin` / tenant `YF` | 覆盖 `data:dataset:read/write/delete` + 硬删除 |
| 普通数据管理员 | `buadmin` / tenant `CABIN` | 可编辑、建版本、归档，不可硬删除 |
| 标注/普通用户 | `annotator` / tenant `CABIN` | 只读或受限访问验证 |
| 跨 BU 用户 | `qeuser` / tenant `QE` | 验证 DAT-012 返回 `404 RESOURCE_NOT_FOUND` |

### 2.2 数据集与版本样本

| 数据 | 建议 ID/名称 | 用途 |
| --- | --- | --- |
| 基线图片数据集 | `DATASET-WELD-DEFECT` | 复用 F009/F015 样本集，验证详情/版本/标注入口回归 |
| 首版本 | `DVER-WELD-001` / `v1` | 验证自动建首版本、复制来源、发布后不可变 |
| 新增版本 | `DVER-WELD-002` / `v2`、`DVER-WELD-003` / `v3` | 验证手动建版本、当前版本回退、版本删除 |
| 共享文件对象 | `FILE-DATASET-WELD-001`、`FILE-DATASET-WELD-002` | 验证复制绑定、解绑不删底层文件对象 |
| 上传会话 | `DUS-F016-APPEND-001` | 验证 `APPEND_VERSION` 模式 |
| 引用占用数据集 | `DATASET-REF-BLOCKED` | 验证 DAT-011 `DATASET_REFERENCED` |
| 安全待处理/阻断文件 | `FILE-UPLOAD-PENDING`、`FILE-UPLOAD-BLOCKED` | 验证 DAT-002 `DATASET_SECURITY_PENDING/BLOCKED` |

### 2.3 文件与状态组合

| 组合 | 用途 |
| --- | --- |
| `READY` 当前版本 + 可写 dataset | 主 happy path：建版本、追加、解绑、上传追加 |
| `PUBLISHED` 版本 | 验证 `DATASET_VERSION_IMMUTABLE` |
| `ARCHIVED` dataset | 验证 `DATASET_ARCHIVED_READONLY` 与硬删除前置 |
| 最后一个版本 | 验证 `DATASET_VERSION_LAST_ONE_FORBIDDEN` |
| 非当前版本 | 验证 `DATASET_TARGET_VERSION_NOT_CURRENT` |
| 被下游训练/模型引用的数据集/版本 | 验证 `DATASET_VERSION_REFERENCED` / `DATASET_REFERENCED` |

## 3. AC 覆盖矩阵

| AC | 需求摘要 | 优先级 | 后端 TDD 落点 | 前端 / Playwright 落点 |
| --- | --- | --- | --- | --- |
| AC-01 | 新建数据集自动创建 `v1`；列表显示版本数；详情支持版本切换 | P0 | `DataManagementControllerTest` 新增/扩展数据集创建、列表、详情断言 | `data-source-dataset-management.spec.ts` 扩展列表列与版本切换；必要时新增 `dataset-lifecycle-management.spec.ts` |
| AC-02 | 编辑数据集仅修改元信息 | P1 | `PUT /api/v1/datasets/{datasetId}` 契约断言 | `dataset-lifecycle-management.spec.ts` 编辑弹窗/保存后详情断言 |
| AC-03 | 手动创建新版本默认复制上一版本文件集合并保留追溯 | P0 | `POST /datasets/{id}/versions` + `sourceVersionId` + 复制绑定断言 | `dataset-lifecycle-management.spec.ts` 新建版本弹窗与详情更新 |
| AC-04 | 当前版本允许追加/解绑，且只影响当前版本，不删底层文件对象 | P0 | `POST/DELETE /versions/{versionId}/files*` 断言 | `dataset-lifecycle-management.spec.ts` 或 `local-dataset-upload.spec.ts` |
| AC-05 | 已发布/锁定版本不可删；最后一个版本不可删；错误明确 | P0 | 删除/追加/解绑负例，校验 `409` 业务码 | 前端错误提示、按钮禁用/隐藏 |
| AC-06 | 普通用户可归档；仅管理员可硬删除；删除前引用检查与审计 | P0 | `POST /archive`、`DELETE /datasets/{id}` 正负例 | `data-source-dataset-management.spec.ts` 管理入口显隐；可补 `dataset-lifecycle-management.spec.ts` |
| AC-07 | 上传向导支持追加到既有版本，并与详情视图一致 | P0 | `POST /dataset-upload-sessions` + `commit` append 模式断言 | `local-dataset-upload.spec.ts` 扩展 append flow |
| AC-08 | 权限、跨 BU、内容安全、审计有证据覆盖 | P0 | DAT-002/DAT-005/DAT-011/DAT-012、审计查询 | 前端仅验证用户可见反馈，不替代后端规则测试 |

## 4. P0 - Blocking 用例矩阵

| ID | AC | 类型 | 场景 | 关键测试数据 | 核心验证点 | 推荐测试落点 | 阻塞发布 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F016-P0-01 | AC-01 | Backend TDD | 新建数据集自动生成 `v1` | 新建 `RAW/IMAGE` dataset | `currentVersionName=v1`、`versionCount=1`、详情 `selectedVersion=currentVersion`、版本号不再出现 `v0.1.0` | `DataManagementControllerTest` | 是 |
| F016-P0-02 | AC-01 | Frontend + E2E | 数据集列表显示版本数，详情可切换版本视图 | `DATASET-WELD-DEFECT` 含 `v1/v2` | 列表展示 `versionCount`；切换 `versionId` 后 `files` 仅显示所选版本；默认展示 `currentVersionId` | `frontend/e2e/data-source-dataset-management.spec.ts`，必要时新增 `frontend/e2e/dataset-lifecycle-management.spec.ts` | 是 |
| F016-P0-03 | AC-03 | Backend TDD | 手动创建新版本默认复制上一版本文件绑定 | `DVER-WELD-001 -> v2` | `POST /api/v1/datasets/{datasetId}/versions` 成功；`sourceVersionId` 正确；新版本文件数=来源版本；仅复制 `dataset_file` 绑定，不复制 `platform_file_object` 实体 | `DataManagementControllerTest` | 是 |
| F016-P0-04 | AC-04 | Backend TDD | 当前版本追加文件仅影响当前版本 | `currentVersion=v2`，追加 `FILE-DATASET-WELD-002` | `POST /versions/{versionId}/files` 成功；`fileCount/recordCount/sizeBytes` 更新；旧版本文件集合不变；审计 `DATASET_FILE_ATTACHED` | `DataManagementControllerTest` | 是 |
| F016-P0-05 | AC-04 | Backend TDD | 当前版本解绑文件不删除底层文件对象 | `bindingId=DF-001`，文件同时被 `v1/v2` 绑定 | `DELETE /versions/{versionId}/files/{bindingId}` 后仅当前版本解绑；其他版本仍可见该 `fileId`；`platform_file_object` 仍存在；lineage 不被清空 | `DataManagementControllerTest` | 是 |
| F016-P0-06 | AC-05 | Backend TDD | 已发布版本/归档版本不可追加、解绑、删除 | `versionStatus=PUBLISHED/ARCHIVED` | 返回 `409 DATASET_VERSION_IMMUTABLE`；审计 reject 事件；前端不应允许误操作 | `DataManagementControllerTest` + 前端交互断言 | 是 |
| F016-P0-07 | AC-05 | Backend TDD | 最后一个版本不可删除；非当前版本不可追加/解绑 | 单版本 dataset；历史版本 `v1` 非当前 | 删除最后版本返回 `409 DATASET_VERSION_LAST_ONE_FORBIDDEN`；向非当前版本写入返回 `409 DATASET_TARGET_VERSION_NOT_CURRENT` | `DataManagementControllerTest` | 是 |
| F016-P0-08 | AC-06 | Backend TDD | 普通管理员可归档，归档后所有写操作只读 | `ACTIVE` dataset | `POST /archive` 成功后 `dataset.status=ARCHIVED`；后续编辑/建版本/追加/解绑/上传追加均返回 `409 DATASET_ARCHIVED_READONLY` | `DataManagementControllerTest` | 是 |
| F016-P0-09 | AC-06 | Backend TDD | 仅超级管理员可硬删除，且必须先归档并通过 DAT-011 引用检查 | `DATASET-REF-BLOCKED` 与已归档 dataset 各一份 | 非管理员返回 `403 FORBIDDEN` 或诊断 `DATASET_HARD_DELETE_ADMIN_ONLY`；未归档返回 `409 DATASET_NOT_ARCHIVED_FOR_HARD_DELETE`；有引用返回 `409 DATASET_REFERENCED`；成功后 `GET` 返回 `404`；写入 `DATASET_HARD_DELETED/HARD_DELETE_REJECTED` | `DataManagementControllerTest` | 是 |
| F016-P0-10 | AC-07 | Backend TDD | 上传会话 `APPEND_VERSION` 模式只向既有版本追加，不创建新 dataset/version | `DUS-F016-APPEND-001`，目标 `datasetId + currentVersionId` | `POST /dataset-upload-sessions` 返回 `targetAction=APPEND_VERSION`；`commit` 后 `datasetId/versionId` 指向原目标；`diagnosticCode=DATASET_UPLOAD_APPEND_READY`；`versionStatus=SECURITY_PENDING`；无新增 dataset/version | `DataManagementControllerTest` | 是 |
| F016-P0-11 | AC-07 | Playwright E2E | 上传向导追加到既有版本后，详情页仍落在目标版本且文件数增长 | 目标当前版本 `v2`，上传 1~2 张图片 | 向导可选 `APPEND_VERSION`；commit 后返回详情；目标版本文件列表出现新文件；未生成影子数据集；标记安全待处理文案正确 | `frontend/e2e/local-dataset-upload.spec.ts` | 是 |
| F016-P0-12 | AC-08 | Backend TDD | DAT-002 内容安全 pending / blocked 场景不可伪造通过 | `FILE-UPLOAD-PENDING`、`FILE-UPLOAD-BLOCKED` | 返回 `422 DATASET_SECURITY_PENDING` / `422 DATASET_SECURITY_BLOCKED`；`versionStatus` 不得被写成 `READY/PUBLISHED`；审计 reject 事件存在 | `DataManagementControllerTest` | 是 |
| F016-P0-13 | AC-08 | Backend TDD | DAT-012 跨 BU 隔离：读写均不暴露资源存在性 | `qeuser` 访问 `CABIN` dataset/version/session | `GET/PUT/POST/DELETE` 统一返回 `404 RESOURCE_NOT_FOUND`；无资源存在性泄露 | `DataManagementControllerTest` | 是 |
| F016-P0-14 | AC-08 | Backend TDD | 审计事件与 contract 一致 | 更新、建版本、删版本、追加、解绑、归档、硬删除、上传 append | `platform_audit_log` 至少写入 action/resourceId/result/detailJson/traceId；事件名与 contract 逐项匹配 | `DataManagementControllerTest` | 是 |

## 5. P1 - Important 用例矩阵

| ID | AC | 类型 | 场景 | 关键测试数据 | 核心验证点 | 推荐测试落点 |
| --- | --- | --- | --- | --- | --- | --- |
| F016-P1-01 | AC-02 | Backend TDD | 编辑数据集仅修改元信息 | `name/accessLevel/tags/description` 变更 | `PUT /api/v1/datasets/{datasetId}` 后 `versions/files/currentVersionId` 不变；`DATASET_UPDATED` 审计带修改字段摘要 | `DataManagementControllerTest` |
| F016-P1-02 | AC-02 | Frontend + E2E | 编辑数据集弹窗与版本内容编辑严格分离 | `DATASET-WELD-DEFECT` | 页面只允许修改元信息字段；不出现文件集合编辑副作用；成功后详情刷新 | 建议新增 `frontend/e2e/dataset-lifecycle-management.spec.ts` |
| F016-P1-03 | AC-03/05 | Backend TDD | 删除当前版本后 `currentVersionId` 回退到 `sourceVersionId`；若来源不存在则回退到最近版本 | `v1 -> v2 -> v3` | 删除 `v3` 后当前版本回到 `v2`；再删当前版本时按 contract 规则选择剩余最近版本 | `DataManagementControllerTest` |
| F016-P1-04 | AC-03 | Frontend + E2E | 新建版本弹窗默认建议 `v{N+1}` 且默认勾选复制来源文件 | 当前版本 `v2` | UI 默认值正确；创建后版本列表新增 `v3`；详情默认切到新 current version | 建议新增 `frontend/e2e/dataset-lifecycle-management.spec.ts` |
| F016-P1-05 | AC-05 | Backend TDD | 待删版本被后续训练/模型/lineage 引用时禁止删除 | `DVER-WELD-002` 被下游引用 | 返回 `409 DATASET_VERSION_REFERENCED`；审计 `DATASET_VERSION_DELETE_REJECTED` | `DataManagementControllerTest` |
| F016-P1-06 | AC-06 | Frontend + E2E | 归档与硬删除入口分层正确 | 管理员 vs 非管理员 | 普通数据管理员仅见“归档”；超级管理员额外见“彻底删除”；文案明确不可恢复 | `frontend/e2e/data-source-dataset-management.spec.ts` 或新 spec |
| F016-P1-07 | AC-07 | Backend TDD | 上传会话非法场景：重复提交、空会话、目标版本不是当前版本 | `DUS-F016-APPEND-001` 多状态组合 | 返回 `409 DATASET_UPLOAD_DUPLICATE_COMMIT`、`422 DATASET_UPLOAD_EMPTY_SESSION`、`409 DATASET_TARGET_VERSION_NOT_CURRENT` / `DATASET_UPLOAD_TARGET_VERSION_NOT_CURRENT` | `DataManagementControllerTest` |
| F016-P1-08 | AC-08 | Backend TDD | 文件完整性校验失败时拒绝追加 | `fileId` 摘要不匹配 | 返回 `422 DATASET_FILE_HASH_MISMATCH`，无绑定落库，无伪审计成功事件 | `DataManagementControllerTest` |

## 6. P2 - Nice to Have 用例矩阵

| ID | AC | 类型 | 场景 | 关键测试数据 | 核心验证点 | 推荐测试落点 |
| --- | --- | --- | --- | --- | --- | --- |
| F016-P2-01 | AC-01 | Backend TDD | `GET /datasets/{datasetId}?versionId=` 指向非法版本或非归属版本 | 非本数据集 `versionId` | 返回 `404 RESOURCE_NOT_FOUND` | `DataManagementControllerTest` |
| F016-P2-02 | AC-03 | Backend TDD | 手工指定 `versionName` 时同 dataset 内必须唯一 | 重复 `v2` | 参数合法但业务冲突时返回 `400 INVALID_PARAM` 或实现约定错误；不得创建重复版本号 | `DataManagementControllerTest` |
| F016-P2-03 | AC-04 | Frontend + E2E | 历史版本只读查看体验 | `selectedVersion=v1`，`currentVersion=v3` | 页面展示历史版本文件与诊断信息，但不展示追加/解绑 CTA | 建议新增 `frontend/e2e/dataset-lifecycle-management.spec.ts` |
| F016-P2-04 | AC-06 | Frontend + E2E | 归档后的详情仍可只读查看血缘、审计、权限 | `ARCHIVED` dataset | 详情页仍可打开；只读提示明确；无写操作按钮 | `frontend/e2e/data-source-dataset-management.spec.ts` 或新 spec |
| F016-P2-05 | AC-08 | Backend TDD | `hardDeletable` 聚合字段与真实前置条件一致 | 已归档/未归档/有引用/无引用 | 列表与详情 `hardDeletable` 仅在超级管理员+已归档+无引用时为 `true` | `DataManagementControllerTest` |

## 7. 权限 / 审计 / MUST 规则专项验证

### 7.1 权限矩阵

| 操作 | 预期 |
| --- | --- |
| `GET /api/v1/datasets`、`GET /api/v1/datasets/{datasetId}` | 仅 `data:dataset:read` 且同 BU/已授权可见 |
| `PUT /api/v1/datasets/{datasetId}`、`POST /versions`、`POST/DELETE files` | 必须具备 `data:dataset:write` |
| `POST /api/v1/datasets/{datasetId}/archive` | 必须具备 `data:dataset:delete` |
| `DELETE /api/v1/datasets/{datasetId}` | `data:dataset:delete` + 超级管理员 |
| `POST /api/v1/dataset-upload-sessions` / `commit` | `data:dataset:write`；append 模式还需能写目标版本 |

### 7.2 审计事件最小覆盖

以下事件至少各有 1 个成功或失败自动化断言：

- `DATASET_UPDATED`
- `DATASET_UPDATE_REJECTED`
- `DATASET_VERSION_CREATED`
- `DATASET_VERSION_DELETED`
- `DATASET_VERSION_DELETE_REJECTED`
- `DATASET_FILE_ATTACHED`
- `DATASET_FILE_ATTACH_REJECTED`
- `DATASET_FILE_UNBOUND`
- `DATASET_FILE_UNBIND_REJECTED`
- `DATASET_ARCHIVED`
- `DATASET_ARCHIVE_REJECTED`
- `DATASET_HARD_DELETED`
- `DATASET_HARD_DELETE_REJECTED`
- `DATASET_UPLOAD_SESSION_CREATED`
- `DATASET_UPLOAD_APPEND_COMMITTED`
- `DATASET_UPLOAD_FAILED`

### 7.3 MUST 规则映射

| 规则 | 必测场景 | 预期 |
| --- | --- | --- |
| DAT-002 | 追加文件/上传追加后安全未完成或高风险 | 返回 `422 DATASET_SECURITY_PENDING/BLOCKED`，版本不得伪造为 `READY/PUBLISHED` |
| DAT-005 | `PUBLISHED` 版本追加、解绑、删除 | 返回 `409 DATASET_VERSION_IMMUTABLE` |
| DAT-011 | 硬删除前存在训练/模型/lineage 引用 | 返回 `409 DATASET_REFERENCED` |
| DAT-012 | 跨 BU 读写、上传追加、删除 | 返回 `404 RESOURCE_NOT_FOUND`，不泄露存在性 |

## 8. 回归范围

### 8.1 必跑回归

1. **F009 数据源与数据集管理基础能力**
   - 数据集列表/详情仍可打开
   - `POST /api/v1/datasets/{datasetId}/versions/{versionId}/publish` 既有发布流程未回退
   - `GET /api/v1/dataset-references` 引用查询仍可用
2. **F015 本地图片上传**
   - 新建数据集上传流程仍可成功创建 dataset + `v1`
   - 上传完成后详情页、预览状态、标注入口行为不回退
3. **下游入口回归**
   - 数据集详情页继续可进入标注任务/导出等既有入口
   - 版本增强不应破坏已有 `lineage` 展示

### 8.2 推荐执行命令

```powershell
mvn -q -f backend/pom.xml -pl smp-app test -Dtest=DataManagementControllerTest
npm --prefix frontend run test:e2e -- data-source-dataset-management.spec.ts
npm --prefix frontend run test:e2e -- local-dataset-upload.spec.ts
# 若拆新 spec
npm --prefix frontend run test:e2e -- dataset-lifecycle-management.spec.ts
```

## 9. 交付与阶段 handoff

### 9.1 后端实现 handoff

1. 先补 `DataManagementControllerTest` 的 P0 失败用例，再实现 controller/service；禁止先写实现后补测试。
2. 版本删除、解绑文件、上传 append commit 必须验证“只删绑定不删 `platform_file_object`”。
3. 错误码、diagnosticCode、审计事件名必须逐项对齐 frozen contract，不能沿用旧 F009 `v0.1.0` 或模糊错误文案。
4. `DELETE /api/v1/datasets/{datasetId}` 必须严格执行“已归档 + 超级管理员 + DAT-011 引用检查”三重门禁。
5. `GET /datasets/{id}?versionId=` 的返回 `files` 只能是所选版本视图，避免继续返回全量混合文件。

### 9.2 前端实现 handoff

1. 明确区分“当前查看版本”和“当前版本”；只有两者一致且 `mutable=true` 才允许显示追加/解绑/上传追加 CTA。
2. 编辑数据集弹窗只能修改 `name/accessLevel/tags/description`，不能隐式改版本或文件集合。
3. 上传向导 `APPEND_VERSION` 模式提交后必须回到目标数据集详情，且落在目标版本，不得生成影子数据集。
4. 归档与硬删除必须使用不同入口与确认文案；管理员权限显隐不能只靠前端静态判断，需兼容后端 reject 提示。
5. 若现有 `data-source-dataset-management.spec.ts` / `local-dataset-upload.spec.ts` 过重，优先新增 `frontend/e2e/dataset-lifecycle-management.spec.ts` 承接 F016 专项场景。

## 10. Traceability

- AC-01 -> `F016-P0-01`, `F016-P0-02`, `F016-P2-01`
- AC-02 -> `F016-P1-01`, `F016-P1-02`
- AC-03 -> `F016-P0-03`, `F016-P1-03`, `F016-P1-04`, `F016-P2-02`
- AC-04 -> `F016-P0-04`, `F016-P0-05`, `F016-P2-03`
- AC-05 -> `F016-P0-06`, `F016-P0-07`, `F016-P1-05`
- AC-06 -> `F016-P0-08`, `F016-P0-09`, `F016-P1-06`, `F016-P2-04`, `F016-P2-05`
- AC-07 -> `F016-P0-10`, `F016-P0-11`, `F016-P1-07`
- AC-08 -> `F016-P0-12`, `F016-P0-13`, `F016-P0-14`, `F016-P1-08`
