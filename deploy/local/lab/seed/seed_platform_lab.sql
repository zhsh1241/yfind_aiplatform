INSERT INTO platform_config_value (id, config_key, scope_type, scope_id, value_json, masked_value, version, updated_by, updated_at)
VALUES ('CV-storage.bucket-BU-TENANT-CABIN', 'storage.bucket', 'BU', 'TENANT-CABIN', 'smp-datasets', NULL, 1, 'USR-ADMIN', CURRENT_TIMESTAMP)
ON CONFLICT (config_key, scope_type, scope_id) DO UPDATE SET
id = EXCLUDED.id,
value_json = EXCLUDED.value_json,
masked_value = EXCLUDED.masked_value,
version = EXCLUDED.version,
updated_by = EXCLUDED.updated_by,
updated_at = CURRENT_TIMESTAMP;

INSERT INTO platform_config_value (id, config_key, scope_type, scope_id, value_json, masked_value, version, updated_by, updated_at)
VALUES ('CV-storage.bucket-BU-TENANT-QE', 'storage.bucket', 'BU', 'TENANT-QE', 'smp-datasets', NULL, 1, 'USR-ADMIN', CURRENT_TIMESTAMP)
ON CONFLICT (config_key, scope_type, scope_id) DO UPDATE SET
id = EXCLUDED.id,
value_json = EXCLUDED.value_json,
masked_value = EXCLUDED.masked_value,
version = EXCLUDED.version,
updated_by = EXCLUDED.updated_by,
updated_at = CURRENT_TIMESTAMP;

INSERT INTO platform_config_value (id, config_key, scope_type, scope_id, value_json, masked_value, version, updated_by, updated_at)
VALUES ('CV-storage.bucket-GLOBAL-TENANT-YF', 'storage.bucket', 'GLOBAL', 'TENANT-YF', 'smp-datasets', NULL, 2, 'USR-ADMIN', CURRENT_TIMESTAMP)
ON CONFLICT (config_key, scope_type, scope_id) DO UPDATE SET
id = EXCLUDED.id,
value_json = EXCLUDED.value_json,
masked_value = EXCLUDED.masked_value,
version = EXCLUDED.version,
updated_by = EXCLUDED.updated_by,
updated_at = CURRENT_TIMESTAMP;


INSERT INTO platform_config_value (id, config_key, scope_type, scope_id, value_json, masked_value, version, updated_by, updated_at)
VALUES ('CV-storage.prefix-BU-TENANT-CABIN', 'storage.prefix', 'BU', 'TENANT-CABIN', 'TENANT-CABIN', NULL, 1, 'USR-ADMIN', CURRENT_TIMESTAMP)
ON CONFLICT (config_key, scope_type, scope_id) DO UPDATE SET
id = EXCLUDED.id,
value_json = EXCLUDED.value_json,
masked_value = EXCLUDED.masked_value,
version = EXCLUDED.version,
updated_by = EXCLUDED.updated_by,
updated_at = CURRENT_TIMESTAMP;

INSERT INTO platform_config_value (id, config_key, scope_type, scope_id, value_json, masked_value, version, updated_by, updated_at)
VALUES ('CV-storage.prefix-BU-TENANT-QE', 'storage.prefix', 'BU', 'TENANT-QE', 'TENANT-QE', NULL, 1, 'USR-ADMIN', CURRENT_TIMESTAMP)
ON CONFLICT (config_key, scope_type, scope_id) DO UPDATE SET
id = EXCLUDED.id,
value_json = EXCLUDED.value_json,
masked_value = EXCLUDED.masked_value,
version = EXCLUDED.version,
updated_by = EXCLUDED.updated_by,
updated_at = CURRENT_TIMESTAMP;

