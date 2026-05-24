# SMP Deploy

SMP 工业 AI 小模型平台部署工程骨架，提供本地联调 Compose、基础 Helm chart 与 smoke 检查脚本。

## 目录

| 路径 | 说明 |
|---|---|
| `local/docker-compose.yml` | 本地联调服务编排示例 |
| `helm/smp-platform` | Kubernetes / Helm 部署草案 |
| `scripts/smoke.ps1` | 后端健康检查与前端首页 smoke 检查 |
| `scripts/prepare-data-source-lab.ps1` | F009 生产仿真数据源实验室一键启动与种子数据脚本 |

## 外部参数

生产环境镜像仓库、命名空间、Ingress/Gateway、KMS、LDAP、Kafka ACL、对象存储和 MLOps 参数继续使用 `TODO_CONFIRM_*` 占位，必须在对应 feature 或部署 ADR 中确认后才能替换。

# 生产仿真数据源实验室

F009 数据源与数据集管理提供一套本地 Docker 生产仿真环境，用于在没有真实工厂网络、对象存储、消息队列、时序库或工业协议网关时完成端到端测试。该环境只用于本地联调与验收，不替代真实生产系统；正式外部参数仍保留 `TODO_CONFIRM_*`。

## 一键准备

```powershell
# 启动缺失组件并灌入全量测试数据
powershell -ExecutionPolicy Bypass -File deploy/scripts/prepare-data-source-lab.ps1

# 可选启动 Kafka（镜像较大；默认用 RabbitMQ 覆盖 STREAM）
powershell -ExecutionPolicy Bypass -File deploy/scripts/prepare-data-source-lab.ps1 -WithKafka

# 只灌数据，不重新执行 compose
powershell -ExecutionPolicy Bypass -File deploy/scripts/prepare-data-source-lab.ps1 -SkipCompose -SkipBackend
```

脚本会启动/准备 PostgreSQL、Redis、MySQL、MinIO、RabbitMQ、InfluxDB、本地 API、HTTP 文件源和工业协议仿真网关；使用 `-WithKafka` 时额外启动 Kafka。脚本会把数据源与手工同步任务写入 `smp_platform`。

## 数据集文件存储（已接通 Docker MinIO）

当前后端已接通本地 Docker MinIO，以下数据文件默认写入 `smp-platform-minio` / `smp-datasets`：

- 上传向导 `POST /api/v1/platform/files/*`
- 数据源同步导入生成的数据集文件
- 数据标准化输出文件
- Pipeline 输出文件
- 标注结果文件
- 标注训练导出包

默认环境变量如下（`deploy/local/docker-compose.yml` 已内置）：

```env
SMP_STORAGE_ENDPOINT=http://minio:9000
SMP_STORAGE_PUBLIC_ENDPOINT=http://localhost:9000
SMP_STORAGE_BUCKET=smp-datasets
SMP_STORAGE_ACCESS_KEY=smpminio
SMP_STORAGE_SECRET_KEY=smpminio_local_password
```

若在宿主机直接启动 backend，可改为：

```env
SMP_STORAGE_ENDPOINT=http://localhost:9000
SMP_STORAGE_PUBLIC_ENDPOINT=http://localhost:9000
SMP_STORAGE_BUCKET=smp-datasets
SMP_STORAGE_ACCESS_KEY=smpminio
SMP_STORAGE_SECRET_KEY=smpminio_local_password
```

文件下载接口现在返回 MinIO 预签名 URL，不再停留在 `TODO_CONFIRM_MINIO_ENDPOINT` 占位；其中：

- `SMP_STORAGE_ENDPOINT`：容器内 backend 访问 MinIO 的地址
- `SMP_STORAGE_PUBLIC_ENDPOINT`：返回给浏览器的可访问地址（本地默认 `http://localhost:9000`）

## 服务清单

