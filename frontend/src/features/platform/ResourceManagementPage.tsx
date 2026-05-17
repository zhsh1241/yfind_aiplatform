import { Alert, Button, Card, Col, Form, Input, Modal, Progress, Row, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  platformApi,
  type PaiConnectionUpdateInput,
  type PaiResourceBinding,
  type PaiResourceBindingUpdateInput,
  type PaiResourceNode,
  type PaiResourcePool,
  type PaiResourceStorage,
  type PaiResourceUsageCard,
} from './platformApi';

function statusColor(status?: string) {
  if (!status) return 'default';
  if (['READY', 'ACTIVE', 'SUCCESS', 'OK'].includes(status)) return 'green';
  if (['UNCONFIGURED', 'STALE', 'WARNING', 'RATE_LIMITED'].includes(status)) return 'orange';
  if (['FAILED', 'AUTH_FAILED', 'UNAVAILABLE', 'TIMEOUT', 'DISABLED'].includes(status)) return 'red';
  return 'blue';
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString('zh-CN') : '尚未同步';
}

function UsageCard({ card }: { card: PaiResourceUsageCard }) {
  return (
    <Card className="resource-usage-card">
      <Space orientation="vertical" className="full-width" size={8}>
        <Space className="full-width" style={{ justifyContent: 'space-between' }}>
          <Typography.Text strong>{card.label}</Typography.Text>
          <Tag color={statusColor(card.status)}>{card.status}</Tag>
        </Space>
        <Typography.Title level={3} style={{ margin: 0 }}>{card.used.toLocaleString('zh-CN')} / {card.total.toLocaleString('zh-CN')} {card.unit}</Typography.Title>
        <Progress percent={card.percent} status={card.percent > 85 ? 'exception' : card.percent > 70 ? 'active' : 'normal'} />
        <Typography.Text type="secondary">来自 PAI Resource Quota 同步快照</Typography.Text>
      </Space>
    </Card>
  );
}

function BindingModal({ binding, open, onCancel, onSave, loading }: { binding: PaiResourceBinding | null; open: boolean; onCancel: () => void; onSave: (bindingId: string, input: PaiResourceBindingUpdateInput) => void; loading?: boolean }) {
  return (
    <Modal title={`维护 PAI 映射 · ${binding?.organizationName ?? ''}`} open={open} onCancel={onCancel} footer={null} destroyOnHidden>
      <Form
        layout="vertical"
        initialValues={binding ? {
          organizationId: binding.organizationId,
          workspaceId: binding.workspaceId,
          workspaceName: binding.workspaceName,
          quotaId: binding.quotaId,
          quotaName: binding.quotaName,
          resourceGroupId: binding.resourceGroupId,
          status: binding.status,
          diagnosticMessage: binding.diagnosticMessage,
        } : undefined}
        onFinish={(values) => binding && onSave(binding.bindingId, values as PaiResourceBindingUpdateInput)}
      >
        <Form.Item name="organizationId" label="组织 ID" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="workspaceId" label="PAI Workspace ID" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="workspaceName" label="PAI Workspace 名称" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="quotaId" label="PAI Resource Quota ID" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="quotaName" label="PAI Resource Quota 名称" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="resourceGroupId" label="PAI Resource Group ID" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="status" label="映射状态" rules={[{ required: true }]}><Input placeholder="ACTIVE / DISABLED" /></Form.Item>
        <Form.Item name="diagnosticMessage" label="诊断说明"><Input /></Form.Item>
        <Alert type="warning" showIcon title="不得填写明文 AccessKey / Secret；真实 RAM Role、Region、Endpoint 保留 TODO_CONFIRM_PAI_*。" style={{ marginBottom: 16 }} />
        <Button type="primary" htmlType="submit" loading={loading}>保存映射并写审计</Button>
      </Form>
    </Modal>
  );
}

