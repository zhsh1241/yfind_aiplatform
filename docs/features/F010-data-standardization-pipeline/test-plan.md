# Test Plan: F010 数据标准化

## P0

- AC-01 后端：`GET /api/v1/data-standards/overview` 展示所有可见数据集标准画像、字段映射、质量分和问题数。
- AC-02 后端：`GET /api/v1/datasets/{id}/standard-profile` 基于数据集 `dataType` 与来源 `sourceType` 覆盖关系库、对象、文件、API、流、时序、工业协议。
- AC-03 后端：`POST /api/v1/data-standard-tasks` 支持创建标准化任务，校验权限与 BU 可见性。
- AC-04 后端：`POST /api/v1/data-standard-tasks/{id}/run` 生成 `PREPROCESSED` 数据集、发布版本、标准化文件和 `STANDARDIZATION` 血缘。
- AC-05 前端：`/pipeline` 页面按原型展示数据校验、清洗、归一化、格式转换，并能创建/运行任务。
- 安全：权限与 BU 隔离复用 F006/F009。

## Commands

```powershell
mvn -q -f backend/pom.xml -pl smp-app test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
npm --prefix frontend run e2e
```
