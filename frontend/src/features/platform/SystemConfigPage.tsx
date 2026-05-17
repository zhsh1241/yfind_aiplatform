import { Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { platformApi, type ApiKeySummary, type ConfigItem, type FileObjectSummary, type NotificationChannel } from './platformApi';

const groupLabels: Record<string, string> = {
  basic: '基础设置',
  storage: '存储配置',
  notification: '通知设置',
  security: '数据安全',
  auth: '认证集成',
  tag: '标签管理',
};

function statusColor(status: string) {
  if (status === 'ACTIVE' || status === 'READY' || status === 'AVAILABLE') return 'green';
  if (status === 'UNCONFIGURED') return 'orange';
  if (status === 'REVOKED' || status === 'FAILED') return 'red';
  return 'blue';
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN') : '—';
}

function ConfigForm({ items, onSave, loading }: { items: ConfigItem[]; onSave: (key: string, value: string) => void; loading?: boolean }) {
  return (
    <Space orientation="vertical" className="full-width">
      {items.map((item) => <ConfigRow key={item.key} item={item} onSave={onSave} loading={loading} />)}
    </Space>
  );
}

function ConfigRow({ item, onSave, loading }: { item: ConfigItem; onSave: (key: string, value: string) => void; loading?: boolean }) {
  const [value, setValue] = useState(item.scopeValue ?? item.effectiveValue);
  return (
    <Card size="small">
      <Row gutter={16} align="middle">
        <Col xs={24} lg={7}>
          <Typography.Text strong>{item.displayName}</Typography.Text><br />
          <Typography.Text type="secondary" className="mono">{item.key}</Typography.Text>
        </Col>
        <Col xs={24} lg={8}>
          <Input value={value} onChange={(event) => setValue(event.target.value)} aria-label={item.displayName} />
        </Col>
        <Col xs={12} lg={5}>
          <Tag>{item.scopeType}:{item.scopeId}</Tag><br />
          <span className="muted">继承自 {item.inheritedFrom}</span>
        </Col>
        <Col xs={12} lg={4}>
          <Button loading={loading} onClick={() => onSave(item.key, value)}>保存</Button>
        </Col>
      </Row>
    </Card>
  );
}

function StoragePanel({ configs, files, onSave, loading }: { configs: ConfigItem[]; files: FileObjectSummary[]; onSave: (key: string, value: string) => void; loading?: boolean }) {
  const totalBytes = files.reduce((sum, file) => sum + (file.sizeBytes ?? file.expectedSizeBytes ?? 0), 0);
  return (
    <Space orientation="vertical" className="full-width" size={16}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}><Card title="对象存储状态"><Tag color="orange">UNCONFIGURED</Tag><p className="muted">TODO_CONFIRM_MINIO_ENDPOINT</p></Card></Col>
        <Col xs={24} md={8}><Card title="文件元数据"><Typography.Title level={4}>{files.length}</Typography.Title><span className="muted">已登记 object key</span></Card></Col>
        <Col xs={24} md={8}><Card title="已登记容量"><Typography.Title level={4}>{(totalBytes / 1024 / 1024).toFixed(1)} MB</Typography.Title><span className="muted">来自 platform_file_object</span></Card></Col>
      </Row>
      <Card title="存储路径配置" extra={<Button>清理缓存</Button>}>
        <ConfigForm items={configs} onSave={onSave} loading={loading} />
      </Card>
      <Card title="文件元数据 seam">
        <Table<FileObjectSummary>
          rowKey="fileId"
          size="small"
          dataSource={files}
          pagination={false}
          columns={[
            { title: '文件ID', dataIndex: 'fileId' },
            { title: '资产类型', dataIndex: 'assetType' },
            { title: 'Bucket', dataIndex: 'bucket' },
            { title: 'Object Key', dataIndex: 'objectKey', render: (value: string) => <span className="mono">{value}</span> },
            { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag> },
          ]}
        />
      </Card>
    </Space>
  );
}

