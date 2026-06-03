# Test Plan: F019 模型中心与模型版本基础

## 1. 测试范围与目标

- Feature：`F019-model-registry-foundation`
- Contract version：`v1`（`docs/features/F019-model-registry-foundation/contract.md`，状态：frozen）
- TASK：`TASK-model-registry-foundation`
- Planning refs：
  - `docs/features/F019-model-registry-foundation/plan.md`
  - `docs/features/F019-model-registry-foundation/TASK.md`
  - `docs/features/F019-model-registry-foundation/reports/planning/prd.md`
  - `docs/features/F019-model-registry-foundation/reports/planning/test-spec.md`
- Business refs：
  - `docs/business/bizdocs/02-02-业务流程-模型开发与训练.md`
  - `docs/business/bizdocs/03-02-系统功能-模型开发.md`
  - `docs/business/domain/02-领域对象-模型域.md`
  - `docs/business/rules/02-模型开发规则.md`
  - `docs/business/api/01-API接口规范.md`
- Prototype refs：
  - `docs/prototype/SMP工业AI平台-原型v2.html` page key `hub`、`train`、`exp`、`eval`
  - `docs/prototype/screen-hub.png`
  - `docs/prototype/screen-train.png`
  - `docs/prototype/screen-exp.png`
  - `docs/prototype/screen-eval.png`

### 1.1 测试目标

验证 F019 在复用 `platform_file_object`、统一权限与审计基座的前提下，能够为模型域建立单一模型注册中心事实源，并完成以下能力：

1. 模型中心列表、详情、搜索、筛选和分页。
2. 模型创建、元数据维护和 scope 管理。
3. 模型版本创建、文件对象绑定、版本历史和当前版本展示。
4. 模型版本状态机 `DEVELOPMENT -> TESTING -> PRODUCTION -> DEPRECATED`。
5. `MDL-003`、`MDL-004`、`MDL-006`、`MDL-009` 规则门禁。
6. 跨 BU 访问申请/审批、预训练模型选择器和下载审计闭环。
7. 前端页面与 E2E 主链路符合原型信息架构且不保留原型说明性元素。

### 1.2 测试策略

- **后端 TDD**：以模型中心 controller/service 集成测试为主，先写失败用例，覆盖契约、错误码、权限、审计和 MUST 规则；必要时补充 service 单测，但不能替代 API 契约断言。
- **前端交互测试**：使用 Vitest + React Testing Library 验证模型中心列表、详情、表单校验、状态操作、访问申请与 `ModelSelector` 组件行为。
- **Playwright E2E**：覆盖模型创建、版本创建、合法流转、跨 BU 申请、下载 URL 和预训练模型选择主路径，并验证关键负路径反馈。
- **回归测试**：确保现有平台 shell、统一 envelope、RBAC、对象存储、审计能力不被模型注册中心接入破坏。

### 1.3 发布阻塞定义

以下任一失败均阻塞发布：

- 任一 P0 用例失败。
- 任一 AC-01 ~ AC-13 未被自动化测试覆盖。
- 任一 MUST 规则（`MDL-003` / `MDL-004` / `MDL-006` / `MDL-009`）缺少自动化验证。
- 存在跨 BU 资源可见性泄露、越权下载、非法状态流转或未评估发布。
- 模型版本绕开 `platform_file_object`、下载接口泄露 MinIO 凭据、或关键审计事件缺失。

## 2. 测试数据与角色准备

### 2.1 账号与权限

| 角色 | 建议账号 | 关键权限/用途 |
| --- | --- | --- |
| 超级管理员 | `admin` / tenant `YF` | 覆盖 `model:model:*`、`model:version:*`、审批、下载、导入外部评估证明 |
| BU 管理员 | `buadmin-cabin` / tenant `CABIN` | 创建模型、创建版本、审批本 BU owner 模型的跨 BU 访问 |
| 模型 owner / 训练工程师 | `trainer-cabin` / tenant `CABIN` | 创建/维护模型、版本、状态流转、下载、发起 scope 变更 |
| 同 BU 普通用户 | `analyst-cabin` / tenant `CABIN` | 验证 BU 内只读/可用模型与预训练选择 |
| 跨 BU 用户 | `trainer-qe` / tenant `QE` | 验证 MDL-004 跨 BU 阻断、申请、审批后访问 |
| 未授权用户 | `viewer-qe` / tenant `QE` | 验证 403/404 与资源存在性不泄露 |

