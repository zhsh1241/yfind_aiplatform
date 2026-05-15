# Feature Contract: 部署工程底座

## Contract Metadata
- Version: v1
- Status: implemented
- Owner: contract-architect
- Created: 2026-05-15
- Updated: 2026-05-16
- Feature: F005-deploy-foundation

## 1. Requirement Summary

- 用户目标：恢复 backend/frontend/deploy 的最小部署入口和 AI scaffold 启用配置。
- 业务价值：为后续功能提供本地联调、容器镜像、Helm 草案和 smoke 检查基线。
- 业务资料：`docs/business/arch/01-部署架构.md`, `docs/business/bizdocs/06-非功能性需求.md`, `docs/business/open-questions.md`
- 原型页面：无专属页面；前端首页承载全局访问入口。

## 2. Deployment Artifact Contract

| Artifact | Contract |
|---|---|
| `backend/Dockerfile` | 必须能以 Maven 构建 Spring Boot jar，并以 Java 21 runtime 启动 `smp-app`。 |
| `frontend/Dockerfile` | 必须能构建 Vite 静态产物，并由 nginx 提供服务。 |
| `frontend/nginx.conf` | 必须支持 SPA fallback 到 `index.html`。 |
| `deploy/local/docker-compose.yml` | 必须包含 postgres、valkey、minio、backend、frontend 服务。 |
| `deploy/helm/smp-platform/values.yaml` | 未确认生产参数必须使用 `TODO_CONFIRM_*`。 |
| `deploy/helm/smp-platform/templates/*.yaml` | 必须提供 backend/frontend deployment 与 ingress 草案。 |
| `deploy/scripts/smoke.ps1` | 必须检查后端 `/actuator/health` 与前端首页。 |

## 3. Environment Contract

| Key | Status |
|---|---|
| `TODO_CONFIRM_REGISTRY` | 待确认镜像仓库 |
| `TODO_CONFIRM_K8S_NAMESPACE` | 待确认命名空间 |
| `TODO_CONFIRM_INGRESS_HOST` | 待确认访问域名 |
| `TODO_CONFIRM_POSTGRES_*` | 待确认元数据库连接 |
| `TODO_CONFIRM_LDAP_URL` | 待 F006 确认身份源 |

## 4. Compatibility

- Backward compatibility: 旧 deploy 已删除，不提供旧 manifest 兼容。
- Versioning: Helm chart 从 `0.1.0` 起步，随部署能力 feature 演进。
- Security: 不提交真实 secret；生产 secret 通过外部 secret manager 或集群配置注入。
- Observability: 仅保留健康检查入口；完整 OpenTelemetry/Prometheus/Grafana/Loki 由 F017 实现。