import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Modal, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { dataApi, platformApi, type AuditLogSummary, type DatasetAccessRequest, type PermissionMatrix, type RoleCreateInput, type RoleSummary } from './platformApi';
import { PermissionMatrixTable, RolePermissionEditModal } from './UserManagementPage';

function permissionCodesForRole(rows: PermissionMatrix['rows'], roleCode: string) {
  return rows.filter((permission) => permission.allowedRoles.includes(roleCode)).map((permission) => permission.permissionCode);
}

export function PermissionManagementPage() {
  const queryClient = useQueryClient();
  const [grantOpen, setGrantOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleSummary | null>(null);
  const [reviewingRequest, setReviewingRequest] = useState<DatasetAccessRequest | null>(null);
  const [requestForm] = Form.useForm<{ datasetId: string; purpose: string }>();
  const [reviewForm] = Form.useForm<{ reason?: string; expiresAt?: string }>();
  const matrix = useQuery({ queryKey: ['platform-permission-matrix'], queryFn: platformApi.permissionMatrix });
  const audits = useQuery({ queryKey: ['platform-audit-logs'], queryFn: () => platformApi.auditLogs() });
  const datasets = useQuery({ queryKey: ['datasets-for-access-request'], queryFn: () => dataApi.datasets({ pageSize: 100 }) });
  const accessRequests = useQuery({ queryKey: ['dataset-access-requests'], queryFn: () => dataApi.accessRequestInbox() });
  const pendingRequests = (accessRequests.data ?? []).filter((item) => item.status === 'PENDING');
  const grants = (accessRequests.data ?? []).filter((item) => item.status === 'APPROVED');
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
      setEditingRole(null);
      await queryClient.invalidateQueries({ queryKey: ['platform-roles'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-permission-matrix'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-users'] });
    },
  });
  const submitAccessRequest = useMutation({
    mutationFn: (values: { datasetId: string; purpose: string }) => dataApi.requestAccess(values.datasetId, values.purpose),
    onSuccess: async () => {
      setGrantOpen(false);
      requestForm.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['dataset-access-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-audit-logs'] });
    },
  });
  const approveAccess = useMutation({
    mutationFn: ({ requestId, reason, expiresAt }: { requestId: string; reason?: string; expiresAt?: string }) => dataApi.approveAccess(requestId, { reason, expiresAt }),
    onSuccess: async () => {
      setReviewingRequest(null);
      reviewForm.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['dataset-access-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-audit-logs'] });
    },
  });
  const rejectAccess = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) => dataApi.rejectAccess(requestId, { reason }),
    onSuccess: async () => {
      setReviewingRequest(null);
      reviewForm.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['dataset-access-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-audit-logs'] });
    },
  });

  return (
    <div className="content-page">
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>权限管理</Typography.Title>
          <Typography.Text type="secondary">RBAC 角色权限矩阵 · 6 个预设角色</Typography.Text>
        </div>
        <Space>
          <Button>导出矩阵</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setRoleOpen(true)}>创建角色</Button>
        </Space>
      </div>

      <Tabs
        items={[
          {
            key: 'overview',
            label: '当前权限概览',
            children: (
              <Space orientation="vertical" size={16} className="full-width">
                <Alert type="info" showIcon title="数据集访问授权" description="权限申请、审批工作台与授权记录均保留原型路径；待处理记录请进入审批工作台处理。" /><Typography.Text>待审批</Typography.Text>
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
                <Card title="角色权限维护">
                  <Table
                    rowKey="code"
                    size="small"
                    dataSource={matrix.data?.roles ?? []}
                    pagination={false}
                    columns={[
                      { title: '角色编码', dataIndex: 'code' },
                      { title: '角色名称', dataIndex: 'name' },
                      { title: '类型', dataIndex: 'preset', render: (preset: boolean) => (preset ? <Tag>预设角色</Tag> : <Tag color="blue">自定义角色</Tag>) },
                      { title: '作用域', dataIndex: 'scope' },
                      { title: '父角色上限', dataIndex: 'parentRoleCode', render: (value: string | null) => value ?? '无' },
                      {
                        title: '操作',
                        key: 'actions',
                        render: (_: unknown, role: RoleSummary) => <Button size="small" onClick={() => setEditingRole(role)}>{role.preset ? '查看权限' : '编辑权限'}</Button>,
                      },
                    ]}
                  />
                  <Typography.Paragraph type="secondary" className="mt-12">上方矩阵可直接勾选自定义角色权限；预设角色可查看已拥有权限但不可编辑。复杂批量调整也可点击“编辑权限”。</Typography.Paragraph>
                </Card>
              </Space>
            ),
          },
          {
            key: 'request',
            label: '权限申请',
            children: (
              <Space orientation="vertical" size={16} className="full-width">
                <Card title="提交数据集访问申请" extra={<Button type="primary" size="small" onClick={() => setGrantOpen(true)}>提交申请</Button>}>
                  <Typography.Paragraph type="secondary">受限数据集需要先提交用途说明，审批通过后系统自动写入数据集访问授权并保留审计记录。</Typography.Paragraph>
                </Card>
                <Card title="申请记录">
                  <AccessRequestTable items={accessRequests.data ?? []} loading={accessRequests.isLoading} showActions={false} />
                </Card>
              </Space>
            ),
          },
          {
            key: 'approval',
            label: '审批工作台',
            children: (
              <Space orientation="vertical" size={16} className="full-width">
                <Card title="待审批" extra={<Tag color="orange">{pendingRequests.length}</Tag>}>
                  <AccessRequestTable items={pendingRequests} loading={accessRequests.isLoading} showActions onReview={(record) => setReviewingRequest(record)} />
                </Card>
                <Card title="已通过授权">
                  <AccessRequestTable items={grants} loading={accessRequests.isLoading} showActions={false} />
                </Card>
              </Space>
            ),
          },
          {
            key: 'history',
            label: '申请历史',
            children: <AuditTable items={audits.data?.items ?? []} loading={audits.isLoading} />,
          },
        ]}
      />

      <Modal title="提交数据集访问申请" open={grantOpen} onCancel={() => setGrantOpen(false)} footer={null} destroyOnHidden>
        <Form form={requestForm} layout="vertical" onFinish={(values) => submitAccessRequest.mutate(values)}>
          <Form.Item label="申请数据集" name="datasetId" rules={[{ required: true, message: '请选择数据集' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              loading={datasets.isLoading}
              options={(datasets.data?.items ?? []).map((dataset) => ({ value: dataset.datasetId, label: `${dataset.name} · ${dataset.accessLevel}` }))}
              placeholder="选择需要访问的数据集"
            />
          </Form.Item>
          <Form.Item label="申请用途" name="purpose" rules={[{ required: true, message: '请填写申请用途' }]}>
            <Input.TextArea rows={4} placeholder="说明业务场景、项目范围、使用期限或模型训练用途" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitAccessRequest.isPending}>提交申请</Button>
        </Form>
      </Modal>
      <Modal title="审批数据集访问申请" open={Boolean(reviewingRequest)} onCancel={() => setReviewingRequest(null)} footer={null} destroyOnHidden>
        <Typography.Paragraph>
          数据集：<strong>{reviewingRequest?.datasetName ?? reviewingRequest?.datasetId}</strong><br />
          申请人：{reviewingRequest?.requesterName}<br />
          用途：{reviewingRequest?.purpose}
        </Typography.Paragraph>
        <Form form={reviewForm} layout="vertical">
          <Form.Item label="审批意见" name="reason"><Input.TextArea rows={3} placeholder="填写批准或驳回原因" /></Form.Item>
          <Form.Item label="授权到期时间" name="expiresAt" tooltip="不填默认 30 天；格式示例 2026-06-30T00:00:00Z"><Input placeholder="可选，例如 2026-06-30T00:00:00Z" /></Form.Item>
          <Space>
            <Button
              type="primary"
              loading={approveAccess.isPending}
              onClick={() => reviewingRequest && approveAccess.mutate({ requestId: reviewingRequest.requestId, ...reviewForm.getFieldsValue() })}
            >
              批准
            </Button>
            <Button
              danger
              loading={rejectAccess.isPending}
              onClick={() => reviewingRequest && rejectAccess.mutate({ requestId: reviewingRequest.requestId, reason: reviewForm.getFieldValue('reason') })}
            >
              驳回
            </Button>
          </Space>
        </Form>
      </Modal>
      <Modal title="创建角色" open={roleOpen} onCancel={() => setRoleOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" initialValues={{ scope: 'TENANT', permissionCodes: ['menu:dash'] }} onFinish={(values: RoleCreateInput) => createRole.mutate(values)}>
          <Form.Item label="角色编码" name="code" rules={[{ required: true }]}><Input placeholder="例如 CABIN_DATA_MANAGER" /></Form.Item>
          <Form.Item label="角色名称" name="name" rules={[{ required: true }]}><Input placeholder="自定义角色名称" /></Form.Item>
          <Form.Item label="说明" name="description"><Input.TextArea rows={3} placeholder="描述 BU 权限边界与职责" /></Form.Item>
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
          <Form.Item label="初始权限" name="permissionCodes" tooltip="BU 权限随角色权限矩阵授予，不直接关联用户。">
            <Select
              mode="multiple"
              options={(matrix.data?.rows ?? []).map((permission) => ({ value: permission.permissionCode, label: `${permission.module} / ${permission.permissionName}` }))}
              placeholder="选择菜单与功能权限"
            />
          </Form.Item>
          <Typography.Paragraph type="secondary">预设角色权限可查看但不可修改；自定义角色创建后可由角色权限矩阵统一承载 BU 权限。</Typography.Paragraph>
          <Button type="primary" htmlType="submit" loading={createRole.isPending}>创建角色</Button>
        </Form>
      </Modal>
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

function AuditTable({ items, loading }: { items: AuditLogSummary[]; loading?: boolean }) {
  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={items}
      pagination={false}
      columns={[
        { title: '事件', dataIndex: 'action' },
        { title: '操作人', dataIndex: 'operatorName' },
        { title: '结果', dataIndex: 'result', render: (value: string) => <Tag color={value === 'SUCCESS' ? 'green' : 'red'}>{value}</Tag> },
        { title: '风险', dataIndex: 'riskLevel', render: (value: string) => <Tag color={value === 'CRITICAL' ? 'red' : value === 'WARNING' ? 'orange' : 'blue'}>{value}</Tag> },
        { title: '签名', dataIndex: 'signature', render: (value: string) => <span className="mono">{value.slice(0, 12)}...</span> },
      ]}
    />
  );
}

function AccessRequestTable({ items, loading, showActions, onReview }: { items: DatasetAccessRequest[]; loading?: boolean; showActions?: boolean; onReview?: (record: DatasetAccessRequest) => void }) {
  return (
    <Table
      rowKey="requestId"
      loading={loading}
      dataSource={items}
      pagination={false}
      columns={[
        { title: '数据集', dataIndex: 'datasetName', render: (value: string | undefined, record) => value ?? record.datasetId },
        { title: '申请人', dataIndex: 'requesterName' },
        { title: '用途', dataIndex: 'purpose' },
        { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={statusColor(value)}>{statusText(value)}</Tag> },
        { title: '提交时间', dataIndex: 'createdAt', render: (value: string) => formatTime(value) },
        { title: '审批人', dataIndex: 'reviewerName', render: (value: string | null | undefined, record) => value ?? record.reviewedBy ?? '待审批' },
        ...(showActions ? [{
          title: '操作',
          key: 'actions',
          render: (_: unknown, record: DatasetAccessRequest) => <Button size="small" onClick={() => onReview?.(record)}>审批</Button>,
        }] : []),
      ]}
    />
  );
}

function statusColor(status: string) {
  if (status === 'APPROVED') return 'green';
  if (status === 'REJECTED') return 'red';
  return 'orange';
}

function statusText(status: string) {
  if (status === 'APPROVED') return '已通过';
  if (status === 'REJECTED') return '已驳回';
  if (status === 'PENDING') return '待审批';
  return status;
}

function formatTime(value?: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN') : '待确认时间';
}
