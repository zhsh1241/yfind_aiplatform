> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-dataset-asset-mvp.md`

﻿# Test Spec: F004-dataset-asset-mvp

## Acceptance Coverage

- AC-01：规划证据存在并归档到 F004 feature 目录。
- AC-02：数据资产 MVP 明确覆盖列表、搜索、筛选、上传、元数据登记、版本、样例预览、权限申请与审批。
- AC-03：授权模型明确为“数据集级查看 + 版本级下载”。
- AC-04：上传策略明确为“通用文件可上传，图片预览有保证”。
- AC-05：hash、去重策略、异步预处理队列被纳入 F004 正式范围。
- AC-06：存储策略明确为“抽象接口 + 默认本地文件系统实现”。
- AC-07：验收标准同时覆盖端到端业务闭环与处理链路稳定性。

## Verification Strategy

- 文档检查：确认 `plan.md`、`reports/planning/deep-interview.md`、`reports/planning/prd.md`、`reports/planning/test-spec.md` 已齐备。
- 契约检查：后续 `contract.md` 必须冻结数据集、版本、文件条目、授权申请、审批、异步任务、预览与下载边界。
- 后端测试方向：
  - 数据集 CRUD 与版本生成
  - 文件上传与 hash 记录
  - 去重策略分支
  - 异步任务状态流转
  - 数据集级查看授权
  - 版本级下载授权
  - 申请 / 审批流程
- 前端测试方向：
  - 列表、搜索、筛选
  - 上传入口与元数据录入
  - 图片样例预览
  - 申请 / 审批交互
  - 无下载权限时的版本下载限制
- 联调检查方向：
  - 上传完成后版本可见
  - 审批通过后下载权限生效
  - 异步预处理状态能回传到前端

## Commands Planned For Build Stage

```powershell
$env:JAVA_HOME = "C:\Java\jdk-21.0.6"
mvn -f backend/pom.xml test
Push-Location frontend; npm run lint; npm run test:ci; npm run build; Pop-Location
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F004-dataset-asset-mvp
```

## Manual Review

- 确认对象存储引用、外部系统同步、数据源连接测试未被错误纳入 F004。
- 确认图片预览与通用文件上传的边界描述一致。
- 确认授权分层不会与 F002 权限基线冲突。
- 确认异步预处理与去重策略不是“占位承诺”，而是后续 build-feature 的正式交付目标。
