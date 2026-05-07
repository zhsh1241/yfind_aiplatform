# yfind_aiplatform

AI platform project workspace.

This repository has been initialized with the portable AI development scaffold from:

`C:\GIT\newwms_copy\_temp\ai-scaffold-portable-20260428-095328`

## Scaffold Status

Installed scaffold surfaces:

- `AGENTS.md`
- `project.md`
- `ai-scaffold.config.json`
- `.agents/`
- `.codex/`
- `docs/features/`
- `docs/bugfix/`
- `tools/ai-scaffold/`
- `scripts/check-*`

Backend, FastAPI AI adapter, frontend, and deploy skeletons are initialized by `F001-platform-architecture-baseline`. External database, E2E, AI/MLOps, Kubernetes, registry, SSO, and CI values remain TODO placeholders until confirmed.

## Baseline Roots

- `backend/`: Java 21 + Spring Boot 3 baseline with `GET /api/health`.
- `ai-adapter/`: Python 3.12 + FastAPI internal adapter with `GET /internal/health`.
- `frontend/`: React + TypeScript + Ant Design Pro baseline shell.
- `deploy/`: Helm/Kubernetes baseline for frontend, backend, and ai-adapter with `TODO_CONFIRM_*` placeholders.
- `docs/features/F001-platform-architecture-baseline/`: baseline feature documentation and verification report.

## Common Commands

```powershell
npm --prefix tools/ai-scaffold ci
npm --prefix tools/ai-scaffold run build
node tools/ai-scaffold/dist/cli.js doctor
node tools/ai-scaffold/dist/cli.js sync-codex
npm --prefix tools/ai-scaffold test
```

## æ¬æº Java 21 ç¯å¢

å½åæºå¨é»è®¤ `java` / `mvn` å¯è½æå **Java 8**ï¼è `backend/` éè¦ **Java 21**ãè¿è¡ backend verify æ gate åï¼è¯·åå¨å½å PowerShell ä¼è¯åæ¢å° JDK 21ï¼

```powershell
$env:JAVA_HOME='C:\java\jdk-21.0.6'
$env:Path="C:\java\jdk-21.0.6\bin;" + [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
java -version
mvn -version
```

ç¡®è®¤ `java -version` å `mvn -version` åæ¾ç¤º **21.0.6**ï¼ä¸è¦æ¾ç¤º `1.8.x`ã

å¸¸ç¨éªè¯å½ä»¤ï¼

```powershell
mvn -f backend\pom.xml test -q
mvn -f backend\pom.xml verify -DskipITs=true
```

Create a feature artifact:

```powershell
node tools/ai-scaffold/dist/cli.js init-feature --slug <slug> --title "<title>"
```

Render an agent prompt:

```powershell
node tools/ai-scaffold/dist/cli.js render-agent-prompt --role backend-tdd-engineer --feature-dir docs/features/F001-example --task "Describe task" --summary
```

## Before Real Feature Work

Fill confirmed values in `ai-scaffold.config.json` and mirror the same facts in `project.md`:

- backend path and compile/test/verify commands
- frontend path(s) and lint/test/build/E2E commands
- database test name, user, password, and container name
- E2E account and tenant settings
- CI workflow rules, if used


## Backend / frontend smoke

```powershell
$env:JAVA_HOME='C:\java\jdk-21.0.6'
$env:Path="C:\java\jdk-21.0.6\bin;" + [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
mvn -f backend\pom.xml verify -DskipITs=true

Push-Location ai-adapter
python -m compileall app tests
python -m unittest discover -s tests -v
Pop-Location

Push-Location frontend
npm install
npm run lint
npm run test:ci
npm run build
npm run e2e
Pop-Location
```
