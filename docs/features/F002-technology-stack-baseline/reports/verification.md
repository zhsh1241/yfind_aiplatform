# Verification Report: 技术栈基线确认

## Summary

- Feature: F002-technology-stack-baseline
- Date: 2026-05-15
- Result: PASS

## Evidence

| Check | Command | Result |
|---|---|---|
| AI scaffold build | `npm --prefix tools/ai-scaffold run build` | PASS |
| AI scaffold tests | `npm --prefix tools/ai-scaffold test` | PASS，13/13 node tests |
| Scaffold status | `node tools/ai-scaffold/dist/cli.js scaffold-status` | PASS，输出 `Technology stack` 段 |
| Doctor JSON | `node tools/ai-scaffold/dist/cli.js doctor --json` | PASS，JSON 包含 `scaffold.technologyStack` |
| Feature gate | `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F002-technology-stack-baseline --skip-backend-integration` | PASS |
| AI adapter compile | `python -m compileall app tests`（在 `ai-adapter/`） | PASS |
| AI adapter tests | `python -m unittest discover -s tests -v`（在 `ai-adapter/`） | PASS，4/4 unittest |
| Work-item link | changed files piped to `node tools/ai-scaffold/dist/cli.js check-work-item-link --stdin` | PASS |
| Stale stack grep | `rg "Spring Boot 3\.1|React 18|Ant Design 5|MyBatis Plus 3" .agents/agents .codex/agents ...` | PASS，无过时默认口径命中 |

## Notes

- 2026-05-15 复核官方资料后，主后端默认线采用 Spring Boot 4.0.x；Kubernetes 采用 1.35.x 生产基线，不直接追最新 1.36。

- backend/frontend 仍保持 disabled，符合当前清空待重建状态。
- 本次只确定技术栈和脚手架摘要，不新增业务运行时代码。
- 外部环境参数仍按 `TODO_CONFIRM_*` 和 `docs/business/open-questions.md` 追踪。
