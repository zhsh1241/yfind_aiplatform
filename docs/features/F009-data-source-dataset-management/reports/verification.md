# F009 验证报告

## 概览

- Verdict: PASS
- 日期：2026-05-18
- 范围：F009 数据源与数据集管理基础能力，含本地 Docker PostgreSQL/Redis 集成门禁补跑。

## 本地 Docker 集成环境

- Docker Desktop：已启动，`docker compose version` 可用。
- PostgreSQL：复用本地容器 `smp-platform-postgres`，镜像 `postgres:16-alpine`，端口 `localhost:5432`，测试库 `smp_platform`。
- Redis：复用本地容器 `smp-platform-redis`，镜像 `redis:7-alpine`，端口 `localhost:6379`。
- 健康检查：`pg_isready -U smp -d smp_platform` 返回 accepting connections；`redis-cli ping` 返回 `PONG`。
- 说明：本次仅使用临时环境变量覆盖本地验证连接参数，未把未知正式外部参数写入 `ai-scaffold.config.json`，正式环境仍保留 `TODO_CONFIRM_*`。

## 命令证据

```powershell
docker start smp-platform-postgres smp-platform-redis
# PostgreSQL: accepting connections
# Redis: PONG

docker exec smp-platform-postgres dropdb -U smp --if-exists smp_platform
docker exec smp-platform-postgres createdb -U smp smp_platform
# 使用空库验证 Flyway 从 V1 到 V5 的 PostgreSQL 迁移

$env:JAVA_HOME='C:\java\jdk-21.0.6'
$env:DB_HOST='localhost'; $env:DB_PORT='5432'; $env:DB_NAME='smp_platform'
$env:DB_USER='smp'; $env:DB_PASSWORD='smp_local_password'
$env:REDIS_HOST='localhost'; $env:REDIS_PORT='6379'
$env:SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5432/smp_platform'
$env:SPRING_DATASOURCE_USERNAME='smp'
$env:SPRING_DATASOURCE_PASSWORD='smp_local_password'
$env:SPRING_DATASOURCE_DRIVER_CLASS_NAME='org.postgresql.Driver'
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F009-data-source-dataset-management --run-e2e
# Backend: PostgreSQL 16.13，Flyway successfully applied 5 migrations，Tests run: 24, Failures: 0, Errors: 0, Skipped: 0，BUILD SUCCESS
# ai-adapter: unittest 4 passed
# Frontend lint: 0 errors, 1 existing warning
# Frontend Vitest: 1 file passed, 6 tests passed
# Frontend build: passed
# Playwright E2E: 9 passed
# Quality gate passed.
```

## 补充修复证据

- `backend/smp-app/pom.xml` 增加 `org.flywaydb:flyway-database-postgresql`，解决 Flyway 11 对 PostgreSQL 16 的数据库支持模块拆分问题；未新增业务依赖或外部服务契约。
- `PlatformPermissionAuditControllerTest` 的审计篡改时间表达式按数据库产品名选择 PostgreSQL/H2 兼容写法，确保 H2 降级测试与 PostgreSQL 集成测试均覆盖同一签名校验语义。

## 已验证事项

- F009 `plan.md` / `TASK.md` / `contract.md` / `test-plan.md` / code review verdict 均通过 feature artifact gate。
- 后端在 PostgreSQL 16.13 上完成 Flyway V1-V5 迁移并通过 24 个测试，覆盖 F009 DATA 域及既有 PLATFORM/RESOURCE 回归。
- 前端保持原型信息架构，Playwright 全量 9 个用例通过，其中 F009 数据源/数据集用例 3 个通过。
- AI adapter baseline unittest 4 个通过。

## 已知非阻塞项

- 前端 lint 仍有既有 `AppNavigation.tsx` Fast Refresh warning，非 error。
- Playwright 日志仍会出现 Ant Design `Space.direction` deprecated warning 和 jsdom CSS parse warning，均未阻断 E2E。
- 真实对象存储、内容安全、外部采集 connector、PAI/LDAP 等仍按冻结契约保留 `TODO_CONFIRM_*` seam，未在本地 Docker 验证中伪造真实外部系统。

## 结论

F009 已在本地 Docker PostgreSQL/Redis 环境下完成不带 `--skip-backend-integration` 的完整门禁补跑；当前验证结论为 PASS。