### 2.2 模型与版本样本

| 数据 | 建议 ID/名称 | 用途 |
| --- | --- | --- |
| 平台内置预训练模型 | `MODEL-YOLO-PLT-001` | 验证 `PLATFORM` scope、选择器展示、下载 |
| BU 模型 | `MODEL-WELD-CABIN-001` | 验证 CABIN BU owner 模型的创建、详情、版本历史 |
| 私有模型 | `MODEL-PRIVATE-CABIN-001` | 验证 `PRIVATE` scope 仅 owner 可见 |
| 首版本 | `MVER-WELD-001-V1` / `v1.0` | 验证版本创建、文件绑定、当前版本 |
| 测试版本 | `MVER-WELD-001-V2` / `v2.0` | 验证状态流转、删除、历史展示 |
| 活跃引用版本 | `MVER-INUSE-001-V1` | 验证 MDL-003 删除阻断 |
| 外部评估证明版本 | `MVER-PROOF-001-V1` | 验证管理员导入 `IMPORTED_PROOF` 后发布 |
| 已废弃版本 | `MVER-DEPRECATED-001-V3` | 验证选择器过滤和状态只读 |

### 2.3 文件对象与状态组合

| 组合 | 用途 |
| --- | --- |
| `platform_file_object` `.onnx` / 100MB | 正常模型版本创建 happy path |
| `platform_file_object` `.pt` / 2GB | 验证边界大小允许 |
| `platform_file_object` `.zip` / 2GB+1 | 验证 `413 MODEL_FILE_TOO_LARGE` |
| `platform_file_object` `.exe` | 验证 `422 MODEL_FILE_TYPE_UNSUPPORTED` |
| 不存在或跨租户 fileObjectId | 验证 `422 MODEL_FILE_OBJECT_NOT_FOUND` |
| `evaluationStatus=NONE` | 验证 MDL-006 发布阻断 |
| `activeDeploymentCount>0` | 验证 MDL-003 删除阻断 |
| `status=DEPRECATED` | 验证选择器和下载/使用行为限制 |

## 3. AC 覆盖矩阵

| AC | 需求摘要 | 优先级 | 后端 TDD 落点 | 前端 / Playwright 落点 |
| --- | --- | --- | --- | --- |
| AC-01 | 模型中心按关键词、标签、框架、任务类型、scope、状态筛选并分页 | P0 | `GET /api/v1/models` 契约、权限、分页 | 模型中心列表页筛选条、分页、空态 |
| AC-02 | 创建模型并维护元数据，缺少必填字段前后端拒绝 | P0 | `POST/PATCH /api/v1/models` 参数校验、审计 | 创建/编辑表单校验与错误反馈 |
| AC-03 | 创建版本，版本号唯一，文件类型/大小合法，绑定 `platform_file_object` | P0 | `POST /models/{id}/versions` 唯一约束、文件校验 | 创建版本弹窗、字段校验、成功刷新 |
| AC-04 | 模型详情展示元数据、版本历史、文件信息、指标、权限摘要、审计 | P1 | `GET /api/v1/models/{id}` / versions detail | 详情页信息区块、版本切换、审计区 |
| AC-05 | 版本状态仅允许合法流转，非法跳转阻断 | P0 | `POST /transition` 状态矩阵、错误码 | 合法动作显隐、非法操作错误展示 |
| AC-06 | 未评估或无导入证明不能发布 `PRODUCTION` | P0 | `MODEL_EVALUATION_REQUIRED`、阻断审计 | 发布按钮可见性、错误提示 |
| AC-07 | 活跃推理引用版本不能删除，并展示阻断原因 | P0 | `DELETE /versions/{id}` 返回 active references | 删除确认与阻断弹窗 |
| AC-08 | PLATFORM/BU/PRIVATE 按权限可见，跨 BU 无授权阻断 | P0 | 列表/详情/下载权限校验 | 列表结果、详情访问、错误页 |
| AC-09 | 跨 BU 访问申请/审批 seam 可记录状态，审批前不生效 | P0 | access-request approve/reject API、grant 生效时机 | 申请按钮、审批状态、审批后访问变化 |
| AC-10 | 预训练模型选择器只展示有权限且状态可用版本 | P0 | selector 查询、权限和状态过滤 | `ModelSelector` 单测与 E2E 复用场景 |
| AC-11 | 下载模型生成 10 分钟预签名 URL，不暴露凭据并记录下载审计 | P0 | `POST /download-url` 响应与审计 | 下载入口、成功反馈、URL 不泄露密钥 |
| AC-12 | 关键写操作与规则阻断均记录审计 | P0 | audit repository / API 结果断言 | 详情页审计记录展示 |
| AC-13 | 页面不出现原型说明元素，空态/错态均为业务文案 | P1 | 不适用 | 页面文案、空态、异常态、说明性元素缺失 |

