---
feature: F002-identity-org-permission
title: 身份、组织与权限基线
plan_status: approved
approved_at: "2026-05-02"
owner: codex
created_at: 2026-04-30
updated_at: 2026-04-30
---

# Plan: Identity Organization Permission Baseline

## Intent

Establish the platform identity, organization, permission, and audit foundation before domain features such as dataset, labeling, training, model registry, inference, and edge deployment are implemented.

## Planning Evidence

- Deep interview: `reports/planning/deep-interview.md`
- PRD: `reports/planning/prd.md`
- Test spec: `reports/planning/test-spec.md`

## Background

F001 initialized the executable baseline with Spring Boot main backend, FastAPI AI adapter, React frontend, Helm deploy skeleton, and scaffold gates. F002 is the first platform domain foundation feature. It must centralize identity and authorization decisions in the Spring Boot backend so later modules do not duplicate permission or audit logic.

## Scope

### In Scope

- Define backend package/domain boundaries for identity, organization, role, permission, and audit.
- Define MVP local development/test authentication seam.
- Define OIDC/Keycloak/enterprise SSO integration boundary with `TODO_CONFIRM_*` placeholders.
- Define platform permission vocabulary for MVP modules and actions.
- Define current-user/auth-status API shape and protected API default-deny rules.
- Define frontend user-context, login placeholder, permission-gated navigation, and unauthorized-state behavior.
- Define audit obligations for login, role/permission changes, and denied high-risk access.

### Out of Scope / Non-goals

- Real enterprise SSO credentials, URLs, client IDs, secrets, or tenant-specific claims.
- MFA, password reset, SCIM, LDAP/HR synchronization, and production account lifecycle automation.
- Full workflow approval engine.
- Fine-grained dataset/model row-level or column-level authorization.
- AI adapter authorization implementation beyond documenting internal-service expectations.

## Decision Boundaries

Codex may decide:

- Java package layout and DTO naming inside `backend/`.
- Initial permission enum/key naming for MVP modules.
- Local dev/test principal strategy.
- Frontend route/menu guard structure.
- Test fixture names and audit event DTO shape.

Must remain pending or be escalated:

- Enterprise IAM provider, protocol details, issuer URL, client ID/secret, scopes, and claim mapping.
- Final tenant/org hierarchy rules.
- Production role taxonomy and administrator bootstrap process.
- Security policy decisions such as MFA, password policy, session TTL, and token revocation.

## Exception Scenarios

- SSO unavailable locally: use local dev profile/test principal only, with explicit non-production naming.
- Missing org/role mapping: default deny and document the configuration gap.
- Unauthorized access: return 401/403 and audit high-risk denied access.
- Unknown IAM values: keep `TODO_CONFIRM_*`; do not invent fake production values.

## Technical Approach

### Backend

- Add domain packages under `backend/src/main/java/com/yfind/aiplatform/`:
  - `identity/`
  - `organization/`
  - `permission/`
  - `audit/`
- Introduce current-user/auth-status API contract, for example:
  - `GET /api/auth/me`
  - `GET /api/auth/status`
- Define role/permission assignment management APIs for administrators in contract stage.
- Keep Spring Security/OIDC as the production seam, while using a local test/dev principal for MVP development until real IAM values are confirmed.
- Store future business authorization state in PostgreSQL; F002 build stage should add SQL/migration notes only after contract approval.

### Frontend

- Add user-context and permission-aware navigation seams.
- Render unauthenticated/unauthorized states without hardcoding real SSO URLs.
- Consume backend-provided permissions; do not authorize purely in the browser.

### AI Adapter

- Keep `ai-adapter/` internal-only.
- Document that future adapter calls from backend must use service-to-service controls, but do not implement adapter auth in F002 unless explicitly scoped during build.

## Permission Vocabulary Draft

Initial permission keys should cover module/action pairs:

- `identity:user:read`, `identity:user:manage`
- `identity:role:read`, `identity:role:manage`
- `dataset:read`, `dataset:manage`
- `labeling:read`, `labeling:manage`
- `training:read`, `training:execute`, `training:manage`
- `model:read`, `model:manage`
- `inference:read`, `inference:deploy`, `inference:manage`
- `edge:read`, `edge:deploy`, `edge:manage`
- `resource:read`, `resource:manage`
- `audit:read`

Final naming can be refined during contract/TASK stage, but default-deny behavior must remain.

## Reuse Strategy

Reuse `backend/`, `frontend/`, `docs/features/`, `/api/auth/status`, `/api/auth/me`, existing MockMvc tests and existing Vitest `App.test.tsx` before adding any new seam.

### Must Reuse

- Existing Spring Boot backend root `backend/` and package base `com.yfind.aiplatform`.
- Existing frontend root `frontend/` and React/Vite test setup.
- Existing scaffold feature workflow under `docs/features/` and `tools/ai-scaffold/`.
- Existing architecture route in `project.md` and `docs/architecture/02-technical-roadmap.md`.

### Duplication Rejected

- Do not create a second backend service for identity outside `backend/`.
- Do not implement authorization inside `ai-adapter/` as the platform source of truth.
- Do not hardcode production SSO URLs/secrets in frontend or backend config.
- Do not add module-specific permission logic in dataset/training/model packages before shared permission seams exist.

### Approved New Seams

- New backend identity/organization/permission/audit packages are allowed because no shared authorization domain exists yet.
- New frontend auth context/menu guard seams are allowed because later pages need a shared permission entrypoint.

## Acceptance Criteria Draft

- AC-01: F002 planning evidence and `plan.md` exist.
- AC-02: Backend identity/org/role/permission/audit boundaries are documented and traceable to future implementation tasks.
- AC-03: Current-user/auth-status API contract is defined.
- AC-04: MVP permission vocabulary and default-deny behavior are defined.
- AC-05: Audit obligations are defined for login, role/permission changes, and denied high-risk access.
- AC-06: Frontend user-context and permission-gated navigation behavior are defined.
- AC-07: SSO/Keycloak/enterprise IAM values remain `TODO_CONFIRM_*` until confirmed.

## Risks & Dependencies

- Enterprise IAM details may change DTOs, claim mapping, and login flow.
- Tenant/org hierarchy may require revisiting schema design.
- Security requirements such as MFA or token revocation may expand scope.
- Later domain features depend on stable permission naming and audit event conventions.

## Open Questions

- Which enterprise IAM provider is authoritative: existing SSO, Keycloak, or another OIDC/SAML provider?
- What are the exact user, organization, department, role, and tenant claims?
- Who bootstraps the first platform administrator?
- Are permissions module-level for MVP, or must dataset/model ownership be enforced in F002?

## Approval Notes

- Reviewer: 用户
- Decision: 2026-05-02 用户要求“按照顺序逐个功能开始实现”，按功能顺序批准先实现 F002。
