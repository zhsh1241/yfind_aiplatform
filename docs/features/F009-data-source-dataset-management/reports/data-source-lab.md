# F009 生产仿真数据源实验室报告

## 目标

为 `RELATIONAL_DB`、`FILE`、`OBJECT_STORAGE`、`API`、`STREAM`、`TIME_SERIES`、`INDUSTRIAL_PROTOCOL` 全部数据源类型准备本地 Docker 组件与测试数据，使验收人员可以在无真实工厂网络的情况下模拟生产导入链路。

## 组件与数据

| 数据源类型 | 本地组件 | 样例数据 |
|---|---|---|
| `RELATIONAL_DB` | PostgreSQL + MySQL | MES 工单、质量测量、工位事件、供应商质量单 |
| `FILE` | Nginx HTTP 文件目录 | 焊接质量 CSV、标注 JSONL |
| `OBJECT_STORAGE` | MinIO | `smp-datasets` bucket 下 raw/preprocessed/text 对象 |
| `API` | Python HTTP API | 工单文本、质量事件 JSON |
| `STREAM` | RabbitMQ + 可选 Kafka | `smp.weld.events` 队列/Topic 事件 |
| `TIME_SERIES` | InfluxDB | 焊接电流/电压与质量尺寸测量 line protocol |
| `INDUSTRIAL_PROTOCOL` | Python TCP 网关 | OPC-UA-like 点位：电流、电压、机器人速度 |

## 平台配置

准备脚本会向 `smp_platform` 写入默认 8 个 `DSRC-LAB-*` 数据源与 8 个 `DSYNC-LAB-*` 手工同步任务；使用 `-WithKafka` 后额外写入 Kafka stream 实例。所有默认数据源本地状态为：

- `status=ACTIVE`
- `diagnostic_code=OK`
- `diagnostic_message=DOCKER <SOURCE_TYPE> connector verified`

## 使用方式

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/prepare-data-source-lab.ps1

# 如需 Kafka Topic 也纳入 STREAM 验收：
powershell -ExecutionPolicy Bypass -File deploy/scripts/prepare-data-source-lab.ps1 -WithKafka
```

随后在页面进入“数据管理 / 数据源管理”，点击各 `DSRC-LAB-*` 数据源的测试/激活/同步入口；也可直接运行对应 `DSYNC-LAB-*` 同步任务触发导入，后端会生成数据集、版本、文件绑定与血缘记录。

## 边界

该实验室是本地生产仿真 sandbox：组件、端口、账号均为本地测试默认值，不作为正式生产配置。正式 LDAP、PAI、KMS、对象存储、Kafka ACL、工业网关参数仍需在部署 ADR 或环境配置中以 `TODO_CONFIRM_*` 完成确认。
