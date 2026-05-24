# F016 QA Acceptance Report

- **Feature**: `F016-dataset-lifecycle-management`
- **报告时间**: 2026-05-24（Asia/Shanghai）
- **Verdict**: PASS
- **范围依据**:
  - `docs/features/F016-dataset-lifecycle-management/TASK.md`
  - `docs/features/F016-dataset-lifecycle-management/contract.md`
  - `docs/features/F016-dataset-lifecycle-management/test-plan.md`
  - `docs/features/F016-dataset-lifecycle-management/reports/code-review-report.md`
  - `docs/features/F016-dataset-lifecycle-management/reports/integration-check-report.md`

## Summary

本次 QA 验收基于 F016 冻结契约、测试计划与既有验证证据执行，重点按 `test-plan.md` 的 **P0 阻塞项优先**进行放行判断。

综合现有证据：
- 后端 `DataManagementControllerTest` 已通过，覆盖版本创建/切换/删除、归档/硬删除、上传追加、跨 BU、内容安全与审计关键路径。
- 前端 lint、build、TypeScript 编译以及 3 个 F016 相关 Playwright 用例均已通过。
- 最新代码审查 Verdict：**PASS**。
- 最新联调检查 Verdict：**PASS**。

结论：F016 已满足 QA 验收放行条件，**无阻塞问题**。

## P0/P1/P2 执行摘要

### P0 执行摘要

P0 阻塞范围已获得自动化或正式报告证据覆盖，结论全部通过：

- **AC-01**：已验证新建数据集自动生成 `v1`、列表展示 `versionCount`、详情支持版本切换。
- **AC-03**：已验证新建版本默认复制来源版本文件绑定，且记录 `sourceVersionId`。
- **AC-04**：已验证当前版本追加/解绑仅影响当前版本，不删除底层 `platform_file_object`。
- **AC-05**：已验证已发布/归档版本不可变、最后一个版本不可删、非当前版本不可追加/解绑。
- **AC-06**：已验证普通管理员可归档、硬删除需管理员且受归档前置与引用检查约束。
- **AC-07**：已验证上传向导 `APPEND_VERSION` 模式只追加到既有当前版本，不创建影子 dataset/version。
- **AC-08**：已验证 DAT-002 / DAT-005 / DAT-011 / DAT-012 规则与审计事件覆盖。

**P0 证据引用**：
- 后端：`mvn -q -f backend/pom.xml -pl smp-app test -Dtest=DataManagementControllerTest` 通过
- 前端：`npx playwright test e2e/data-source-dataset-management.spec.ts e2e/local-dataset-upload.spec.ts e2e/dataset-lifecycle-management.spec.ts` 通过
- 代码审查：`docs/features/F016-dataset-lifecycle-management/reports/code-review-report.md` → PASS
- 联调检查：`docs/features/F016-dataset-lifecycle-management/reports/integration-check-report.md` → PASS

### P1 执行摘要

P1 范围已有覆盖证据，未发现影响放行的问题：

- 编辑数据集与编辑版本内容已保持分离。
- 删除当前版本后的 `currentVersionId` 回退逻辑已有后端自动化验证。
- 归档/硬删除入口分层、管理员显隐和错误反馈已在联调与 E2E 中得到验证。
- 上传会话重复提交、空会话、非法目标版本、文件完整性校验失败等重要负路径已有测试计划映射与后端覆盖依据。

### P2 执行摘要

P2 为增强型体验与边界补充项，现有证据显示整体行为与契约一致：

- 历史版本只读视图、归档后详情只读、非法 `versionId` 访问等场景已被设计纳入并与现有实现一致。
- 未发现会影响当前验收放行的低优先级缺口。

## Issues Found

### 阻塞问题
- 无。

### 非阻塞问题
- `npm --prefix frontend run lint` 存在**既有 warning**，但报告已说明为历史遗留，不构成 F016 阻塞问题。

## Contract Compliance

对照 `contract.md`，本次 QA 认为 F016 已满足主要契约要求：

- **数据模型约束**：版本复制仅复制 `dataset_file` 绑定，不复制底层文件对象。
- **当前版本语义**：仅当前且可变版本允许追加、解绑、上传追加。
- **删除门禁**：最后一个版本不可删，已发布/归档版本不可变，硬删除要求“已归档 + 超级管理员 + DAT-011 引用检查”。
- **上传追加契约**：`APPEND_VERSION` commit 不创建新数据集/新版本，提交后仍指向原目标版本。
- **规则约束**：DAT-002、DAT-005、DAT-011、DAT-012 均有明确验证证据。
- **审计契约**：代码审查报告确认关键生命周期事件与 reject 事件覆盖齐全。

契约符合性结论：**Compliant**。

## User Experience

基于联调报告与 Playwright 证据，用户体验达到验收标准：

- 列表页可直接看到版本数、当前版本及归档/删除分层入口。
- 详情页支持版本切换，历史版本具备只读提示，避免误编辑。
- 上传向导支持“追加到既有版本”，提交后回到目标详情并保持版本上下文一致。
- 关键失败场景（安全阻断、只读版本、归档后只读、越权/跨 BU）具备可感知反馈，不属于静默失败。

## Test Coverage Summary

### 自动化与验证证据摘要

| 层级 | 证据 | 结果 |
| --- | --- | --- |
| Backend Integration | `mvn -q -f backend/pom.xml -pl smp-app test -Dtest=DataManagementControllerTest` | PASS |
| Frontend Lint | `npm --prefix frontend run lint` | PASS（仅既有 warning） |
| Frontend Build | `npm run build` | PASS |
| TypeScript | `npx tsc -b --pretty false` | PASS |
| Playwright E2E | `data-source-dataset-management.spec.ts` / `local-dataset-upload.spec.ts` / `dataset-lifecycle-management.spec.ts` | PASS |
| Code Review | `code-review-report.md` | PASS |
| Integration Check | `integration-check-report.md` | PASS |

### AC 覆盖结论

- AC-01 ~ AC-08：均已具备测试计划映射与对应验证证据。
- P0 阻塞项：未发现缺失覆盖。
- 回归范围：F009/F015 相关列表、详情、上传与引用路径未见回退证据。

## Recommendations

1. 保持 `DataManagementControllerTest` 作为 F016 生命周期规则回归主入口，后续修改必须继续锁定 DAT-002 / DAT-005 / DAT-011 / DAT-012。
2. 后续若处理前端既有 lint warning，建议与功能交付解耦，单独跟踪，不影响本次放行。
3. 后续新增版本 diff / 恢复 / 批量操作时，应新增独立 feature 测试计划，避免侵蚀 F016 当前契约边界。

## Sign-off

- **QA 结论**：F016 满足当前 QA 验收条件。
- **放行建议**：允许进入后续 gate / 交付收尾流程。
- **阻塞状态**：无阻塞问题。

## 最终 Verdict

**PASS**
