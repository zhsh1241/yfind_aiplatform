# yfind_aiplatform Backend

Spring Boot backend baseline for `F001-platform-architecture-baseline`.

This service is the main platform backend and owns enterprise API state,
permissions, metadata, and audit records. Python-first AI/MLOps SDK integration
belongs in `../ai-adapter/` and should be called through internal APIs.

## Commands

```powershell
mvn -f backend/pom.xml compile -q
mvn -f backend/pom.xml test -q
mvn -f backend/pom.xml verify
```

## Baseline API

- `GET /api/health`

Business modules start in later features. Do not add domain schema or external integration here without the matching `docs/features/Fxxx-*` plan.
