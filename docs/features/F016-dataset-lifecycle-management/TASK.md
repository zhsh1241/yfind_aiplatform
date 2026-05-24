---
feature: F016-dataset-lifecycle-management
title: 数据集生命周期管理增强
task_status: draft
owner: codex
created_at: 2026-05-24
updated_at: 2026-05-24
---

# Task: 数据集生命周期管理增强

## 1. 需求摘要

作为数据管理员、标注工程师和平台管理员，我需要在同一数据集下显式管理版本、元信息、归档与硬删除，以便让数据集演进过程可追溯、可授权、可审计，并且不破坏后续标注、训练和血缘引用能力。

### Business Value

- 把 F009/F015 已具备的底层 dataset/version/file seam 提升为可直接使用的正式生命周期能力。
- 降低数据集维护成本，避免通过“重建影子数据集”规避版本管理。
- 满足已发布版本不可修改、删除前引用检查、跨 BU 隔离、审计可追溯等 DATA 域强规则。

### Source References

- Business docs:
  - `docs/business/bizdocs/03-01-系统功能-数据管理.md`
  - `docs/business/domain/01-领域对象-数据域.md`
  - `docs/business/rules/01-数据管理规则.md`
  - `docs/business/api/01-API接口规范.md`
- Planning artifacts:
  - `docs/features/F016-dataset-lifecycle-management/plan.md`
  - `docs/features/F016-dataset-lifecycle-management/reports/planning/deep-interview.md`
  - `docs/features/F016-dataset-lifecycle-management/reports/planning/prd.md`
  - `docs/features/F016-dataset-lifecycle-management/reports/planning/test-spec.md`
- Prototype:
  - `docs/prototype/SMP工业AI平台-原型v2.html`
  - page key: `ds`, `dsdetail`, `up`

## 2. 范围

### In Scope

- [ ] 数据集列表页展示版本数，并新增编辑、归档、删除入口。
- [ ] 数据集详情页支持版本切换、新建版本、删除版本、编辑数据集元信息。
- [ ] 当前选中版本支持追加图片与解绑图片。
- [ ] 上传向导支持“追加到既有数据集版本”的复用入口。
- [ ] 后端补充版本删除、按版本解绑、最后一个版本保护、管理员硬删除门禁与审计。
- [ ] 补充前后端测试与 Playwright E2E，覆盖生命周期关键路径。

### Out of Scope

- 版本 diff / 回滚 / 恢复
- 批量版本操作
- 新增平行版本模型、影子数据集或第二套文件事实源
- 扩展到非图片数据类型的生命周期新交互

## 3. 技术分析

### Backend

- Module/API:
  - 复用 `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementController.java`
  - 复用 `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java`
  - 扩展 dataset/version/file 生命周期接口，最小新增仅限正式缺口 seam
- Domain objects:
  - `dataset`
  - `dataset_version`
  - `dataset_file`
  - `platform_file_object`
  - `data_lineage`
- Business rules:
  - DAT-005：已发布版本不可修改，变更必须新建版本
  - DAT-011：数据集删除前须检查训练/模型引用
  - DAT-012：默认 BU 隔离，跨 BU 不暴露资源存在性
  - DAT-002：追加图片仍需经过内容安全检测前置

### Frontend

- Prototype page key:
  - `ds`
  - `dsdetail`
  - `up`
- Pages/components:
  - `frontend/src/features/data/DataPages.tsx` 中的数据集管理、详情、上传相关页面
  - `frontend/src/features/platform/platformApi.ts`
- States/interactions:
  - dataset 元信息编辑与版本内容编辑分离
  - 当前选中版本上下文切换
  - 归档 vs 管理员硬删除分离确认
  - 上传向导复用“追加到当前版本”流程

### AI Adapter / Integration

- Adapter endpoint:
  - 本 feature 不新增 AI adapter 主流程接口
- External system placeholders:
  - `TODO_CONFIRM_CONTENT_SAFETY_SERVICE`
  - `TODO_CONFIRM_DATASET_DELETE_REFERENCE_SOURCE`

### Database

- Tables:
  - 复用 `dataset`、`dataset_version`、`dataset_file`、`platform_file_object`、`data_lineage`
  - 如需审计/状态增强，仅允许在现有 lifecycle 表上做最小增补
- Migrations:
  - 若现有 schema 无法支撑版本删除/归档门禁，再新增 F016 对应 Flyway migration

## 复用方案

### 必须复用

- 业务与原型基准：`docs/business/`、`docs/prototype/`
- 后端既有 seam：
  - `DataManagementService`
  - `DataManagementController`
  - F009 的 dataset/version/file/query/access/lineage 实现
  - F006 权限、租户、审计底座
  - F007 `platform_file_object` 文件事实源
- 前端既有 seam：
  - `frontend/src/features/data/DataPages.tsx`
  - `frontend/src/features/platform/platformApi.ts`
  - 现有 React Query、Ant Design、session store、页面路由骨架
- 测试基座：
  - `backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java`
  - `frontend/e2e/*.spec.ts`

### 禁止复用/复制方式

- 不复制已删除旧实现或重造第二套 dataset/version/file 模型
- 不把“编辑数据集”实现成影子数据集复制
- 不新增独立上传页面或平行 API；必须在现有页面/API seam 上闭环

### 不复用时的原因

- 当前 F009/F015 缺少“删除单版本”“从指定版本解绑文件”“管理员硬删除门禁”“版本上下文前端入口”这些正式生命周期能力，必须在原 seam 上做最小增强，而不是保留为不可见底层能力。

## 5. Acceptance Criteria

- [ ] AC-01：新建数据集仍自动创建 `v1`，列表页展示版本数，详情页支持版本切换。
- [ ] AC-02：编辑数据集仅修改元信息，不直接改动其他版本的文件集合。
- [ ] AC-03：手动创建新版本默认复制上一版本文件集合，并保留版本追溯信息。
- [ ] AC-04：当前选中版本允许追加图片与解绑图片，且仅影响当前版本，不删除底层 `platform_file_object`。
- [ ] AC-05：已发布/锁定版本不可删，最后一个版本不可删；违反时返回明确业务错误。
- [ ] AC-06：普通用户可归档数据集；仅管理员可执行彻底删除，且删除前必须做引用检查与审计记录。
- [ ] AC-07：上传向导支持追加到既有版本，并与详情页版本视图保持一致。
- [ ] AC-08：权限、跨 BU 隔离、内容安全与审计行为有测试和验收证据覆盖。

## 6. Definition of Done

- [x] `plan.md` 已批准。
- [ ] `contract.md` 已冻结或进入实现态。
- [ ] `test-plan.md` 引用全部 AC-xx。
- [ ] 复用审查已完成并记录在文档与评审产物中。
- [ ] 后端以 TDD 方式完成实现与测试。
- [ ] 前端交互、API 适配与 Playwright E2E 完成。
- [ ] 权限、审计和 MUST 规则存在验证证据。
- [ ] `node tools/ai-scaffold/dist/cli.js gate` 及相关 feature 门禁通过，或记录等价 CI 证据。

## 7. 风险与问题

- 版本复制、追加与解绑必须避免误删跨版本共享文件绑定。
- `DataPages.tsx` 当前文件体量较大，需在不破坏既有页面的前提下做局部增强。
- worktree 内未内置 `tools/ai-scaffold/dist/` 构建产物，执行门禁/渲染 prompt 时需显式使用相对路径指向仓库根已构建 CLI。
- 若数据集引用检查依赖的训练/模型引用事实不足，需保持 `TODO_CONFIRM_*` 诊断而不能伪造通过。
