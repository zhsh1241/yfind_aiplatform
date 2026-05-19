# F010 原型对比与完整测试报告

- **Feature**: `F010-data-standardization-pipeline`
- **报告时间**: 2026-05-18 20:55（Asia/Shanghai）
- **结论**: PASS_WITH_NOTES
- **测试对象**: 基于数据集的数据标准化与 Pipeline 能力
- **原型依据**: `docs/prototype/SMP工业AI平台-原型v2.html` 的 `pipeline`、`opmarket`、`dsdetail`
- **实现依据**: `docs/features/F010-data-standardization-pipeline/{plan.md,TASK.md,contract.md,test-plan.md}`

## 1. 总体结论

F010 已按“数据标准能力归属 Pipeline / 算子能力、基于 F009 数据集执行标准化”的范围落地：

- 没有新增独立“数据标准中心”，入口仍在数据管理域下的 `/pipeline`。
- 后端已提供冻结契约中的标准画像、任务创建、任务运行 API，并复用 F009 数据集、版本、文件、血缘和 F006 权限/审计 seam。
- 任务运行后可生成 `PREPROCESSED` 输出数据集、发布版本、`STANDARDIZED` 文件绑定和 `STANDARDIZATION` 血缘。
- 前端 `/pipeline` 已从占位页替换为真实的数据标准化页面，覆盖数据校验、清洗、归一化、格式转换等原型语义。
- 全量质量门禁通过：后端测试、AI adapter 编译/单测、前端 lint/test/build/E2E 均通过。

需要说明：F010 当前不是对原型 `Pipeline编辑器` 的 1:1 视觉/交互复刻。拖拽画布、完整算子市场预览、运行历史、版本快照、全局变量等仍属于完整 Pipeline 编排能力，未在 F010 范围内实现；本期实现的是“数据集标准化闭环”。

## 2. 原型对比范围

| 原型位置 | 原型能力 | F010 对比结论 |
| --- | --- | --- |
| `MENU` 数据管理：`Pipeline编辑器`、`算子广场` | 数据标准/清洗不作为独立中心，而在 Pipeline / 算子语义中表达 | 符合。实现保留数据管理域入口 `/pipeline` 和 `opmarket`，但 `/pipeline` 菜单文案为“数据标准 / Pipeline”，非原型原文。 |
| `Pipeline` 的 `OP_CATALOG` | 文件/数据库/API 读取，空值填充、去重、异常过滤、数据校验、归一化、COCO/YOLO/CSV 格式转换等 | 部分符合且覆盖 F010 范围。前端展示数据校验、空值填充、去重、异常过滤、归一化、格式转换；未实现完整图像/文本处理算子目录和拖拽添加。 |
| `Pipeline` 编辑器画布 | 工具栏、节点画布、节点配置、运行、历史、快照、全局变量 | F010 未做 1:1 画布。实现改为标准画像 + 标准化任务表 + 运行按钮，属于计划内的标准化闭环。 |
| `dsdetail` 血缘图 | 数据源 -> 数据集 -> Pipeline -> 下游的血缘链路 | 符合核心语义。运行标准化任务后写入 `STANDARDIZATION` 血缘，并输出 `PREPROCESSED` 数据集。 |
| `opmarket` 算子广场 | 算子说明、效果预览、使用统计 | 保留原型路由/权限；F010 未将真实任务与算子市场做深度联动，属于后续完整 Pipeline/算子市场能力。 |

## 3. 实现核对

### 3.1 后端

| 文件 | 核对结果 |
| --- | --- |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementController.java` | 已暴露 `GET /api/v1/data-standards/overview`、`GET /api/v1/datasets/{id}/standard-profile`、`GET/POST /api/v1/data-standard-tasks`、`POST /api/v1/data-standard-tasks/{id}/run`。 |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataManagementService.java` | 已实现标准画像、任务创建、任务运行、输出数据集/版本/文件/血缘生成；权限使用 `data:standard:read/write/run`。 |
| `backend/smp-app/src/main/java/com/yf/smp/app/platform/DataDtos.java` | 已定义 F010 response/request DTO。 |
| `backend/smp-app/src/main/resources/db/migration/V7__data_standardization.sql` | 已新增 `data_standard_task` 表、权限、角色权限和初始标准化任务样例。 |
| `backend/smp-app/src/test/java/com/yf/smp/app/platform/DataManagementControllerTest.java` | 已包含 F010 标准画像、任务创建、任务运行、输出 `PREPROCESSED` 和 `STANDARDIZATION` 血缘断言。 |

