# F009 验证报告

## 概览

- Verdict: PASS
- 日期：2026-05-18
- 范围：F009 数据源与数据集管理基础能力，以及本地 Docker 生产仿真数据源实验室。

## 本地 Docker 集成环境

- Docker Desktop 已启动，`docker compose version` 可用。
- PostgreSQL：`smp-platform-postgres`，端口 `localhost:5432`，平台库 `smp_platform`，源库 `smp_source_mes`。
- Redis：`smp-platform-redis`，端口 `localhost:6379`。
- MySQL：`smp-platform-mysql`，端口 `localhost:3306`，源库 `smp_source_mes`。
- MinIO：`smp-platform-minio`，端口 `localhost:9000/9001`，bucket `smp-datasets`。
- RabbitMQ：`smp-platform-rabbitmq`，端口 `localhost:5672/15672`，queue `smp.weld.events`。
- InfluxDB：`smp-platform-influxdb`，端口 `localhost:8086`，bucket `smp_timeseries`。
- API 数据源、HTTP 文件源、工业协议 TCP 仿真网关均已启动。
- Kafka 作为可选 stream 实例，可通过 `-WithKafka` 启动并写入 `DSRC-LAB-KAFKA`。

## 生产仿真数据源实验室执行证据

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/prepare-data-source-lab.ps1 -SkipBackend
# READY: PostgreSQL / MySQL / Redis / MinIO / RabbitMQ / InfluxDB / HTTP API Source / HTTP File Source / Industrial Protocol TCP
# data_source: DSRC-LAB-API, DSRC-LAB-FILE, DSRC-LAB-INFLUX, DSRC-LAB-MINIO, DSRC-LAB-MYSQL, DSRC-LAB-OPCUA, DSRC-LAB-POSTGRES, DSRC-LAB-RABBIT 均 ACTIVE / OK
# data_source_sync_task: DSYNC-LAB-* 共 8 个手工任务均 PAUSED / READY_FOR_MANUAL_IMPORT
# PostgreSQL 源库：mes_work_order=3, qe_measurement=4
# MySQL 源库：mes_station_event=3, supplier_quality_ticket=2
# MinIO bucket smp-datasets 已写入 raw/preprocessed/text 样例对象
# RabbitMQ queue smp.weld.events 已写入 2 条事件
```

说明：默认 STREAM 生产仿真由 RabbitMQ 覆盖，以避免首次拉取 Confluent 镜像阻塞本地测试；如需 Kafka，可执行：

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/prepare-data-source-lab.ps1 -WithKafka
```

## 回归命令证据

```powershell
$env:JAVA_HOME='C:\java\jdk-21.0.6'
mvn -q -f backend/pom.xml -pl smp-app test
# Tests run: 25, Failures: 0, Errors: 0, Skipped: 0

npm --prefix frontend run lint
# 0 errors, 1 existing react-refresh warning

npm --prefix frontend run build
# vite build passed

npm --prefix frontend run test:ci -- --pool=threads --poolOptions.threads.singleThread=true
# 1 file passed, 6 tests passed

npm --prefix frontend run e2e
# 9 tests passed

node tools/ai-scaffold/dist/cli.js check-task-traceability docs/features/F009-data-source-dataset-management
node tools/ai-scaffold/dist/cli.js verify-contract docs/features/F009-data-source-dataset-management
# traceability passed; contract frozen/ready
```

## 已验证事项

- F009 `RELATIONAL_DB`、`FILE`、`OBJECT_STORAGE`、`API`、`STREAM`、`TIME_SERIES`、`INDUSTRIAL_PROTOCOL` 均有本地 Docker 生产仿真数据源与测试数据。
- 后端 sandbox / Docker connector 可生成数据集、版本、文件绑定与血缘。
- 前端数据源、数据集详情、文件信息、导入说明、类型文案与 E2E 均通过回归。
- 文档已同步：`deploy/README.md`、`contract.md`、`test-plan.md`、`reports/data-source-lab.md`、本验证报告。

## 已知非阻塞项

- 前端 lint 仍有既有 `AppNavigation.tsx` Fast Refresh warning，非 error。
- Playwright 日志仍有 Ant Design `Space.direction` deprecated warning，未阻断 E2E。
- Kafka 默认不启动；使用 `-WithKafka` 时会额外拉取 Confluent 镜像并写入 Kafka 数据源。
- 正式生产 LDAP、PAI、KMS、对象存储、Kafka ACL、工业网关参数仍需以 `TODO_CONFIRM_*` 在部署 ADR 或环境配置中确认。

## 连接测试实时回归证据（2026-05-18）

针对页面“数据源测试连接”出现 `TODO_CONFIRM_CONNECTOR_FOR_INDUSTRIAL_PROTOCOL` / `TODO_CONFIRM_CONNECTOR_FOR_OBJECT_STORAGE` / `TODO_CONFIRM_CONNECTOR_FOR_RELATIONAL_DB` 的问题，已补充连接探测 fallback 并重启本地后端。验证命令：

```powershell
$env:JAVA_HOME='C:\java\jdk-21.0.6'
$env:PATH='C:\java\jdk-21.0.6\bin;' + $env:PATH
mvn -q -f backend/pom.xml -pl smp-app test
# DataManagementControllerTest: Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
```

页面同源后端 `http://localhost:8080` 实时调用 `/api/v1/data-sources/{id}/test` 结果：

| 数据源 | 类型 | 结果 | 诊断 |
| --- | --- | --- | --- |
| DSRC-LAB-POSTGRES | RELATIONAL_DB | SUCCESS | DOCKER RELATIONAL_DB connector verified |
| DSRC-LAB-MYSQL | RELATIONAL_DB | SUCCESS | DOCKER RELATIONAL_DB connector verified |
| DSRC-LAB-MINIO | OBJECT_STORAGE | SUCCESS | DOCKER OBJECT_STORAGE connector verified |
| DSRC-LAB-FILE | FILE | SUCCESS | DOCKER FILE connector verified |
| DSRC-LAB-API | API | SUCCESS | DOCKER API connector verified |
| DSRC-LAB-RABBIT | STREAM | SUCCESS | DOCKER STREAM connector verified |
| DSRC-LAB-INFLUX | TIME_SERIES | SUCCESS | DOCKER TIME_SERIES connector verified |
| DSRC-LAB-OPCUA | INDUSTRIAL_PROTOCOL | SUCCESS | DOCKER INDUSTRIAL_PROTOCOL connector verified |

修复点：后端 connector probe 不再只按单一 `endpoint` 探测；对 `127.0.0.1`、`localhost`、`host.docker.internal` 和 Docker service/container name 做候选回退，HTTP 类连接对 MinIO 使用 `/minio/health/live`，TCP 类连接支持带 scheme 的 endpoint 规范化。
