> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-dataset-lifecycle-management.md`
> Interview transcript: `.omx/interviews/dataset-lifecycle-management-20260523T220044Z.md`

# Deep Interview Spec: dataset-lifecycle-management

## Metadata

- Feature slug: dataset-lifecycle-management
- Feature directory: docs/features/F016-dataset-lifecycle-management/
- Profile: standard
- Rounds: 17
- Final ambiguity: 0.11
- Threshold: 0.20
- Context type: brownfield
- Context snapshot: .omx/context/dataset-lifecycle-management-20260523T220044Z.md
- Interview transcript: .omx/interviews/dataset-lifecycle-management-20260523T220044Z.md

## Intent

让同一数据集在平台内具备多版本演进能力，同时把“元信息编辑”“版本内容管理”“归档/硬删除治理”拆分为清晰、可审计、可授权的操作模型。

## Desired Outcome

1. 新建数据集自动生成 `v1`
2. 一个数据集下允许多个版本
3. 版本平级展示，由用户手动选择当前查看版本
4. 编辑数据集只改元信息
5. 版本由用户手动创建，默认复制上一版本图片集合
6. 当前选中版本允许追加与解绑图片
7. 已发布/锁定版本不可删，最后一个版本不可删
8. 普通用户可归档，管理员可彻底删除

## In Scope

- 数据集管理页新增：编辑、归档、删除、版本数展示。
- 数据集详情页新增：版本列表/切换、新建版本、版本删除、向当前版本追加图片、从当前版本解绑图片、编辑数据集元信息。
- 上传向导支持“追加到当前选中版本”的复用入口。
- 后端补充版本删除、版本文件解绑、最后一个版本保护、管理员硬删除门禁。

## Out-of-Scope / Non-goals

- 不做版本差异比较（diff）
- 不做版本回滚/恢复
- 不做批量版本操作
- 不新增第二套版本/文件事实源
