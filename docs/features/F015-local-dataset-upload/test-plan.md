# Test Plan: 本地图片上传创建数据集

## 1. 测试范围
- 功能：F015-local-dataset-upload（本地图片上传创建数据集）
- 目标文档：`docs/features/F015-local-dataset-upload/plan.md`、`TASK.md`、`contract.md`、`reports/planning/deep-interview.md`、`reports/planning/prd.md`、`reports/planning/test-spec.md`
- 契约版本：v1（当前 `contract.md` 已 frozen）
- 业务资料：
  - `docs/business/bizdocs/01-业务场景清单.md`
  - `docs/business/bizdocs/02-01-业务流程-数据管理.md`
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md`
  - `docs/business/rules/01-数据管理规则.md`
  - `docs/business/问题记录.md`
- 原型资料：
  - `docs/prototype/SMP工业AI平台-原型v2.html`
  - 页面 key：`up`、`ds`、`dsdetail`、`ann`

## 2. 测试目标
1. 验证 F015 在保留“数据源导入”旧路径的同时，新增“本地上传图片”正式入口，并在无可用数据源时提供正确空态与引导。
2. 验证 upload session、文件上传、内容安全检测、版本创建、血缘绑定、详情跳转与标注入口兼容，完整覆盖 AC-01 ~ AC-06。
3. 验证 DAT-002、DAT-005、DAT-009、DAT-012 等 MUST 规则在上传主链路、失败链路和权限链路中的执行与证据留存。
4. 验证权限、审计、诊断、NFR 和原型一致性，确保 build-feature 交付可直接进入 gate。

## 3. 测试分层与方法
- 单元/服务测试：upload session 状态机、creationMode 分支、诊断码映射、lineage mapper、安全结果归并。
- 后端集成测试：session API、multipart/zip 文件接收、`platform_file_object` 生成、`dataset/version/file/lineage` 绑定、权限、审计、内容安全失败路径。
- 前端组件/集成：空态、双入口切换、上传列表、阶段进度、诊断提示、跳转和旧路径回归。
- E2E：用户从 `/up` 完成“本地上传图片创建数据集 -> 跳转详情 -> 进入标注入口”的关键旅程，以及高风险内容 / 数据源导入回归。
- 人工/视觉验收：比对原型 `up` / `ds` / `dsdetail` / `ann` 的信息架构、入口语义、步骤感知、进度反馈与详情页入口位置。

## 4. 测试矩阵

### 4.1 P0 - 必须通过（阻塞发布）
| ID | AC | 场景 | 预期结果 |
|---|---|---|---|
| T-P0-01 | AC-01 | 无可用数据源时显示本地上传空态 | 不显示空白来源数据源下拉；展示“当前无可用数据源”说明；提供“直接上传图片”“去创建数据源”CTA |
| T-P0-02 | AC-02, AC-06 | 具备写权限用户创建本地上传 session | 成功创建 upload session，返回 `sessionId` 与初始状态，并写入 `DATASET_UPLOAD_SESSION_CREATED` 审计 |
| T-P0-03 | AC-02, AC-03 | 上传多张合法图片生成文件对象 | 合法文件进入 `UPLOADED`；生成 `platform_file_object`；accepted/rejected 汇总正确 |
| T-P0-04 | AC-02, AC-06 | 非法格式文件被拒绝且不可进入后续绑定 | 文件状态为 `REJECTED`；返回明确诊断；不生成 `dataset_file` 绑定 |
| T-P0-05 | AC-03 | commit 后创建数据集、版本、文件和血缘 | 生成/确认 `dataset`、`dataset_version`、`dataset_file`、`data_lineage(sourceType=LOCAL_UPLOAD)`；详情页可见文件与版本 |
| T-P0-06 | AC-04, AC-06 | 高风险内容被拦截且不得进入最终可用版本 | 高风险文件被拦截；版本进入 `SECURITY_PENDING`；页面展示明确诊断；写 `DATASET_SECURITY_BLOCKED` 审计 |
| T-P0-07 | AC-04 | 内容安全服务不可用时不得假成功 | 版本进入 `SECURITY_PENDING` 或提交失败；不得出现 READY/PUBLISHED 假成功 |
| T-P0-08 | AC-05, AC-06 | 上传成功后跳转详情并继续发起标注任务 | 详情页展示文件、版本、基础元数据；ACTIVE 数据集可继续发起标注任务 |
| T-P0-09 | AC-06 | 跨 BU 或无写权限访问 upload session 被拒绝 | 返回 403/404；写未授权或跨 BU 审计；不泄露资源存在性 |
| T-P0-10 | AC-01, AC-03, AC-05 | 数据源导入旧路径不回归 | `DATA_SOURCE_IMPORT` 旧路径保持可用，不受本地上传改造影响 |

### 4.2 P1 - 重要功能（应通过）
| ID | AC | 场景 | 预期结果 |
|---|---|---|---|
| T-P1-01 | AC-02, AC-03 | zip 上传成功解包为多图片 | zip 被解包；每个有效图片有独立状态；最终可创建数据集版本 |
| T-P1-02 | AC-02, AC-03 | zip 中混入非法/损坏文件 | 合法图片进入候选；非法/损坏文件被单独拒绝并保留原因 |
| T-P1-03 | AC-02, AC-06 | 空 session commit 被拒绝 | 返回业务诊断；不创建 dataset/version/file |
| T-P1-04 | AC-03, AC-06 | 重复 commit 的幂等与冲突处理 | 不重复创建版本/文件绑定；返回幂等成功或明确冲突 |
| T-P1-05 | AC-05 | 上传生成的数据集兼容训练格式导出回归 | F014 导出链路可识别本地上传数据集版本 |
| T-P1-06 | AC-05 | 详情页样例/元数据展示与原型一致 | 元数据、版本区、文件区和标注入口结构不回退 |
| T-P1-07 | AC-06 | 审计事件链完整可追溯 | 关键动作产生对应审计事件，并记录 actor、tenantId、resourceId、结果 |

### 4.3 P2 - 边界与增强（最好通过）
| ID | AC | 场景 | 预期结果 |
|---|---|---|---|
| T-P2-01 | AC-02 | 达到上传文件数上限 | 返回明确超限诊断，不出现半成功脏数据 |
| T-P2-02 | AC-02 | zip 大小超限 | 返回 413/超限诊断并拒绝接收 |
| T-P2-03 | AC-03 | 文件名、大小写、重复文件边界 | 文件名展示稳定，去重/冲突策略可解释 |
| T-P2-04 | AC-05 | 从数据集管理页进入上传页的入口语义一致 | `ds -> up` 路由、页标题与入口语义保持原型一致 |
| T-P2-05 | AC-06 | 失败后重新上传与会话恢复 | session 能正确累计或覆盖失败项，最终结果可解释 |

## 5. AC 追溯矩阵
| AC | 验收要求 | 覆盖测试 |
|---|---|---|
| AC-01 | 无数据源时显示空态并提供本地上传入口 | T-P0-01, T-P0-10, T-P2-04 |
| AC-02 | 支持本地上传图片/zip 并创建 upload session | T-P0-02, T-P0-03, T-P1-01, T-P1-02, T-P2-01, T-P2-02 |
| AC-03 | 上传文件生成 FileObject 并绑定数据集版本 | T-P0-03, T-P0-05, T-P1-01, T-P1-03, T-P1-04, T-P2-03 |
| AC-04 | 内容安全失败文件不得进入最终可用版本 | T-P0-06, T-P0-07 |
| AC-05 | 上传成功后的数据集可查看并继续发起标注任务 | T-P0-08, T-P0-10, T-P1-05, T-P1-06 |
| AC-06 | 权限、跨 BU、失败路径均有审计和诊断 | T-P0-02, T-P0-04, T-P0-06, T-P0-09, T-P1-03, T-P1-04, T-P1-07, T-P2-05 |

## 6. 权限与访问控制验证
- 创建 session、上传文件、commit：要求 `data:dataset:write`
- 查询 session、查看详情：要求 `data:dataset:read`
- 文件预览/下载：要求 `platform:file:download` 或等价文件读取权限
- 跨 BU 默认拒绝，未授权返回 404/403，满足 DAT-012

## 7. 审计验证
必验事件：
- `DATASET_UPLOAD_SESSION_CREATED`
- `DATASET_UPLOAD_FILE_ACCEPTED`
- `DATASET_UPLOAD_FILE_REJECTED`
- `DATASET_UPLOAD_COMMITTED`
- `DATASET_UPLOAD_FAILED`
- `DATASET_SECURITY_BLOCKED`

审计字段至少包含：traceId、actorId、tenantId、resourceId、result、riskLevel、detail/诊断信息。

## 8. MUST 规则验证
| 规则 | 验证要求 | 对应用例 |
|---|---|---|
| DAT-002 | 所有上传数据在进入最终版本前完成内容安全检测；高风险拦截；服务不可用不得假成功 | T-P0-06, T-P0-07 |
| DAT-005 | 已发布版本不可被 upload session 二次改写；重复 commit 不得篡改已发布版本 | T-P1-04 |
| DAT-009 | 只有达到 ACTIVE/可用状态的数据集才能继续发起标注任务 | T-P0-08 |
| DAT-012 | session/dataset 查询自动附加 tenantId；跨 BU 无授权返回 404/403 | T-P0-09 |

## 9. NFR 验证
- 可用性：无数据源时不可出现空白下拉与无反馈阻断。
- 可观测性：session 进度、诊断、审计、失败阶段可查询。
- 一致性：前端进度、后端状态、审计结果一致。
- 安全性：不暴露真实对象存储路径；跨 BU 默认隔离。
- 兼容性：不破坏 F009 数据源导入与 F012/F014 后续链路。

## 10. 原型一致性验证
- `up` 页面保持“新建数据集 / 上传向导”语义与步骤感。
- `ds` 页面“＋ 新建数据集”入口仍进入上传向导。
- `dsdetail` 页面继续展示元数据、版本信息、文件区与标注入口。
- `ann` 入口仍从数据集详情发起，不新增原型外绕行路径。

## 11. 自动化建议与落点
- 后端：`backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java`
- 前端：`frontend/src/features/data/DataPages.tsx` 相关集成与 `frontend/e2e/local-dataset-upload.spec.ts`
- E2E 重点：
  1. 无数据源 -> 本地上传空态 -> 上传成功 -> 详情跳转
  2. 高风险内容 -> 拦截提示 -> 阻断标注入口
  3. 有数据源 -> 数据源导入路径回归

## 12. 执行与门禁建议
```powershell
node tools/ai-scaffold/dist/cli.js check-feature-artifacts docs/features/F015-local-dataset-upload
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F015-local-dataset-upload
mvn -q -f backend/pom.xml -pl smp-app -Dtest=DataManagementControllerTest test
npm --prefix frontend run lint
npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
npm --prefix frontend run build
npm --prefix frontend run e2e -- local-dataset-upload.spec.ts
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F015-local-dataset-upload --skip-backend-integration --run-e2e
```

## 13. 退出标准
- AC-01 ~ AC-06 均有明确测试覆盖并形成可执行用例。
- P0 用例全部通过后方可进入发布判定。
- MUST 规则、权限、审计、诊断、原型一致性均有验证证据。
- 数据源导入旧路径回归通过，且上传成功后的详情/标注入口链路可用。
