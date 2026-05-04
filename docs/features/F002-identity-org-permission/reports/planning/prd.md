> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/prd-identity-org-permission.md`

﻿# PRD: F002-identity-org-permission

## Problem

Future platform modules need a shared identity, organization, role, permission, and audit foundation. Without this baseline, dataset, labeling, training, model registry, inference, edge, and resource features would duplicate authorization logic and produce inconsistent audit records.

## Goals

- Define the Spring Boot domain model and API surface for identity, organization, roles, permissions, and audit.
- Provide a local development/test authentication seam without pretending to know production IAM details.
- Establish permission vocabulary for MVP modules and actions.
- Define frontend integration expectations for current user, navigation visibility, and unauthorized states.
- Keep enterprise SSO/Keycloak values as explicit `TODO_CONFIRM_*` placeholders.

## Users

- Platform administrators managing organizations, users, roles, and permissions.
- Enterprise users logging in through SSO or local MVP seam.
- AI coding agents implementing subsequent feature permissions.
- Auditors reviewing high-risk operation records.

## Functional Requirements

- Backend exposes current-user and auth-status APIs.
- Backend models organizations, users, roles, permissions, and assignments.
- Backend enforces default-deny authorization for protected APIs.
- Backend records audit events for login, permission changes, role assignments, and denied high-risk access.
- Frontend renders login/user-context placeholders and permission-gated navigation from backend data.
- Contracts document OIDC/Keycloak integration boundaries and unconfirmed values.

## Non-goals

- Real enterprise SSO rollout.
- MFA, SCIM, LDAP/HR synchronization, password recovery, or production account lifecycle automation.
- Full approval workflow engine.
- Domain-specific dataset/model row-level authorization.

## Success Criteria

- `plan.md` exists with `plan_status: draft` and archived planning evidence.
- Contract identifies API endpoints, DTOs, permission vocabulary, and audit obligations.
- Test plan covers auth, RBAC, org isolation, audit, unauthorized access, and frontend permission rendering.
- Unknown IAM and environment details remain explicit and searchable.