### 3.2 前端

| 文件 | 核对结果 |
| --- | --- |
| `frontend/src/components/AppNavigation.tsx` | 已在数据管理域保留 `pipeline` 与 `opmarket`，`pipeline` 文案为“数据标准 / Pipeline”。 |
| `frontend/src/App.tsx` | `/pipeline` 路由指向真实 `DataPipelineStandardPage`，按菜单权限控制访问。 |
| `frontend/src/features/data/DataPages.tsx` | 已实现数据标准概览、画像表、标准化算子语义卡、字段标准映射、标准化任务创建/运行。 |
| `frontend/src/features/platform/platformApi.ts` | 已接入 F010 API client 与类型定义。 |
| `frontend/e2e/data-standardization-pipeline.spec.ts` | 已覆盖 `/pipeline` 页面、原型语义文案、画像表、字段映射、创建任务、运行任务和输出数据集提示。 |

## 4. 验收项覆盖

| AC | 验收要求 | 结果 | 证据 |
| --- | --- | --- | --- |
| AC-01 | 展示所有可见数据集标准画像、字段映射、质量分和问题数 | PASS | 后端 `dataStandardizationProfilesAndRunsOnDatasetsFromDifferentSources`；前端 E2E 验证画像表和字段映射。 |
| AC-02 | 画像基于数据集 `dataType` 与来源 `sourceType`，覆盖多源数据集 | PASS_WITH_NOTES | 代码实现通过 `data_lineage -> data_source.source_type` 推断来源，并按 `dataType` 生成字段标准；F009 connector 测试覆盖保留数据源类型导入。直接 F010 断言重点覆盖 IMAGE/TEXT，建议后续补一组全 sourceType profile 参数化断言。 |
| AC-03 | 支持创建标准化任务 | PASS | 后端 `POST /api/v1/data-standard-tasks` 断言 `READY`；前端 E2E 验证“标准化任务已创建”。 |
| AC-04 | 运行任务后生成 `PREPROCESSED` 数据集、发布版本、标准化文件和 `STANDARDIZATION` 血缘 | PASS | 后端断言 `SUCCEEDED`、输出数据集 ID、质量分 >= 90、输出详情 `datasetType=PREPROCESSED`、`fileRole=STANDARDIZED`、`transformType=STANDARDIZATION`。 |
| AC-05 | 前端 `/pipeline` 按原型展示数据校验、清洗、归一化、格式转换等能力 | PASS_WITH_NOTES | E2E 验证“数据校验”“归一化”“格式转换”等可见；完整拖拽 Pipeline 编辑器不在 F010 实现范围。 |

## 5. 测试执行记录

### 5.1 前置与文档门禁

| 命令 | 结果 |
| --- | --- |
| `node tools/ai-scaffold/dist/cli.js check-feature-artifacts docs/features/F010-data-standardization-pipeline` | PASS |
| `node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F010-data-standardization-pipeline` | PASS |
| `node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F010-data-standardization-pipeline` | PASS |
| `node tools/ai-scaffold/dist/cli.js check-code-review-verdict docs/features/F010-data-standardization-pipeline` | PASS，Code Review verdict 为 `PASS_WITH_COMMENTS` |

### 5.2 后端测试