## 4. P0 - Blocking 用例矩阵

| ID | AC | 类型 | 场景 | 关键测试数据 | 核心验证点 | 推荐测试落点 | 阻塞发布 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F019-P0-01 | AC-01 | Backend TDD | 模型中心按关键词与多维筛选返回分页结果 | `MODEL-YOLO-PLT-001`、`MODEL-WELD-CABIN-001` | `GET /api/v1/models` 返回匹配 `items/total/page/pageSize`，仅含用户可见模型 | 模型中心 controller 集成测试 | 是 |
| F019-P0-02 | AC-01/AC-13 | Frontend + E2E | 列表筛选与空态展示真实业务文案 | 搜索不存在关键词 | 筛选条件联动、分页正确、空态不出现原型说明文字 | `frontend/e2e/model-registry-foundation.spec.ts` | 是 |
| F019-P0-03 | AC-02 | Backend TDD | 模型 owner 创建模型成功并写审计 | `name/framework/taskType/inputFormat/outputFormat/scope` 合法 | 返回 `Model`，`currentVersionId=null`，审计 `MODEL_CREATED` | controller/service 集成测试 | 是 |
| F019-P0-04 | AC-02 | Backend TDD | 缺少必填元数据创建模型被拒绝 | 缺少 `framework` 或 `taskType` | 返回 `400 INVALID_PARAM`，无数据落库，无成功审计 | controller 集成测试 | 是 |
| F019-P0-05 | AC-02 | Frontend 单测 | 创建模型表单缺少必填字段前端阻断提交 | name 留空 | 提交按钮受控或展示字段级错误，未触发 API | `ModelCreateModal.test.tsx` | 是 |
| F019-P0-06 | AC-03 | Backend TDD | 创建版本成功绑定合法 `platform_file_object` | `.onnx`、100MB、`versionNo=v1.0` | 返回 `ModelVersion`，`fileObjectId/storageBucket/storageKey` 正确，审计 `MODEL_VERSION_CREATED`、`MODEL_VERSION_FILE_BOUND` | controller 集成测试 | 是 |
| F019-P0-07 | AC-03 | Backend TDD | 同一模型重复版本号被唯一约束阻断 | 同一 `modelId` 再次提交 `v1.0` | 返回 `409 MODEL_VERSION_CONFLICT`，不创建重复版本 | controller 集成测试 | 是 |
| F019-P0-08 | AC-03 | Backend TDD | 非白名单文件或超 2GB 文件创建版本被拒绝 | `.exe`、`2147483649` bytes | 返回 `422 MODEL_FILE_TYPE_UNSUPPORTED` 或 `413 MODEL_FILE_TOO_LARGE` | controller 集成测试 | 是 |
| F019-P0-09 | AC-05 | Backend TDD | 合法状态流转 `DEVELOPMENT -> TESTING` 成功 | `status=DEVELOPMENT` | 返回新状态 `TESTING`，审计 `MODEL_VERSION_TRANSITIONED` | controller/service 集成测试 | 是 |
| F019-P0-10 | AC-05/MDL-009 | Backend TDD | 非法状态跳转 `DEVELOPMENT -> PRODUCTION` 被阻断 | `evaluationStatus=PASSED` 也不允许跳跃 | 返回 `422 MODEL_VERSION_TRANSITION_INVALID`，无状态变化 | controller/service 集成测试 | 是 |
| F019-P0-11 | AC-06/MDL-006 | Backend TDD | 未评估版本从 `TESTING -> PRODUCTION` 被阻断 | `evaluationStatus=NONE` | 返回 `422 MODEL_EVALUATION_REQUIRED`，写 `MODEL_VERSION_PUBLISH_BLOCKED` 审计 | controller/service 集成测试 | 是 |
| F019-P0-12 | AC-06 | Backend TDD | 管理员导入外部评估证明后允许发布 `PRODUCTION` | `evaluationStatus=IMPORTED_PROOF` | `TESTING -> PRODUCTION` 成功，保留外部证明 ID/说明 | controller/service 集成测试 | 是 |
| F019-P0-13 | AC-07/MDL-003 | Backend TDD | 活跃推理引用版本删除被阻断并返回引用摘要 | `activeDeploymentCount=1` | 返回 `409 MODEL_VERSION_IN_USE`，`activeReferences` 含 service 摘要，审计 `MODEL_VERSION_DELETE_BLOCKED` | controller/service 集成测试 | 是 |
| F019-P0-14 | AC-08/MDL-004 | Backend TDD | 跨 BU 无授权访问 BU 模型详情被阻断 | `trainer-qe` 访问 `MODEL-WELD-CABIN-001` | 返回 `403 MODEL_ACCESS_REQUIRED` 或 `404 RESOURCE_NOT_FOUND`，不泄露敏感数据 | controller 集成测试 | 是 |
| F019-P0-15 | AC-09/MDL-004 | Backend TDD | 跨 BU 访问申请创建后在审批前不生效 | `permission=USE_FOR_TRAINING` | `MODEL_ACCESS_REQUESTED` 为 `PENDING`，申请人仍无法 view/download/use | access request 集成测试 | 是 |
| F019-P0-16 | AC-09 | Backend TDD | owner 或 BU 管理员审批通过后访问授权生效 | `trainer-qe` 申请、`buadmin-cabin` 审批 | 返回 `APPROVED`，同步生成 `ModelAccessGrant`，随后可访问目标权限 | access approve 集成测试 | 是 |
| F019-P0-17 | AC-10 | Frontend + E2E | 预训练模型选择器仅展示可见且状态可用版本 | `PLATFORM/BU/PRIVATE/DEPRECATED` 混合数据 | 仅显示 `PRODUCTION` 或允许使用的非废弃可见版本，不含 `DEPRECATED` 和无权限项 | `ModelSelector.test.tsx` + `frontend/e2e/model-selector.spec.ts` | 是 |
| F019-P0-18 | AC-11 | Backend TDD | 下载接口返回 10 分钟预签名 URL 且不泄露凭据 | 合法下载权限用户 | `expiresInSeconds=600`，URL 含 `X-Amz-Expires=600`，响应体不含 accessKey/secretKey，审计 `MODEL_DOWNLOADED` | controller/service 集成测试 | 是 |
| F019-P0-19 | AC-11 | Frontend + E2E | 下载动作成功提示与失败反馈符合业务文案 | 下载成功与 MinIO client 不可用场景 | 前端提示下载已准备或明确失败原因，不暴露底层凭据/内部错误 | `frontend/e2e/model-registry-foundation.spec.ts` | 是 |
| F019-P0-20 | AC-12 | Backend TDD | 关键写操作与规则阻断均写入正确审计事件 | create/update/version/transition/block/delete/access/download | 审计 `action/result/traceId/resourceId/detailJson` 与 contract 对齐 | audit 集成测试 | 是 |

