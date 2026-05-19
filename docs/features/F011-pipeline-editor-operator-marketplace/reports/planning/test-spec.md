> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-pipeline-editor-operator-marketplace.md`

﻿# Test Spec: F011 完整 Pipeline 编辑器与算子市场

## 1. 测试目标

验证 F011 是否按原型和 PRD 实现完整 Pipeline 编辑器、算子市场、版本快照、全局变量、运行历史、自定义算子与权限审计能力，同时确保不破坏 F009/F010 数据集、血缘与标准化能力。

## 2. 覆盖矩阵

| AC | 类型 | 测试重点 |
| --- | --- | --- |
| AC-01 | Frontend/E2E | `/pipeline` 展示工具栏、算子库、画布、节点配置、运行历史、版本快照、全局变量。 |
| AC-02 | API/E2E | 添加算子、拖拽节点、保存 DAG，后端持久化节点/边/坐标/参数。 |
| AC-03 | API/E2E | 节点参数、全局变量、版本快照、回滚/复制。 |
| AC-04 | API/E2E | 测试运行、运行历史、节点日志、失败节点定位。 |
| AC-05 | API/Integration | 成功运行生成输出数据集、版本、文件和血缘。 |
| AC-06 | Frontend/API/E2E | `/opmarket` 分类、搜索、详情、Before/After 预览、统计。 |
| AC-07 | API/E2E/Security | 自定义算子提交、审核、发布/驳回；HTTP endpoint/secretRef 约束。 |
| AC-08 | Security/API | 权限不足、跨 BU、无效 DAG、明文密钥拒绝并审计。 |

## 3. 后端测试

### 3.1 Pipeline CRUD 与版本

- `POST /api/v1/pipelines` 创建 Pipeline。
- `PUT /api/v1/pipelines/{id}` 保存节点、边、变量。
- 断言版本快照生成，版本号递增，作者/时间/说明存在。
- `POST /api/v1/pipelines/{id}/versions/{versionId}/restore` 回滚后当前定义恢复。

### 3.2 DAG 校验

- 有效 DAG：输入节点 -> 清洗/标准化节点 -> 输出节点，返回通过。
- 无效 DAG：
  - 缺少输入节点。
  - 缺少输出节点。
  - 引用不存在算子。
  - 必填参数缺失。
  - 变量引用不存在。
  - 存在环。
- 断言错误码、错误节点 ID、审计事件 `PIPELINE_VALIDATION_FAILED`。

### 3.3 运行与输出

- `POST /api/v1/pipelines/{id}/runs` 触发沙箱测试运行。
- 成功路径断言：`SUCCEEDED`、node runs 全部完成、日志摘要存在、输出 dataset/version/file 存在、`data_lineage.transform_type` 正确。
- 失败路径断言：指定错误节点 `FAILED`，run 为 `FAILED`，不生成输出数据集，审计记录存在。

### 3.4 算子市场

- `GET /api/v1/operators` 支持分类、关键词搜索。
- `GET /api/v1/operators/{id}` 返回 schema、输入输出、示例、统计。
- seed 算子至少覆盖：文件加载、数据库读取、API 拉取、空值填充、去重、异常过滤、数据校验、图像缩放、随机裁剪、颜色抖动、归一化、分词、去停用词、向量化、COCO 转换、YOLO 转换、CSV 导出、F010 标准化模板。

### 3.5 自定义算子安全

- 提交 JSON Schema 算子，状态为 `SUBMITTED`。
- BU Admin 审核通过后 `APPROVED/PUBLISHED`。
- 明文 password/accessKey/token 被拒绝。
- HTTP endpoint 未配置或 TODO_CONFIRM 时不得进入可运行状态。
- 跨 BU 审核/读取被拒绝。

## 4. 前端测试

### 4.1 Unit / Component

- DAG 状态 reducer/helper：添加节点、移动节点、添加边、删除节点时清理边。
- 参数 schema 渲染：string/int/bool/select/json 必填校验。
- 变量引用展示与校验。

### 4.2 E2E: Pipeline 编辑器

1. 登录后点击“Pipeline编辑器”。
2. 验证顶部工具栏：添加算子、配置、调度、保存、运行历史、版本快照、全局变量、运行。
3. 验证左侧算子库与中间画布可见。
4. 从添加算子侧边栏搜索“归一化”，添加到画布。
5. 拖拽节点或调整顺序，保存 Pipeline。
6. 打开全局变量，新增 `BATCH_SIZE`。
7. 打开版本快照，验证新版本出现。
8. 点击运行，验证运行历史出现 `SUCCEEDED`，节点日志可见。

### 4.3 E2E: 算子广场

1. 进入“算子广场”。
2. 分类筛选“数据清洗”。
3. 搜索“YOLO”或“归一化”。
4. 打开算子详情，验证参数、输入输出、Before/After 预览、使用统计。
5. 点击“使用到 Pipeline”或“添加到流水线”，验证跳转/联动。
6. 提交自定义 HTTP 算子，使用 `secret://TODO_CONFIRM_OPERATOR_SECRET`，状态为待审核。

### 4.4 E2E: 权限与异常

- 普通无权限账号访问 `/pipeline` 或保存 Pipeline 显示 403。
- 跨 BU pipeline 不可见。
- 保存有环 DAG 显示错误定位。
- 明文密钥提交显示错误。

## 5. 回归测试

- F009 数据源/数据集 E2E 保持通过。
- F010 数据标准化 E2E 保持通过，或更新为从 Pipeline 模板入口验证但不移除 API 兼容性。
- 全量 `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F011-pipeline-editor-operator-marketplace --skip-backend-integration --run-e2e` 通过。

## 6. 验证命令

```powershell
$env:JAVA_HOME='C:\java\jdk-25'; $env:Path="$env:JAVA_HOME\bin;$env:Path"
mvn -q -f backend/pom.xml -pl smp-app test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
npm --prefix frontend run e2e
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F011-pipeline-editor-operator-marketplace --skip-backend-integration --run-e2e
```

## 7. 验收证据要求

- 后端 surefire 测试摘要。
- 前端 lint/test/build/E2E 输出。
- Playwright F011 专项截图或 trace（如失败则保留）。
- 原型对比 QA 报告：说明 `/pipeline`、`/opmarket` 与原型差异。
- Code review report：至少覆盖安全、复用、数据模型、权限审计、原型一致性。
