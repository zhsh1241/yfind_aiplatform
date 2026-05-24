---
feature: F016-dataset-lifecycle-management
title: 数据集生命周期管理增强
plan_status: draft
approved_at: ""
owner: codex
created_at: 2026-05-23
updated_at: 2026-05-23
---

# Plan: 数据集生命周期管理增强

## 1. 背景与目标

F009 已建立数据集、版本、文件绑定、权限、血缘与引用检查的基础后端 seam，F015 已补齐真实图片批量上传与上传完成后的详情预览能力。但当前前端仍缺少“正式生命周期操作”：数据集编辑、手动创建多版本、按版本追加/解绑图片、版本删除门禁、普通归档与管理员硬删除等产品能力，导致用户虽然拥有底层能力，却无法以正式产品方式使用。

本次目标是在不新增平行数据模型的前提下，把现有后端能力和少量必要规则增强整合成完整的数据集生命周期体验。

### 参考依据

- `docs/business/bizdocs/03-01-系统功能-数据管理.md`
- `docs/business/domain/01-领域对象-数据域.md`
- `docs/business/rules/01-数据管理规则.md`
- `docs/business/api/01-API接口规范.md`
- `reports/planning/deep-interview.md`
- `reports/planning/prd.md`
- `reports/planning/test-spec.md`

## 2. 范围

### In Scope

1. 数据集管理页新增：编辑、归档、删除、版本数展示。
2. 数据集详情页新增：
   - 版本列表/切换
   - 新建版本
   - 版本删除
   - 当前版本追加图片
   - 当前版本解绑图片
   - 编辑数据集元信息
3. 上传向导支持“追加到当前选中版本”的复用入口。
4. 后端补充版本删除、版本文件解绑、最后一个版本保护、管理员硬删除门禁。

### Out of Scope

- 不做版本对比（diff）
- 不做版本回滚/恢复
- 不做批量版本操作
- 不新增第二套版本/文件事实源

## 3. 技术方案要点

### Backend

- 保持 `dataset` / `dataset_version` / `dataset_file` / `platform_file_object` 为唯一事实源。
- 新增或扩展服务操作：
  - 查询版本数
  - 删除单个版本
  - 从指定版本解绑文件
  - 指定 `datasetId + versionId` 的追加图片入口
  - 管理员硬删除门禁
- 规则上明确区分：
  - **版本号**：`v1` / `v2` / `v3`
  - **状态**：`DRAFT` / `PUBLISHED` / `ARCHIVED` / `DELETED`

### Frontend

- `DatasetManagementPage`
  - 新增版本数列
  - 新增编辑、归档、删除入口
- `DatasetDetailPage`
  - 新增版本切换区
  - 新增“新建版本”弹窗
  - 新增“编辑数据集”弹窗
  - 新增“追加图片到当前版本”入口
  - 新增“从当前版本解绑图片”入口
- `DatasetUploadPage`
  - 增加“追加到既有数据集版本”模式

## 4. 风险与依赖

- 版本复制与解绑逻辑若不谨慎，容易误删跨版本共享文件绑定。
- 若前端不清晰区分“编辑数据集”和“编辑版本内容”，用户容易混淆。
- 若管理员硬删除门禁只做前端不做后端，会存在越权风险。

## 5. Reuse Strategy / 复用策略

### 必须复用

- `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java`
- `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementController.java`
- `frontend/src/features/platform/platformApi.ts`
- `frontend/src/features/data/DatasetUploadPage.tsx`
- F007 `platform_file_object`
- F006 权限、租户、审计底座

### 明确禁止复制

- 不新增平行版本表/文件表
- 不把“编辑数据集”实现成影子数据集
- 不再造第二套上传流程或版本缓存状态

### 新增 seam 的必要性

现有 F009 只有“创建版本”和“绑定文件”，缺少“删除单版本”“从某个版本解绑图片”“管理员硬删除门禁”这些正式生命周期 seam，因此需要在原服务上做最小闭环增强，而不是重构整套模型。

## 6. 与后续 TASK 验收项对应关系（草案）

- AC-01：新建数据集自动创建 `v1`
- AC-02：列表页显示版本数；详情页可切换版本
- AC-03：编辑数据集只改元信息
- AC-04：手动创建新版本默认复制上一版本文件集合
- AC-05：当前选中版本允许追加与解绑图片
- AC-06：已发布/锁定版本不可删，最后一个版本不可删
- AC-07：普通用户可归档，管理员可彻底删除

## 7. 审批说明

请审阅 `plan.md`。若通过，请人工把 frontmatter 改为：

```yaml
plan_status: approved
approved_at: YYYY-MM-DD
```

然后执行：

```powershell
node tools/ai-scaffold/dist/cli.js check-plan-approved docs/features/F016-dataset-lifecycle-management
```

通过后再进入 `/build-feature`。
