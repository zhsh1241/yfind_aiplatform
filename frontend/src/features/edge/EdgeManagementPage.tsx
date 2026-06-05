import {
  ApiOutlined,
  CheckCircleOutlined,
  CloudSyncOutlined,
  DeploymentUnitOutlined,
  PlusOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Col,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import {
  platformApi,
  type EdgeDeployment,
  type EdgeDeploymentCreateInput,
  type EdgeServer,
  type EdgeServerCreateInput,
} from '../platform/platformApi';
import { useSessionStore } from '../platform/sessionStore';

const SERVER_STATUS_OPTIONS = ['REGISTERED', 'ONLINE', 'OFFLINE', 'STALE', 'DECOMMISSIONED'];
const DEPLOYMENT_STATUS_OPTIONS = ['REQUESTED', 'APPROVED', 'REJECTED', 'QUEUED', 'TRANSFERRING', 'VERIFYING', 'DEPLOYED', 'FAILED', 'ROLLED_BACK', 'CANCELLED'];

function statusColor(status?: string | null) {
  switch (status) {
    case 'ONLINE':
    case 'DEPLOYED':
    case 'APPROVED':
      return 'green';
    case 'REGISTERED':
    case 'REQUESTED':
    case 'VERIFYING':
      return 'blue';
    case 'STALE':
      return 'gold';
    case 'DECOMMISSIONED':
    case 'REJECTED':
    case 'FAILED':
      return 'red';
    case 'ROLLED_BACK':
      return 'purple';
    default:
      return 'default';
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN');
}

function toJsonObject(value?: string): Record<string, unknown> {
  if (!value?.trim()) return {};
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON 必须是对象');
  }
  return parsed as Record<string, unknown>;
}

function OneLineText({ value, width = 260 }: { value?: string | null; width?: number }) {
  const text = value || '-';
  return (
    <Typography.Text title={text} ellipsis style={{ display: 'inline-block', maxWidth: width, verticalAlign: 'bottom' }}>
      {text}
    </Typography.Text>
  );
}

export function EdgeManagementPage() {
  const queryClient = useQueryClient();
  const [messageApi, messageContext] = message.useMessage();
  const [filters, setFilters] = useState({ keyword: '', status: undefined as string | undefined, page: 1, pageSize: 20 });
  const [selectedServerId, setSelectedServerId] = useState<string>();
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>();
  const [deploymentStatus, setDeploymentStatus] = useState<string>();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [deploymentOpen, setDeploymentOpen] = useState(false);
  const [registerForm] = Form.useForm<EdgeServerCreateInput & { hardwareSummaryJson?: string }>();
  const [deploymentForm] = Form.useForm<EdgeDeploymentCreateInput>();
  const [integrityForm] = Form.useForm<{ receivedSha256: string; diagnostic?: string }>();
  const [rollbackForm] = Form.useForm<{ targetDeploymentId?: string; reason?: string }>();
  const currentUser = useSessionStore((state) => state.user);

  const serverQuery = useQuery({
    queryKey: ['edge-servers', filters],
    queryFn: () => platformApi.edgeServers(filters),
  });

  const deploymentQuery = useQuery({
    queryKey: ['edge-deployments', selectedServerId, deploymentStatus],
    queryFn: () => platformApi.edgeDeployments({ edgeServerId: selectedServerId, status: deploymentStatus, page: 1, pageSize: 50 }),
  });

  const selectedServerQuery = useQuery({
    queryKey: ['edge-server-detail', selectedServerId],
    queryFn: () => platformApi.edgeServerDetail(selectedServerId!),
    enabled: Boolean(selectedServerId),
  });

  const selectedDeploymentQuery = useQuery({
    queryKey: ['edge-deployment-detail', selectedDeploymentId],
    queryFn: () => platformApi.edgeDeploymentDetail(selectedDeploymentId!),
    enabled: Boolean(selectedDeploymentId),
  });

  const servers = useMemo(() => serverQuery.data?.items ?? [], [serverQuery.data?.items]);
  const deployments = useMemo(() => deploymentQuery.data?.items ?? [], [deploymentQuery.data?.items]);
  const selectedServer = selectedServerQuery.data ?? servers.find((item) => item.edgeServerId === selectedServerId);

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['edge-servers'] });
    await queryClient.invalidateQueries({ queryKey: ['edge-deployments'] });
    await queryClient.invalidateQueries({ queryKey: ['edge-server-detail'] });
    await queryClient.invalidateQueries({ queryKey: ['edge-deployment-detail'] });
  };

  const createServerMutation = useMutation({
    mutationFn: (values: EdgeServerCreateInput & { hardwareSummaryJson?: string }) => platformApi.createEdgeServer({
      ...values,
      hardwareSummary: toJsonObject(values.hardwareSummaryJson),
    }),
    onSuccess: async (server) => {
      messageApi.success(`边端服务器 ${server.serverName} 已注册`);
      setRegisterOpen(false);
      registerForm.resetFields();
      setSelectedServerId(server.edgeServerId);
      await refreshAll();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const heartbeatMutation = useMutation({
    mutationFn: (serverId: string) => platformApi.heartbeatEdgeServer(serverId, {
      status: 'ONLINE',
      agentVersion: selectedServer?.agentVersion ?? '1.0.0',
      resourceSummary: { cpuUsage: 0.35, memoryUsage: 0.42 },
      diagnostic: 'manual heartbeat from console',
    }),
    onSuccess: async () => {
      messageApi.success('心跳已更新为 ONLINE');
      await refreshAll();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const decommissionMutation = useMutation({
    mutationFn: (serverId: string) => platformApi.decommissionEdgeServer(serverId),
    onSuccess: async () => {
      messageApi.success('边端服务器已停用');
      await refreshAll();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const createDeploymentMutation = useMutation({
    mutationFn: (values: EdgeDeploymentCreateInput) => platformApi.createEdgeDeployment(values),
    onSuccess: async (deployment) => {
      messageApi.success(`下发申请 ${deployment.deploymentId} 已创建`);
      setDeploymentOpen(false);
      deploymentForm.resetFields();
      setSelectedDeploymentId(deployment.deploymentId);
      await refreshAll();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const approveMutation = useMutation({
    mutationFn: (deploymentId: string) => platformApi.approveEdgeDeployment(deploymentId, '页面审批通过'),
    onSuccess: async () => {
      messageApi.success('下发申请已授权');
      await refreshAll();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (deploymentId: string) => platformApi.rejectEdgeDeployment(deploymentId, '页面审批拒绝'),
    onSuccess: async () => {
      messageApi.success('下发申请已拒绝');
      await refreshAll();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const executeMutation = useMutation({
    mutationFn: (deploymentId: string) => platformApi.executeEdgeDeployment(deploymentId),
    onSuccess: async () => {
      messageApi.success('已进入边端执行与完整性验证 seam');
      await refreshAll();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ deploymentId, values }: { deploymentId: string; values: { receivedSha256: string; diagnostic?: string } }) =>
      platformApi.verifyEdgeDeploymentIntegrity(deploymentId, values),
    onSuccess: async () => {
      messageApi.success('完整性校验通过，部署已完成');
      integrityForm.resetFields();
      await refreshAll();
    },
    onError: async (error: Error) => {
      messageApi.error(error.message);
      await refreshAll();
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: ({ deploymentId, values }: { deploymentId: string; values: { targetDeploymentId?: string; reason?: string } }) =>
      platformApi.rollbackEdgeDeployment(deploymentId, values),
    onSuccess: async () => {
      messageApi.success('回滚记录已写入');
      rollbackForm.resetFields();
      await refreshAll();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const summary = useMemo(() => {
    const online = servers.filter((item) => item.status === 'ONLINE').length;
    const activeDeployment = deployments.filter((item) => ['REQUESTED', 'APPROVED', 'VERIFYING'].includes(item.status)).length;
    const failed = deployments.filter((item) => item.status === 'FAILED').length;
    return { total: serverQuery.data?.total ?? servers.length, online, activeDeployment, failed };
  }, [deployments, serverQuery.data?.total, servers]);

  const summaryCards = [
    {
      title: '纳管边端',
      value: summary.total,
      hint: '已登记的工厂边端节点',
      icon: <DeploymentUnitOutlined />,
      accent: 'blue',
    },
    {
      title: '在线节点',
      value: summary.online,
      hint: '最近心跳为 ONLINE',
      icon: <CloudSyncOutlined />,
      accent: 'green',
    },
    {
      title: '进行中下发',
      value: summary.activeDeployment,
      hint: '待授权 / 执行 / 验证任务',
      icon: <ApiOutlined />,
      accent: 'purple',
    },
    {
      title: '失败待处理',
      value: summary.failed,
      hint: '需排查 hash 或边端诊断',
      icon: <StopOutlined />,
      accent: 'gold',
    },
  ];

  const serverColumns: ColumnsType<EdgeServer> = [
    {
      title: '服务器',
      dataIndex: 'serverName',
      render: (_, record) => <Button type="link" onClick={() => setSelectedServerId(record.edgeServerId)}>{record.serverName}</Button>,
    },
    { title: '位置', dataIndex: 'location' },
    { title: 'BU/组织', dataIndex: 'organizationId', width: 140 },
    { title: '负责人', render: (_, record) => record.ownerName || record.ownerUserId, width: 140 },
    { title: 'Agent', dataIndex: 'agentVersion', width: 96 },
    { title: '状态', width: 120, render: (_, record) => <Tag color={statusColor(record.status)}>{record.status}</Tag> },
    { title: '最近心跳', width: 180, render: (_, record) => formatDateTime(record.lastHeartbeatAt) },
    {
      title: '操作',
      width: 220,
      render: (_, record) => (
        <Space wrap>
          <Button size="small" icon={<CloudSyncOutlined />} disabled={!record.permissionSummary.canWrite || record.status === 'DECOMMISSIONED'} onClick={() => heartbeatMutation.mutate(record.edgeServerId)} loading={heartbeatMutation.isPending}>心跳</Button>
          <Button size="small" disabled={!record.permissionSummary.canRequestDeployment || record.status === 'DECOMMISSIONED'} onClick={() => {
            setSelectedServerId(record.edgeServerId);
            deploymentForm.setFieldsValue({ edgeServerId: record.edgeServerId, strategy: 'IMMEDIATE' });
            setDeploymentOpen(true);
          }}>申请下发</Button>
          <Button size="small" danger icon={<StopOutlined />} disabled={!record.permissionSummary.canWrite || record.status === 'DECOMMISSIONED'} onClick={() => decommissionMutation.mutate(record.edgeServerId)} loading={decommissionMutation.isPending}>停用</Button>
        </Space>
      ),
    },
  ];

  const deploymentColumns: ColumnsType<EdgeDeployment> = [
    { title: '任务', width: 180, render: (_, record) => <Button type="link" onClick={() => setSelectedDeploymentId(record.deploymentId)}>{record.deploymentId}</Button> },
    { title: '模型', render: (_, record) => <OneLineText value={`${record.modelName} · ${record.versionNo}`} /> },
    { title: '状态', width: 110, render: (_, record) => <Tag color={statusColor(record.status)}>{record.status}</Tag> },
    { title: '授权', width: 110, render: (_, record) => <Tag color={statusColor(record.approvalStatus)}>{record.approvalStatus}</Tag> },
    { title: 'hash', width: 180, render: (_, record) => <OneLineText value={record.artifactSha256} width={160} /> },
    { title: '失败原因', width: 220, render: (_, record) => <OneLineText value={record.failureReason} width={200} /> },
    {
      title: '动作',
      width: 330,
      render: (_, record) => (
        <Space wrap>
          <Button size="small" disabled={!canApprove(record)} onClick={() => approveMutation.mutate(record.deploymentId)} loading={approveMutation.isPending}>审批通过</Button>
          <Button size="small" danger disabled={!canApprove(record)} onClick={() => rejectMutation.mutate(record.deploymentId)} loading={rejectMutation.isPending}>拒绝</Button>
          <Button size="small" icon={<ApiOutlined />} disabled={!canExecute(record)} onClick={() => executeMutation.mutate(record.deploymentId)} loading={executeMutation.isPending}>执行</Button>
          <Button size="small" icon={<CheckCircleOutlined />} disabled={!canVerify(record)} onClick={() => {
            setSelectedDeploymentId(record.deploymentId);
            integrityForm.setFieldsValue({ receivedSha256: record.artifactSha256, diagnostic: 'edge side checksum' });
          }}>校验</Button>
          <Button size="small" icon={<RollbackOutlined />} disabled={!canRollback(record)} onClick={() => {
            setSelectedDeploymentId(record.deploymentId);
            rollbackForm.setFieldsValue({ targetDeploymentId: deployments.find((item) => item.deploymentId !== record.deploymentId)?.deploymentId, reason: '页面回滚 seam' });
          }}>回滚</Button>
        </Space>
      ),
    },
  ];

  const activeDeployment = selectedDeploymentQuery.data?.deployment ?? deployments.find((item) => item.deploymentId === selectedDeploymentId);

  const canApprove = (deployment?: EdgeDeployment | null) => Boolean(deployment?.permissionSummary.canApproveDeployment && deployment.approvalStatus === 'PENDING' && deployment.status === 'REQUESTED');
  const canExecute = (deployment?: EdgeDeployment | null) => Boolean(deployment?.permissionSummary.canExecuteDeployment && deployment.approvalStatus === 'APPROVED' && ['APPROVED', 'QUEUED', 'TRANSFERRING'].includes(deployment.status));
  const canVerify = (deployment?: EdgeDeployment | null) => Boolean(deployment?.permissionSummary.canExecuteDeployment && deployment.status === 'VERIFYING');
  const canRollback = (deployment?: EdgeDeployment | null) => Boolean(deployment?.permissionSummary.canExecuteDeployment && ['DEPLOYED', 'FAILED'].includes(deployment.status));

  return (
    <div className="content-page">
      {messageContext}
      <div className="page-hero console-hero">
        <div className="console-hero-copy">
          <Space wrap size={8} className="console-hero-kickers">
            <Tag color="blue">EDGE DELIVERY</Tag>
            <Tag color="purple">Owner 授权</Tag>
            <Tag color="gold">Hash 校验</Tag>
          </Space>
          <Typography.Title level={3}>边端管理</Typography.Title>
          <Typography.Text type="secondary">
            纳管工厂边端服务器，并将 Production 模型版本按 owner 授权、hash 完整性校验与审计规则下发到边端。
          </Typography.Text>
          <Space wrap size={8} className="console-hero-metrics">
            <span>纳管边端 <strong>{summary.total}</strong></span>
            <span>在线节点 <strong>{summary.online}</strong></span>
            <span>进行中下发 <strong>{summary.activeDeployment}</strong></span>
          </Space>
        </div>
        <Space wrap className="console-hero-actions">
          <Button icon={<SafetyCertificateOutlined />} disabled={!selectedDeploymentId} onClick={() => selectedDeploymentId && selectedDeploymentQuery.refetch()}>
            刷新下发详情
          </Button>
          <Tag color="blue">TASK-edge-management-delivery</Tag>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            registerForm.setFieldsValue({ organizationId: currentUser?.tenantId ?? 'TENANT-CABIN', ownerUserId: currentUser?.id ?? 'USR-BU-CABIN', agentVersion: '1.0.0', hardwareSummaryJson: '{"gpu":"NVIDIA T4 x1"}' });
            setRegisterOpen(true);
          }}>注册边端服务器</Button>
        </Space>
      </div>

      <div className="console-summary-grid">
        {summaryCards.map((item) => (
          <Card key={item.title} className={`console-summary-card console-summary-card-${item.accent}`}>
            <div className="console-summary-card-header">
              <span className="console-summary-icon">{item.icon}</span>
              <Typography.Text type="secondary">{item.title}</Typography.Text>
            </div>
            <Statistic value={item.value} />
            <Typography.Text type="secondary" className="console-summary-hint">{item.hint}</Typography.Text>
          </Card>
        ))}
      </div>

      <Card
        className="page-card console-panel-card"
        title={<Space><SafetyCertificateOutlined />边端 Agent seam</Space>}
        extra={<Tag color="green">边界透明</Tag>}
      >
        <div className="console-panel">
          <div>
            <Typography.Title level={5}>真实边端通道尚未接入</Typography.Title>
            <Typography.Text type="secondary">
              本期仅记录 MANUAL_AGENT_SEAM 与 TODO_CONFIRM_EDGE_AGENT_PROTOCOL，不宣称已接入真实 Agent、mTLS 或外部工单系统。
            </Typography.Text>
          </div>
          <div className="console-panel-control">
            <Alert showIcon type="info" title="执行、完整性校验和回滚均为平台侧可替换 seam；真实工厂 Agent 协议确认后再替换。" />
          </div>
        </div>
      </Card>

      <Card
        className="page-card console-catalog-card"
        title={<Space><DeploymentUnitOutlined />边端服务器</Space>}
        extra={<Space wrap><Tag color="cyan">{serverQuery.data?.total ?? 0} 条</Tag></Space>}
      >
        <div className="console-filter-toolbar">
          <Input.Search allowClear placeholder="按名称/位置/主机检索" style={{ width: 280 }} onSearch={(keyword) => setFilters((prev) => ({ ...prev, keyword, page: 1 }))} />
          <Select allowClear placeholder="状态" style={{ width: 160 }} options={SERVER_STATUS_OPTIONS.map((item) => ({ value: item, label: item }))} onChange={(status) => setFilters((prev) => ({ ...prev, status, page: 1 }))} />
        </div>
        <Table
          rowKey="edgeServerId"
          loading={serverQuery.isLoading}
          columns={serverColumns}
          dataSource={servers}
          locale={{ emptyText: <Empty description="暂无边端服务器，请先注册工厂边端节点。" /> }}
          pagination={{ current: filters.page, pageSize: filters.pageSize, total: serverQuery.data?.total ?? 0, onChange: (page, pageSize) => setFilters((prev) => ({ ...prev, page, pageSize })) }}
        />
      </Card>

      <Card
        className="page-card console-catalog-card"
        title={<Space><ApiOutlined />下发历史</Space>}
        extra={<Tag color="blue">{deployments.length} 条</Tag>}
      >
        <div className="console-filter-toolbar">
          <Select allowClear placeholder="下发状态" style={{ width: 180 }} options={DEPLOYMENT_STATUS_OPTIONS.map((item) => ({ value: item, label: item }))} onChange={setDeploymentStatus} />
        </div>
        <Table rowKey="deploymentId" loading={deploymentQuery.isLoading} columns={deploymentColumns} dataSource={deployments} pagination={false} locale={{ emptyText: '请选择服务器查看下发历史，或创建新的下发申请。' }} />
      </Card>

      <Drawer title={selectedServer ? `${selectedServer.serverName} · 边端详情` : '边端详情'} open={Boolean(selectedServerId)} onClose={() => setSelectedServerId(undefined)} size={620} mask={false}>
        {selectedServer ? (
          <Space orientation="vertical" className="full-width" size={16}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="服务器 ID">{selectedServer.edgeServerId}</Descriptions.Item>
              <Descriptions.Item label="位置 / 主机">{selectedServer.location} / {selectedServer.hostAddress}</Descriptions.Item>
              <Descriptions.Item label="组织 / 负责人">{selectedServer.organizationId} / {selectedServer.ownerName || selectedServer.ownerUserId}</Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={statusColor(selectedServer.status)}>{selectedServer.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Agent 版本">{selectedServer.agentVersion}</Descriptions.Item>
              <Descriptions.Item label="硬件摘要"><Typography.Text code>{JSON.stringify(selectedServer.hardwareSummary)}</Typography.Text></Descriptions.Item>
              <Descriptions.Item label="资源摘要"><Typography.Text code>{JSON.stringify(selectedServer.resourceSummary)}</Typography.Text></Descriptions.Item>
              <Descriptions.Item label="诊断 seam">{selectedServer.diagnostic}</Descriptions.Item>
              <Descriptions.Item label="最近心跳">{formatDateTime(selectedServer.lastHeartbeatAt)}</Descriptions.Item>
            </Descriptions>
            <Space>
              <Button icon={<CloudSyncOutlined />} disabled={!selectedServer.permissionSummary.canWrite || selectedServer.status === 'DECOMMISSIONED'} onClick={() => heartbeatMutation.mutate(selectedServer.edgeServerId)}>发送心跳</Button>
              <Button type="primary" disabled={!selectedServer.permissionSummary.canRequestDeployment || selectedServer.status === 'DECOMMISSIONED'} onClick={() => {
                deploymentForm.setFieldsValue({ edgeServerId: selectedServer.edgeServerId, strategy: 'IMMEDIATE' });
                setDeploymentOpen(true);
              }}>创建下发申请</Button>
              <Button danger disabled={!selectedServer.permissionSummary.canWrite || selectedServer.status === 'DECOMMISSIONED'} onClick={() => decommissionMutation.mutate(selectedServer.edgeServerId)}>停用服务器</Button>
            </Space>
          </Space>
        ) : <Empty description="请选择边端服务器" />}
      </Drawer>

      <Drawer title="下发详情" open={Boolean(selectedDeploymentId)} onClose={() => setSelectedDeploymentId(undefined)} size={720} mask={false}>
        {activeDeployment ? (
          <Space orientation="vertical" className="full-width" size={16}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="部署 ID">{activeDeployment.deploymentId}</Descriptions.Item>
              <Descriptions.Item label="边端服务器">{activeDeployment.edgeServerName}</Descriptions.Item>
              <Descriptions.Item label="模型版本">{activeDeployment.modelName} / {activeDeployment.versionNo}</Descriptions.Item>
              <Descriptions.Item label="artifact/hash">{activeDeployment.artifactFileObjectId} / <Typography.Text copyable>{activeDeployment.artifactSha256}</Typography.Text></Descriptions.Item>
              <Descriptions.Item label="状态"><Space><Tag color={statusColor(activeDeployment.status)}>{activeDeployment.status}</Tag><Tag color={statusColor(activeDeployment.approvalStatus)}>{activeDeployment.approvalStatus}</Tag></Space></Descriptions.Item>
              <Descriptions.Item label="诊断">{activeDeployment.diagnostic}</Descriptions.Item>
              <Descriptions.Item label="失败原因">{activeDeployment.failureReason || '-'}</Descriptions.Item>
              <Descriptions.Item label="重试次数">{activeDeployment.retryCount}</Descriptions.Item>
              <Descriptions.Item label="时间线">申请 {formatDateTime(activeDeployment.requestedAt)} · 执行 {formatDateTime(activeDeployment.executedAt)} · 验证 {formatDateTime(activeDeployment.verifiedAt)}</Descriptions.Item>
            </Descriptions>

            <Space wrap>
              <Button disabled={!canApprove(activeDeployment)} onClick={() => approveMutation.mutate(activeDeployment.deploymentId)} loading={approveMutation.isPending}>审批通过</Button>
              <Button danger disabled={!canApprove(activeDeployment)} onClick={() => rejectMutation.mutate(activeDeployment.deploymentId)} loading={rejectMutation.isPending}>拒绝</Button>
              <Button icon={<ApiOutlined />} disabled={!canExecute(activeDeployment)} onClick={() => executeMutation.mutate(activeDeployment.deploymentId)} loading={executeMutation.isPending}>执行</Button>
            </Space>

            <Card size="small" title="完整性校验">
              <Form form={integrityForm} layout="inline" onFinish={(values) => verifyMutation.mutate({ deploymentId: activeDeployment.deploymentId, values })} initialValues={{ receivedSha256: activeDeployment.artifactSha256, diagnostic: 'edge side checksum' }}>
                <Form.Item name="receivedSha256" label="边端回传 SHA-256" rules={[{ required: true, message: '请输入边端回传 hash' }]}><Input style={{ width: 260 }} /></Form.Item>
                <Form.Item name="diagnostic" label="诊断"><Input style={{ width: 180 }} /></Form.Item>
                <Button htmlType="submit" type="primary" disabled={!canVerify(activeDeployment)} loading={verifyMutation.isPending}>提交校验</Button>
              </Form>
            </Card>

            <Card size="small" title="回滚 seam">
              <Form form={rollbackForm} layout="inline" onFinish={(values) => rollbackMutation.mutate({ deploymentId: activeDeployment.deploymentId, values })}>
                <Form.Item name="targetDeploymentId" label="目标任务"><Input style={{ width: 220 }} placeholder="EDGEDEP-..." /></Form.Item>
                <Form.Item name="reason" label="原因"><Input style={{ width: 220 }} /></Form.Item>
                <Button htmlType="submit" icon={<RollbackOutlined />} disabled={!canRollback(activeDeployment)} loading={rollbackMutation.isPending}>记录回滚</Button>
              </Form>
            </Card>

            <Card size="small" title="审批记录">
              {selectedDeploymentQuery.data?.approvals?.length ? (
                <Timeline items={selectedDeploymentQuery.data.approvals.map((item) => ({ color: item.decision === 'APPROVED' ? 'green' : 'red', content: `${item.decision} · ${item.approverUserId} · ${item.comment ?? '-'} · ${formatDateTime(item.decidedAt)}` }))} />
              ) : <Empty description="暂无审批记录" />}
            </Card>
          </Space>
        ) : <Empty description="请选择下发任务" />}
      </Drawer>

      <Modal title="注册边端服务器" open={registerOpen} onCancel={() => setRegisterOpen(false)} onOk={() => void registerForm.submit()} confirmLoading={createServerMutation.isPending}>
        <Form form={registerForm} layout="vertical" onFinish={(values) => createServerMutation.mutate(values)}>
          <Form.Item name="serverName" label="服务器名称" rules={[{ required: true, message: '请输入服务器名称' }]}><Input /></Form.Item>
          <Form.Item name="location" label="位置" rules={[{ required: true, message: '请输入位置' }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="organizationId" label="BU/组织 ID" rules={[{ required: true, message: '请输入组织 ID' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="ownerUserId" label="负责人用户 ID" rules={[{ required: true, message: '请输入负责人' }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="hostAddress" label="主机地址" rules={[{ required: true, message: '请输入主机地址' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="agentVersion" label="Agent 版本" rules={[{ required: true, message: '请输入 Agent 版本' }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="hardwareSummaryJson" label="硬件摘要 JSON"><Input.TextArea rows={3} placeholder='{"gpu":"NVIDIA T4 x1"}' /></Form.Item>
        </Form>
      </Modal>

      <Modal title="创建模型下发申请" open={deploymentOpen} onCancel={() => setDeploymentOpen(false)} onOk={() => void deploymentForm.submit()} confirmLoading={createDeploymentMutation.isPending}>
        <Form form={deploymentForm} layout="vertical" initialValues={{ strategy: 'IMMEDIATE' }} onFinish={(values) => createDeploymentMutation.mutate(values)}>
          <Form.Item name="edgeServerId" label="边端服务器" rules={[{ required: true, message: '请选择边端服务器' }]}>
            <Select options={servers.map((item) => ({ value: item.edgeServerId, label: `${item.serverName} · ${item.status}` }))} />
          </Form.Item>
          <Form.Item name="modelId" label="模型 ID" rules={[{ required: true, message: '请输入模型 ID' }]}><Input placeholder="MODEL-..." /></Form.Item>
          <Form.Item name="versionId" label="Production 版本 ID" rules={[{ required: true, message: '请输入 Production 版本 ID' }]}><Input placeholder="MVER-..." /></Form.Item>
          <Form.Item name="strategy" label="下发策略" rules={[{ required: true }]}><Select options={[{ value: 'IMMEDIATE', label: '立即下发' }, { value: 'SCHEDULED', label: '计划下发' }]} /></Form.Item>
          <Form.Item name="scheduledAt" label="计划时间"><Input placeholder="2026-06-05T20:00:00Z" /></Form.Item>
          <Form.Item name="notes" label="申请说明"><Input.TextArea rows={3} /></Form.Item>
          <Alert showIcon type="warning" title="仅允许已进入 PRODUCTION 的模型版本下发；未 owner 授权时执行会被后端拒绝。" />
        </Form>
      </Modal>
    </div>
  );
}
