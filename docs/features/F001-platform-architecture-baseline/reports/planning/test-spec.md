> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-platform-architecture-baseline.md`

# Test Spec: F001-platform-architecture-baseline

## Acceptance Coverage

- AC-01: Feature planning evidence exists and is archived.
- AC-02: Backend skeleton compiles and exposes a health endpoint.
- AC-03: AI adapter skeleton compiles, tests, and exposes internal health/capability endpoints.
- AC-04: Frontend skeleton installs, tests, and builds.
- AC-05: Deploy skeleton contains Helm/Kubernetes templates and environment placeholders for frontend/backend/ai-adapter.
- AC-06: Component version matrix records confirmed defaults and TODO confirmations.
- AC-07: `ai-scaffold.config.json` resolves real backend/service/frontend roots.

## Verification Commands

```powershell
node tools/ai-scaffold/dist/cli.js doctor
npm --prefix tools/ai-scaffold test
mvn -f backend/pom.xml test
Push-Location ai-adapter; python -m compileall app tests; python -m unittest discover -s tests -v; Pop-Location
Push-Location frontend; npm install; npm run lint; npm run test:ci; npm run build; Pop-Location
```

## Manual Review

- Confirm `plan.md` is draft and references archived planning evidence.
- Confirm deploy templates do not contain real secrets or fake infrastructure values.
- Confirm TODOs are limited to external values that need business or infrastructure confirmation.


