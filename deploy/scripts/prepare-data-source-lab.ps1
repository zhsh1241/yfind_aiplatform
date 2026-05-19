param(
    [switch]$SkipCompose,
    [switch]$SkipBackend,
    [switch]$WithKafka
)

$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$ComposeFile = Join-Path $Root 'deploy\local\docker-compose.yml'
$SeedDir = Join-Path $Root 'deploy\local\lab\seed'

function Write-Step([string]$Message) { Write-Host "`n==> $Message" -ForegroundColor Cyan }
function Wait-Until([string]$Name, [scriptblock]$Probe, [int]$TimeoutSeconds = 180) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            & $Probe | Out-Null
            if ($LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE) {
                Write-Host "READY: $Name"
                return
            }
        } catch {}
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)
    throw "等待超时：$Name"
}
function Ensure-CoreContainer([string]$Name, [string]$RunArgs) {
    $exists = docker ps -a --format '{{.Names}}' | Where-Object { $_ -eq $Name }
    if (-not $exists) {
        Invoke-Expression "docker run -d --name $Name $RunArgs" | Out-Host
    } else {
        docker start $Name | Out-Null
    }
}
function Invoke-PostgresFile([string]$Database, [string]$FileName) {
    $local = Join-Path $SeedDir $FileName
    docker cp $local "smp-platform-postgres:/tmp/$FileName" | Out-Null
    docker exec smp-platform-postgres psql -v ON_ERROR_STOP=1 -U smp -d $Database -f "/tmp/$FileName"
}
function Invoke-MySqlFile([string]$FileName) {
    $local = Join-Path $SeedDir $FileName
    docker cp $local "smp-platform-mysql:/tmp/$FileName" | Out-Null
    docker exec smp-platform-mysql sh -lc "mysql -uroot -p`$MYSQL_ROOT_PASSWORD --default-character-set=utf8mb4 < /tmp/$FileName"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw '缺少 Docker CLI。' }

if (-not $SkipCompose) {
    Write-Step '启动/补齐 Docker 生产仿真组件'
    Ensure-CoreContainer 'smp-platform-postgres' '-e POSTGRES_DB=smp_platform -e POSTGRES_USER=smp -e POSTGRES_PASSWORD=smp_local_password -p 5432:5432 -v smp_postgres_data:/var/lib/postgresql/data postgres:16-alpine'
    Ensure-CoreContainer 'smp-platform-redis' '-p 6379:6379 -v smp_redis_data:/data redis:7-alpine'
    Ensure-CoreContainer 'smp-platform-mysql' '-e MYSQL_DATABASE=smp_source_mes -e MYSQL_USER=smp_source -e MYSQL_PASSWORD=smp_source_password -e MYSQL_ROOT_PASSWORD=smp_root_password -p 3306:3306 -v smp_mysql_data:/var/lib/mysql mysql:8.4'
    Ensure-CoreContainer 'smp-platform-minio' '-e MINIO_ROOT_USER=smpminio -e MINIO_ROOT_PASSWORD=smpminio_local_password -p 9000:9000 -p 9001:9001 -v smp_minio_data:/data minio/minio:RELEASE.2025-04-22T22-12-26Z server /data --console-address ":9001"'
    Ensure-CoreContainer 'smp-platform-rabbitmq' '-e RABBITMQ_DEFAULT_USER=smp -e RABBITMQ_DEFAULT_PASS=smp_rabbit_password -p 5672:5672 -p 15672:15672 -v smp_rabbitmq_data:/var/lib/rabbitmq rabbitmq:4-management-alpine'
    docker compose -f $ComposeFile up -d --build influxdb source-api industrial-protocol file-source
    if ($WithKafka) { docker compose -f $ComposeFile up -d --build zookeeper kafka }
}

