import { Button, Card, Col, Form, Input, InputNumber, Modal, Progress, Row, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { platformApi, type ConfigItem, type OrganizationMember, type OrganizationNode } from './platformApi';

function flattenOrganizations(nodes: OrganizationNode[]): OrganizationNode[] {
  return nodes.flatMap((node) => [node, ...flattenOrganizations(node.children ?? [])]);
}

function typeLabel(type: string) {
  if (type === 'CORP') return '集团';
  if (type === 'BU') return 'BU';
  if (type === 'PROJECT') return '项目';
  return type;
}

function typeColor(type: string) {
  if (type === 'CORP') return 'blue';
  if (type === 'BU') return 'green';
  if (type === 'PROJECT') return 'purple';
  return 'default';
}

function statusTag(status: string) {
  return status === 'ACTIVE' ? <Tag color="green">启用</Tag> : <Tag color="default">{status}</Tag>;
}

function OrganizationCard({ node, level = 0, onEditQuota, onOpenConfig, onAddMember }: { node: OrganizationNode; level?: number; onEditQuota: (node: OrganizationNode) => void; onOpenConfig: (node: OrganizationNode) => void; onAddMember: (node: OrganizationNode) => void }) {
  const usage = Math.min(100, Math.round((node.usedGpu / Math.max(node.quotaGpu, 1)) * 100));
  return (
    <div className="org-node" style={{ marginLeft: level * 22 }}>
      <Card size="small" className="org-node-card">
        <Space align="start" className="full-width" style={{ justifyContent: 'space-between' }}>
          <Space orientation="vertical" size={2}>
            <Space>
              <Typography.Text strong>{node.name}</Typography.Text>
              <Tag color={typeColor(node.tenantType)}>{typeLabel(node.tenantType)}</Tag>
              {statusTag(node.status)}
            </Space>
            <Typography.Text type="secondary" className="mono">{node.code} · {node.path}</Typography.Text>
            <Space size={12} wrap>
              <span className="muted">成员 {node.userCount}</span>
              <span className="muted">GPU {node.usedGpu}/{node.quotaGpu}</span>
              <span className="muted">存储 {node.quotaStorageTb} TB</span>
              <span className="muted">API {node.apiRateLimitPerDay}/日</span>
            </Space>
            <Progress percent={usage} size="small" status={usage > 85 ? 'exception' : 'active'} />
          </Space>
          <Space wrap>
            <Button size="small" onClick={() => onAddMember(node)}>添加成员</Button>
            <Button size="small" onClick={() => onEditQuota(node)}>编辑配额</Button>
            <Button size="small" onClick={() => onOpenConfig(node)}>BU配置</Button>
          </Space>
        </Space>
      </Card>
      {node.children?.map((child) => <OrganizationCard key={child.id} node={child} level={level + 1} onEditQuota={onEditQuota} onOpenConfig={onOpenConfig} onAddMember={onAddMember} />)}
    </div>
  );
}

function configsByGroup(items: ConfigItem[], groupName: string) {
  return items.filter((item) => item.groupName === groupName);
}

export function OrganizationManagementPage() {
  const queryClient = useQueryClient();
  const [tenantOpen, setTenantOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationNode | null>(null);
  const [searchText, setSearchText] = useState('');
  const [messageApi, contextHolder] = message.useMessage();

  const tree = useQuery({ queryKey: ['platform-organizations-tree'], queryFn: platformApi.organizationTree });
  const members = useQuery({ queryKey: ['platform-organization-members'], queryFn: platformApi.organizationMembers });
  const configs = useQuery({ queryKey: ['platform-configs', 'BU', selectedOrg?.id ?? 'TENANT-CABIN'], queryFn: () => platformApi.configs('BU', selectedOrg?.id ?? 'TENANT-CABIN') });
  const users = useQuery({ queryKey: ['platform-users'], queryFn: platformApi.users });
  const roles = useQuery({ queryKey: ['platform-roles'], queryFn: platformApi.roles });

  const organizations = useMemo(() => flattenOrganizations(tree.data?.nodes ?? []), [tree.data]);
  const filteredOrganizations = useMemo(() => {
    if (!searchText.trim()) return organizations;
    return organizations.filter((item) => `${item.name}${item.code}`.toLowerCase().includes(searchText.trim().toLowerCase()));
  }, [organizations, searchText]);

  const invalidateOrg = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['platform-organizations-tree'] }),
      queryClient.invalidateQueries({ queryKey: ['platform-organization-members'] }),
      queryClient.invalidateQueries({ queryKey: ['platform-configs'] }),
    ]);
  };

  const createOrganization = useMutation({
    mutationFn: platformApi.createOrganization,
    onSuccess: async () => {
      setTenantOpen(false);
      await invalidateOrg();
      messageApi.success('新建租户已写入组织事实源');
    },
  });
  const updateOrganization = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; quotaGpu?: number; quotaStorageTb?: number; apiRateLimitPerDay?: number } }) => platformApi.updateOrganization(id, input),
    onSuccess: async () => {
      setQuotaOpen(false);
      await invalidateOrg();
      messageApi.success('组织配额已更新并记录审计');
    },
  });
  const assignMember = useMutation({
    mutationFn: ({ organizationId, input }: { organizationId: string; input: { userId: string; roleCode: string; scopeType: string; scopeId: string } }) => platformApi.assignOrganizationMember(organizationId, input),
    onSuccess: async () => {
      setMemberOpen(false);
      await invalidateOrg();
      messageApi.success('成员作用域已分配，权限即时生效');
    },
  });
  const updateConfig = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => platformApi.updateConfig(key, { scopeType: 'BU', scopeId: selectedOrg?.id ?? 'TENANT-CABIN', value, reason: 'F007 org 页面 BU 个性化配置' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform-configs'] });
      messageApi.success('BU 个性化配置已保存');
    },
  });

  const openMember = (node?: OrganizationNode) => {
    if (!node) return;
    setSelectedOrg(node);
    setMemberOpen(true);
  };
  const openQuota = (node: OrganizationNode) => {
    setSelectedOrg(node);
    setQuotaOpen(true);
  };
  const openConfig = (node: OrganizationNode) => {
    setSelectedOrg(node);
    setConfigOpen(true);
  };

  return (
    <div className="content-page">
      {contextHolder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>组织管理</Typography.Title>
          <Typography.Text type="secondary">花叔工业智能 · 组织架构管理</Typography.Text>
        </div>
        <Space>
          <Input.Search placeholder="搜索组织 / BU / 项目" allowClear onSearch={setSearchText} onChange={(event) => setSearchText(event.target.value)} />
          <Button type="primary" onClick={() => setTenantOpen(true)}>＋ 新建租户</Button>
        </Space>
      </div>

      <Tabs
        items={[
          {
            key: 'tree',
            label: '组织架构',
            children: (
              <Space orientation="vertical" size={16} className="full-width">
                <Card title="花叔工业智能 · 组织架构图" extra={<Tag color="blue">CORP / BU / PROJECT</Tag>} loading={tree.isLoading}>
                  {tree.data?.nodes.map((node) => <OrganizationCard key={node.id} node={node} onEditQuota={openQuota} onOpenConfig={openConfig} onAddMember={openMember} />)}
                </Card>
                <Card title="租户列表" extra={<Button onClick={() => selectedOrg && openConfig(selectedOrg)}>权限跳转</Button>}>
                  <Table
                    rowKey="id"
                    size="small"
                    dataSource={filteredOrganizations}
                    pagination={false}
                    columns={[
                      { title: '租户/组织', dataIndex: 'name', render: (_: string, row: OrganizationNode) => <strong>{row.name}<br /><span className="muted">{row.id}</span></strong> },
                      { title: '编码', dataIndex: 'code' },
                      { title: '类型', dataIndex: 'tenantType', render: (value: string) => <Tag color={typeColor(value)}>{typeLabel(value)}</Tag> },
                      { title: '配额', render: (_: unknown, row: OrganizationNode) => <span>GPU {row.quotaGpu} · {row.quotaStorageTb}TB · API {row.apiRateLimitPerDay}/日</span> },
                      { title: '状态', dataIndex: 'status', render: statusTag },
                      { title: '操作', render: (_: unknown, row: OrganizationNode) => <Space><Button size="small" onClick={() => openQuota(row)}>编辑配额</Button><Button size="small" onClick={() => openConfig(row)}>BU配置</Button><Button size="small">权限跳转</Button></Space> },
                    ]}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: 'department',
            label: '部门管理',
            children: (
              <Row gutter={[16, 16]}>
                {filteredOrganizations.filter((item) => item.tenantType !== 'PROJECT').map((node) => (
                  <Col xs={24} md={12} xl={8} key={node.id}>
                    <Card title={node.name} extra={<Tag color={typeColor(node.tenantType)}>{typeLabel(node.tenantType)}</Tag>}>
                      <Space orientation="vertical" className="full-width">
                        <Typography.Text className="mono">{node.path}</Typography.Text>
                        <Typography.Text type="secondary">时区 {node.timezone} · 默认语言 {node.defaultLocale}</Typography.Text>
                        <Button onClick={() => openQuota(node)}>节点重命名 / 编辑配额</Button>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            ),
          },
          {
            key: 'members',
            label: '成员管理',
            children: (
              <Card title="成员与作用域" extra={<Button type="primary" onClick={() => openMember(organizations.find((item) => item.tenantType === 'BU') ?? organizations[0])}>添加成员</Button>}>
                <Table<OrganizationMember>
                  rowKey="id"
                  loading={members.isLoading}
                  dataSource={members.data?.items ?? []}
                  pagination={false}
                  columns={[
                    { title: '成员', dataIndex: 'displayName', render: (_: string, row) => <strong>{row.displayName}<br /><span className="muted">{row.username}</span></strong> },
                    { title: '组织', dataIndex: 'organizationName' },
                    { title: '角色', dataIndex: 'roleCode', render: (role: string) => <Tag color={role === 'SUPER_ADMIN' ? 'red' : 'blue'}>{role}</Tag> },
                    { title: '作用域', render: (_: unknown, row) => <span>{row.scopeType}:{row.scopeId}</span> },
                    { title: '状态', dataIndex: 'status', render: statusTag },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal title="新建租户" open={tenantOpen} onCancel={() => setTenantOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" onFinish={(values) => createOrganization.mutate({ ...values, quotaGpu: Number(values.quotaGpu), quotaStorageTb: Number(values.quotaStorageTb), apiRateLimitPerDay: Number(values.apiRateLimitPerDay) })}>
          <Form.Item name="name" label="租户名称" rules={[{ required: true }]}><Input placeholder="视觉质检项目" /></Form.Item>
          <Form.Item name="code" label="租户编码" rules={[{ required: true }]}><Input placeholder="VISION-QA" /></Form.Item>
          <Form.Item name="tenantType" label="类型" initialValue="PROJECT"><Select options={[{ value: 'BU', label: 'BU' }, { value: 'PROJECT', label: '项目' }]} /></Form.Item>
          <Form.Item name="parentId" label="父级组织" initialValue="TENANT-CABIN"><Select options={organizations.map((item) => ({ value: item.id, label: `${item.name} · ${typeLabel(item.tenantType)}` }))} /></Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="quotaGpu" label="GPU配额" initialValue={8}><InputNumber className="full-width" min={1} /></Form.Item></Col>
            <Col span={8}><Form.Item name="quotaStorageTb" label="存储TB" initialValue={5}><InputNumber className="full-width" min={1} /></Form.Item></Col>
            <Col span={8}><Form.Item name="apiRateLimitPerDay" label="API日限额" initialValue={10000}><InputNumber className="full-width" min={1} /></Form.Item></Col>
          </Row>
          <Button type="primary" htmlType="submit" loading={createOrganization.isPending}>创建并审计</Button>
        </Form>
      </Modal>

      <Modal title={`添加成员 · ${selectedOrg?.name ?? '组织'}`} open={memberOpen} onCancel={() => setMemberOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" onFinish={(values) => selectedOrg && assignMember.mutate({ organizationId: selectedOrg.id, input: { userId: values.userId, roleCode: values.roleCode, scopeType: selectedOrg.tenantType === 'PROJECT' ? 'PROJECT' : 'BU', scopeId: selectedOrg.id } })}>
          <Form.Item name="userId" label="用户" initialValue={users.data?.items[0]?.id} rules={[{ required: true }]}><Select options={(users.data?.items ?? []).map((user) => ({ value: user.id, label: `${user.displayName} · ${user.username}` }))} /></Form.Item>
          <Form.Item name="roleCode" label="角色" initialValue="BU_ADMIN" rules={[{ required: true }]}><Select options={(roles.data ?? []).map((role) => ({ value: role.code, label: `${role.name} · ${role.code}` }))} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={assignMember.isPending}>分配作用域</Button>
        </Form>
      </Modal>

      <Modal title={`编辑配额 · ${selectedOrg?.name ?? '组织'}`} open={quotaOpen} onCancel={() => setQuotaOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" initialValues={{ name: selectedOrg?.name, quotaGpu: selectedOrg?.quotaGpu, quotaStorageTb: selectedOrg?.quotaStorageTb, apiRateLimitPerDay: selectedOrg?.apiRateLimitPerDay }} onFinish={(values) => selectedOrg && updateOrganization.mutate({ id: selectedOrg.id, input: values })}>
          <Form.Item name="name" label="节点名称"><Input /></Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="quotaGpu" label="GPU配额"><InputNumber className="full-width" min={1} /></Form.Item></Col>
            <Col span={8}><Form.Item name="quotaStorageTb" label="存储TB"><InputNumber className="full-width" min={1} /></Form.Item></Col>
            <Col span={8}><Form.Item name="apiRateLimitPerDay" label="API日限额"><InputNumber className="full-width" min={1} /></Form.Item></Col>
          </Row>
          <Button type="primary" htmlType="submit" loading={updateOrganization.isPending}>保存配额</Button>
        </Form>
      </Modal>

      <Modal title={`BU 个性化配置 · ${selectedOrg?.name ?? '组织'}`} open={configOpen} onCancel={() => setConfigOpen(false)} footer={null} width={760} destroyOnHidden>
        <Space orientation="vertical" className="full-width">
          <Typography.Paragraph type="secondary">配置继承链按 PROJECT &gt; BU &gt; GLOBAL 解析，BU/项目不能突破集团上限。</Typography.Paragraph>
          {configsByGroup(configs.data ?? [], 'basic').map((item) => <ConfigEditor key={item.key} item={item} onSave={(value) => updateConfig.mutate({ key: item.key, value })} loading={updateConfig.isPending} />)}
          {configsByGroup(configs.data ?? [], 'storage').map((item) => <ConfigEditor key={item.key} item={item} onSave={(value) => updateConfig.mutate({ key: item.key, value })} loading={updateConfig.isPending} />)}
        </Space>
      </Modal>
    </div>
  );
}

function ConfigEditor({ item, onSave, loading }: { item: ConfigItem; onSave: (value: string) => void; loading?: boolean }) {
  const [value, setValue] = useState(item.scopeValue ?? item.effectiveValue);
  return (
    <Card size="small">
      <Row gutter={12} align="middle">
        <Col xs={24} md={8}>
          <strong>{item.displayName}</strong><br />
          <span className="muted mono">{item.key}</span>
        </Col>
        <Col xs={24} md={9}><Input value={value} onChange={(event) => setValue(event.target.value)} /></Col>
        <Col xs={12} md={4}><Tag>{item.inheritedFrom}</Tag></Col>
        <Col xs={12} md={3}><Button size="small" loading={loading} onClick={() => onSave(value)}>保存</Button></Col>
      </Row>
    </Card>
  );
}
