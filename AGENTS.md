# yfind_aiplatform Agent Guide

This repository is initialized with the portable AI development scaffold.
Project-specific implementation details are intentionally unresolved until confirmed in `ai-scaffold.config.json` and `project.md`.

## Operating Contract

- 所有正式文档、计划、报告、README、feature/bugfix 产出物、评审说明和面向人审的交付内容默认使用中文；只有代码标识符、API 字段、命令、配置键、第三方专有名词或用户明确要求时才使用英文。
- Use `.codex/` as the Codex-facing workflow surface.
- Use `.agents/agents/` and `.agents/skills/` as the canonical role and skill sources.
- Use `docs/features/F{nnn}-{slug}/` for feature plans, tasks, contracts, test plans, SQL, and reports.
- Use `docs/bugfix/{bug-id}-{slug}/` for tracked bugfix artifacts.
- Use `tools/ai-scaffold` as the pass/fail authority for scaffold checks.
- Keep project-specific paths, commands, accounts, and service names in `ai-scaffold.config.json`.
- Do not copy runtime state such as `.omx/`, `.codex/tasks/tmp/`, `.codex/worktrees/*`, `node_modules/`, or `dist/` into the repo.
- Do not infer backend, frontend, database, E2E, or CI technology choices from the scaffold template.

## Default Workflow

1. Plan with `.codex/workflows/plan-feature.md`.
2. Build with `.codex/workflows/build-feature.md` after plan approval.
3. Review and QA with `.codex/workflows/run-review.md` and `.codex/workflows/run-qa.md`.
4. Verify with `node tools/ai-scaffold/dist/cli.js gate` or the target repo's equivalent CI after `ai-scaffold.config.json` is filled with confirmed commands.

## Target Repo Setup Status

The scaffold is installed, but these values remain TODO by design:

- backend path and commands
- frontend path(s) and commands
- database test name, user, password, and container name
- E2E account and tenant settings
- CI workflow, if this repository will use one

Update `project.md` and `ai-scaffold.config.json` when these facts are known.
