# F005 训练任务 MVP 代码复审报告

- Feature：F005-training-job-mvp
- 复审日期：2026-05-05
- 复审方式：针对历史 BLOCK 项逐项复核当前 worktree 与自动化门禁结果
- Verdict: PASS

## 复审范围

- `backend/src/main/java/com/yfind/aiplatform/training/`
- `backend/src/test/java/com/yfind/aiplatform/training/TrainingJobControllerTest.java`
- `ai-adapter/app/api/training.py`
- `ai-adapter/tests/test_health.py`
- `frontend/src/pages/TrainingPage.tsx`
- `frontend/src/modals/TrainingModal.tsx`
- `frontend/src/App.test.tsx`
- `frontend/e2e/training-job.spec.ts`
- `docs/features/F005-training-job-mvp/`

## 历史 BLOCK 项处理结果

1. **训练 API 权限/认证边界缺失**：已修复。
   - 新增 `TrainingAuthorizationService`。
   - 训练 API 要求 `Authorization: Bearer LOCAL_DEV_TOKEN`。
   - 支持 `X-Platform-Permissions` 权限收窄：读接口需要 `training:read`，创建需要 `training:execute`，取消需要 `training:manage`。
   - 新增 401/403 MockMvc 回归测试。

2. **创建训练任务复用/覆盖种子任务**：已修复。
   - `TrainingJobService.create()` 生成独立 `jobKey`，使用 `jobs.add(0, record)` 新增记录，不覆盖既有种子任务。

3. **正式文档乱码**：已修复。
   - `plan.md`、`TASK.md`、`contract.md`、`test-plan.md`、`sql/migration-notes.md`、`reports/verification.md` 已 UTF-8 中文重写。

4. **真实编排仍为 stub**：已降级为明确限制，不再阻塞 MVP。
   - contract、TASK、SQL notes、verification 均声明 `TODO_CONFIRM_MODEL_ARTIFACT_URI`、`TODO_CONFIRM_WORKFLOW_ENGINE_QUEUE` 和真实 MLOps 接入为后续生产化事项。

## 复审结论

当前 F005 达到 MVP 放行标准：权限边界已有本地开发 token 与权限头校验，状态污染问题已修复，文档可读，stub 限制已显式记录并由测试覆盖。

## 仍需后续生产化处理

- 将 `LOCAL_DEV_TOKEN` 替换为 F002 统一认证主体和真实 token 校验。
- 将内存任务状态迁移到数据库状态机。
- 接入真实 Kubeflow / Argo / MLflow / 对象存储。
- 增加跨服务审计落表、幂等提交和重试策略。

## 验证证据

- 后端 `mvn test` 通过。
- ai-adapter unittest 通过。
- 前端 lint、Vitest、build 通过。
- Playwright E2E 通过。
- scaffold gate 可在不跳过 code review verdict 的情况下通过。