Write-Step '等待基础组件就绪'
Wait-Until 'PostgreSQL smp_platform' { docker exec smp-platform-postgres pg_isready -U smp -d smp_platform } 180
Wait-Until 'MySQL smp_source_mes' { docker exec smp-platform-mysql mysqladmin ping -h 127.0.0.1 -uroot -psmp_root_password --silent } 180
Wait-Until 'Redis' { docker exec smp-platform-redis redis-cli ping } 60
Wait-Until 'MinIO' { docker exec smp-platform-minio mc ready local } 120
Wait-Until 'RabbitMQ' { docker exec smp-platform-rabbitmq rabbitmq-diagnostics -q ping } 120
try { Wait-Until 'InfluxDB' { docker exec smp-platform-influxdb influx ping } 180 } catch { Write-Warning $_.Exception.Message }
try { Wait-Until 'HTTP API Source' { Invoke-WebRequest -UseBasicParsing http://localhost:8081/health } 60 } catch { Write-Warning $_.Exception.Message }
try { Wait-Until 'HTTP File Source' { Invoke-WebRequest -UseBasicParsing http://localhost:8082/weld_quality_snapshot.csv } 60 } catch { Write-Warning $_.Exception.Message }
try { Wait-Until 'Industrial Protocol TCP' { Test-NetConnection 127.0.0.1 -Port 4840 | Where-Object TcpTestSucceeded } 60 } catch { Write-Warning $_.Exception.Message }
if ($WithKafka) { try { Wait-Until 'Kafka' { docker exec smp-platform-kafka kafka-broker-api-versions --bootstrap-server localhost:9092 } 180 } catch { Write-Warning $_.Exception.Message } }

Write-Step '准备 PostgreSQL / MySQL 关系型源库'
Invoke-PostgresFile 'smp_platform' 'create_source_db.sql'
Invoke-PostgresFile 'smp_source_mes' 'seed_pg_source.sql'
Invoke-MySqlFile 'seed_mysql_source.sql'

Write-Step '准备 Redis 缓存/实时状态样例'
docker exec smp-platform-redis redis-cli DEL smp:line:CABIN-WELD-01:status smp:line:CABIN-WELD-02:status smp:quality:latest:gap_mm smp:dataset:hot | Out-Null
docker exec smp-platform-redis redis-cli HSET smp:line:CABIN-WELD-01:status status RUNNING currentA 12.3 voltageV 48.7 oee 0.91 | Out-Null
docker exec smp-platform-redis redis-cli HSET smp:line:CABIN-WELD-02:status status IDLE currentA 0 voltageV 0 oee 0.86 | Out-Null
docker exec smp-platform-redis redis-cli SET smp:quality:latest:gap_mm 1.12 | Out-Null
docker exec smp-platform-redis redis-cli LPUSH smp:dataset:hot DATASET-WELD-DEFECT DATASET-WELD-PREPROCESSED DATASET-QE-MEASURE-RAW | Out-Null

Write-Step '准备 MinIO 对象存储样例'
docker cp (Join-Path $SeedDir 'weld_manifest.csv') smp-platform-minio:/tmp/weld_manifest.csv | Out-Null
docker cp (Join-Path $SeedDir 'workorder_text.jsonl') smp-platform-minio:/tmp/workorder_text.jsonl | Out-Null
docker cp (Join-Path $SeedDir 'weld_features.csv') smp-platform-minio:/tmp/weld_features.csv | Out-Null
docker exec smp-platform-minio sh -lc 'mc alias set local http://127.0.0.1:9000 smpminio smpminio_local_password >/dev/null && mc mb --ignore-existing local/smp-datasets'
docker exec smp-platform-minio mc cp /tmp/weld_manifest.csv local/smp-datasets/TENANT-CABIN/raw/weld/weld_manifest.csv
docker exec smp-platform-minio mc cp /tmp/workorder_text.jsonl local/smp-datasets/TENANT-YF/raw/text/workorder_text.jsonl
docker exec smp-platform-minio mc cp /tmp/weld_features.csv local/smp-datasets/TENANT-CABIN/preprocessed/weld/weld_features.csv
docker exec smp-platform-minio mc ls --recursive local/smp-datasets

Write-Step '准备 RabbitMQ / Kafka 流数据样例'
docker exec smp-platform-rabbitmq sh -lc 'rabbitmqadmin -u $RABBITMQ_DEFAULT_USER -p $RABBITMQ_DEFAULT_PASS declare queue --name smp.weld.events --durable true --non-interactive; rabbitmqadmin -u $RABBITMQ_DEFAULT_USER -p $RABBITMQ_DEFAULT_PASS purge queue --name smp.weld.events --non-interactive'
docker exec smp-platform-rabbitmq sh -lc 'rabbitmqadmin -u $RABBITMQ_DEFAULT_USER -p $RABBITMQ_DEFAULT_PASS publish message --routing-key smp.weld.events --payload ''{"eventId":"MQ-0001","line":"CABIN-WELD-01","defect":"POROSITY","ts":"2026-05-18T08:00:00Z"}'' --non-interactive' | Out-Null
docker exec smp-platform-rabbitmq sh -lc 'rabbitmqadmin -u $RABBITMQ_DEFAULT_USER -p $RABBITMQ_DEFAULT_PASS publish message --routing-key smp.weld.events --payload ''{"eventId":"MQ-0002","line":"CABIN-WELD-02","defect":"UNDERCUT","ts":"2026-05-18T08:05:00Z"}'' --non-interactive' | Out-Null
docker exec smp-platform-rabbitmq sh -lc 'rabbitmqadmin -u $RABBITMQ_DEFAULT_USER -p $RABBITMQ_DEFAULT_PASS list queues --non-interactive'
if ($WithKafka) {
    docker exec smp-platform-kafka kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic smp.weld.events --partitions 1 --replication-factor 1
    Get-Content (Join-Path $SeedDir 'kafka_events.jsonl') | docker exec -i smp-platform-kafka kafka-console-producer --bootstrap-server localhost:9092 --topic smp.weld.events
}

Write-Step '准备 InfluxDB 时序数据样例'
try {
    docker cp (Join-Path $SeedDir 'influx.lp') smp-platform-influxdb:/tmp/smp.lp | Out-Null
    docker exec smp-platform-influxdb influx write --bucket smp_timeseries --org yanfeng --token smp_influx_token --file /tmp/smp.lp
} catch { Write-Warning "InfluxDB seed 跳过：$($_.Exception.Message)" }

Write-Step '写入 SMP 平台数据源与同步任务配置'
Invoke-PostgresFile 'smp_platform' 'seed_platform_lab.sql'
if ($WithKafka) { Invoke-PostgresFile 'smp_platform' 'seed_platform_kafka_lab.sql' }

if (-not $SkipBackend) {
    Write-Step '启动后端/前端容器'
    docker compose -f $ComposeFile up -d --build backend frontend
}

Write-Step '验证数据源实验室状态'
docker exec smp-platform-postgres psql -U smp -d smp_platform -c "select source_id, source_type, endpoint, port, database_name, status, diagnostic_code from data_source where source_id like 'DSRC-LAB-%' order by source_id;"
docker exec smp-platform-postgres psql -U smp -d smp_platform -c "select task_id, source_id, status, sync_scope from data_source_sync_task where task_id like 'DSYNC-LAB-%' order by task_id;"
docker exec smp-platform-postgres psql -U smp -d smp_source_mes -c "select count(*) as mes_work_order_count from mes_work_order; select count(*) as qe_measurement_count from qe_measurement;"
docker exec smp-platform-mysql sh -lc "mysql -uroot -p`$MYSQL_ROOT_PASSWORD -e 'select count(*) as mes_station_event_count from smp_source_mes.mes_station_event; select count(*) as supplier_quality_ticket_count from smp_source_mes.supplier_quality_ticket;'"
Write-Host "`n生产仿真数据源实验室已准备完成。"
