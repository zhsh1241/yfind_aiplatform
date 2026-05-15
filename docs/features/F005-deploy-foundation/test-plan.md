# Test Plan: 部署工程底座

## 1. Test Scope

- Feature: F005-deploy-foundation
- Contract version: v1
- Business references: `docs/business/arch/01-部署架构.md`, `docs/business/bizdocs/06-非功能性需求.md`, `docs/business/open-questions.md`
- Prototype references: 无专属页面；前端首页作为部署 smoke 入口

## 2. P0 - Blocking

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P0-01 | AC-01 | 容器入口存在 | 检查 backend/frontend Dockerfile 与 nginx.conf | 文件存在 |
| T-P0-02 | AC-02 | 本地 Compose 服务齐备 | 检查 `deploy/local/docker-compose.yml` | 包含 postgres、valkey、minio、backend、frontend |
| T-P0-03 | AC-05 | AI scaffold gate 纳入工程骨架 | 执行 `node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration` | backend/frontend/ai-adapter gate 通过 |

## 3. P1 - Important

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P1-01 | AC-03 | Helm 草案存在且不伪造生产参数 | 检查 `deploy/helm/smp-platform` | Chart/templates 存在，values 使用 `TODO_CONFIRM_*` |
| T-P1-02 | AC-04 | smoke 脚本覆盖最小运行入口 | 检查 `deploy/scripts/smoke.ps1` | 调用后端 `/actuator/health` 与前端 URL |

## 4. P2 - Nice to Have

| ID | AC | Scenario | Steps | Expected |
|---|---|---|---|---|
| T-P2-01 | AC-03 | Helm lint | 在 Helm 4 可用环境执行 lint | 无模板错误 |

## 5. Cross-cutting Verification

- Permission: 生产认证/LDAP/网关由 F006/F017 验证。
- Audit: 本功能不产生业务审计事件。
- Business rules: 不涉及业务 MUST。
- NFR: 健康检查、容器化、配置注入和 smoke 是后续生产加固基础。
- Frontend visual/prototype parity: 不涉及视觉验收。

## 6. Traceability

- AC-01 -> T-P0-01
- AC-02 -> T-P0-02
- AC-03 -> T-P1-01, T-P2-01
- AC-04 -> T-P1-02
- AC-05 -> T-P0-03