# Test Plan: 标注任务、标注审核与 Label Studio 适配

## 1. Test Scope
- Feature: F012-annotation-integration
- Contract version: v1 frozen
- Business references:
  - `docs/business/bizdocs/02-01-业务流程-数据管理.md` DATA-003、DATA-006
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md` FUNC-DATA-020、021、022、023、024、025、026、028、042、095
  - `docs/business/rules/01-数据管理规则.md` DAT-003、DAT-004、DAT-009、DAT-010、DAT-012
  - `docs/business/rules/05-平台与权限规则.md` PLT-001、PLT-011、PLT-014
- Prototype references:
  - `docs/prototype/SMP工业AI平台-原型v2.html` page key `ann`、`annwork`、`annreview`、`dsdetail`、`lineage`

## 2. P0 - Blocking

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-01 | 标注任务管理原型结构可见 | 登录后进入 `/ann` | 标题 `标注任务管理`、统计卡、Tab、任务列表、标签模板按钮和 `＋ 新建标注任务` 可见 |
| T-P0-02 | AC-02 | 创建任务成功 | 调用 `POST /annotation/tasks`，传 ACTIVE 数据集、PUBLISHED 模板、标注员、审核员 | 返回任务 `ASSIGNED`/`IN_PROGRESS`，生成 assignment、work item、external binding，并写创建/分配审计 |
| T-P0-03 | AC-02 | DAT-009 非 ACTIVE 数据集失败 | 用非 ACTIVE 数据集创建任务 | API 返回 422，消息包含“所选数据集状态不可用”，任务不落库 |
| T-P0-04 | AC-02 AC-03 | DAT-003 未发布模板失败 | 用 DRAFT 模板创建任务或启动任务 | API 返回 422，消息包含“任务尚未配置标签模板” |
| T-P0-05 | AC-03 | 标签模板发布和 Label Studio config | 创建模板、发布、获取 label-studio-config | 状态 `PUBLISHED`，返回 `<View>` XML seam，写 `ANNOTATION_TEMPLATE_PUBLISHED` 审计 |
| T-P0-06 | AC-04 | 工作台提交标注结果 | 查询 work-items，保存草稿，提交 annotationJson | 工作项进入 `REVIEW_PENDING`，生成 review item，写 `ANNOTATION_RESULT_SUBMITTED` |
| T-P0-07 | AC-05 | 审核通过/驳回 | 审核员 approve 一个项，reject 另一个项并填写原因 | 通过项 `APPROVED`，驳回项 `REJECTED`，任务统计更新，审计存在 |
| T-P0-08 | AC-05 | DAT-004 自审阻断 | 标注提交人调用 approve 自己的 review item | API 返回 422，消息“不允许审核自己提交的标注结果”，写 `ANNOTATION_REVIEW_SELF_REJECTED` |
| T-P0-09 | AC-06 | Label Studio 未配置 | 调用 status/sync-project/import-results | 返回 `UNCONFIGURED`、`TODO_CONFIRM_LABEL_STUDIO_*`，同步失败写审计，不返回成功同步 |
| T-P0-10 | AC-07 | 发布标注数据集成功 | 所有工作项已通过后调用 `quality-check` 与 `publish-dataset` | 生成 `ANNOTATED` dataset/version/file 和 `ANNOTATION` lineage，返回 `PASSED` |
| T-P0-11 | AC-07 | DAT-010 质量检查失败 | 覆盖率不足或存在未通过工作项时发布 | API 返回 422 或 `FAILED` 诊断，阻断发布，写 `ANNOTATION_QUALITY_CHECK_FAILED` |
| T-P0-12 | AC-08 | 权限与 BU 隔离 | QE 用户访问 CABIN 任务；无 review 权限审核 | 跨 BU 读 404 或写 403，权限不足 403，并有审计 |

## 3. P1 - Important

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-01 | 任务状态筛选 | 在 `/ann` 切换全部/进行中/待开始/待审核/已完成 Tab | 列表按状态更新，统计保持可见 |
| T-P1-02 | AC-03 | 标签模板抽屉 | 打开“标签模板”，查看 PUBLISHED 与 DRAFT 模板 | 可见标签层级、场景、Label Studio 状态 |
| T-P1-03 | AC-04 | 工作台 Label Studio Banner | 进入 `/annwork` | 可见 `外部标注工具未配置` 与 `TODO_CONFIRM_LABEL_STUDIO_BASE_URL` |
| T-P1-04 | AC-05 | 驳回原因必填 | 审核页点击驳回但不填原因 | 前端/后端阻止提交并提示原因必填 |
| T-P1-05 | AC-07 | 数据集详情和血缘可见 | 发布后进入 `/dsdetail` 与 `/lineage` | 可见 `ANNOTATED` 数据集、`ANNOTATION` 血缘或标注时间轴事件 |
| T-P1-06 | AC-08 | PLT-014 停用任务扫描 seam | 查询用户停用影响或任务重新分配提示 | 响应包含进行中标注/审核任务计数或 TODO seam |

## 4. P2 - Nice to Have

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-01 | 原型语义文案完整性 | 检查 `/ann` 文案 | `标注任务管理`、`标签模板`、`新建标注任务`、`AI 预标注`、`质量评分` 等文案完整 |
| T-P2-02 | AC-06 | Label Studio 导出格式 seam | 查看任务详情/发布区域 | 明示 `TODO_CONFIRM_ANNOTATION_EXPORT_FORMATS`，不伪造支持清单 |
| T-P2-03 | AC-04 | AI 预标注未配置 | 启用 AI 预标注但模型来源未知 | 状态为 `UNCONFIGURED`，人工标注仍可继续 |

## 5. Cross-cutting Verification

- Permission:
  - 后端测试覆盖 `data:annotation:*`、`data:label-template:*` 权限不足。
  - 前端 E2E 使用 SUPER_ADMIN mock 覆盖 `menu:ann`、`menu:annwork`、`menu:annreview`。
- Audit:
  - 后端测试查询 `platform_audit_log`，断言 `ANNOTATION_TASK_CREATED`、`ANNOTATION_RESULT_SUBMITTED`、`ANNOTATION_REVIEW_APPROVED`、`ANNOTATION_DATASET_PUBLISHED`、`ANNOTATION_LABEL_STUDIO_SYNC_FAILED`。
- Business rules:
  - DAT-003、DAT-004、DAT-009、DAT-010、DAT-012、PLT-001、PLT-011。
- NFR:
  - 无新增依赖；API 保持 `/api/v1` envelope；错误信息不泄露 token/secret。
- Frontend visual/prototype parity:
  - E2E 覆盖 `/ann` 关键区域、向导、`/annwork`、`/annreview`，QA 报告附原型对比矩阵。

## 6. Traceability

- AC-01 -> T-P0-01, T-P1-01, T-P2-01
- AC-02 -> T-P0-02, T-P0-03, T-P0-04
- AC-03 -> T-P0-05, T-P1-02
- AC-04 -> T-P0-06, T-P1-03, T-P2-03
- AC-05 -> T-P0-07, T-P0-08, T-P1-04
- AC-06 -> T-P0-09, T-P2-02
- AC-07 -> T-P0-10, T-P0-11, T-P1-05
- AC-08 -> T-P0-12, T-P1-06

## 7. Required commands

```powershell
$env:JAVA_HOME='C:\java\jdk-25'; $env:Path="$env:JAVA_HOME\bin;$env:Path"
mvn -q -f backend/pom.xml -pl smp-app test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
npm --prefix frontend run e2e
node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F012-annotation-integration
node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F012-annotation-integration
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F012-annotation-integration --run-e2e
```
