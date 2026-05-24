import { ImportOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Col, Form, Input, Modal, Row, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { displayRoleName, platformApi, type PermissionMatrix, type RoleSummary, type UserSummary } from './platformApi';

function statusTag(status: string) {
  return status === 'ACTIVE' ? <Tag color="green">正常</Tag> : <Tag color="red">停用</Tag>;
}

function roleColor(role: string) {
  if (role === 'SUPER_ADMIN') return 'red';
  if (role === 'BU_ADMIN') return 'orange';
  if (role.includes('MODEL')) return 'blue';
  if (role.includes('DATA')) return 'green';
  return 'default';
}

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleSummary | null>(null);
  const users = useQuery({ queryKey: ['platform-users'], queryFn: platformApi.users });
  const roles = useQuery({ queryKey: ['platform-roles'], queryFn: platformApi.roles });
  const matrix = useQuery({ queryKey: ['platform-permission-matrix'], queryFn: platformApi.permissionMatrix });
  const createUser = useMutation({
    mutationFn: platformApi.createUser,
    onSuccess: async () => {
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['platform-users'] });
    },
  });
  const updateUser = useMutation({
    mutationFn: ({ userId, values }: { userId: string; values: { displayName: string; email: string; status: string } }) => platformApi.updateUser(userId, values),
    onSuccess: async () => {
      setEditingUser(null);
      await queryClient.invalidateQueries({ queryKey: ['platform-users'] });
    },
  });
  const updateRoles = useMutation({
    mutationFn: ({ userId, roleCodes, expiresAt }: { userId: string; roleCodes: string[]; expiresAt?: string | null }) => platformApi.updateUserRoles(userId, roleCodes, expiresAt),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-permission-matrix'] });
    },
  });
  const unlockUser = useMutation({
    mutationFn: platformApi.unlockUser,
    onSuccess: async () => {
      message.success('用户已解锁并刷新会话版本');
      await queryClient.invalidateQueries({ queryKey: ['platform-users'] });
    },
  });
  const createRole = useMutation({
    mutationFn: platformApi.createRole,
    onSuccess: async () => {
      setRoleOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-permission-matrix'] });
    },
  });
  const updateRolePermissions = useMutation({
    mutationFn: ({ roleCode, permissionCodes }: { roleCode: string; permissionCodes: string[] }) => platformApi.updateRolePermissions(roleCode, permissionCodes),
    onSuccess: async () => {
      message.success('角色权限已更新，关联用户会话已失效');
      setEditingRole(null);
      await queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-permission-matrix'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-users'] });
    },
  });

  const columns = [
    { title: '用户', dataIndex: 'displayName', key: 'displayName', render: (_: string, row: UserSummary) => <strong>{row.displayName}<br /><span className="muted">{row.id}</span></strong> },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '角色', key: 'roles', render: (_: unknown, row: UserSummary) => <Space wrap>{row.roles.map((role) => <Tag key={role} color={roleColor(role)}>{displayRoleName(role, roles.data ?? [])}</Tag>)}</Space> },
    { title: 'BU', dataIndex: 'tenantName', key: 'tenantName' },
    { title: '最后登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', render: (value: string | null) => value ?? '从未登录' },
    { title: '状态', dataIndex: 'status', key: 'status', render: statusTag },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, row: UserSummary) => (
        <Space>
          <Button size="small" onClick={() => setEditingUser(row)}>编辑</Button>
          <Button size="small" loading={unlockUser.isPending} onClick={() => unlockUser.mutate(row.id)}>解锁</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="content-page">
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>用户管理</Typography.Title>
          <Typography.Text type="secondary">账号管理 · 角色分配 · GPU 用量统计</Typography.Text>
        </div>
        <Space>
          <Button icon={<ImportOutlined />}>批量导入</Button>
          <Button icon={<PlusOutlined />} onClick={() => setRoleOpen(true)}>新增角色</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新建用户</Button>
        </Space>
      </div>

      <Tabs
        items={[
          {
            key: 'users',
            label: '用户列表',
            children: <Table rowKey="id" loading={users.isLoading} dataSource={users.data?.items ?? []} columns={columns} pagination={false} />,
          },
          {
            key: 'roles',
            label: '角色管理',
            children: <RoleCards roles={roles.data ?? []} onCreate={() => setRoleOpen(true)} onEditPermissions={setEditingRole} />,
          },
          {
            key: 'matrix',
            label: '权限矩阵',
            children: (
              <PermissionMatrixTable
                matrix={matrix.data}
                loading={matrix.isLoading}
                onToggleRolePermission={(role, permissionCode, checked) => {
                  const currentCodes = permissionCodesForRole(matrix.data?.rows ?? [], role.code);
                  const nextCodes = checked
                    ? Array.from(new Set([...currentCodes, permissionCode]))
                    : currentCodes.filter((code) => code !== permissionCode);
                  updateRolePermissions.mutate({ roleCode: role.code, permissionCodes: nextCodes });
                }}
                updatingRoleCode={updateRolePermissions.variables?.roleCode}
              />
            ),
          },
        ]}
      />

      <Modal title="新建用户" open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" onFinish={(values) => createUser.mutate({ ...values, tenantId: values.tenantId || 'TENANT-CABIN', buCode: values.buCode || 'CABIN', password: values.password || 'Smp@123456' })}>
          <Form.Item label="姓名" name="displayName" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="账号" name="username" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="BU" name="buCode" initialValue="CABIN"><Input /></Form.Item>
          <Form.Item label="租户ID" name="tenantId" initialValue="TENANT-CABIN"><Input /></Form.Item>
          <Button type="primary" htmlType="submit" loading={createUser.isPending}>创建零权限用户</Button>
        </Form>
      </Modal>
      <Modal title="编辑用户" open={Boolean(editingUser)} onCancel={() => setEditingUser(null)} footer={null} destroyOnHidden>
        {editingUser && (
          <Form
            layout="vertical"
            initialValues={{
              displayName: editingUser.displayName,
              email: editingUser.email,
              status: editingUser.status,
              roles: editingUser.roles,
              expiresAt: null,
            }}
            onFinish={(values) => {
              updateUser.mutate({ userId: editingUser.id, values: { displayName: values.displayName, email: values.email, status: values.status } });
              updateRoles.mutate({ userId: editingUser.id, roleCodes: values.roles ?? [], expiresAt: values.expiresAt || null });
            }}
          >
            <Form.Item label="姓名" name="displayName" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item label="邮箱" name="email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
            <Form.Item label="状态" name="status" rules={[{ required: true }]}>
              <Select options={[{ value: 'ACTIVE', label: '正常' }, { value: 'DISABLED', label: '停用' }]} />
            </Form.Item>
            <Form.Item label="角色" name="roles" tooltip="BU 数据范围与功能权限通过角色授予；用户仅维护账号资料和角色分配。">
              <Select
                mode="multiple"
                options={(roles.data ?? []).map((role) => ({ value: role.code, label: `${role.name}（${role.code}）` }))}
                placeholder="选择角色"
              />
            </Form.Item>
            <Form.Item label="临时授权到期时间" name="expiresAt" tooltip="留空表示长期有效；填写 ISO 时间用于临时权限。">
              <Input placeholder="例如 2026-06-30T18:00:00+08:00" />
            </Form.Item>
            <Typography.Paragraph type="secondary">BU 权限跟随角色权限矩阵生效，不在用户资料中直接维护。</Typography.Paragraph>
            <Button type="primary" htmlType="submit" loading={updateUser.isPending || updateRoles.isPending}>保存用户与角色</Button>
          </Form>
        )}
      </Modal>
      <RoleCreateModal
        open={roleOpen}
        loading={createRole.isPending}
        permissions={matrix.data?.rows ?? []}
        onCancel={() => setRoleOpen(false)}
        onCreate={(values) => createRole.mutate(values)}
      />
      <RolePermissionEditModal
        role={editingRole}
        loading={updateRolePermissions.isPending}
        permissions={matrix.data?.rows ?? []}
        onCancel={() => setEditingRole(null)}
        onSave={(permissionCodes) => editingRole && updateRolePermissions.mutate({ roleCode: editingRole.code, permissionCodes })}
      />
    </div>
  );
}