function NotificationPanel({ channels, onTest, onUpdate, testing }: { channels: NotificationChannel[]; onTest: (channelId: string) => void; onUpdate: (channel: NotificationChannel) => void; testing?: boolean }) {
  return (
    <Card title="通知渠道" extra={<Tag color="orange">未配置外部参数时不伪造成功</Tag>}>
      <Table<NotificationChannel>
        rowKey="channelId"
        dataSource={channels}
        pagination={false}
        columns={[
          { title: '渠道', dataIndex: 'name', render: (_: string, row) => <strong>{row.name}<br /><span className="muted">{row.channelType}</span></strong> },
          { title: '配置', dataIndex: 'configMasked', render: (value: string | null) => <span className="mono">{value ?? 'TODO_CONFIRM_NOTIFICATION_CHANNEL'}</span> },
          { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag> },
          { title: '诊断', dataIndex: 'diagnostic', render: (value: string | null) => value ?? 'TODO_CONFIRM_NOTIFICATION_CHANNEL' },
          { title: '最近测试', dataIndex: 'lastTestAt', render: formatDate },
          { title: '操作', render: (_: unknown, row) => <Space><Button size="small" onClick={() => onUpdate(row)}>保存配置</Button><Button size="small" loading={testing} onClick={() => onTest(row.channelId)}>测试</Button></Space> },
        ]}
      />
    </Card>
  );
}

function ApiKeyPanel({ keys, onCreate, onRevoke, createdKey, loading }: { keys: ApiKeySummary[]; onCreate: (values: { name: string; scopeType: string; scopeId: string; expiresInDays: number }) => void; onRevoke: (id: string) => void; createdKey: ApiKeySummary | null; loading?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Space orientation="vertical" className="full-width" size={16}>
      <Card title="API 密钥" extra={<Button type="primary" onClick={() => setOpen(true)}>＋ 新建 API Key</Button>}>
        {createdKey?.plainTextKey ? (
          <Card size="small" className="api-key-once" title="一次性明文展示">
            <Typography.Paragraph copyable className="mono">{createdKey.plainTextKey}</Typography.Paragraph>
            <Typography.Text type="warning">关闭后将仅展示脱敏值，后端只保存 hash。</Typography.Text>
          </Card>
        ) : null}
        <Table<ApiKeySummary>
          rowKey="id"
          dataSource={keys}
          pagination={false}
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: '脱敏 Key', dataIndex: 'maskedKey', render: (value: string) => <span className="mono">{value}</span> },
            { title: '作用域', render: (_: unknown, row) => `${row.scopeType}:${row.scopeId}` },
            { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag> },
            { title: '过期时间', dataIndex: 'expiresAt', render: formatDate },
            { title: '操作', render: (_: unknown, row) => <Button danger size="small" disabled={row.status === 'REVOKED'} onClick={() => onRevoke(row.id)}>撤销</Button> },
          ]}
        />
      </Card>
      <Modal title="新建 API Key" open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" onFinish={(values) => { onCreate({ ...values, expiresInDays: Number(values.expiresInDays) }); setOpen(false); }}>
          <Form.Item name="name" label="Key 名称" rules={[{ required: true }]}><Input placeholder="batch-inference-prod" /></Form.Item>
          <Form.Item name="scopeType" label="作用域类型" initialValue="BU"><Select options={[{ value: 'GLOBAL', label: 'GLOBAL' }, { value: 'BU', label: 'BU' }, { value: 'PROJECT', label: 'PROJECT' }]} /></Form.Item>
          <Form.Item name="scopeId" label="作用域 ID" initialValue="TENANT-CABIN"><Input /></Form.Item>
          <Form.Item name="expiresInDays" label="有效期（天）" initialValue={90}><InputNumber min={1} max={3650} className="full-width" /></Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>创建并一次性展示</Button>
        </Form>
      </Modal>
    </Space>
  );
}

function TagPanel({ configs, onSave, loading }: { configs: ConfigItem[]; onSave: (key: string, value: string) => void; loading?: boolean }) {
  const defaultTags = ['图像', '视频', '音频', '文本', '结构化数据', '质量检测', '目标检测', 'L1-公开', 'L2-内部', '工厂采集'];
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card title="标签管理结构">
          <Space wrap>{defaultTags.map((tag) => <Tag key={tag} color="blue">{tag}</Tag>)}</Space>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="默认场景配置"><ConfigForm items={configs} onSave={onSave} loading={loading} /></Card>
      </Col>
    </Row>
  );
}

