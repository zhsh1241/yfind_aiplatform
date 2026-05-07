> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-model-registry-mvp.md`

# Test Spec: F006-model-registry-mvp

## Acceptance Coverage
- AC-01：后端模型列表、详情、注册、审批、驳回、归档 API。
- AC-02：模型版本来源可追踪到 F005 training job 和 artifact URI。
- AC-03：版本详情展示评测指标、checksum、状态、deployable。
- AC-04：`model:read` / `model:manage` 权限 trace。
- AC-05：前端模型仓库列表、详情、审批/驳回交互。
- AC-06：Playwright 覆盖模型仓库主流程。
- AC-07：feature 文档、contract、test-plan、gate、work-item-link 可追踪。

## Verification Strategy
- Backend：MockMvc 覆盖 list/detail/register/approve/reject/archive。
- Frontend：Vitest 覆盖页面渲染、详情抽屉和审批弹窗。
- E2E：Playwright 从“模型仓库”导航进入，查看模型版本并完成审批。
- Scaffold：check-build-feature-prereqs、verify-contract、check-task-traceability、gate。

## Regression Focus
- F005 训练中心页面和 artifact 展示不被破坏。
- F003 导航中 `model` 模块由占位升级为正式页面，不影响其他模块。
- F002 权限词表中 `model:read` / `model:manage` 保持兼容。
