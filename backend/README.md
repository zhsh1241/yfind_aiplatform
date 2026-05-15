# SMP Backend

YFI / 延锋 SMP 工业 AI 小模型平台主后端工程骨架。

## 技术栈

- Java 21
- Spring Boot 4.0.x
- Maven 3.9.x
- Spring MVC / Spring Security / Spring Data JPA
- Flyway / OpenAPI 3.1
- JUnit 5 / Testcontainers 预留

## 模块

| 模块 | 职责 |
|---|---|
| `smp-common` | 通用 API envelope、错误码和业务异常基类 |
| `smp-platform` | 平台五大业务域边界常量与后续领域模块入口 |
| `smp-app` | Spring Boot 启动应用、基础 API、Flyway migration、健康检查 |

## 验证

```powershell
$env:JAVA_HOME='C:\java\jdk-21.0.6'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
mvn -f backend/pom.xml verify -DskipITs=true
```

生产数据库、LDAP、对象存储、Kafka、MLOps 与 Kubernetes 参数仍使用 `TODO_CONFIRM_*` 占位；测试 profile 使用 H2 PostgreSQL mode 验证 Flyway migration 与基础接口。