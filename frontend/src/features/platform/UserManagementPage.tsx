import { Button, Card, Col, Form, Input, Modal, Row, Space, Table, Tabs, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { platformApi, type PermissionMatrix, type RoleSummary, type UserSummary } from './platformApi';

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

  const columns = [
    { title: '用户', dataIndex: 'displayName', key: 'displayName', render: (_: string, row: UserSummary) => <strong>{row.displayName}<br /><span className="muted">{row.id}</span></strong> },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '角色', key: 'roles', render: (_: unknown, row: UserSummary) => <Space wrap>{row.roles.map((role) => <Tag key={role} color={roleColor(role)}>{role}</Tag>)}</Space> },
    { title: 'BU', dataIndex: 'tenantName', key: 'tenantName' },
    { title: '最后登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', render: (value: string | null) => value ?? '从未登录' },
    { title: '状态', dataIndex: 'status', key: 'status', render: statusTag },
    { title: '操作', key: 'actions', render: () => <Space><Button size="small">编辑</Button><Button size="small">解锁</Button></Space> },
  ];

  return (
    <div className="content-page">
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>用户管理</Typography.Title>
          <Typography.Text type="secondary">账号管理 · 角色分配 · GPU 用量统计</Typography.Text>
        </div>
        <Space>
          <Button>⬆ 批量导入</Button>
          <Button type="primary" onClick={() => setOpen(true)}>＋ 新建用户</Button>
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
            children: <RoleCards roles={roles.data ?? []} />,
          },
          {
            key: 'matrix',
            label: '权限矩阵',
            children: <PermissionMatrixTable matrix={matrix.data} loading={matrix.isLoading} />,
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
    </div>
  );
}

function RoleCards({ roles }: { roles: RoleSummary[] }) {
  return (
    <Row gutter={[16, 16]}>
      {roles.map((role) => (
        <Col key={role.code} xs={24} md={12} xl={8}>
          <Card className="role-card">
            <Space orientation="vertical">
              <Tag color={roleColor(role.code)}>{role.name}</Tag>
              <Typography.Text strong>{role.code}</Typography.Text>
              <Typography.Text type="secondary">{role.description}</Typography.Text>
              <Typography.Text>{role.userCount} 个用户</Typography.Text>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

export function PermissionMatrixTable({ matrix, loading }: { matrix?: PermissionMatrix; loading?: boolean }) {
  const roles = matrix?.roles ?? [];
  const columns = [
    { title: '模块', dataIndex: 'module', key: 'module', fixed: 'left' as const },
    { title: '权限', dataIndex: 'permissionName', key: 'permissionName' },
    ...roles.map((role) => ({
      title: role.name,
      key: role.code,
      align: 'center' as const,
      render: (_: unknown, row: { allowedRoles: string[] }) => <span className={row.allowedRoles.includes(role.code) ? 'matrix-check on' : 'matrix-check'}>{row.allowedRoles.includes(role.code) ? '✓' : '×'}</span>,
    })),
  ];
  return <Table rowKey="permissionCode" loading={loading} dataSource={matrix?.rows ?? []} columns={columns} pagination={false} scroll={{ x: true }} />;
}
