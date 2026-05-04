> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage deep-interview`.
> Source: `.omx/specs/deep-interview-identity-org-permission.md`
> Interview transcript: `.omx/interviews/identity-org-permission-20260430.md`

﻿# Deep Interview Spec: F002-identity-org-permission

## Intent

Create the MVP identity, organization, permission, and audit foundation for the YFI Industrial AI Small Model Platform.

## Desired Outcome

The feature plan defines how Spring Boot will own users, organizations, roles, permissions, authentication seams, and audit records while keeping enterprise SSO/Keycloak details configurable and unguessed.

## In Scope

- Backend identity/org/permission/audit domain structure.
- MVP local authentication/test seam.
- OIDC/Keycloak/enterprise SSO integration boundary with `TODO_CONFIRM_*` values.
- Permission model for platform module/action access.
- Frontend login/user-context/navigation permission placeholders.
- API contract and tests for auth status, current user, org/role/permission management, and audit emission.

## Out of Scope / Non-goals

- Production SSO credentials or tenant-specific claim mapping.
- Password reset, MFA, SCIM/LDAP sync, HR sync.
- Full workflow approval engine.
- Fine-grained dataset/model row-level authorization.
- AI adapter authorization implementation beyond documenting internal-service expectations.

## Decision Boundaries

- Use Spring Security / OIDC-compatible boundaries but keep real provider details pending.
- Backend remains source of truth for platform authorization and audit.
- Frontend consumes backend-provided user context and permission lists; it must not decide authorization alone.
- Unknown external facts remain `TODO_CONFIRM_*`.

## Exception Scenarios

- SSO unavailable in local development: use local dev profile/test principal only.
- Missing org/role mapping: default deny and expose explicit configuration gap.
- Unauthorized access: return 401/403 and write audit event for high-risk operations.
