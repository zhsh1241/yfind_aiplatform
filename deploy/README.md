# yfind_aiplatform Deploy

Deployment baseline for private Kubernetes environments.

## Layout

- `helm/yfind-aiplatform/`: Helm chart skeleton for frontend, Spring Boot backend, and FastAPI AI adapter.
- `env/values.local.example.yaml`: local/example values with `TODO_CONFIRM_*` placeholders.

## Rules

- Do not commit real secrets, registry credentials, cluster names, domains, or TLS material.
- Keep environment-specific values in copied values files or secret managers.
- Production deployment details must be confirmed in a later feature or release plan.
- Keep `ai-adapter` internal to the cluster; it should not be exposed directly to browsers.
