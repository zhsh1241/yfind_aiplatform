> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-dataset-preparation-pipeline.md`

﻿# Test Spec: F008-dataset-preparation-pipeline

## Acceptance Coverage

- AC-01：规划证据归档完整，`plan.md`、`reports/planning/deep-interview.md`、`reports/planning/prd.md`、`reports/planning/test-spec.md` 齐备。
- AC-02：F008 范围明确覆盖数据收集、清洗、标注、划分、预处理、增强、格式转换与加载全部 7 个步骤。
- AC-03：功能边界明确止于“可直接用于训练的标准数据集”，不包含训练任务提交、模型注册、审批治理。
- AC-04：所有核心步骤均由平台内置能力完成，不允许正式路径依赖外部脚本或外部步骤执行。
- AC-05：默认异常策略明确为“失败即阻断，人工修正后重跑”。
- AC-06：计划明确要求保留过程配置、质量检查结果、版本、重跑记录、权限隔离与协作支持。
- AC-07：复用策略明确复用既有 dataset / permission / training 边界，不引入平行实现。

## Verification Strategy

- 文档检查：确认 F008 的 planning artifacts 全部存在且路径引用正确。
- 契约检查：后续 `contract.md` 需冻结数据准备任务、阶段状态、步骤输入输出、质量门禁、重跑、权限与审计字段。
- 后端测试方向：
  - 数据源接入配置与来源元数据登记
  - 清洗规则执行与质量门禁结果
  - 标注任务、标签结构、一致性校验
  - 划分比例配置与数据快照生成
  - 预处理 / 增强策略执行与失败阻断
  - 格式转换与加载配置生成
  - 阶段状态机、重跑记录、权限校验、审计记录
- 前端测试方向：
  - 数据准备任务列表、详情、阶段进度、失败原因与重跑入口
  - 多来源接入配置界面
  - 清洗 / 标注 / 划分 / 预处理 / 增强 / 转换配置表单
  - 质量检查结果展示与阻断提示
  - 协作与权限隔离下的可见性差异
- 联调检查方向：
  - 同一任务从原始数据接入走到标准训练数据集产出
  - 任一步骤失败时后续步骤被阻断
  - 修正后重跑能够保留历史记录并产出新快照
  - 格式转换结果可被训练侧按约定引用

## Commands Planned For Build Stage

```powershell
$env:JAVA_HOME = "C:\Java\jdk-21.0.6"
mvn -f backend/pom.xml test
Push-Location frontend; npm run lint; npm run test:ci; npm run build; Pop-Location
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F008-dataset-preparation-pipeline
```

## Manual Review

- 确认 F008 没有错误扩展到训练执行、模型治理与推理部署。
- 确认“平台内置完成全部步骤”的表述在 plan / contract / test-plan 中保持一致。
- 确认失败阻断与人工重跑策略不会被写成可静默跳过。
- 确认复用策略不会引导新增第二套 dataset 或 permission 体系。
- 确认开放问题会在 build-feature 前进一步冻结为可执行契约，而不是留成模糊承诺。