| 命令 | 结果 |
| --- | --- |
| `mvn -q -f backend/pom.xml -pl smp-app test`（默认 PATH 为 Java 8） | FAIL，环境错误：Java 8 不满足 `release 21`，不可作为功能失败判定。 |
| `mvn -q -f backend/pom.xml -pl smp-app test`（切换到 JDK 21+/25 后） | PASS |
| `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F010-data-standardization-pipeline --skip-backend-integration --skip-code-review-verdict --run-e2e` 中 Backend 阶段 | PASS；当前门禁输出 `Tests run: 27, Failures: 0, Errors: 0, Skipped: 0`，Flyway 迁移 v1-v7 全部应用成功。 |

环境注意：本机默认 `java` 指向 `C:\Program Files\Java\jdk1.8.0_202`；执行后端测试必须显式使用项目基线要求的 Java 21+。

### 5.3 前端静态检查、单测与构建

| 命令 | 结果 |
| --- | --- |
| `npm --prefix frontend run lint` | PASS；0 errors，1 warning：`AppNavigation.tsx` 的 react-refresh `only-export-components` 既有警告。 |
| `npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true` | PASS；1 test file，6 tests passed。 |
| `npm --prefix frontend run build` | PASS；Vite 构建成功；存在 chunk > 500kB 的非阻断警告。 |

### 5.4 E2E

| 命令 | 结果 |
| --- | --- |
| `npm --prefix frontend run e2e -- data-standardization-pipeline.spec.ts` | PASS；1 passed。 |
| `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F010-data-standardization-pipeline --skip-backend-integration --skip-code-review-verdict --run-e2e` 中 E2E 阶段 | PASS；10 passed。 |

F010 专项 E2E 覆盖内容：

1. 登录并进入“数据标准 / Pipeline”。
2. 验证页面标题和“按原型落地的数据标准能力”说明。
3. 验证“数据校验”“归一化”“格式转换”等原型语义可见。
4. 选择“焊缝缺陷检测数据集”。
5. 验证字段标准映射与 `object_key` 字段可见。
6. 创建标准化任务并看到“标准化任务已创建”。
7. 运行任务并看到输出数据集 `DATASET-STANDARDIZED-001` 的成功提示。

### 5.5 AI Adapter 与全量门禁

| 命令 | 结果 |
| --- | --- |
| `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F010-data-standardization-pipeline --skip-backend-integration --skip-code-review-verdict --run-e2e` | PASS |
| gate 内 `python -m compileall app tests` | PASS |
| gate 内 `python -m unittest discover -s tests -v` | PASS；4 tests passed。 |

## 6. 非阻断警告与风险

| 类型 | 内容 | 影响 | 建议 |
| --- | --- | --- | --- |
| 环境 | 默认 Java 为 1.8，后端需 Java 21+ | 若未切换 JDK 会误报编译失败 | 在本机 shell/profile 或 README 中固定 `JAVA_HOME` 为 Java 21+。 |
| 前端 lint | `AppNavigation.tsx` 导出常量导致 react-refresh warning | 不影响构建/运行 | 后续可将 `prototypePages` 移到单独常量文件。 |
| 构建 | Vite 提示主 bundle > 500kB | 不影响 F010 功能 | 后续按路由拆分或 code splitting。 |
| E2E 控制台 | Ant Design `Space direction` deprecated warning，另有 CSS parse warning | 不影响当前测试通过 | 后续将 `direction` 改为 `orientation`，并排查测试环境 CSS parser 警告来源。 |
| 原型一致性 | F010 不是完整 Pipeline 编辑器视觉复刻 | 不影响 F010 计划内验收；对“完整原型复刻”预期需说明 | 后续单独规划完整 Pipeline DAG/算子市场功能。 |
| 覆盖深度 | AC-02 全 sourceType 的标准画像当前以代码审查 + F009 connector 测试为主 | 对多源画像回归的自动化粒度仍可加强 | 增加参数化 API 测试：对每类 sourceType 导入数据集后调用 `standard-profile` 并断言 `sourceType` 与标准字段。 |

## 7. 最终判定

- **功能实现**：PASS
- **原型语义一致性**：PASS_WITH_NOTES
- **自动化测试**：PASS
- **质量门禁**：PASS
- **是否可继续后续功能开发**：可以，但完整 Pipeline 编辑器/算子市场应作为后续独立 feature 规划。
