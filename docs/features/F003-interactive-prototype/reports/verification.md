# 验证报告：可点击平台原型

## 验证日期

2026-04-30

## 验证范围

- 前端中文可点击原型页面。
- 模块导航、流程节点、详情抽屉、关键操作弹窗、训练步骤流、部署确认弹窗。
- 基于 `design.md` 的 Apple 风格重设计：黑色全局导航、磨砂子导航、满屏产品 tile、单一蓝色交互、低 chrome 卡片。
- F003 验收项 AC-01 至 AC-05。

## 自动化验证结果

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npm run lint` | 通过 | TypeScript `tsc --noEmit` 无类型错误。 |
| `npm run test:ci` | 通过 | Vitest 运行 1 个测试文件、6 个用例全部通过。 |
| `npm run build` | 通过 | Vite 生产构建成功。 |
| `node tools/ai-scaffold/dist/cli.js check-work-item-link --stdin` | 通过 | 代码变更已关联到 feature 文档。 |
| `node tools/ai-scaffold/dist/cli.js gate` | 通过 | 后端、AI Adapter、前端综合质量门禁通过。 |

## 验收项追踪

- AC-01：通过测试「点击导航后切换到数据资产并打开上传弹窗」验证模块导航可切换内容。
- AC-02：通过测试「点击流程节点后打开详情抽屉」验证流程节点详情反馈；概览卡片同用 `openDetail` 抽屉交互。
- AC-03：通过上传数据集、启动训练步骤流、部署模型弹窗测试验证关键按钮交互。
- AC-04：监控审计模块和告警按钮均接入详情抽屉或消息反馈。
- AC-05：lint/test/build 已通过。

## 已知风险

- 当前为前端静态原型，真实登录、文件上传、模型训练、推理服务和边缘下发仍需后续 feature 接入后端 API。
- Vite 构建提示主包超过 500 kB，原因是 Ant Design/图标在原型阶段一次性打包；正式产品化时再按路由和组件做代码分割。
