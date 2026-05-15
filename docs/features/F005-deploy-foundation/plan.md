---
feature: F005-deploy-foundation
title: 部署工程底座
plan_status: approved
approved_at: 2026-05-16
owner: codex
created_at: 2026-05-15
updated_at: 2026-05-16
---

# Plan: 部署工程底座

## 1. 背景与目标

在 F003 后端骨架与 F004 前端骨架恢复后，本功能恢复部署工程最小骨架，确保本地联调、容器镜像、Kubernetes/Helm 草案和 AI scaffold gate 都有明确入口。

- 业务来源：`docs/business/arch/01-部署架构.md`、`docs/business/bizdocs/06-非功能性需求.md`、`docs/business/open-questions.md`
- 原型来源：部署底座无专属业务页面；服务于 `docs/prototype/SMP工业AI平台-原型v2.html` 全局访问入口
- 技术来源：`docs/architecture/01-technology-stack-baseline.md`、`docs/features/FEATURE_BREAKDOWN.md` F005
- 目标结果：建立 backend/frontend Dockerfile、本地 Compose、Helm chart 草案、smoke 脚本，并启用 backend/frontend/deploy codeLikeRoots。

## 2. 范围

### In Scope

- 后端 Dockerfile 与前端 Dockerfile/nginx 配置。
- `deploy/local/docker-compose.yml`：PostgreSQL、Valkey、MinIO、backend、frontend 本地联调草案。
- `deploy/helm/smp-platform`：Chart、values、backend/frontend deployment、ingress 草案。
- `deploy/scripts/smoke.ps1`：后端 health 与前端首页 smoke。
- `ai-scaffold.config.json` 将 `backend/`、`frontend/`、`deploy/` 纳入 codeLikeRoots，并启用 backend/frontend gate。

### Out of Scope

- 不提供生产可直接上线的 Helm values。
- 不确认镜像仓库、Kubernetes namespace、Ingress host、LDAP、Kafka ACL、KMS 等外部参数。
- 不接入 CI/CD、Argo CD 应用或真实集群。

## Reuse Strategy

### Must Reuse

- 部署架构：`docs/business/arch/01-部署架构.md`。
- 技术栈基线：`docs/architecture/01-technology-stack-baseline.md` 中 Docker/OCI、Kubernetes 1.35.x、Helm 4、Argo CD 3.x。
- 工程骨架：F003 `backend/` 与 F004 `frontend/`。
- AI 脚手架：`tools/ai-scaffold/` gate 和 `ai-scaffold.config.json`。

### Duplication Rejected

- 不复制旧 deploy 实现或旧环境参数。
- 不把本地 Compose 作为生产部署事实来源。
- 不伪造生产镜像仓库、证书、账号或集群配置。

### Approved New Seams

- 新增 `deploy/local/.env.example` 和 `docker-compose.yml` 作为本地联调 seam。
- 新增 `deploy/helm/smp-platform/values.yaml`，所有未确认生产参数保留 `TODO_CONFIRM_*`。
- 新增 `deploy/scripts/smoke.ps1` 作为部署后最小 smoke seam。

## 4. 交付方案

1. 为 backend/frontend 增加容器构建入口。
2. 建立本地 Compose 串起 PostgreSQL、Valkey、MinIO、backend、frontend。
3. 建立 Helm chart 草案和 values TODO 占位。
4. 增加 smoke 脚本和部署 README。
5. 更新 AI scaffold 配置并运行 gate。

## 5. 数据、权限与审计

- 领域对象：不新增业务领域对象。
- MUST 规则：不实现业务规则。
- 权限：LDAP/网关/证书参数保留 `TODO_CONFIRM_*`，F006/F017 收口。
- 审计事件：不产生业务审计事件；运行日志与审计存储策略由 F017 生产加固定义。

## 6. 风险与未决问题

- 生产镜像仓库、命名空间、Ingress/Gateway、TLS、LDAP、Kafka、对象存储、MLOps 地址仍待确认。
- Helm chart 为草案，需在真实 Kubernetes 环境与 Helm 4 可用性确认后升级。
- 本地 Compose 未覆盖 Kafka、OpenSearch、MLflow、Argo Workflows、KServe 等完整生产依赖。

## 7. 审批记录

- Reviewer: codex 自主工程底座规划
- Decision: approved，用于恢复部署骨架并让 backend/frontend/deploy 纳入 AI scaffold gate。