# Test Plan: 技术栈基线确认

## 1. Test Scope
- Feature: F002-technology-stack-baseline
- Contract version: v1
- Business references: `docs/business/arch/01-部署架构.md`, `docs/business/api/01-API接口规范.md`, `docs/business/open-questions.md`
- Prototype references: `docs/prototype/SMP工业AI平台-原型v2.html`

## 2. P0 - Blocking
| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-01 | 技术栈基线文档完整 | 检查 `docs/architecture/01-technology-stack-baseline.md` | 覆盖后端、前端、AI adapter、数据、MLOps、部署、安全、测试与暂缓选项 |
| T-P0-02 | AC-03 | 脚手架可读取技术栈摘要 | 运行 `node tools/ai-scaffold/dist/cli.js scaffold-status` | 输出 `Technology stack` 段和 baseline doc |
| T-P0-03 | AC-05 | 当前质量门禁通过 | 运行 `node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F002-technology-stack-baseline --skip-backend-integration` | gate PASS |

## 3. P1 - Important
| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-02 | 根文档口径一致 | 检查 `README.md`、`project.md`、`AGENTS.md` | 均引用已确定技术栈，且说明 backend/frontend 仍待重建 |
| T-P1-02 | AC-04 | Agent brief 无旧技术栈残留 | 运行 `rg "Spring Boot 3\\.1|React 18|Ant Design 5|MyBatis Plus 3" .agents/agents .codex/agents` | 无过时默认口径命中 |
| T-P1-03 | AC-05 | ai-adapter 当前基线仍可验证 | 在 `ai-adapter/` 运行 compileall 和 unittest | Python 编译和测试通过 |

## 4. P2 - Nice to Have
| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-03 | doctor JSON 包含 technologyStack | 运行 `node tools/ai-scaffold/dist/cli.js doctor --json` | JSON 中包含 scaffold.technologyStack |

## 5. Cross-cutting Verification
- Permission: 本任务不新增业务 API；基线确定 YF LDAP + Spring Security + RBAC/ABAC。
- Audit: 本任务不产生业务审计事件；基线确定 PostgreSQL 事实表 + Kafka/OpenSearch 检索。
- Business rules: 后续 feature 必须把 `docs/business/rules/` MUST 规则纳入契约和测试。
- NFR: 基线引用 NFR，但容量/合规/维护窗口等仍保留 open questions。
- Frontend visual/prototype parity: 本任务不实现 UI；基线要求后续前端以原型 25 页面和截图验收。

## 6. Traceability
- AC-01 -> T-P0-01
- AC-02 -> T-P1-01
- AC-03 -> T-P0-02, T-P2-01
- AC-04 -> T-P1-02
- AC-05 -> T-P0-03, T-P1-03
