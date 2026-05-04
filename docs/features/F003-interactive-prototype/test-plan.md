# 测试计划：可点击平台原型

## 自动化测试

- 渲染平台名称和中文模块导航。
- 点击数据资产导航并验证页面切换。
- 点击上传数据集并验证弹窗。
- 点击启动训练并验证步骤弹窗。
- 点击部署模型并验证确认弹窗。

## 命令

```powershell
Push-Location frontend
npm run lint
npm run test:ci
npm run build
Pop-Location
```