export function SystemConfigPage() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [createdKey, setCreatedKey] = useState<ApiKeySummary | null>(null);

  const configs = useQuery({ queryKey: ['platform-configs', 'GLOBAL', 'TENANT-YF'], queryFn: () => platformApi.configs('GLOBAL', 'TENANT-YF') });
  const files = useQuery({ queryKey: ['platform-files'], queryFn: platformApi.files });
  const channels = useQuery({ queryKey: ['platform-notification-channels'], queryFn: platformApi.notificationChannels });
  const apiKeys = useQuery({ queryKey: ['platform-api-keys'], queryFn: platformApi.apiKeys });

  const byGroup = useMemo(() => Map.groupBy(configs.data ?? [], (item) => item.groupName), [configs.data]);

  const updateConfig = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => platformApi.updateConfig(key, { scopeType: 'GLOBAL', scopeId: 'TENANT-YF', value, reason: 'F007 sys 页面配置保存' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform-configs'] });
      messageApi.success('系统配置已保存并生成版本记录');
    },
  });
  const testChannel = useMutation({
    mutationFn: platformApi.testNotificationChannel,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['platform-notification-channels'] });
      messageApi.warning(`通知测试返回 ${result.result}: ${result.diagnostic}`);
    },
  });
  const updateChannel = useMutation({
    mutationFn: (channel: NotificationChannel) => platformApi.updateNotificationChannel(channel.channelId, { enabled: channel.enabled, configMasked: channel.configMasked ?? undefined, diagnostic: channel.diagnostic ?? undefined }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform-notification-channels'] });
      messageApi.success('通知渠道配置已保存');
    },
  });
  const createApiKey = useMutation({
    mutationFn: platformApi.createApiKey,
    onSuccess: async (result) => {
      setCreatedKey(result);
      await queryClient.invalidateQueries({ queryKey: ['platform-api-keys'] });
      messageApi.success('API Key 已创建，请立即复制一次性明文');
    },
  });
  const revokeApiKey = useMutation({
    mutationFn: platformApi.revokeApiKey,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform-api-keys'] });
      messageApi.success('API Key 已撤销并记录 CRITICAL 审计');
    },
  });

  const saveConfig = (key: string, value: string) => updateConfig.mutate({ key, value });

  return (
    <div className="content-page">
      {contextHolder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>系统配置</Typography.Title>
          <Typography.Text type="secondary">基础设置 · 存储配置 · 通知设置 · API 密钥 · 数据安全 · 认证集成 · 标签管理</Typography.Text>
        </div>
        <Tag color="blue">GLOBAL:TENANT-YF</Tag>
      </div>

      <Tabs
        items={[
          { key: 'basic', label: '基础设置', children: <Card title={groupLabels.basic}><ConfigForm items={byGroup.get('basic') ?? []} onSave={saveConfig} loading={updateConfig.isPending} /></Card> },
          { key: 'storage', label: '存储配置', children: <StoragePanel configs={byGroup.get('storage') ?? []} files={files.data?.items ?? []} onSave={saveConfig} loading={updateConfig.isPending} /> },
          { key: 'notification', label: '通知设置', children: <NotificationPanel channels={channels.data ?? []} onUpdate={(channel) => updateChannel.mutate(channel)} onTest={(channelId) => testChannel.mutate(channelId)} testing={testChannel.isPending} /> },
          { key: 'apikey', label: 'API 密钥', children: <ApiKeyPanel keys={apiKeys.data ?? []} onCreate={(values) => createApiKey.mutate({ ...values, permissions: ['INFERENCE_READ'] })} onRevoke={(id) => revokeApiKey.mutate(id)} createdKey={createdKey} loading={createApiKey.isPending || revokeApiKey.isPending} /> },
          { key: 'security', label: '数据安全', children: <Card title={groupLabels.security}><ConfigForm items={byGroup.get('security') ?? []} onSave={saveConfig} loading={updateConfig.isPending} /><Card size="small" title="脱敏规则 seam"><Tag color="green">手机号</Tag><Tag color="green">身份证号</Tag><Tag color="green">邮箱地址</Tag><Tag>IP 地址</Tag></Card></Card> },
          { key: 'auth', label: '认证集成', children: <Card title={groupLabels.auth} extra={<Tag color="orange">TODO_CONFIRM_IDP_METADATA_URL</Tag>}><ConfigForm items={byGroup.get('auth') ?? []} onSave={saveConfig} loading={updateConfig.isPending} /><Typography.Paragraph type="secondary">LDAP / SSO / SAML / OAuth2 参数待外部系统确认，F007 仅保留未配置真实状态。</Typography.Paragraph></Card> },
          { key: 'tag', label: '标签管理', children: <TagPanel configs={byGroup.get('tag') ?? []} onSave={saveConfig} loading={updateConfig.isPending} /> },
        ]}
      />
    </div>
  );
}
