# SMP Deploy

SMP 工业 AI 小模型平台部署工程骨架，提供本地联调 Compose、基础 Helm chart 与 smoke 检查脚本。

## 目录

| 路径 | 说明 |
|---|---|
| `local/docker-compose.yml` | 本地联调服务编排示例 |
| `helm/smp-platform` | Kubernetes / Helm 部署草案 |
| `scripts/smoke.ps1` | 后端健康检查与前端首页 smoke 检查 |

## 外部参数

生产环境镜像仓库、命名空间、Ingress/Gateway、KMS、LDAP、Kafka ACL、对象存储和 MLOps 参数继续使用 `TODO_CONFIRM_*` 占位，必须在对应 feature 或部署 ADR 中确认后才能替换。