# Component Version Matrix

## Purpose

Track selected baseline versions and pending environment confirmations for `F001-platform-architecture-baseline`.

## Application Stack

| Component | Selected Baseline | Status | Notes |
| --- | --- | --- | --- |
| Java | 21 | selected | Backend language/runtime baseline |
| Spring Boot | 3.3.7 | selected | Maven parent in `backend/pom.xml` |
| Maven | system installed | selected | Used by scaffold backend commands |
| Python | 3.12.x | selected | AI adapter language/runtime baseline |
| FastAPI | 0.115.x | selected | Internal AI/MLOps adapter API framework |
| uv | 0.8.x | selected | AI adapter dependency and command runner |
| unittest / compileall | Python stdlib | selected | AI adapter smoke test and syntax-check baseline |
| Node.js | 22.x | selected | Current local runtime is Node 22.13.1 |
| React | 18.3.x | selected | Frontend UI runtime |
| TypeScript | 5.7.x | selected | Backend scaffold tool and frontend |
| Vite | 6.0.x | selected | Frontend dev/build tool |
| Ant Design | 5.x | selected | UI component system |
| Ant Design Pro Components | 2.x | selected | Enterprise console layout/components |

## Platform Stack

| Component | Selected Baseline | Status | Notes |
| --- | --- | --- | --- |
| Kubernetes | TODO_CONFIRM_K8S_VERSION | pending | Private cluster version must be confirmed |
| Helm | 3.x | selected | Chart skeleton in `deploy/helm` |
| Argo CD | TODO_CONFIRM_ARGOCD_VERSION | pending | GitOps provider not confirmed |
| PostgreSQL | TODO_CONFIRM_POSTGRES_VERSION | pending | Main metadata database |
| Redis | TODO_CONFIRM_REDIS_VERSION | pending | Cache/state/lock |
| MinIO or S3-compatible storage | TODO_CONFIRM_OBJECT_STORAGE_VERSION | pending | Dataset/model/artifact storage |
| OpenSearch or Elasticsearch | TODO_CONFIRM_SEARCH_VERSION | pending | Metadata/log search |
| Prometheus | TODO_CONFIRM_PROMETHEUS_VERSION | pending | Metrics |
| Grafana | TODO_CONFIRM_GRAFANA_VERSION | pending | Dashboards |
| Loki or ELK | TODO_CONFIRM_LOG_STACK_VERSION | pending | Logs |
| OpenTelemetry | TODO_CONFIRM_OTEL_VERSION | pending | Tracing |

## AI/MLOps Stack

| Component | Selected Baseline | Status | Notes |
| --- | --- | --- | --- |
| Label Studio | TODO_CONFIRM_LABEL_STUDIO_VERSION | pending | MVP labeling integration |
| AI Adapter | FastAPI internal service | selected | Encapsulates Python-first AI/MLOps SDK integrations under `ai-adapter/` |
| Kubeflow Pipelines/Trainer | TODO_CONFIRM_KUBEFLOW_VERSION | pending | Training workflow candidate |
| Argo Workflows | TODO_CONFIRM_ARGO_WORKFLOWS_VERSION | pending | Alternative workflow runtime |
| MLflow | TODO_CONFIRM_MLFLOW_VERSION | pending | Experiment tracking and model registry |
| KServe | TODO_CONFIRM_KSERVE_VERSION | pending | Inference service runtime |
| Edge Agent | custom minimal service | planned | Implement in `F008-edge-server-deployment` |

## Confirmation Rules

- Replace `TODO_CONFIRM_*` only with verified environment or architecture decisions.
- Record why any selected component changes.
- Do not introduce a second framework for the same layer without updating `docs/architecture/02-technical-roadmap.md`.