| 类型 | 容器 | 端口 | 账号/说明 |
|---|---|---:|---|
| 平台元数据库 / PostgreSQL 源库 | `smp-platform-postgres` | 5432 | `smp/smp_local_password`，库：`smp_platform`、`smp_source_mes` |
| Redis 缓存 | `smp-platform-redis` | 6379 | 样例 key：`smp:line:*`、`smp:dataset:hot` |
| MySQL 关系源库 | `smp-platform-mysql` | 3306 | `root/<MYSQL_ROOT_PASSWORD>`；新建 compose 默认为 `smp_root_password`，复用旧容器时以 `docker exec smp-platform-mysql printenv MYSQL_ROOT_PASSWORD` 为准 |
| MinIO 对象存储 | `smp-platform-minio` | 9000/9001 | `smpminio/smpminio_local_password`，bucket：`smp-datasets`；backend compose 默认直连 `http://minio:9000` |
| RabbitMQ 事件流 | `smp-platform-rabbitmq` | 5672/15672 | `smp/<RABBITMQ_DEFAULT_PASS>`；新建 compose 默认为 `smp_rabbit_password`，复用旧容器时以 `docker exec smp-platform-rabbitmq printenv RABBITMQ_DEFAULT_PASS` 为准 |
| Kafka 事件流（可选） | `smp-platform-kafka` | 9092 | topic：`smp.weld.events` |
| InfluxDB 时序库 | `smp-platform-influxdb` | 8086 | org：`yanfeng`，bucket：`smp_timeseries`，token：`smp_influx_token` |
| API 数据源 | `smp-platform-source-api` | 8081 | `GET /health`、`GET /api/workorders`、`GET /api/quality-events` |
| 文件数据源 | `smp-platform-file-source` | 8082 | `weld_quality_snapshot.csv`、`weld_annotations.jsonl` |
| 工业协议仿真 | `smp-platform-industrial` | 4840 | TCP 文本协议，发送 `READ` 返回 OPC-UA-like 点位 JSON |
| 标注工具 | `smp-platform-label-studio` | 8083 | Label Studio 独立服务；本地访问 `http://localhost:8083`，数据卷 `smp_label_studio_data`，只读挂载 `deploy/local/lab/file-source` 作为样例文件 |
| 后端（可选） | `smp-platform-backend` | 8080 | Spring Boot API |
| 前端（可选） | `smp-platform-frontend` | 5173 | Web 控制台 |

## 平台内置数据源 ID

| 数据源 ID | 类型 | 对应组件 | 同步任务 ID |
|---|---|---|---|
| `DSRC-LAB-POSTGRES` | `RELATIONAL_DB` | PostgreSQL `smp_source_mes` | `DSYNC-LAB-POSTGRES` |
| `DSRC-LAB-MYSQL` | `RELATIONAL_DB` | MySQL `smp_source_mes` | `DSYNC-LAB-MYSQL` |
| `DSRC-LAB-MINIO` | `OBJECT_STORAGE` | MinIO `smp-datasets` | `DSYNC-LAB-MINIO` |
| `DSRC-LAB-FILE` | `FILE` | HTTP 文件目录 | `DSYNC-LAB-FILE` |
| `DSRC-LAB-API` | `API` | 外部工单 API | `DSYNC-LAB-API` |
| `DSRC-LAB-RABBIT` | `STREAM` | RabbitMQ 队列 | `DSYNC-LAB-RABBIT` |
| `DSRC-LAB-KAFKA` | `STREAM` | Kafka Topic（使用 `-WithKafka` 后写入） | `DSYNC-LAB-KAFKA` |
| `DSRC-LAB-INFLUX` | `TIME_SERIES` | InfluxDB bucket | `DSYNC-LAB-INFLUX` |
| `DSRC-LAB-OPCUA` | `INDUSTRIAL_PROTOCOL` | 工业协议 TCP 仿真 | `DSYNC-LAB-OPCUA` |

## 验证命令

```powershell
docker exec smp-platform-postgres psql -U smp -d smp_platform -c "select source_id,source_type,status,diagnostic_code from data_source where source_id like 'DSRC-LAB-%' order by source_id;"
docker exec smp-platform-postgres psql -U smp -d smp_source_mes -c "select count(*) from mes_work_order; select count(*) from qe_measurement;"
docker exec smp-platform-mysql sh -lc "mysql -uroot -p`$MYSQL_ROOT_PASSWORD -e 'select count(*) from smp_source_mes.mes_station_event;'"
curl http://localhost:8081/health
curl http://localhost:8082/weld_quality_snapshot.csv
docker exec smp-platform-minio mc ls local/smp-datasets --recursive
```
