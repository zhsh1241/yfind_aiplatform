# yfind_aiplatform Backend

Spring Boot backend baseline for `F001-platform-architecture-baseline`.

This service is the main platform backend and owns enterprise API state,
permissions, metadata, and audit records. Python-first AI/MLOps SDK integration
belongs in `../ai-adapter/` and should be called through internal APIs.

## 环境要求

后端基线为 **Java 21 / Spring Boot 3**。如果系统默认 `mvn` 仍使用 Java 8，请先在当前 PowerShell 会话切换 JDK：

```powershell
$env:JAVA_HOME='C:\java\jdk-21.0.6'
$env:Path="C:\java\jdk-21.0.6\bin;" + [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
java -version
mvn -version
```

两条命令都应显示 **21.0.6** 后再运行测试。

## Commands

```powershell
mvn -f backend/pom.xml compile -q
mvn -f backend/pom.xml test -q
mvn -f backend/pom.xml verify
```

常用本地验证：

```powershell
mvn -f backend/pom.xml test -q
mvn -f backend/pom.xml verify -DskipITs=true
```

## Baseline API

- `GET /api/health`

Business modules start in later features. Do not add domain schema or external integration here without the matching `docs/features/Fxxx-*` plan.

## 数据库接入

后端已接入 Spring JDBC + Flyway 迁移，所有可变业务状态会写入 `platform_domain_events` 领域事件表。

本地默认使用文件型 H2 数据库，路径为 `backend/data/yfind-aiplatform.mv.db`，便于无外部依赖直接启动；该目录已加入 `.gitignore`。

本地 PostgreSQL 使用 Docker Compose 启动：

```powershell
docker compose --env-file deploy/env/postgres.local.example.env -f deploy/docker-compose.postgres.yml up -d
docker exec yfind-aiplatform-postgres pg_isready -U yfind -d yfind_aiplatform
$env:POSTGRES_JDBC_URL='jdbc:postgresql://localhost:5432/yfind_aiplatform'
$env:DB_DRIVER='org.postgresql.Driver'
$env:POSTGRES_USER='yfind'
$env:POSTGRES_PASSWORD='yfind_local_password'
```

随后启动后端：

```powershell
$env:JAVA_HOME='C:\java\jdk-21.0.6'
$env:Path="$env:JAVA_HOME\bin;C:\Apache\Maven\bin;$env:Path"
Push-Location backend
mvn spring-boot:run
Pop-Location
```

如需在 PostgreSQL 上运行后端测试：

```powershell
$env:SPRING_PROFILES_ACTIVE='postgres'
$env:POSTGRES_TEST_JDBC_URL='jdbc:postgresql://localhost:5432/yfind_aiplatform_test'
Push-Location backend
mvn test -q
Pop-Location
Remove-Item Env:\SPRING_PROFILES_ACTIVE
```
