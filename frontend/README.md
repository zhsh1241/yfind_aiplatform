# SMP Frontend

YFI / 延锋 SMP 工业 AI 小模型平台管理台前端工程骨架。

## 技术栈

- React 19
- TypeScript 6.x
- Vite 8
- Ant Design 6
- TanStack Query 5
- Zustand 5
- Vitest + Playwright

## 命令

```powershell
npm install
npm run lint
npm run test:ci
npm run build
npm run e2e
```

当前 F004 仅保留 25 个原型页面 key 的路由占位、Ant Design 布局、API client 与查询缓存底座。后续业务功能必须参考 `docs/features/FEATURE_BREAKDOWN.md`、`docs/business/` 和 `docs/prototype/` 接入真实 API。