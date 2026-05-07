# F005 训练任务 MVP QA 验收报告

- 结论：PASS_WITH_ISSUES
- 范围：以 worktree `C:\GIT\yfind_aiplatform\.codex\worktrees\feature-training-job-mvp` 为准
- 日期：2026-05-05

## 一、验收范围
重点检查 P0：训练列表、创建、取消、日志摘录、artifact 空态、ai-adapter submit、前端 E2E。

## 二、验证结果

### 1) 后端训练任务 API
- 验证命令：`mvn test -q`
- worktree 结果：通过（`TrainingControllerTest` 7/7 通过）
- 证据：`backend/target/surefire-reports/TEST-com.yfind.aiplatform.training.TrainingControllerTest.xml`
- 覆盖点：
  - 列表 `GET /api/training-jobs`
  - 详情 `GET /api/training-jobs/{jobKey}`
  - 创建 `POST /api/training-jobs`
  - 取消 `POST /api/training-jobs/{jobKey}/cancel`
  - 模板查询 `GET /api/training-jobs/templates`
  - 非法 datasetVersion 409
  - 非法取消状态 409

### 2) ai-adapter submit
- 验证命令：`python -m compileall app tests`、`python -m unittest discover -s tests -v`
- 结果：通过（2/2 通过）
- 证据：`ai-adapter/tests/test_training.py`
- 结论：`/internal/api/training-jobs/submit` 已实现，但为 `local-stub` 返回，不接真实编排器。

### 3) 前端训练页 / 单测
- 验证命令：`npm run lint`、`npm run test:ci`、`npm run build`
- 结果：通过（Vitest 10/10 通过；build 通过）
- 证据：
  - `frontend/src/App.test.tsx`
  - `frontend/src/pages/TrainingPage.tsx`
  - `frontend/src/prototype-data.ts`
- 覆盖点：训练看板、创建、取消、日志摘录、artifact 空态、详情展示。

### 4) 前端 E2E
- 验证命令：`npm run e2e`
- 结果：通过（2/2 通过）
- 证据：`frontend/e2e/training-job-mvp.spec.ts`
- 说明：覆盖了创建训练与取消运行中任务的主交互。

## 三、P0 结论
- 训练列表：通过
- 创建：通过
- 取消：通过
- 日志摘录：通过
- artifact 空态：通过
- ai-adapter submit：通过（stub）
- 前端 E2E：通过（stub 原型流）

## 四、问题与限制
1. **实现为 mock/stub / 内存态**
   - backend 训练数据为 seed + 内存状态；ai-adapter 为 `local-stub`；前端训练页使用 prototype data。
   - 未验证真实持久化、真实调度器、真实对象存储、真实权限链路、mTLS / `X-Service-Token`。

2. **E2E 覆盖不等于真实集成**
   - `frontend/e2e/training-job-mvp.spec.ts` 验证的是原型交互，不是后端真实 API + admin 账号端到端链路。
   - 未产出截图/录屏归档。

3. **契约 / 文档存在乱码**
   - `docs/features/F005-training-job-mvp/contract.md` 与 `test-plan.md` 中大量中文显示为 `???`，影响人工审阅与追溯。

4. **环境差异**
   - 主仓库默认 Java 8 下 `mvn test` 失败；worktree 验证使用 `C:\java\jdk-25` 才通过。
   - 项目约定为 Java 21，当前未直接验证 Java 21 环境。

5. **Gate 未执行**
   - 本次未运行 `node tools/ai-scaffold/dist/cli.js gate`，因此 AC-06/AC-07 的 gate 级追溯未完全闭环。

## 五、最终 Verdict
**PASS_WITH_ISSUES**：P0 功能在 worktree 中已通过自动化验证，但存在 stub/内存态限制、E2E 未覆盖真实 admin 集成、文档乱码、Java 版本环境差异及 gate 未执行等问题。