## 5. P1 - Important 用例矩阵

| ID | AC | 类型 | 场景 | 关键测试数据 | 核心验证点 | 推荐测试落点 |
| --- | --- | --- | --- | --- | --- | --- |
| F019-P1-01 | AC-04 | Backend TDD | 模型详情返回元数据、版本历史、文件信息、指标摘要、权限摘要和审计 | `MODEL-WELD-CABIN-001` 含 `v1/v2` | `GET /api/v1/models/{id}` 字段完整，`auditEvents` 与 `versions` 可用 | controller 集成测试 |
| F019-P1-02 | AC-04 | Frontend + E2E | 详情页展示版本历史、指标摘要、权限摘要和审计区块 | 多版本模型 | 页面区块齐全，切换版本后文件/指标随之更新 | `frontend/e2e/model-registry-foundation.spec.ts` |
| F019-P1-03 | AC-05 | Frontend 单测 | 版本状态操作按钮仅展示合法后继动作 | `DEVELOPMENT/TESTING/PRODUCTION/DEPRECATED` | `DEVELOPMENT` 仅显示转 `TESTING`，`DEPRECATED` 不显示流转按钮 | `VersionTransitionActions.test.tsx` |
| F019-P1-04 | AC-07 | Frontend + E2E | 删除被活跃推理引用阻断时展示引用摘要 | `INF-SVC-001` | 弹窗展示服务名、状态和阻断文案 | `frontend/e2e/model-registry-foundation.spec.ts` |
| F019-P1-05 | AC-08 | Backend TDD | PRIVATE scope 模型仅 owner 可见，同 BU 普通用户不可见 | `MODEL-PRIVATE-CABIN-001` | owner 可访问；同 BU 非 owner 返回拒绝/不存在 | controller 集成测试 |
| F019-P1-06 | AC-09 | Backend TDD | scope 变更为跨 BU 可见时审批前原 scope 不生效 | `PRIVATE -> PLATFORM` 或跨 BU 可见变更 | 返回 `422 MODEL_SCOPE_APPROVAL_REQUIRED` 或 `PENDING` 记录；实际 scope 维持原值 | update model / access workflow 集成测试 |
| F019-P1-07 | AC-10 | Frontend 单测 | `ModelSelector` 搜索与标签筛选联动 | keyword + framework + taskType | 只显示匹配且可用版本，空结果展示业务空态 | `ModelSelector.test.tsx` |
| F019-P1-08 | AC-12 | Frontend + E2E | 审计记录页面正确展示成功与阻断事件 | publish blocked、delete blocked、download success | 审计列表 action/result/operator/time 可读 | `frontend/e2e/model-registry-foundation.spec.ts` |
| F019-P1-09 | AC-13 | Frontend 单测 | 页面错误态与空态文案业务化，不出现 prototype 注释/说明 | 404/403/empty | 文案使用业务语言，不包含“原型”“示意”等描述 | 相关页面组件单测 |

