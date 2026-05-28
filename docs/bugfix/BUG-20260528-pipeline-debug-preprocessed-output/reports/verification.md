# 验证记录：BUG-20260528 Pipeline 调试模式与预处理产物格式

## 验证环境

- 日期：2026-05-28
- 工作目录：`C:\GIT\yfind_aiplatform`
- 后端：Java 21 / Maven / Spring Boot 测试 profile
- 前端：React / TypeScript / Vite / Vitest

## 已执行命令与结果

```powershell
npm --prefix frontend run test:ci -- DataPages.test.tsx
```

结果：通过，`DataPages.test.tsx` 11 个测试全部通过。

```powershell
mvn -pl smp-app "-Dtest=VisualPreprocessPipelineControllerTest#debugRunShowsNodeProgressAndCreatesUsableImageFilesInsteadOfZip,VisualPreprocessPipelineControllerTest#videoPipelineRunCreatesPendingResultThenManualActivateForAnnotation" test
```

结果：通过，2 个后端回归测试全部通过。

```powershell
npm --prefix frontend run build
```

结果：通过，`tsc -b` 与 `vite build` 成功；Vite 仅报告既有 chunk size warning。

```powershell
node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration
```

结果：通过，质量门禁成功完成：

- 后端 Maven 测试：71 tests，0 failures，0 errors。
- AI adapter Python 测试：4 tests，OK。
- 前端 lint：0 errors，7 warnings（既有 react-refresh / hooks warnings）。
- 前端 Vitest：2 test files，43 tests，全部通过。
- 前端 build：成功；Vite 仅报告 chunk size warning。

## 覆盖结论

- 调试模式：`DEBUG` 运行详情返回 `debugMode=true`，节点日志包含步骤、输入、输出、状态和调试采样。
- 预处理产物：视频抽帧输出绑定 `image/jpeg` 文件，object key 不再以 `.zip` 结尾，数据集详情可预览。
- 回归链路：既有视频抽帧结果 `PENDING_CONFIRMATION -> CONFIRMED -> ACTIVE` 与标注来源链路未被破坏。
