# Test Plan: Platform Architecture Baseline

## Metadata

- Feature: F001-platform-architecture-baseline
- Task ID: TASK-platform-architecture-baseline
- Created: 2026-04-29
- Updated: 2026-04-29

## Acceptance Criteria Mapping

| AC | Scenario | Verification |
| --- | --- | --- |
| AC-01 | Feature documents and planning reports exist | File inspection |
| AC-02 | Backend health endpoint and test pass | `mvn -f backend/pom.xml test` |
| AC-03 | AI adapter health/capability endpoints and tests pass | `python -m compileall app tests`; `python -m unittest discover -s tests -v` |
| AC-04 | Frontend shell lint/test/build pass | `Push-Location frontend; npm run lint; Pop-Location`; `Push-Location frontend; npm run test:ci; Pop-Location`; `Push-Location frontend; npm run build; Pop-Location` |
| AC-05 | Deploy skeleton has no secrets and includes ai-adapter | File inspection |
| AC-06 | Component version matrix exists | File inspection |
| AC-07 | Scaffold doctor resolves paths | `node tools/ai-scaffold/dist/cli.js doctor` |

## Automated Tests

### Backend

- Test class must include trace tag `TASK-platform-architecture-baseline`.
- Verify `GET /api/health` returns status `UP`, service name, and feature trace.

### AI Adapter

- Test file must include trace tag `TASK-platform-architecture-baseline`.
- Verify `GET /internal/health` returns status `UP`, service name, adapter role, and feature trace.
- Verify `GET /internal/capabilities` reports `TODO_CONFIRM_*` placeholders until real AI/MLOps endpoints are confirmed.

### Frontend

- Test file must include trace tag `TASK-platform-architecture-baseline`.
- Verify the platform shell renders project name and MVP flow content.

## Manual Review

- Confirm `plan.md` remains `plan_status: draft`.
- Confirm planning reports exist under `reports/planning/`.
- Confirm deploy values contain only placeholders and no real secrets.
- Confirm `ai-scaffold.config.json` uses real roots `backend`, `ai-adapter`, and `frontend`.

## Commands

```powershell
node tools/ai-scaffold/dist/cli.js doctor
npm --prefix tools/ai-scaffold test
mvn -f backend/pom.xml test
Push-Location ai-adapter; python -m compileall app tests; python -m unittest discover -s tests -v; Pop-Location
Push-Location frontend; npm install; Pop-Location
Push-Location frontend; npm run lint; Pop-Location
Push-Location frontend; npm run test:ci; Pop-Location
Push-Location frontend; npm run build; Pop-Location
```

## Known Limits

- No E2E browser automation is required for F001.
- No database migration is required for F001.
- No real Kubernetes deployment is required for F001.