## 6. P2 - Nice to Have 用例矩阵

| ID | AC | 类型 | 场景 | 关键测试数据 | 核心验证点 | 推荐测试落点 |
| --- | --- | --- | --- | --- | --- | --- |
| F019-P2-01 | AC-01 | Backend TDD | pageSize 超过 100 时按契约限制 | `pageSize=1000` | 返回默认上限或 `400 INVALID_PARAM`，实现口径需稳定 | list API 集成测试 |
| F019-P2-02 | AC-03 | Backend TDD | 2GB 边界文件允许创建版本 | `fileSizeBytes=2147483648` | 创建成功，不误判为超限 | create version 集成测试 |
| F019-P2-03 | AC-04 | Frontend + E2E | 详情页无版本时空状态正确 | 仅创建模型未创建版本 | 版本区展示业务空态和创建引导 | `frontend/e2e/model-registry-foundation.spec.ts` |
| F019-P2-04 | AC-08 | Backend TDD | 平台内置模型对有权限用户在任意 BU 可见 | `scope=PLATFORM` | 不同 BU 用户均可列出并查看详情 | list/detail 集成测试 |
| F019-P2-05 | AC-11 | Backend TDD | 预签名 URL 失败时仍记录失败审计 | MinIO client 不可用 | 返回失败诊断，审计 `MODEL_DOWNLOADED` result=`FAILED` | download service 集成测试 |

## 7. 权限 / 审计 / MUST 规则专项验证

