> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-dataset-lifecycle-management.md`

# RALPLAN PRD: 数据集生命周期管理增强

## 1. RALPLAN-DR Summary

### Principles

1. Dataset 元信息与 Dataset 版本是两套概念。
2. 版本由用户显式管理，而不是隐式自动演化。
3. 当前选中版本内的图片增删必须局部生效，不影响其他版本。
4. 删除策略要保守：普通归档、管理员硬删除、最后一个版本不可删、文件对象仅解绑。
5. 优先复用 F009/F015/F007 既有 seam，不新增平行模型。

### Decision Drivers

1. 用户要的是“同一数据集多个版本”，不是把状态当版本。
2. 平台后端已有基础 seam，主要缺少正式生命周期规则与前端入口。
3. 必须保护历史版本与文件对象，避免破坏追溯能力。

### Viable Options

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| 直接扩展现有 F009/F015 生命周期能力 | 复用最多，风险最低 | 需要补较多前端交互 | **Chosen** |
| 新建独立版本子系统 | 边界更“新” | 与现有 `dataset_version` 重复 | Rejected |
| 只补前端入口，不改后端规则 | 开发快 | 无法满足最后一个版本保护与管理员门禁 | Rejected |

## 2. Functional Requirements

- 新建数据集后自动创建 `v1`
- 列表页展示版本数
- 详情页支持版本切换
- 编辑数据集只修改元信息
- 手动创建版本，默认复制上一版本图片集合
- 当前选中版本允许追加与解绑图片
- 已发布/锁定版本不可删，最后一个版本不可删
- 普通用户可归档，管理员可彻底删除

## 3. Reuse Strategy

### Must Reuse

- F009 `dataset` / `dataset_version` / `dataset_file`
- F015 上传与追加图片能力
- F007 `platform_file_object`
- F006 权限、租户、审计

### Explicitly forbidden duplication

- 不新增平行版本表
- 不新增平行文件对象事实源
- 不把数据集编辑实现成影子数据集

### New seams justified

需要补“删除单版本”和“按版本解绑图片”的正式服务 seam，因为现有 F009 只有创建版本和绑定文件。
