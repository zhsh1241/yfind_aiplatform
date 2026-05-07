# yfind_aiplatform Deploy

Deployment baseline for private Kubernetes environments.

## Layout

- `helm/yfind-aiplatform/`: Helm chart skeleton for frontend, Spring Boot backend, and FastAPI AI adapter.
- `env/values.local.example.yaml`: local/example values with `TODO_CONFIRM_*` placeholders.
- `docker-compose.postgres.yml`: local PostgreSQL 16 for backend development and scaffold gates.
- `postgres/init/`: local database bootstrap SQL, including the test database.

## Rules

- Do not commit real secrets, registry credentials, cluster names, domains, or TLS material.
- Keep environment-specific values in copied values files or secret managers.
- Production deployment details must be confirmed in a later feature or release plan.
- Keep `ai-adapter` internal to the cluster; it should not be exposed directly to browsers.

## 本地 PostgreSQL（Docker）

启动数据库：

```powershell
docker compose --env-file deploy/env/postgres.local.example.env -f deploy/docker-compose.postgres.yml up -d
docker exec yfind-aiplatform-postgres pg_isready -U yfind -d yfind_aiplatform
```

连接信息：

| 用途 | 值 |
| --- | --- |
| 主库 | `jdbc:postgresql://localhost:5432/yfind_aiplatform` |
| 测试库 | `jdbc:postgresql://localhost:5432/yfind_aiplatform_test` |
| 用户 | `yfind` |
| 本地默认密码 | `yfind_local_password` |
| 容器 | `yfind-aiplatform-postgres` |

停止数据库：

```powershell
docker compose --env-file deploy/env/postgres.local.example.env -f deploy/docker-compose.postgres.yml down
```

如需清空本地数据库数据：

```powershell
docker compose --env-file deploy/env/postgres.local.example.env -f deploy/docker-compose.postgres.yml down -v
```
