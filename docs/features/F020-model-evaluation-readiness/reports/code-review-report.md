# F020 模型评估结果与发布门禁 Code Review Report（R3 复审）

## Summary
- Feature: F020-model-evaluation-readiness
- Date: 2026-06-05
- Reviewer: code-reviewer
- Verdict: PASS_WITH_COMMENTS
- 结论：R3 已关闭 R2 阻塞项。CR-01-R2 的 dataset artifact 下载路径已在文件 assetType 为 `DATASET` 时同时要求 `data:dataset:download` 与有效 `dataset_access_grant`（跨 BU 场景），并继续校验 dataset/version/file 绑定；MA-03-R2 已补充跨 BU “仅模型授权无数据集授权拒绝下载 + 补授 dataset_access_grant 后允许下载”的集成回归测试。当前未发现需阻塞放行的问题。

## R3 Closure Matrix
| 原问题 | R3 状态 | 复审证据 | 结论 |
|---|---|---|---|
| CR-01-R2 Dataset artifact 下载未复用跨 BU 数据集访问授权 | Closed | `ModelEvaluationService.requireArtifactFileAccessible` 在 `file.assetType()='DATASET'` 分支先要求 `data:dataset:download`，再调用 `requireDatasetDownloadAccess`；后者对非超管、非同租户、非 PUBLIC 数据集查询 `dataset_access_grant`，要求 `status='ACTIVE'`、`version_id IS NULL OR version_id=?` 且未过期，否则记录 `MODEL_EVALUATION_ARTIFACT_ACCESS_BLOCKED` 并返回 `40304`。 | 已关闭 |
| MA-03-R2 缺少 CR-01-R2 权限回归测试 | Closed | `ModelEvaluationControllerTest` 已新增跨 BU scoped `model_access_grant` 用户下载 dataset artifact 返回 `40304` 的负向断言，并在插入对应 `dataset_access_grant` 后断言同一下载接口返回 `code=0` 且 `downloadUrl` 非空。 | 已关闭 |

## Files Reviewed
| File | Scope | Issues |
|---|---:|---:|
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/ModelEvaluationService.java` | R3 修复复审：artifact 文件授权、dataset grant 校验、审计 | 0 |
| `backend/smp-app/src/test/java/com/yf/smp/app/platform/ModelEvaluationControllerTest.java` | R3 回归测试复审：跨 BU dataset artifact 下载负向/正向路径 | 0 |
| `docs/features/F020-model-evaluation-readiness/reports/code-review-report.md` | 复审结论更新 | 0 |

## Issues

### Critical / Must Fix
无。

### Major / Should Fix Before Merge
无。

### Minor / Nice to Have
| ID | File | Line | Issue | Suggestion |
|---|---|---:|---|---|
| MI-01-R3 | `backend/smp-app/src/test/java/com/yf/smp/app/platform/ModelEvaluationControllerTest.java` | 170-178 | 当前 MA-03-R2 已覆盖下载拒绝/授权放行；未额外断言 `MODEL_EVALUATION_ARTIFACT_ACCESS_BLOCKED` 审计日志内容。代码已记录该审计，因此不阻塞放行。 | 后续若拆分测试，可增加一条审计查询断言，避免授权拒绝路径的审计 tag 回归。 |

## Security Review
- [x] Dataset artifact 下载不再仅依赖模型查看授权；跨 BU 调用者必须具备 `dataset_access_grant`。
- [x] 下载入口仍先执行 `model:evaluation:download` 权限与 `requireViewableModel`，模型不可见用户无法探测 artifact。
- [x] Dataset artifact 仍校验 `platform_file_object.tenant_id == run.tenant_id` 与 `dataset_file(dataset_id, version_id, file_id, status='BOUND')`，避免租户错配或未绑定文件被下载。
- [x] SQL 查询使用参数绑定；未发现字符串拼接注入。
- [x] 拒绝路径记录 `MODEL_EVALUATION_ARTIFACT_ACCESS_BLOCKED`，满足审计设计方向。

## Performance Review
- [x] R3 修复仅在单次 artifact 下载/导入校验中增加一次 dataset version 查询与一次 grant count 查询，范围固定、可接受。
- [x] `dataset_access_grant` 已有 `(dataset_id, user_id, status, expires_at)` 索引；当前查询可利用核心前缀过滤。
- [x] 未引入循环数据库访问或 N+1 查询。

## Test / Verification Evidence
| Command | Result | Notes |
|---|---|---|
| `mvn -pl smp-app -Dtest=ModelEvaluationControllerTest test`（在 `backend/`） | PASS | 1 test；覆盖 F020 主链路、CR-02、MA-01、CR-01-R2/MA-03-R2 的跨 BU dataset artifact 下载拒绝与补 grant 放行。 |

## Recommendation
- 可放行：`PASS_WITH_COMMENTS`。
- 非阻塞建议：后续测试拆分时补充 `MODEL_EVALUATION_ARTIFACT_ACCESS_BLOCKED` 审计日志断言，提高审计回归粒度。
