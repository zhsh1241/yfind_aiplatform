# yfind_aiplatform Backend

Spring Boot backend baseline for `F001-platform-architecture-baseline`.

This service is the main platform backend and owns enterprise API state,
permissions, metadata, and audit records. Python-first AI/MLOps SDK integration
belongs in `../ai-adapter/` and should be called through internal APIs.

## ç¯å¢è¦æ±

åç«¯åºçº¿ä¸º **Java 21 / Spring Boot 3**ãå¦æç³»ç»é»è®¤ `mvn` ä»ä½¿ç¨ Java 8ï¼è¯·åå¨å½å PowerShell ä¼è¯åæ¢ JDKï¼

```powershell
$env:JAVA_HOME='C:\java\jdk-21.0.6'
$env:Path="C:\java\jdk-21.0.6\bin;" + [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
java -version
mvn -version
```

ä¸¤æ¡å½ä»¤é½åºæ¾ç¤º **21.0.6** ååè¿è¡æµè¯ã

## Commands

```powershell
mvn -f backend/pom.xml compile -q
mvn -f backend/pom.xml test -q
mvn -f backend/pom.xml verify
```

å¸¸ç¨æ¬å°éªè¯ï¼

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

如需切换 PostgreSQL，可先启动本地数据库：

```powershell
docker compose -f deploy/docker-compose.postgres.yml up -d
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