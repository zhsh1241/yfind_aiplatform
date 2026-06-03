> Archived by `node tools/ai-scaffold/dist/cli.js archive-planning-artifacts --stage all`.
> Source: `.omx/plans/test-spec-model-registry-foundation.md`

# Test Spec: F019 模型中心与模型版本基础

## 1. 测试目标

验证 F019 在不实现训练、真实评估、工程化和推理部署的前提下，能够建立可靠的模型注册中心基础：模型检索、模型导入、版本管理、文件绑定、权限、状态机、规则阻断和审计。

## 2. 覆盖范围

- Backend unit / integration tests。
- Frontend unit / route tests。
- E2E happy path 与关键异常路径。
- 权限、状态机、审计、文件对象绑定。
- scaffold feature artifact gate。

## 3. 后端测试

### 模型检索

- 创建多种 framework/taskType/scope/status/tag 的模型。
- `GET /api/v1/models` 支持关键词、标签、框架、任务类型、scope、状态筛选。
- 无权限模型不出现在列表中；跨 BU 未授权不泄露存在性。

### 模型与版本创建

- `POST /models` 创建模型，校验必填元数据。
- `POST /models/{id}/versions` 创建版本并绑定 `platform_file_object`。
- 版本号同一模型内唯一；冲突返回 409。
- 文件对象不存在或租户不匹配时拒绝。

### 生命周期状态机（MDL-009）

- Development → Testing 成功。
- Testing → Production 成功但需要评估通过。
- Testing → Deprecated 成功。
- Production → Deprecated 成功。
- Development → Production、Production → Testing、Deprecated → 任意状态失败。

### 发布准入（MDL-006）

- 无评估记录发布 Production 返回 422。
- 评估失败发布返回 422。
- 评估通过或合法导入证明可发布。
- 阻断时包含可读错误码与跳转评估建议。

### 删除阻断（MDL-003）

- 无活跃推理引用时可删除非 Production/或按 contract 允许的版本。
- 存在 RUNNING/ENABLED 推理引用时删除失败，并返回引用服务摘要。
- 删除阻断记录审计。

### 权限与跨 BU（MDL-004）

- PRIVATE 仅 owner 可见。
- BU 模型本 BU 可按权限查看/使用。
- PLATFORM 模型全局可见。
- 跨 BU 访问无授权返回 403/404。
- 跨 BU access request approve 后可查看/引用。
- scope 变更为跨 BU 可见时创建审批记录，审批通过前不生效。

### 审计

- 创建模型、创建版本、状态变更、发布阻断、删除阻断、访问申请、审批写入审计。
- 审计记录包含 actor、tenant、org、target、traceId、before/after 或 reason。

## 4. 前端测试

- 模型中心路由可渲染，无原型说明元素。
- 列表筛选器改变时调用正确 query 参数。
- 模型详情展示基础信息、版本列表、文件信息、状态与权限。
- 创建模型表单校验 framework/taskType/input/output/scope。
- 版本状态操作只展示合法动作；非法动作或后端阻断显示业务原因。
- 预训练模型选择器只展示可用且有权限模型。

## 5. E2E 测试

### Happy Path

1. 以模型训练工程师登录。
2. 进入模型中心。
3. 新建模型并绑定上传文件对象。
4. 创建 v1.0 版本。
5. 将版本从 Development 流转到 Testing。
6. 标记/导入评估通过证明。
7. 发布到 Production。
8. 在预训练模型选择器中筛选并选中该模型。

### Exception Path

- 未评估版本发布 Production：页面显示“尚未通过评估”。
- Development 直接发布 Production：显示状态流转错误。
- 跨 BU 未授权访问：不可见或拒绝。
- 活跃推理引用版本删除：显示引用服务列表。
- 文件对象缺失：版本创建失败并提示重新上传。

## 6. 非功能与安全验证

- 模型列表分页默认 pageSize，不一次拉全量。
- 文件下载/查看 API 不返回 MinIO 明文凭据。
- 访问控制覆盖 VIEW / DOWNLOAD / USE_FOR_TRAINING / DEPLOY。
- 所有写操作带 traceId 并记录审计。
- 错误响应遵循统一 envelope。

## 7. 门禁命令

规划阶段：

```powershell
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F019-model-registry-foundation --stage deep-interview
node tools/ai-scaffold/dist/cli.js archive-planning-artifacts docs/features/F019-model-registry-foundation --stage ralplan
```

批准后 build 阶段：

```powershell
node tools/ai-scaffold/dist/cli.js check-build-feature-prereqs docs/features/F019-model-registry-foundation
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F019-model-registry-foundation --skip-backend-integration
```

前端行为改变后追加：

```powershell
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F019-model-registry-foundation --skip-backend-integration --run-e2e
```

## 8. Exit Criteria

- `plan.md` 已经人审批准后，TASK/contract/test-plan 与本测试规格一致。
- 后端、前端、E2E 至少覆盖上述 happy path 与 exception path。
- MDL-003/004/006/009 有自动化测试。
- 文件对象、权限、审计没有平行绕实现。
- 无未解释的原型占位或 mock 绕过规则。
