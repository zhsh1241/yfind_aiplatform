# F014 QA 验收报告

## Verdict
PASS

## 验收覆盖
- AC-01/AC-02：ACTIVE IMAGE 数据集可创建多个标注任务，同源任务可查询。
- AC-04/AC-05/AC-06：未完成导出拒绝；完成发布后支持 SMP/Label Studio/COCO/YOLO/VOC，包声明包含图片副本。
- AC-07：超过 200MB 进入异步状态；导出过期时间为 3 个月。
- AC-08：download-url seam 未配置时返回 TODO 诊断，不伪造 URL。
- AC-10：前端 Tab、创建任务、导出弹窗、下载诊断已由 Playwright 覆盖。

## 执行命令
- `mvn -q -f backend/pom.xml -pl smp-app test`：PASS。
- `npm --prefix frontend run lint`：PASS，保留既有 Fast Refresh warning。
- `npm --prefix frontend run build`：PASS，保留既有 chunk-size warning。
- `npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true`：PASS，Vitest 1 file / 10 tests passed；jsdom 输出既有 CSS parse warning。
- `npm --prefix frontend run e2e -- e2e/dataset-annotation-task-export.spec.ts --project=chromium`：PASS，1 passed。

## 未覆盖/剩余风险
- 未接入真实 MinIO 内容流、KMS、TLS、生产签名有效期；保持 `TODO_CONFIRM_*` 诊断。
- Mask PNG palette/像素编码仍由后续实现级规范固化。
