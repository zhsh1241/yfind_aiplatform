# AI Scaffold Migration Guide

This guide is for migrating the AI development scaffold itself into another repository. It is intentionally separate from any WMS business-code migration.

## What To Copy

Copy these scaffold surfaces first:

- `AGENTS.md`
- `project.md`
- `.agents/agents/`
- `.agents/skills/`
- `.codex/workflows/`
- `.codex/templates/`
- `docs/features/` templates and `NEXT_FEATURE_NUMBER.txt`
- `docs/bugfix/` templates, if bugfix workflow is needed
- `tools/ai-scaffold/`
- `scripts/check-*` wrappers, if the target repo still uses them

After copying, edit the project-specific parts of `AGENTS.md` and `project.md` so they describe the target repository. Keep the scaffold operating rules, workflow contracts, commit protocol, and verification standards.

Do not copy runtime state:

- `.omx/state/`
- `.omx/logs/`
- `.omx/context/`
- `.omx/plans/`
- `.omx/*.json`
- `.codex/tasks/tmp/`
- `.codex/worktrees/*`

## Project Adapter

Create `ai-scaffold.config.json` in the target repo root. Do not copy this repository's adapter as-is unless the target repo uses the same layout. Start from:

```text
tools/ai-scaffold/scaffold.config.example.json
```

Set these values before running the full gate:

- `projectName`
- `featureRoot`
- `bugfixRoot`
- `codeLikeRoots`
- `scaffoldRoots`
- `backend.path`
- `backend.commands.*`
- `frontends[].path`
- `frontends[].commands.*`
- `database.*`
- `e2e.*`

The scaffold core should not hardcode business repo paths, service names, test database names, or login accounts. Those belong in `ai-scaffold.config.json`.

## Bootstrap Steps

1. Install scaffold dependencies:

   ```bash
   npm --prefix tools/ai-scaffold ci
   npm --prefix tools/ai-scaffold run build
   ```

2. Regenerate Codex bridge surfaces:

   ```bash
   node tools/ai-scaffold/dist/cli.js sync-codex
   ```

3. Check the local environment:

   ```bash
   node tools/ai-scaffold/dist/cli.js doctor
   ```

4. Run scaffold self-tests:

   ```bash
   npm --prefix tools/ai-scaffold test
   ```

5. Run a feature-doc smoke test in the target repo:

   ```bash
   node tools/ai-scaffold/dist/cli.js init-feature --slug scaffold-smoke --title "Scaffold Smoke"
   node tools/ai-scaffold/dist/cli.js render-agent-prompt --role backend-tdd-engineer --feature-dir docs/features/F001-scaffold-smoke --task "Smoke test prompt rendering" --summary
   ```

6. Delete the smoke feature or keep it only if the target team wants a permanent onboarding example.

## CI Migration

The GitHub Actions workflow is an adapter, not the reusable core. Port it by keeping the invariant checks and replacing project commands:

- Keep: scaffold tests, feature artifact checks, work-item link check, reuse duplication check.
- Replace: backend build/test command, frontend lint/test/build command, service containers, database seed scripts, E2E command.
- Ensure the CI uses `ai-scaffold.config.json` values or matches them exactly.

## Required Acceptance

Migration is complete when the target repo can do all of the following:

- `node tools/ai-scaffold/dist/cli.js doctor` reports the configured project paths.
- `npm --prefix tools/ai-scaffold test` passes.
- `render-agent-prompt --summary` proves role skills are loaded from `.agents/skills/`.
- `init-feature` creates a feature directory without placeholders.
- `check-work-item-link` fails code changes without matching feature/bugfix docs.
- The target repo CI is green using its own backend/frontend/test commands.

## Known Project-Specific Adapters

These commands may still need per-repo review because they naturally touch runtime services:

- `gate`
- `hook`
- `e2e-docker`
- `prepare-manual-test`
- `stop-manual-test`
- PDA-specific helper commands

Treat those as adapters. If the target repo does not have the same runtime shape, either configure them through `ai-scaffold.config.json` or remove them from the target scaffold surface.
