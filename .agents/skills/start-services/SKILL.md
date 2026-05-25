---
name: start-services
description: 在 yfind_aiplatform 仓库中启动本地开发服务栈：使用宿主机 Java 21 运行 backend，并用本机 Docker 启动 PostgreSQL、Redis、MySQL、MinIO、RabbitMQ、InfluxDB、文件/API/工业协议仿真与可选 Label Studio/Kafka。用于“启动后端”“拉起本地联调环境”“重启开发服务”“准备 Docker 依赖并做健康检查”等请求。
---

# Start Services

用这个 skill 启动当前仓库的本地联调环境，默认策略是：

1. 复用 `deploy/scripts/prepare-data-source-lab.ps1` 启动并灌入 Docker 依赖；
2. 在宿主机上用 Java 21 + Maven 运行 `backend/smp-app`；
3. 等待 `http://localhost:8080/actuator/health` 返回成功；
4. 报告日志路径、端口和已启动组件。

## 快速入口

优先直接运行：

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/start-services/scripts/start-services.ps1
```

常见变体：

```powershell
# 额外拉起 Kafka
powershell -ExecutionPolicy Bypass -File .agents/skills/start-services/scripts/start-services.ps1 -WithKafka

# 同时拉起 Label Studio
powershell -ExecutionPolicy Bypass -File .agents/skills/start-services/scripts/start-services.ps1 -WithLabelStudio

# 同时拉起 frontend dev server
powershell -ExecutionPolicy Bypass -File .agents/skills/start-services/scripts/start-services.ps1 -WithFrontend

# 只启动 frontend
powershell -ExecutionPolicy Bypass -File .agents/skills/start-services/scripts/start-services.ps1 -FrontendOnly

# backend 已在运行，仅准备 Docker 依赖
powershell -ExecutionPolicy Bypass -File .agents/skills/start-services/scripts/start-services.ps1 -DepsOnly

# 指定本机 Java 21 路径
powershell -ExecutionPolicy Bypass -File .agents/skills/start-services/scripts/start-services.ps1 -JavaHome C:\java\jdk-21.0.6

# 指定 frontend 端口
powershell -ExecutionPolicy Bypass -File .agents/skills/start-services/scripts/start-services.ps1 -WithFrontend -FrontendPort 5173
```

## 执行流程

### 1. 校验前置条件

- 当前目录必须是仓库根目录，或能从脚本位置推导到仓库根目录。
- 宿主机需要可用的 `docker`、`docker compose`、`mvn`、`java`。
- Java 必须是 21；优先使用传入的 `-JavaHome`，否则尝试：
  - 当前 `JAVA_HOME`
  - `C:\java\jdk-21.0.6`
  - `java` 命令所在环境

### 2. 启动 Docker 依赖

先调用仓库现成脚本：

```powershell
deploy/scripts/prepare-data-source-lab.ps1 -SkipBackend
```

说明：

- 这是本仓库的权威本地依赖准备脚本；
- 会负责 PostgreSQL、Redis、MySQL、MinIO、RabbitMQ、InfluxDB、API 数据源、文件数据源、工业协议仿真与种子数据；
- `-WithKafka` 时追加 Kafka；
- 如需 Label Studio，单独补 `docker compose -f deploy/local/docker-compose.yml up -d label-studio`。

### 3. 启动宿主机 backend

使用宿主机 Java 21 运行：

```powershell
mvn -f backend/smp-app/pom.xml spring-boot:run
```

启动前注入这些环境变量：

- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_NAME=smp_platform`
- `DB_USER=smp`
- `DB_PASSWORD=smp_local_password`
- `SERVER_PORT=8080`
- `SMP_STORAGE_ENDPOINT=http://localhost:9000`
- `SMP_STORAGE_PUBLIC_ENDPOINT=http://localhost:9000`
- `SMP_STORAGE_BUCKET=smp-datasets`
- `SMP_STORAGE_ACCESS_KEY=smpminio`
- `SMP_STORAGE_SECRET_KEY=smpminio_local_password`

启用 Label Studio 时再注入：

- `SMP_LABEL_STUDIO_ENABLED=true`
- `SMP_LABEL_STUDIO_BASE_URL=http://localhost:8083`
- `SMP_LABEL_STUDIO_TOKEN_SECRET_REF=env:LABEL_STUDIO_API_TOKEN`
- `LABEL_STUDIO_API_TOKEN=smp-local-label-studio-token`
- `SMP_LABEL_STUDIO_WORKSPACE_ID=local-sandbox`
- `SMP_LABEL_STUDIO_STORAGE_POLICY=LOCAL_FILES_READONLY`
- `SMP_LABEL_STUDIO_EXPORT_FORMAT=JSON`
- `SMP_LABEL_STUDIO_TIMEOUT_MS=5000`

### 4. 健康检查

至少验证：

```powershell
Invoke-RestMethod http://localhost:8080/actuator/health
```

如果脚本拉起了 frontend，可补充验证：

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:5173
```

如果脚本拉起了 Label Studio，可再补充验证：

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8083
```

## 决策规则

- 如果 8080 已有健康 backend，默认不重复启动，直接报告“已运行”。
- 如果 8080 被其他进程占用且健康检查失败，先识别占用进程，再决定是否停止；不要盲杀无关进程。
- 如果 Docker 依赖未就绪，不要直接启动 backend。
- 如果 Java 不是 21，优先修正 Java 环境，不要硬跑。
- 如果只是补齐依赖，用 `-DepsOnly`，不要重复拉起 backend。
- 如果需要一并启动前端，使用 `-WithFrontend`。
- 如果只需要前端开发服务，使用 `-FrontendOnly`。

## 资源

- `scripts/start-services.ps1`：统一入口脚本，负责 Docker 依赖、宿主机 backend、健康检查与日志输出。