### 7.1 权限矩阵

| 操作 | 预期 |
| --- | --- |
| `GET /api/v1/models`、`GET /api/v1/models/{modelId}` | 需 `model:model:read`，并受 `PLATFORM/BU/PRIVATE/grant` 约束 |
| `POST /api/v1/models`、`PATCH /api/v1/models/{modelId}` | 需 owner / `model:model:write/manage` |
| `POST /api/v1/models/{modelId}/versions` | owner / `model:version:write`，且 fileObject 可访问 |
| `POST /transition` | owner / `model:version:manage`，同时满足 MDL-006/009 |
| `DELETE /versions/{versionId}` | owner / `model:version:delete`，同时满足 MDL-003 |
| `POST /access-requests` | 任意认证用户可发起跨 BU 申请 |
| `PUT /model-access-requests/{requestId}/approve|reject` | owner 或 owner 所属 BU 管理员 |
| `POST /download-url` | `model:model:download` 或 grant `DOWNLOAD` |
| 训练/预训练选择器使用 | `model:model:use` 或 grant `USE_FOR_TRAINING` |

### 7.2 审计事件最小覆盖

以下事件至少各有 1 个成功或失败自动化断言，并带 `TASK-model-registry-foundation` traceability 标记：

- `MODEL_CREATED`
- `MODEL_UPDATED`
- `MODEL_VERSION_CREATED`
- `MODEL_VERSION_FILE_BOUND`
- `MODEL_VERSION_TRANSITIONED`
- `MODEL_VERSION_PUBLISH_BLOCKED`
- `MODEL_VERSION_DELETE_BLOCKED`
- `MODEL_VERSION_DELETED`
- `MODEL_SCOPE_CHANGE_REQUESTED`
- `MODEL_ACCESS_REQUESTED`
- `MODEL_ACCESS_APPROVED`
- `MODEL_ACCESS_REJECTED`
- `MODEL_VIEWED`
- `MODEL_DOWNLOADED`

### 7.3 MUST 规则映射

| 规则 | 必测场景 | 预期 |
| --- | --- | --- |
| MDL-003 | 删除存在活跃推理引用的版本 | 返回 `409 MODEL_VERSION_IN_USE`，附 `activeReferences`，写阻断审计 |
| MDL-004 | 跨 BU 无授权访问、申请审批前不生效、审批后生效 | 无授权时 `403/404`；申请后仍阻断；审批通过后 grant 生效 |
| MDL-006 | 未评估或无外部证明发布 `PRODUCTION` | 返回 `422 MODEL_EVALUATION_REQUIRED`，写 `MODEL_VERSION_PUBLISH_BLOCKED` |
| MDL-009 | 状态跳跃或逆向流转 | 返回 `422 MODEL_VERSION_TRANSITION_INVALID`，状态不变 |

## 8. 自动化分层建议

### 8.1 后端测试

- 位置建议：
  - `backend/.../src/test/java/.../ModelRegistryControllerTest.java`
  - `backend/.../src/test/java/.../ModelRegistryServiceTest.java`
- 优先覆盖：
  - AC-01、AC-02、AC-03、AC-05、AC-06、AC-07、AC-08、AC-09、AC-11、AC-12
  - `MDL-003/004/006/009`
- 测试标记：
  - JUnit display name 或 tag 中包含 `TASK-model-registry-foundation`

### 8.2 前端单测 / 组件测试

- 位置建议：
  - `frontend/src/features/model-registry/__tests__/ModelRegistryPage.test.tsx`
  - `frontend/src/features/model-registry/__tests__/ModelCreateModal.test.tsx`
  - `frontend/src/features/model-registry/__tests__/VersionTransitionActions.test.tsx`
  - `frontend/src/features/model-registry/__tests__/ModelSelector.test.tsx`
- 优先覆盖：
  - 表单校验、状态按钮显隐、空态/错态文案、选择器过滤
- 测试标记：
  - `describe('TASK-model-registry-foundation ...')`

### 8.3 Playwright E2E

- 位置建议：
  - `frontend/e2e/model-registry-foundation.spec.ts`
  - `frontend/e2e/model-selector.spec.ts`
