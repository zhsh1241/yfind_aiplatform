# Test Plan: SMP 重建脚手架基线

## 1. Test Scope

- Feature: F001-smp-rebuild-scaffold-baseline
- Contract version: v1
- Business references: `docs/business/`
- Prototype references: `docs/prototype/`

## 2. P0 - Blocking

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-03 | AI scaffold 自测 | `npm --prefix tools/ai-scaffold test` | 12 项 node test 全部通过 |
| T-P0-02 | AC-05 | 当前 gate | `node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration` | backend/frontend skipped，ai-adapter 通过，Quality gate passed |
| T-P0-03 | AC-05 | ai-adapter 单独验证 | `python -m compileall app tests`; `python -m unittest discover -s tests -v` | 4 项 unittest 全部通过 |

## 3. P1 - Important

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-02 | 脚手架状态查看 | `node tools/ai-scaffold/dist/cli.js scaffold-status` | reference roots OK，backend/frontend disabled，ai-adapter tracked |
| T-P1-02 | AC-03 | 工作项绑定检查 | `git diff --name-only \\| node tools/ai-scaffold/dist/cli.js check-work-item-link --stdin` | 本功能包存在后检查通过 |

## 4. P2 - Nice to Have

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-01 | 文档人工抽查 | 阅读 `README.md`, `project.md`, `AGENTS.md`, `docs/architecture/00-project-understanding.md` | 能说明业务域、原型页面、当前禁用目录和后续流程 |

## 5. Cross-cutting Verification

- Permission: 本功能不新增业务权限。
- Audit: 本功能不新增业务审计。
- Business rules: 后续功能必须引用 `docs/business/rules/`，本功能只恢复脚手架约束。
- NFR: 不涉及运行时 NFR。
- Frontend visual/prototype parity: 不涉及前端实现。

## 6. Traceability

- AC-01 -> T-P2-01
- AC-02 -> T-P1-01
- AC-03 -> T-P0-01, T-P1-02
- AC-04 -> T-P2-01
- AC-05 -> T-P0-02, T-P0-03
