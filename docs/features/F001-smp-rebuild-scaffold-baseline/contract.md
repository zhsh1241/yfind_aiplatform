# Feature Contract: SMP 重建脚手架基线

## Contract Metadata

- Version: v1
- Status: implemented
- Owner: contract-architect
- Created: 2026-05-15
- Feature: F001-smp-rebuild-scaffold-baseline

## 1. Requirement Summary

- 用户目标：脚手架准确描述当前资料/原型基线和可验证服务状态。
- 业务价值：防止后续 agent 误用旧实现，确保质量门禁可运行。
- 业务资料：`docs/business/`
- 原型页面：`docs/prototype/SMP工业AI平台-原型v2.html`

## 2. Configuration Contract

### `ai-scaffold.config.json`

| Field | Required Value | Description |
|---|---|---|
| `referenceRoots` | `docs/business/`, `docs/prototype/` | 业务/原型参考资料，不作为代码变更强制绑定 feature |
| `codeLikeRoots` | `ai-adapter/`, `docs/db/` | 当前仍需工作项绑定的代码/数据库目录 |
| `backend.enabled` | `false` | 旧后端已清空，gate 跳过 |
| `frontends[].enabled` | `false` for `web` | 旧前端已清空，gate 跳过 |
| `services[ai-adapter].enabled` | `true` | 保留 Python compile/test/verify |

### CLI Behavior

| Command | Expected Behavior |
|---|---|
| `scaffold-status` | 输出 delivery/runtime/reference/scaffold roots 状态 |
| `doctor` | 不要求 disabled backend/frontend 的 java/mvn/frontend deps；仍检查启用服务命令 |
| `gate --skip-backend-integration` | 跳过 disabled backend/frontend，执行 ai-adapter 命令 |
| `check-work-item-link --stdin` | `docs/business/`、`docs/prototype/` 变更不触发代码工作项要求 |

## 3. API Contract

本功能不新增业务 API。

## 4. Compatibility

- 对现有 `tools/ai-scaffold` 命令保持向后兼容。
- 新字段 `enabled` 默认不配置时视为启用。
- 新字段 `referenceRoots` 默认包含 `docs/business/` 与 `docs/prototype/`。
