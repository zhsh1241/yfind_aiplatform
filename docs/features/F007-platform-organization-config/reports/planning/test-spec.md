> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage ralplan`.
> Source: `.omx/plans/test-spec-platform-organization-config.md`

﻿# Test Spec: F007 组织、配置与文件元数据

## 1. Test Strategy

F007 测试必须覆盖 happy path、权限失败、状态机错误、审计行为、原型一致性和 TODO_CONFIRM 外部参数状态。测试不得以前端 mock 代替核心后端能力；前端单测可使用契约 fixture，但联调/门禁须连接真实后端测试替身。

## 2. Backend Test Matrix

| Area | Case | Expected |
|---|---|---|
| Organization | SUPER_ADMIN 创建 BU/PROJECT | 201/OK，编码唯一，父子关系正确，写 ORG_NODE_CREATED 审计 |
| Organization | BU_ADMIN 创建其他 BU 子树项目 | 403，写 CROSS_TENANT_ACCESS_ATTEMPT |
| Organization | 删除含子节点/成员/文件引用的节点 | 阻断或 DISABLED，写 WARNING/CRITICAL 审计 |
| Members | 添加成员并授予 BU/PROJECT 作用域角色 | 角色作用域落库，权限即时生效，必要时 session 失效 |
| Config | GLOBAL 默认 + BU override + PROJECT override | effectiveValue 按 PROJECT > BU > GLOBAL 解析 |
| Config | BU override 放宽集团上限 | 422/业务规则失败，写审计 |
| Config | 敏感配置读取 | 返回脱敏值，不返回 secret 明文 |
| API Key | 创建 API Key | 仅创建响应含明文；列表只显示 maskedKey；hash 存储 |
| API Key | 撤销 API Key 后使用/查询 | 不可用，写 API_KEY_REVOKED CRITICAL 审计 |
| File Metadata | init object key + complete upload | 状态 INITIATED→UPLOADED/VERIFIED，hash/size 校验 |
| File Metadata | hash 不匹配或重复 complete | 422/409，写审计 |
| File Metadata | 越权下载/删除 | 403/404 策略一致，写 ACCESS_DENIED |
| Notification | 未配置 SMTP/IM 时测试 | 返回 UNCONFIGURED + TODO_CONFIRM reason，不伪造成功 |
| Notification | 配置格式错误 | 400/422，错误信息可诊断，写审计 |

## 3. Frontend Test Matrix

| Page | Case | Expected |
|---|---|---|
| org | 组织架构 Tab 加载真实树 | 保留 3-Tab、组织树、租户列表、操作列 |
| org | 新建租户弹窗必填校验 | 名称/代码必填；成功态与原型一致 |
| org | 添加成员 | 用户搜索、角色、作用域提交到真实 API |
| org | 编辑配额/BU 配置 | 调用 config API，显示保存结果和错误 |
| sys | 基础/存储/通知配置保存 | 调用真实配置 API；显示有效值/错误 |
| sys | 通知渠道测试 | 发送中/成功/失败/未配置状态可区分 |
| sys | API Key 新建 | 一次性展示完整 key，关闭后列表脱敏 |
| sys | 认证集成 | 外部参数未配置时显示 TODO_CONFIRM/未配置状态，不展示假成功 |
| Navigation | menu 权限 | 复用 F006 menu:org、menu:sys 权限控制 |

## 4. E2E / Integration

- 登录 admin → 进入组织管理 → 新建租户 → 添加成员 → 查看审计日志。
- 登录 BU admin → 尝试修改其他 BU 配置 → 403 → 审计日志出现 WARNING/CRITICAL。
- 登录 admin → 系统配置保存存储/通知参数 → 通知测试返回真实状态。
- 创建 API Key → 页面一次性展示 → 刷新/关闭后不再显示明文。
- 初始化文件元数据 → 完成上传登记 → 查询元数据 → 软删除。

## 5. Gate Commands

Planning stage:

`powershell
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F007-platform-organization-config --stage deep-interview
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F007-platform-organization-config --stage ralplan
`

After human approval and build:

`powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F007-platform-organization-config
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F007-platform-organization-config --skip-backend-integration
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F007-platform-organization-config --skip-backend-integration --run-e2e
`

## 6. Known Verification Risks

- 外部 SMTP/IM/MinIO/LDAP 参数未知；测试必须覆盖 UNCONFIGURED 与配置格式校验，生产联调由后续环境确认补齐。
- F006 权限审计回归必须纳入，避免拆分平台服务时破坏登录、用户、角色、审计能力。