- 主链路：
  1. owner 创建模型 -> 创建版本 -> 流转到 `TESTING`
  2. 未评估发布失败
  3. 管理员导入外部证明后发布成功
  4. 跨 BU 用户申请访问 -> 审批 -> `ModelSelector` 可见
  5. 下载生成 URL 并展示成功提示
- 测试标记：
  - test title 或 annotation 中包含 `TASK-model-registry-foundation`

## 9. 回归范围

### 9.1 必跑回归

1. 平台统一 API envelope、错误码包装、traceId、RBAC 与审计链路。
2. `platform_file_object` / MinIO 对象读取与预签名 URL 生成能力。
3. 现有前端 shell、路由、登录态与全局错误处理。
4. 训练/实验/评估页中后续复用 `ModelSelector` 的页面嵌入不破坏主导航结构。

### 9.2 推荐执行命令

```powershell
mvn -q -f backend/pom.xml test -Dtest=ModelRegistryControllerTest,ModelRegistryServiceTest
npm --prefix frontend run test:ci -- ModelRegistryPage ModelCreateModal VersionTransitionActions ModelSelector
npm --prefix frontend run e2e -- model-registry-foundation.spec.ts
npm --prefix frontend run e2e -- model-selector.spec.ts
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F019-model-registry-foundation --skip-backend-integration --run-e2e
```

## 10. 交付与阶段 handoff

### 10.1 后端实现 handoff

1. 先补 P0 失败用例，再写实现；尤其先锁定 `MDL-003/004/006/009`。
2. 创建版本必须复用 `platform_file_object`，不能新增平行模型文件表或绕过对象存储治理。
3. 错误码、HTTP 状态、审计事件名和 `expiresInSeconds=600` 必须逐项对齐 frozen contract。
4. 跨 BU 详情、下载、selector 查询都要避免泄露无权限模型存在性。
5. `MODEL_SCOPE_APPROVAL_REQUIRED` 与 access grant 的关系必须有明确测试，防止审批前提前生效。

### 10.2 前端实现 handoff

1. 列表筛选、详情、创建/编辑、版本操作、访问申请、下载、选择器需要分别保留独立测试，不要用 mega-test 混测。
2. `ModelSelector` 必须基于真实权限与状态数据过滤，不能以前端静态枚举代替。
3. 页面不得出现“原型说明”“示意页面”等说明性文案；空态与错误态必须业务化。
4. 删除阻断、未评估发布阻断、跨 BU 未授权提示要展示 contract 级业务文案，而不是通用异常 toast。

## 11. Traceability

- Trace tag：`TASK-model-registry-foundation`
- AC-01 -> `F019-P0-01`, `F019-P0-02`, `F019-P2-01`
- AC-02 -> `F019-P0-03`, `F019-P0-04`, `F019-P0-05`
- AC-03 -> `F019-P0-06`, `F019-P0-07`, `F019-P0-08`, `F019-P2-02`
- AC-04 -> `F019-P1-01`, `F019-P1-02`, `F019-P2-03`
- AC-05 -> `F019-P0-09`, `F019-P0-10`, `F019-P1-03`
- AC-06 -> `F019-P0-11`, `F019-P0-12`
- AC-07 -> `F019-P0-13`, `F019-P1-04`
- AC-08 -> `F019-P0-14`, `F019-P1-05`, `F019-P2-04`
- AC-09 -> `F019-P0-15`, `F019-P0-16`, `F019-P1-06`
- AC-10 -> `F019-P0-17`, `F019-P1-07`
- AC-11 -> `F019-P0-18`, `F019-P0-19`, `F019-P2-05`
- AC-12 -> `F019-P0-20`, `F019-P1-08`
- AC-13 -> `F019-P0-02`, `F019-P1-09`
- MDL-003 -> `F019-P0-13`
- MDL-004 -> `F019-P0-14`, `F019-P0-15`, `F019-P0-16`, `F019-P1-06`
- MDL-006 -> `F019-P0-11`, `F019-P0-12`
- MDL-009 -> `F019-P0-09`, `F019-P0-10`, `F019-P1-03`