INSERT INTO data_source (source_id, name, source_type, tenant_id, project_id, endpoint, port, database_name, credential_mode, secret_ref, shared_scope, description, status, last_test_at, diagnostic_code, diagnostic_message, latency_ms, created_by, created_at, updated_at) VALUES
('DSRC-LAB-POSTGRES', '本地 PostgreSQL MES 源库', 'RELATIONAL_DB', 'TENANT-CABIN', NULL, '127.0.0.1', 5432, 'smp_source_mes', 'SECRET_REF', 'secret://local/postgres-source', 'BU', 'Docker 生产仿真：MES 工单与质量测量 PostgreSQL 源库', 'ACTIVE', CURRENT_TIMESTAMP, 'OK', 'DOCKER RELATIONAL_DB connector verified', 5, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSRC-LAB-MYSQL', '本地 MySQL 工位事件源库', 'RELATIONAL_DB', 'TENANT-CABIN', NULL, '127.0.0.1', 3306, 'smp_source_mes', 'SECRET_REF', 'secret://local/mysql-source', 'BU', 'Docker 生产仿真：工位事件与供应商质量 MySQL 源库', 'ACTIVE', CURRENT_TIMESTAMP, 'OK', 'DOCKER RELATIONAL_DB connector verified', 5, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSRC-LAB-MINIO', '本地 MinIO 对象存储', 'OBJECT_STORAGE', 'TENANT-CABIN', NULL, 'http://127.0.0.1:9000', 9000, 'smp-datasets', 'SECRET_REF', 'secret://local/minio', 'BU', 'Docker 生产仿真：S3 兼容对象存储样例桶', 'ACTIVE', CURRENT_TIMESTAMP, 'OK', 'DOCKER OBJECT_STORAGE connector verified', 5, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSRC-LAB-FILE', '本地 HTTP 文件目录', 'FILE', 'TENANT-CABIN', NULL, 'http://127.0.0.1:8082', 8082, '/weld_quality_snapshot.csv', 'NONE', NULL, 'BU', 'Docker 生产仿真：Nginx 静态文件数据源', 'ACTIVE', CURRENT_TIMESTAMP, 'OK', 'DOCKER FILE connector verified', 5, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSRC-LAB-API', '本地工单 API', 'API', 'TENANT-YF', NULL, 'http://127.0.0.1:8081', 8081, '/api/workorders', 'SECRET_REF', 'secret://local/source-api', 'GLOBAL', 'Docker 生产仿真：外部 REST API 工单与质量事件', 'ACTIVE', CURRENT_TIMESTAMP, 'OK', 'DOCKER API connector verified', 5, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSRC-LAB-RABBIT', '本地 RabbitMQ 焊接事件流', 'STREAM', 'TENANT-CABIN', NULL, '127.0.0.1', 5672, 'smp.weld.events', 'SECRET_REF', 'secret://local/rabbitmq', 'BU', 'Docker 生产仿真：RabbitMQ 事件队列', 'ACTIVE', CURRENT_TIMESTAMP, 'OK', 'DOCKER STREAM connector verified', 5, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSRC-LAB-INFLUX', '本地 InfluxDB 时序库', 'TIME_SERIES', 'TENANT-QE', NULL, '127.0.0.1', 8086, 'smp_timeseries', 'SECRET_REF', 'secret://local/influxdb', 'BU', 'Docker 生产仿真：焊接参数与质量测量时序数据', 'ACTIVE', CURRENT_TIMESTAMP, 'OK', 'DOCKER TIME_SERIES connector verified', 5, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSRC-LAB-OPCUA', '本地 OPC-UA 仿真网关', 'INDUSTRIAL_PROTOCOL', 'TENANT-CABIN', NULL, '127.0.0.1', 4840, 'OPC_UA_SIM', 'SECRET_REF', 'secret://local/opcua-sim', 'BU', 'Docker 生产仿真：工业协议遥测点位 TCP 仿真', 'ACTIVE', CURRENT_TIMESTAMP, 'OK', 'DOCKER INDUSTRIAL_PROTOCOL connector verified', 5, 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (source_id) DO UPDATE SET
name=EXCLUDED.name, source_type=EXCLUDED.source_type, tenant_id=EXCLUDED.tenant_id, project_id=EXCLUDED.project_id,
endpoint=EXCLUDED.endpoint, port=EXCLUDED.port, database_name=EXCLUDED.database_name, credential_mode=EXCLUDED.credential_mode,
secret_ref=EXCLUDED.secret_ref, shared_scope=EXCLUDED.shared_scope, description=EXCLUDED.description, status=EXCLUDED.status,
last_test_at=EXCLUDED.last_test_at, diagnostic_code=EXCLUDED.diagnostic_code, diagnostic_message=EXCLUDED.diagnostic_message,
latency_ms=EXCLUDED.latency_ms, updated_at=CURRENT_TIMESTAMP;

INSERT INTO data_source_sync_task (task_id, source_id, target_dataset_id, name, schedule_mode, sync_scope, status, last_run_at, last_result, diagnostic_code, diagnostic_message, created_by, created_at, updated_at) VALUES
('DSYNC-LAB-POSTGRES', 'DSRC-LAB-POSTGRES', NULL, '导入 PostgreSQL MES 工单快照', 'MANUAL', 'mes_work_order,qe_measurement', 'PAUSED', NULL, NULL, 'OK', 'READY_FOR_MANUAL_IMPORT', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSYNC-LAB-MYSQL', 'DSRC-LAB-MYSQL', NULL, '导入 MySQL 工位事件快照', 'MANUAL', 'mes_station_event,supplier_quality_ticket', 'PAUSED', NULL, NULL, 'OK', 'READY_FOR_MANUAL_IMPORT', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSYNC-LAB-MINIO', 'DSRC-LAB-MINIO', NULL, '导入 MinIO 对象清单', 'MANUAL', 'smp-datasets/TENANT-CABIN', 'PAUSED', NULL, NULL, 'OK', 'READY_FOR_MANUAL_IMPORT', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSYNC-LAB-FILE', 'DSRC-LAB-FILE', NULL, '导入 HTTP 文件快照', 'MANUAL', 'weld_quality_snapshot.csv', 'PAUSED', NULL, NULL, 'OK', 'READY_FOR_MANUAL_IMPORT', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSYNC-LAB-API', 'DSRC-LAB-API', NULL, '导入外部 API 工单文本', 'MANUAL', '/api/workorders', 'PAUSED', NULL, NULL, 'OK', 'READY_FOR_MANUAL_IMPORT', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSYNC-LAB-RABBIT', 'DSRC-LAB-RABBIT', NULL, '导入 RabbitMQ 焊接事件批次', 'MANUAL', 'smp.weld.events', 'PAUSED', NULL, NULL, 'OK', 'READY_FOR_MANUAL_IMPORT', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSYNC-LAB-INFLUX', 'DSRC-LAB-INFLUX', NULL, '导入 InfluxDB 焊接时序快照', 'MANUAL', 'weld_metrics,quality_metrics', 'PAUSED', NULL, NULL, 'OK', 'READY_FOR_MANUAL_IMPORT', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('DSYNC-LAB-OPCUA', 'DSRC-LAB-OPCUA', NULL, '导入 OPC-UA 点位遥测快照', 'MANUAL', 'ns=2;s=weld.*', 'PAUSED', NULL, NULL, 'OK', 'READY_FOR_MANUAL_IMPORT', 'USR-ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (task_id) DO UPDATE SET
source_id=EXCLUDED.source_id, name=EXCLUDED.name, schedule_mode=EXCLUDED.schedule_mode, sync_scope=EXCLUDED.sync_scope,
diagnostic_code=EXCLUDED.diagnostic_code, diagnostic_message=EXCLUDED.diagnostic_message, updated_at=CURRENT_TIMESTAMP;