export function ResourceManagementPage() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedBindingId, setSelectedBindingId] = useState<string | undefined>('PAI-BIND-CABIN');
  const [editingBinding, setEditingBinding] = useState<PaiResourceBinding | null>(null);

  const status = useQuery({ queryKey: ['pai-resource-status'], queryFn: platformApi.paiResourceStatus });
  const workspaces = useQuery({ queryKey: ['pai-resource-workspaces'], queryFn: platformApi.paiResourceWorkspaces });
  const activeBinding = useMemo(() => workspaces.data?.items.find((item) => item.bindingId === selectedBindingId) ?? workspaces.data?.items[0], [workspaces.data, selectedBindingId]);
  const activeOrganizationId = activeBinding?.organizationId ?? 'TENANT-CABIN';
  const overview = useQuery({ queryKey: ['pai-resource-overview', activeOrganizationId], queryFn: () => platformApi.paiResourceOverview(activeOrganizationId) });
  const nodes = useQuery({ queryKey: ['pai-resource-nodes', selectedBindingId], queryFn: () => platformApi.paiResourceNodes(selectedBindingId) });
  const pools = useQuery({ queryKey: ['pai-resource-pools', selectedBindingId], queryFn: () => platformApi.paiResourcePools(selectedBindingId) });
  const storage = useQuery({ queryKey: ['pai-resource-storage', selectedBindingId], queryFn: () => platformApi.paiResourceStorage(selectedBindingId) });

  const invalidatePai = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pai-resource-status'] }),
      queryClient.invalidateQueries({ queryKey: ['pai-resource-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['pai-resource-workspaces'] }),
      queryClient.invalidateQueries({ queryKey: ['pai-resource-nodes'] }),
      queryClient.invalidateQueries({ queryKey: ['pai-resource-pools'] }),
      queryClient.invalidateQueries({ queryKey: ['pai-resource-storage'] }),
    ]);
  };

  const syncMutation = useMutation({
    mutationFn: () => platformApi.syncPaiResources({ bindingId: selectedBindingId ?? activeBinding?.bindingId, force: true }),
    onSuccess: async (result) => {
      await invalidatePai();
      if (result.result === 'SUCCESS') {
        messageApi.success(`PAI 同步成功：${result.paiRequestId}`);
      } else {
        messageApi.warning(`PAI 同步返回 ${result.status}: ${result.diagnosticMessage}`);
      }
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const updateBinding = useMutation({
    mutationFn: ({ bindingId, input }: { bindingId: string; input: PaiResourceBindingUpdateInput }) => platformApi.updatePaiResourceBinding(bindingId, input),
    onSuccess: async (binding) => {
      setEditingBinding(null);
      setSelectedBindingId(binding.bindingId);
      await invalidatePai();
      messageApi.success('PAI Workspace / Quota 映射已保存并写入审计');
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const updateConnection = useMutation({
    mutationFn: (input: PaiConnectionUpdateInput) => platformApi.updatePaiConnection(input),
    onSuccess: async () => {
      await invalidatePai();
      messageApi.success('PAI 连接配置已保存并写入审计');
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const isUnconfigured = status.data?.status === 'UNCONFIGURED' || status.data?.configured === false;
  const stale = Boolean(status.data?.stale || overview.data?.stale);

  return (
    <div className="content-page resource-page">
      {contextHolder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>资源管理</Typography.Title>
          <Typography.Text type="secondary">集群总览 · GPU 节点 · 资源池 · 存储（由阿里云 PAI Workspace / Resource Quota 提供事实源）</Typography.Text>
        </div>
        <Space wrap>
          <Tag color={statusColor(status.data?.status)}>{status.data?.status ?? 'LOADING'}</Tag>
          <Button type="primary" loading={syncMutation.isPending} onClick={() => syncMutation.mutate()}>手动同步 PAI</Button>
        </Space>
      </div>

      {isUnconfigured ? (
        <Alert
          type="warning"
          showIcon
          title="PAI 连接尚未配置"
          description={<span>请确认 <span className="mono">{status.data?.diagnosticMessage ?? 'TODO_CONFIRM_PAI_REGION;TODO_CONFIRM_PAI_WORKSPACE_ID;TODO_CONFIRM_PAI_QUOTA_ID'}</span>。SMP 当前只展示映射和同步诊断，不伪造 PAI 调用成功。</span>}
          style={{ marginBottom: 16 }}
        />
      ) : null}
      {stale ? <Alert type="error" showIcon title="当前展示的是最近一次成功快照，最新同步失败或已过期" description={overview.data?.diagnosticMessage ?? status.data?.diagnosticMessage} style={{ marginBottom: 16 }} /> : null}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <Card title="PAI 连接状态" loading={status.isLoading}>
            <Space orientation="vertical" className="full-width">
              <Space><Tag color={statusColor(status.data?.status)}>{status.data?.status}</Tag><Tag>{status.data?.credentialMode}</Tag></Space>
              <Typography.Text className="mono">Region: {status.data?.regionId}</Typography.Text>
              <Typography.Text className="mono">Endpoint: {status.data?.endpoint}</Typography.Text>
              <Typography.Text className="mono">Credential: {status.data?.credentialRefMasked}</Typography.Text>
              <Typography.Text type="secondary">最近同步：{formatDate(status.data?.lastSyncAt)}</Typography.Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="当前 Workspace / Quota" loading={overview.isLoading}>
            <Space orientation="vertical" className="full-width">
              <Typography.Text strong>{overview.data?.bindingId ?? activeBinding?.bindingId}</Typography.Text>
              <Typography.Text className="mono">Workspace: {overview.data?.workspaceId ?? activeBinding?.workspaceId}</Typography.Text>
              <Typography.Text className="mono">Quota: {overview.data?.quotaId ?? activeBinding?.quotaId}</Typography.Text>
              <Typography.Text className="mono">ResourceGroup: {overview.data?.resourceGroupId ?? activeBinding?.resourceGroupId}</Typography.Text>
              <Tag color={statusColor(overview.data?.diagnosticCode)}>{overview.data?.diagnosticCode}</Tag>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="同步诊断" loading={overview.isLoading}>
            <Space orientation="vertical" className="full-width">
              <Typography.Text>数据来源：{overview.data?.updatedFrom ?? 'PAI_SNAPSHOT'}</Typography.Text>
              <Typography.Text>Trace / PAI requestId 由后端同步日志记录。</Typography.Text>
              <Typography.Text type="secondary">{overview.data?.diagnosticMessage ?? status.data?.diagnosticMessage}</Typography.Text>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="PAI 连接配置" style={{ marginBottom: 16 }} extra={<Tag color="red">不保存明文 AccessKey / Secret</Tag>}>
        <Form
          layout="vertical"
          initialValues={status.data ? {
            regionId: status.data.regionId,
            endpoint: status.data.endpoint,
            workspaceId: status.data.workspaceId,
            quotaId: status.data.quotaId,
            resourceGroupId: status.data.resourceGroupId,
            credentialMode: status.data.credentialMode,
            credentialRefMasked: status.data.credentialRefMasked,
            status: status.data.status,
            diagnosticMessage: status.data.diagnosticMessage,
          } : undefined}
          onFinish={(values) => updateConnection.mutate({ ...(values as PaiConnectionUpdateInput), enabled: true })}
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={8}><Form.Item name="regionId" label="PAI Region" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="endpoint" label="PAI Endpoint" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="credentialMode" label="凭证模式" rules={[{ required: true }]}><Input placeholder="RAM_ROLE" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="workspaceId" label="默认 Workspace ID" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="quotaId" label="默认 Resource Quota ID" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="resourceGroupId" label="默认 Resource Group ID" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="credentialRefMasked" label="RAM Role / Secret Ref（脱敏）" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="status" label="连接状态" rules={[{ required: true }]}><Input placeholder="UNCONFIGURED / READY" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="diagnosticMessage" label="诊断说明"><Input /></Form.Item></Col>
          </Row>
          <Button type="primary" loading={updateConnection.isPending} htmlType="submit">保存 PAI 连接配置</Button>
        </Form>
      </Card>

      <Tabs
        items={[
          {
            key: 'overview',
            label: '集群总览',
            children: (
              <Space orientation="vertical" size={16} className="full-width">
                <Row gutter={[16, 16]}>
                  {(overview.data?.cards ?? []).map((card) => <Col xs={24} md={12} xl={6} key={card.key}><UsageCard card={card} /></Col>)}
                </Row>
                <Card title="PAI Workspace / Quota 映射" extra={<Tag color="blue">不创建本地物理调度事实源</Tag>}>
                  <Table<PaiResourceBinding>
                    rowKey="bindingId"
                    loading={workspaces.isLoading}
                    dataSource={workspaces.data?.items ?? []}
                    pagination={false}
                    onRow={(row) => ({ onClick: () => setSelectedBindingId(row.bindingId) })}
                    columns={[
                      { title: '组织', render: (_: unknown, row) => <strong>{row.organizationName}<br /><span className="muted">{row.organizationId}</span></strong> },
                      { title: 'Workspace', render: (_: unknown, row) => <span className="mono">{row.workspaceId}<br />{row.workspaceName}</span> },
                      { title: 'Resource Quota', render: (_: unknown, row) => <span className="mono">{row.quotaId}<br />{row.quotaName}</span> },
                      { title: '状态', dataIndex: 'status', render: (value: string, row) => <Space><Tag color={statusColor(value)}>{value}</Tag><Tag>{row.diagnosticCode}</Tag></Space> },
                      { title: '最近同步', dataIndex: 'lastSyncAt', render: formatDate },
                      { title: '操作', render: (_: unknown, row) => <Button size="small" onClick={(event) => { event.stopPropagation(); setEditingBinding(row); }}>维护映射</Button> },
                    ]}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: 'nodes',
            label: 'GPU 节点',
            children: (
              <Card title="GPU 节点 / PAI Quota 节点视图" extra={<Tag color="purple">sourceType 标识 PAI 来源</Tag>}>
                <Table<PaiResourceNode>
                  rowKey="nodeId"
                  loading={nodes.isLoading}
                  dataSource={nodes.data?.items ?? []}
                  pagination={false}
                  columns={[
                    { title: '节点/配额单元', dataIndex: 'nodeId' },
                    { title: '来源', dataIndex: 'sourceType', render: (value: string) => <Tag>{value}</Tag> },
                    { title: '区域', dataIndex: 'hostOrZone' },
                    { title: 'GPU 规格', dataIndex: 'gpuSpec' },
                    { title: 'CPU/内存', render: (_: unknown, row) => `${row.cpuCores} 核 / ${row.memoryGb}GB` },
                    { title: 'GPU 使用率', render: (_: unknown, row) => <Progress percent={row.gpuUtilizationPercent} size="small" /> },
                    { title: '诊断', dataIndex: 'diagnostic' },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'pools',
            label: '资源池',
            children: (
              <Card title="PAI Resource Quota / Resource Group" extra={<Tag color="blue">Workspace 绑定资源配额</Tag>}>
                <Table<PaiResourcePool>
                  rowKey="poolId"
                  loading={pools.isLoading}
                  dataSource={pools.data?.items ?? []}
                  pagination={false}
                  columns={[
                    { title: '资源池', render: (_: unknown, row) => <strong>{row.poolName}<br /><span className="muted mono">{row.poolId}</span></strong> },
                    { title: '来源', dataIndex: 'sourceType', render: (value: string) => <Tag>{value}</Tag> },
                    { title: 'Workspace', dataIndex: 'workspaceId' },
                    { title: 'GPU', render: (_: unknown, row) => `${row.gpuUsed}/${row.gpuTotal}` },
                    { title: 'CPU', render: (_: unknown, row) => `${row.cpuUsed}/${row.cpuTotal}` },
                    { title: '内存', render: (_: unknown, row) => `${row.memoryUsedGb}/${row.memoryTotalGb}GB` },
                    { title: '用户', dataIndex: 'userCount' },
                    { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag> },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'storage',
            label: '存储',
            children: (
              <Card title="PAI / OSS 存储摘要" extra={<Tag color="orange">不替代 F007 文件元数据服务</Tag>}>
                <Table<PaiResourceStorage>
                  rowKey="storageId"
                  loading={storage.isLoading}
                  dataSource={storage.data?.items ?? []}
                  pagination={false}
                  columns={[
                    { title: '存储', render: (_: unknown, row) => <strong>{row.name}<br /><span className="muted mono">{row.storageId}</span></strong> },
                    { title: '来源', dataIndex: 'sourceType', render: (value: string) => <Tag>{value}</Tag> },
                    { title: '容量', render: (_: unknown, row) => `${row.usedGb.toLocaleString('zh-CN')} / ${row.capacityGb.toLocaleString('zh-CN')} GB` },
                    { title: '使用率', dataIndex: 'percent', render: (value: number) => <Progress percent={value} size="small" /> },
                    { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag> },
                    { title: '诊断', dataIndex: 'diagnostic' },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <BindingModal
        binding={editingBinding}
        open={Boolean(editingBinding)}
        onCancel={() => setEditingBinding(null)}
        onSave={(bindingId, input) => updateBinding.mutate({ bindingId, input })}
        loading={updateBinding.isPending}
      />
    </div>
  );
}
