> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-identity-org-permission.md`

﻿# Test Spec: F002-identity-org-permission

## Acceptance Coverage

- AC-01: Planning evidence exists and is archived.
- AC-02: Identity/org/role/permission domain boundaries are documented.
- AC-03: Backend current-user/auth-status API behavior is specified.
- AC-04: Permission vocabulary covers MVP modules and default-deny behavior.
- AC-05: Audit requirements cover login, role/permission changes, and unauthorized access.
- AC-06: Frontend permission-gated navigation and unauthorized states are specified.
- AC-07: SSO/Keycloak values remain `TODO_CONFIRM_*` until confirmed.

## Verification Strategy

- Unit tests for permission evaluation and default-deny behavior.
- API tests for current user, org/role/permission CRUD boundaries, 401/403 responses, and audit event creation.
- Frontend tests for user context rendering, menu filtering, and unauthorized page behavior.
- Contract review for SSO placeholders and no committed secrets.

## Commands Planned For Build Stage

```powershell
$env:JAVA_HOME = "C:\\Java\\jdk-21.0.6"
mvn -f backend/pom.xml test
Push-Location frontend; npm run lint; npm run test:ci; npm run build; Pop-Location
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F002-identity-org-permission
```

## Manual Review

- Confirm enterprise IAM provider and claim mapping are still pending, not guessed.
- Confirm role/permission vocabulary is acceptable for MVP modules.
- Confirm audit obligations satisfy project governance expectations.
