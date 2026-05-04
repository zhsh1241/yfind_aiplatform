# Verification Report: Platform Architecture Baseline

## Metadata

- Feature: F001-platform-architecture-baseline
- Task ID: TASK-platform-architecture-baseline
- Verified at: 2026-04-30 10:15 Asia/Shanghai
- Verifier: codex

## Summary

F001 baseline skeleton is implemented and smoke-verified using the revised architecture: Spring Boot main platform backend + FastAPI internal AI adapter + React frontend + Helm deploy skeleton. The formal `plan.md` intentionally remains `plan_status: draft`; the project owner explicitly requested bootstrapping before normal plan approval so later features have stable roots.

## Verification Evidence

| Area | Command / Check | Result | Notes |
| --- | --- | --- | --- |
| Scaffold self-tests | `npm --prefix tools/ai-scaffold test` | PASS | 11/11 node tests passed |
| Scaffold doctor | `node tools/ai-scaffold/dist/cli.js doctor` | PASS | Backend `backend`; service `ai-adapter`; frontend `frontend`; dependencies OK |
| Scaffold full gate | `JAVA_HOME=C:\\Java\\jdk-21.0.6; node tools/ai-scaffold/dist/cli.js gate` | PASS | Backend verify + ai-adapter compile/unittest + frontend lint/test/build passed |
| AI adapter compile | `Push-Location ai-adapter; python -m compileall app tests; Pop-Location` | PASS | Python syntax check passed |
| AI adapter unit | `Push-Location ai-adapter; python -m unittest discover -s tests -v; Pop-Location` | PASS | 2 FastAPI smoke tests passed |
| Backend verify | `JAVA_HOME=C:\\Java\\jdk-21.0.6; mvn -f backend\\pom.xml verify -DskipITs=true` | PASS | Spring Boot smoke test passed; build success |
| Frontend lint | `Push-Location frontend; npm run lint; Pop-Location` | PASS | TypeScript no emit passed |
| Frontend unit | `Push-Location frontend; npm run test:ci; Pop-Location` | PASS | Vitest smoke test passed |
| Frontend build | `Push-Location frontend; npm run build; Pop-Location` | PASS | Vite build passed; emitted chunk-size warning only |
| Work-item trace | `git diff --name-only + git ls-files --others --exclude-standard | node tools/ai-scaffold/dist/cli.js check-work-item-link --stdin` | PASS | Code changes tied to feature artifacts |
| Plan approval gate | `node tools/ai-scaffold/dist/cli.js check-plan-approved docs/features/F001-platform-architecture-baseline` | EXPECTED FAIL | `plan.md` remains draft by workflow design |

## Notes

- The machine default Maven Java was Java 8, so backend verification used `JAVA_HOME=C:\\Java\\jdk-21.0.6` to satisfy the Java 21 baseline.
- AI adapter verification used the local Python 3.12 runtime. `pyproject.toml` records FastAPI dependencies for reproducible installs, but this verification did not rely on a committed virtual environment.
- Build outputs (`target/`, `dist/`), Python caches, virtualenvs, and Codex runtime caches are ignored by `.gitignore`.
- `ai-scaffold.config.json` now includes `services[0]` for `ai-adapter` and the scaffold gate runs service checks between backend and frontend.

## Remaining Risks

- `plan.md` still requires human review and approval before normal `/build-feature` governance.
- External infrastructure values remain `TODO_CONFIRM_*` by design, including Label Studio, MLflow, workflow engine, KServe, object storage, Kubernetes, and registry endpoints.
- Vite reports one large JS chunk warning because Ant Design Pro is included in the baseline shell; no functional failure.