function RoleCards({ roles, onCreate, onEditPermissions }: { roles: RoleSummary[]; onCreate: () => void; onEditPermissions: (role: RoleSummary) => void }) {
  return (
    <Space orientation="vertical" size={16} className="full-width">
      <Card>
        <Space wrap>
          <Typography.Text strong>角色管理是 BU 权限的归属入口</Typography.Text>
          <Typography.Text type="secondary">新增角色后，在权限矩阵中维护菜单、功能和 BU 范围能力，再分配给用户。</Typography.Text>
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>新增角色</Button>
        </Space>
      </Card>
      <Row gutter={[16, 16]}>
        {roles.map((role) => (
          <Col key={role.code} xs={24} md={12} xl={8}>
            <Card className="role-card">
              <Space orientation="vertical">
                <Tag color={roleColor(role.code)}>{role.name}</Tag>
                <Typography.Text strong>{role.code}</Typography.Text>
                <Typography.Text type="secondary">{role.description}</Typography.Text>
                <Typography.Text type="secondary">作用域：{role.scope}{role.parentRoleCode ? ` · 父角色：${role.parentRoleCode}` : ''}</Typography.Text>
                <Typography.Text>{role.userCount} 个用户</Typography.Text>
                {role.preset ? (
                  <Button size="small" onClick={() => onEditPermissions(role)}>查看权限</Button>
                ) : (
                  <Button size="small" onClick={() => onEditPermissions(role)}>编辑权限</Button>
                )}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
}

export function RolePermissionEditModal({
  role,
  loading,
  permissions,
  onCancel,
  onSave,
}: {
  role: RoleSummary | null;
  loading?: boolean;
  permissions: PermissionMatrix['rows'];
  onCancel: () => void;
  onSave: (permissionCodes: string[]) => void;
}) {
  const currentPermissionCodes = role
    ? permissions.filter((permission) => permission.allowedRoles.includes(role.code)).map((permission) => permission.permissionCode)
    : [];
  const readonly = Boolean(role?.preset);
  return (
    <Modal
      title={role ? `${readonly ? '查看' : '编辑'}角色权限：${role.name}` : '角色权限'}
      open={Boolean(role)}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      {role && (
        <Form
          key={role.code}
          layout="vertical"
          initialValues={{ permissionCodes: currentPermissionCodes }}
          onFinish={(values: { permissionCodes?: string[] }) => onSave(values.permissionCodes ?? [])}
        >
          <Card size="small" className="mb-16">
            <Space orientation="vertical">
              <Typography.Text strong>{role.code}</Typography.Text>
              <Typography.Text type="secondary">{role.description}</Typography.Text>
              <Typography.Text type="secondary">作用域：{role.scope}{role.parentRoleCode ? ` · 父角色权限上限：${role.parentRoleCode}` : ''}</Typography.Text>
            </Space>
          </Card>
          <Form.Item label="权限" name="permissionCodes" tooltip="BU 权限通过自定义角色的权限矩阵授予；保存后关联用户旧会话会失效。">
            <Select
              mode="multiple"
              disabled={readonly}
              options={permissions.map((permission) => ({ value: permission.permissionCode, label: `${permission.module} / ${permission.permissionName}` }))}
              placeholder="选择菜单与功能权限"
            />
          </Form.Item>
          <Typography.Paragraph type="secondary">
            {readonly ? '预设角色权限仅支持查看，不可在页面直接修改。' : '这里只维护自定义角色权限，不直接修改用户 BU 权限。'}
          </Typography.Paragraph>
          {readonly ? (
            <Button aria-label="关闭" onClick={onCancel}>关闭</Button>
          ) : (
            <Button type="primary" htmlType="submit" loading={loading}>保存角色权限</Button>
          )}
        </Form>
      )}
    </Modal>
  );
}

function RoleCreateModal({
  open,
  loading,
  permissions,
  onCancel,
  onCreate,
}: {
  open: boolean;
  loading?: boolean;
  permissions: PermissionMatrix['rows'];
  onCancel: () => void;
  onCreate: (values: { code: string; name: string; description?: string; scope: string; permissionCodes: string[] }) => void;
}) {
  return (
    <Modal title="新增角色" open={open} onCancel={onCancel} footer={null} destroyOnHidden>
      <Form layout="vertical" initialValues={{ scope: 'TENANT', permissionCodes: ['menu:dash'] }} onFinish={onCreate}>
        <Form.Item label="角色编码" name="code" rules={[{ required: true }]}><Input placeholder="例如 CABIN_DATA_MANAGER" /></Form.Item>
        <Form.Item label="角色名称" name="name" rules={[{ required: true }]}><Input placeholder="例如 座舱数据管理员" /></Form.Item>
        <Form.Item label="描述" name="description"><Input.TextArea rows={3} placeholder="说明该角色可管理的 BU 场景与责任边界" /></Form.Item>
        <Form.Item label="作用域" name="scope" rules={[{ required: true }]}>
          <Select options={[{ value: 'TENANT', label: 'BU / 租户范围' }, { value: 'PROJECT', label: '项目范围' }, { value: 'GLOBAL', label: '全局范围' }]} />
        </Form.Item>
        <Form.Item label="父角色权限上限" name="parentRoleCode" tooltip="可选；选择后自定义角色权限不得超过父角色。">
          <Select
            allowClear
            options={[
              { value: 'BU_ADMIN', label: 'BU子管理员' },
              { value: 'DATA_ANNOTATOR', label: '数据标注工程师' },
              { value: 'DATA_REVIEWER', label: '审核工程师' },
              { value: 'MODEL_TRAINER', label: '模型训练工程师' },
              { value: 'MODEL_OPS', label: '模型应用工程师' },
            ]}
            placeholder="不继承 / 不限制"
          />
        </Form.Item>
        <Form.Item label="初始权限" name="permissionCodes" tooltip="BU 权限通过角色权限矩阵授予，不直接挂到用户。">
          <Select
            mode="multiple"
            options={permissions.map((permission) => ({ value: permission.permissionCode, label: `${permission.module} / ${permission.permissionName}` }))}
            placeholder="选择菜单与功能权限"
          />
        </Form.Item>
        <Typography.Paragraph type="secondary">BU 权限通过角色权限矩阵授予，不直接挂到用户。</Typography.Paragraph>
        <Button type="primary" htmlType="submit" loading={loading}>创建角色并写入权限矩阵</Button>
      </Form>
    </Modal>
  );
}

function permissionCodesForRole(rows: PermissionMatrix['rows'], roleCode: string) {
  return rows.filter((permission) => permission.allowedRoles.includes(roleCode)).map((permission) => permission.permissionCode);
}

export function PermissionMatrixTable({
  matrix,
  loading,
  onToggleRolePermission,
  updatingRoleCode,
}: {
  matrix?: PermissionMatrix;
  loading?: boolean;
  onToggleRolePermission?: (role: RoleSummary, permissionCode: string, checked: boolean) => void;
  updatingRoleCode?: string;
}) {
  const roles = matrix?.roles ?? [];
  const columns = [
    { title: '模块', dataIndex: 'module', key: 'module', fixed: 'left' as const },
    { title: '权限', dataIndex: 'permissionName', key: 'permissionName' },
    ...roles.map((role) => ({
      title: (
        <Space orientation="vertical" size={0}>
          <span>{role.name}</span>
          {role.preset ? <Tag>可查看</Tag> : <Tag color="blue">可直接勾选</Tag>}
        </Space>
      ),
      key: role.code,
      align: 'center' as const,
      render: (_: unknown, row: { permissionCode: string; allowedRoles: string[] }) => {
        const checked = row.allowedRoles.includes(role.code);
        if (!onToggleRolePermission || role.preset) {
          return (
            <span className={checked ? 'matrix-check on' : 'matrix-check'} aria-label={checked ? '已授权' : '未授权'}>
              {checked ? '已' : '未'}
            </span>
          );
        }
        return (
          <Checkbox
            checked={checked}
            disabled={updatingRoleCode === role.code}
            onChange={(event) => onToggleRolePermission(role, row.permissionCode, event.target.checked)}
            aria-label={`${role.name}-${row.permissionCode}`}
          />
        );
      },
    })),
  ];
  return <Table rowKey="permissionCode" loading={loading} dataSource={matrix?.rows ?? []} columns={columns} pagination={false} scroll={{ x: true }} />;
}
