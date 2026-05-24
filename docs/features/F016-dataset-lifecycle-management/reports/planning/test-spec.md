> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-dataset-lifecycle-management.md`

# RALPLAN Test Spec: 数据集生命周期管理增强

## 1. Test Strategy

- Backend integration：覆盖数据集编辑、手动创建版本、默认复制上一版本、版本删除门禁、按版本解绑文件、归档/硬删除权限
- Frontend component/e2e：覆盖列表页版本数、详情页版本切换、编辑元信息、新建版本、追加图片、解绑图片、归档/删除入口
- Regression：保证 F009/F015 上传、详情预览、标注入口不回归

## 2. P0 Tests

- 新建数据集自动生成 `v1`
- 编辑数据集只更新元信息
- 新建版本默认复制上一版本文件集合
- 当前选中版本追加图片只影响当前版本
- 当前选中版本解绑图片只解绑不删文件对象
- 已发布/锁定版本不可删，最后一个版本不可删
- 普通用户可归档，非管理员不可彻底删除，管理员可彻底删除
