import { Alert, Button, Card, Descriptions, Drawer, Form, Input, Modal, Select, Space, Steps, Table, Tabs, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  dataApi,
  platformApi,
  type DataSourceSummary,
  type DataSourceSyncTask,
  type DatasetDetail,
  type DatasetSummary,
  type DatasetVersion,
  type FileObjectSummary,
} from '../platform/platformApi';
import { useSessionStore } from '../platform/sessionStore';

const color = (status?: string) => ['ACTIVE', 'PUBLISHED', 'TESTED', 'OK', 'AVAILABLE', 'BOUND'].includes(status ?? '')
  ? 'green'
  : ['UNCONFIGURED', 'DRAFT', 'PAUSED'].includes(status ?? '') ? 'orange' : ['FAILED', 'DISABLED', 'ARCHIVED'].includes(status ?? '') ? 'red' : 'blue';
const fmtSize = (n?: number | null) => !n ? '0 B' : n > 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} GB` : n > 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${n} B`;
const txt = (v?: string | null) => ({ RAW: '原始数据', PREPROCESSED: '预处理后', ANNOTATED: '已标注', IMAGE: '图片', TEXT: '文本', OBJECT_STORAGE: '对象存储', API: 'API' } as Record<string, string>)[v ?? ''] ?? v ?? '-';

export function DataSourceManagementPage() {
  const currentTenantId = useSessionStore((state) => state.user?.tenantId);
  const qc = useQueryClient();
  const [msg, holder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [detail, setDetail] = useState<DataSourceSummary | null>(null);
  const sources = useQuery({ queryKey: ['data-sources'], queryFn: dataApi.dataSources });
  const tasks = useQuery({ queryKey: ['data-sync-tasks'], queryFn: dataApi.syncTasks });
  const inv = () => Promise.all([qc.invalidateQueries({ queryKey: ['data-sources'] }), qc.invalidateQueries({ queryKey: ['data-sync-tasks'] })]);
  const create = useMutation({ mutationFn: dataApi.createDataSource, onSuccess: async () => { setOpen(false); await inv(); msg.success('数据源已创建'); }, onError: (e: Error) => msg.error(e.message) });
  const test = useMutation({ mutationFn: dataApi.testDataSource, onSuccess: async (r) => { await inv(); msg.info(`${r.result}: ${r.diagnosticMessage}`); }, onError: (e: Error) => msg.error(e.message) });
  const activate = useMutation({ mutationFn: dataApi.activateDataSource, onSuccess: async () => { await inv(); msg.success('数据源已激活'); }, onError: (e: Error) => msg.error(e.message) });
  const disable = useMutation({ mutationFn: dataApi.disableDataSource, onSuccess: inv, onError: (e: Error) => msg.error(e.message) });
  const createTask = useMutation({ mutationFn: dataApi.createSyncTask, onSuccess: async () => { setSyncOpen(false); await inv(); msg.success('同步任务 seam 已保存'); }, onError: (e: Error) => msg.error(e.message) });
  const runTask = useMutation({ mutationFn: dataApi.runSyncTask, onSuccess: async (r) => { await inv(); msg.warning(`${r.status}: ${r.diagnosticMessage}`); }, onError: (e: Error) => msg.error(e.message) });

  return (
    <div className="content-page">
      {holder}
      <div className="page-hero">
        <div><Typography.Title level={3}>数据源管理</Typography.Title><Typography.Text type="secondary">管理外部数据源连接与同步任务</Typography.Text></div>
        <Space><Button onClick={() => setSyncOpen(true)}>＋ 新建同步任务</Button><Button type="primary" onClick={() => setOpen(true)}>＋ 新建数据源</Button></Space>
      </div>
      <Tabs items={[
        { key: 'sources', label: '数据源列表', children: <div className="data-source-grid">{(sources.data ?? []).map((s) => <Card key={s.sourceId} title={<Space><Tag color="blue">{txt(s.sourceType)}</Tag>{s.name}</Space>} extra={<Tag color={color(s.status)}>{s.status}</Tag>}><Space direction="vertical" className="full-width"><Typography.Text className="mono">{s.endpoint}{s.port ? `:${s.port}` : ''}</Typography.Text><Typography.Text type="secondary">secretRef: {s.secretRefMasked}</Typography.Text><Typography.Text type="secondary">诊断：{s.diagnosticCode ?? 'NOT_TESTED'} · {s.diagnosticMessage}</Typography.Text><Space wrap><Button size="small" onClick={() => test.mutate(s.sourceId)}>测试连接</Button><Button size="small" onClick={() => setDetail(s)}>详情/编辑</Button><Button size="small" type="primary" onClick={() => activate.mutate(s.sourceId)}>激活</Button><Button size="small" danger onClick={() => disable.mutate(s.sourceId)}>禁用</Button></Space></Space></Card>)}</div> },
        { key: 'tasks', label: '同步任务', children: <Table<DataSourceSyncTask> rowKey="taskId" dataSource={tasks.data ?? []} pagination={false} columns={[{ title: '任务名称', dataIndex: 'name' }, { title: '数据源', dataIndex: 'sourceName' }, { title: '目标数据集', dataIndex: 'targetDatasetName', render: (v) => v ?? '待绑定' }, { title: '调度周期', dataIndex: 'scheduleMode' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: '诊断', dataIndex: 'diagnosticMessage' }, { title: '操作', render: (_, r) => <Button size="small" onClick={() => runTask.mutate(r.taskId)}>立即同步</Button> }]} /> },
      ]} />
      <Modal title="新建数据源" open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" onFinish={(v) => create.mutate({ tenantId: currentTenantId, ...v })} initialValues={{ sourceType: 'OBJECT_STORAGE', endpoint: 'TODO_CONFIRM_DATA_SOURCE_ENDPOINT', credentialMode: 'SECRET_REF', secretRef: 'secret://TODO_CONFIRM_DATA_SOURCE_SECRET', sharedScope: 'BU' }}>
          <Form.Item name="name" label="数据源名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sourceType" label="类型"><Select options={['RELATIONAL_DB', 'FILE', 'OBJECT_STORAGE', 'STREAM', 'TIME_SERIES', 'INDUSTRIAL_PROTOCOL', 'API'].map((v) => ({ value: v, label: txt(v) }))} /></Form.Item>
          <Form.Item name="endpoint" label="Host / Endpoint" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="secretRef" label="secretRef（不填写明文凭据）"><Input /></Form.Item>
          <Alert type="warning" showIcon title="敏感字段不回显；未配置真实 connector 时返回 UNCONFIGURED / TODO_CONFIRM_*。" style={{ marginBottom: 16 }} />
          <Button type="primary" htmlType="submit">保存</Button>
        </Form>
      </Modal>
      <Modal title="新建同步任务" open={syncOpen} onCancel={() => setSyncOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" onFinish={(v) => createTask.mutate(v)} initialValues={{ sourceId: sources.data?.find((s) => s.status === 'ACTIVE' && s.diagnosticCode === 'OK')?.sourceId, scheduleMode: 'MANUAL' }}>
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sourceId" label="源数据源" rules={[{ required: true }]}><Select options={(sources.data ?? []).filter((s) => s.status === 'ACTIVE' && s.diagnosticCode === 'OK').map((s) => ({ value: s.sourceId, label: s.name }))} /></Form.Item>
          <Form.Item name="targetDatasetId" label="目标数据集 ID"><Input /></Form.Item>
          <Form.Item name="scheduleMode" label="调度方式"><Select options={['MANUAL', 'HOURLY', 'DAILY', 'REALTIME'].map((v) => ({ value: v, label: v }))} /></Form.Item>
          <Button type="primary" htmlType="submit">创建任务</Button>
        </Form>
      </Modal>
      <Drawer title={detail?.name} open={Boolean(detail)} onClose={() => setDetail(null)} size="default"><Descriptions bordered column={1} size="small"><Descriptions.Item label="状态"><Tag color={color(detail?.status)}>{detail?.status}</Tag></Descriptions.Item><Descriptions.Item label="Endpoint">{detail?.endpoint}</Descriptions.Item><Descriptions.Item label="凭据模式">{detail?.credentialMode}</Descriptions.Item><Descriptions.Item label="SecretRef">{detail?.secretRefMasked}</Descriptions.Item><Descriptions.Item label="诊断">{detail?.diagnosticMessage}</Descriptions.Item></Descriptions></Drawer>
    </div>
  );
}

export function DatasetManagementPage() {
  const nav = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<DatasetSummary | null>(null);
  const q = useQuery({ queryKey: ['datasets', keyword], queryFn: () => dataApi.datasets({ keyword }) });
  const rows = q.data?.items ?? [];
  return <div className="content-page"><div className="page-hero"><div><Typography.Title level={3}>数据集管理</Typography.Title><Typography.Text type="secondary">共 {q.data?.stats.total ?? 0} 个数据集 · 合计 {fmtSize(q.data?.stats.totalSizeBytes)}</Typography.Text></div><Space><Button>查看标注任务</Button><Button type="primary" onClick={() => nav('/up')}>＋ 新建数据集</Button></Space></div><div className="summary-grid">{[{ n: q.data?.stats.total ?? 0, l: '数据集总数' }, { n: q.data?.stats.raw ?? 0, l: '原始数据' }, { n: q.data?.stats.restricted ?? 0, l: '受限数据集' }, { n: fmtSize(q.data?.stats.totalSizeBytes), l: '存储使用' }].map((i) => <Card key={i.l}><Typography.Title level={3}>{i.n}</Typography.Title><Typography.Text type="secondary">{i.l}</Typography.Text></Card>)}</div><Tabs items={['全部数据集', '原始数据', '预处理后', '已标注'].map((k) => ({ key: k, label: k, children: null }))} /><Space style={{ marginBottom: 12 }}><Input.Search placeholder="搜索数据集名称..." onSearch={setKeyword} /><Select placeholder="全部权限" style={{ width: 140 }} options={['PUBLIC', 'TEAM', 'PRIVATE', 'RESTRICTED'].map((v) => ({ value: v, label: v }))} /><Button>⊟ 高级筛选</Button></Space><Table<DatasetSummary> rowKey="datasetId" dataSource={rows} loading={q.isLoading} rowSelection={{}} columns={[{ title: '数据集名称', render: (_, r) => <a onClick={() => nav('/dsdetail', { state: { datasetId: r.datasetId } })}>{r.name}</a> }, { title: '类型', render: (_, r) => <Tag>{txt(r.datasetType)} / {txt(r.dataType)}</Tag> }, { title: '版本', dataIndex: 'currentVersionName' }, { title: '样本', dataIndex: 'recordCount' }, { title: '大小', render: (_, r) => fmtSize(r.sizeBytes) }, { title: '权限', dataIndex: 'accessLevel', render: (v) => <Tag color={v === 'RESTRICTED' ? 'red' : 'blue'}>{v}</Tag> }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: '操作', render: (_, r) => <Space><a onClick={() => nav('/dsdetail', { state: { datasetId: r.datasetId } })}>详情</a><a onClick={() => setSelected(r)}>版本</a></Space> }]} /><Drawer title={`版本 · ${selected?.name}`} open={Boolean(selected)} onClose={() => setSelected(null)} size="default"><DatasetVersionList datasetId={selected?.datasetId} /></Drawer></div>;
}

function DatasetVersionList({ datasetId }: { datasetId?: string }) {
  const q = useQuery({ queryKey: ['dataset-detail', datasetId], queryFn: () => dataApi.datasetDetail(datasetId!), enabled: Boolean(datasetId) });
  return <Table<DatasetVersion> rowKey="versionId" dataSource={q.data?.versions ?? []} pagination={false} columns={[{ title: '版本', dataIndex: 'versionName' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: '安全', dataIndex: 'contentSafetyStatus' }, { title: '文件大小', render: (_, r) => fmtSize(r.sizeBytes) }]} />;
}

export function DatasetUploadPage() {
  const nav = useNavigate();
  const currentTenantId = useSessionStore((state) => state.user?.tenantId);
  const [msg, holder] = message.useMessage();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DatasetDetail | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string>();
  const qc = useQueryClient();
  const sources = useQuery({ queryKey: ['data-sources'], queryFn: dataApi.dataSources });
  const files = useQuery({ queryKey: ['platform-files'], queryFn: platformApi.files, enabled: step >= 1 });
  const create = useMutation({ mutationFn: dataApi.createDataset, onSuccess: async (created) => { setDraft(created); await qc.invalidateQueries({ queryKey: ['datasets'] }); setStep(1); msg.success('数据集草稿已创建，请登记 F007 文件对象'); }, onError: (e: Error) => msg.error(e.message) });
  const attach = useMutation({ mutationFn: ({ fileId }: { fileId: string }) => dataApi.attachFile(draft!.dataset.datasetId, draft!.versions[0].versionId, { fileId, fileRole: 'RAW' }), onSuccess: async () => { const refreshed = await dataApi.datasetDetail(draft!.dataset.datasetId); setDraft(refreshed); setStep(2); msg.success('文件登记完成，hash/size 校验通过并已绑定版本草稿'); }, onError: (e: Error) => msg.error(e.message) });
  const fileRows = files.data?.items ?? [];
  return <div className="content-page">{holder}<div className="page-hero"><div><Typography.Title level={3}>新建数据集 / 上传向导</Typography.Title><Typography.Text type="secondary">三步向导 · 复用 F007 文件元数据 seam · hash/size 校验</Typography.Text></div></div><Card><Steps current={step} items={[{ title: '填写元数据' }, { title: '文件登记' }, { title: '预览确认' }]} style={{ marginBottom: 24 }} />{step === 0 && <Form layout="vertical" onFinish={(v) => create.mutate({ ...v, tenantId: currentTenantId, datasetType: 'RAW', tags: String(v.tags ?? '').split(/[,，]/).filter(Boolean), recordCount: Number(v.recordCount ?? 0) })} initialValues={{ name: '新建视觉数据集', dataType: 'IMAGE', accessLevel: 'TEAM', tags: '质检,工业视觉' }}><Form.Item name="name" label="数据集名称"><Input /></Form.Item><Form.Item name="dataType" label="数据类型"><Select options={['IMAGE', 'TEXT', 'AUDIO', 'VIDEO', 'TABULAR'].map((v) => ({ value: v, label: txt(v) }))} /></Form.Item><Form.Item name="accessLevel" label="访问级别"><Select options={['PUBLIC', 'TEAM', 'PRIVATE', 'RESTRICTED'].map((v) => ({ value: v, label: v }))} /></Form.Item><Form.Item name="sourceId" label="来源数据源"><Select options={(sources.data ?? []).filter((s) => s.status === 'ACTIVE' && s.diagnosticCode === 'OK').map((s) => ({ value: s.sourceId, label: s.name }))} /></Form.Item><Form.Item name="tags" label="标签"><Input /></Form.Item><Button type="primary" htmlType="submit" loading={create.isPending}>下一步：初始化数据集</Button></Form>}{step === 1 && <Space direction="vertical" className="full-width"><Alert type="info" showIcon title="文件登记 seam" description="选择 F007 platform_file_object，提交后后端执行 AVAILABLE、sha256 与 size 校验，并绑定到当前版本草稿。" /><Table<FileObjectSummary> rowKey="fileId" dataSource={fileRows} pagination={false} rowSelection={{ type: 'radio', selectedRowKeys: selectedFileId ? [selectedFileId] : [], onChange: (keys) => setSelectedFileId(String(keys[0])) }} columns={[{ title: '文件 ID', dataIndex: 'fileId' }, { title: 'Object Key', dataIndex: 'objectKey' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: 'hash 校验', render: (_, r) => r.expectedSha256 === r.sha256 ? '通过' : '不一致' }, { title: '大小', render: (_, r) => fmtSize(r.sizeBytes) }]} /><Button type="primary" disabled={!selectedFileId} loading={attach.isPending} onClick={() => selectedFileId && attach.mutate({ fileId: selectedFileId })}>完成文件登记并绑定版本</Button></Space>}{step === 2 && <Space direction="vertical" className="full-width"><Alert type="warning" showIcon title="文件上传 seam 已初始化" description="真实对象存储/内容安全服务未配置时保持 TODO_CONFIRM_MINIO_* / SECURITY_PENDING，不伪造发布成功。" /><Table rowKey="id" dataSource={draft?.files ?? []} pagination={false} columns={[{ title: '文件', dataIndex: 'fileId' }, { title: '状态', dataIndex: 'status' }, { title: 'Object Key', dataIndex: 'objectKey' }, { title: '大小', render: (_, r: { sizeBytes?: number | null }) => fmtSize(r.sizeBytes) }]} /><Button type="primary" onClick={() => nav('/ds')}>完成并返回数据集管理</Button></Space>}</Card></div>;
}

export function DatasetDetailPage() {
  const loc = useLocation() as { state?: { datasetId?: string } };
  const datasetId = loc.state?.datasetId ?? 'DATASET-WELD-DEFECT';
  const detail = useQuery({ queryKey: ['dataset-detail', datasetId], queryFn: () => dataApi.datasetDetail(datasetId) });
  const ref = useMutation({ mutationFn: () => dataApi.reference(datasetId), onError: () => undefined });
  const d = detail.data;
  return <div className="content-page"><div className="page-hero"><div><Typography.Title level={3}>{d?.dataset.name ?? '数据集详情'}</Typography.Title><Typography.Text type="secondary">概览 · 版本 · 文件 · 权限 · 血缘 · 样例预览</Typography.Text></div><Button onClick={() => ref.mutate()}>请求引用检查</Button></div>{ref.data ? <Alert type="success" showIcon title={`DatasetReference 可用：${ref.data.versionId}`} style={{ marginBottom: 16 }} /> : null}<Card loading={detail.isLoading}><Descriptions bordered column={2}><Descriptions.Item label="数据类型">{txt(d?.dataset.dataType)}</Descriptions.Item><Descriptions.Item label="状态"><Tag color={color(d?.dataset.status)}>{d?.dataset.status}</Tag></Descriptions.Item><Descriptions.Item label="权限"><Tag color={d?.dataset.accessLevel === 'RESTRICTED' ? 'red' : 'blue'}>{d?.dataset.accessLevel}</Tag></Descriptions.Item><Descriptions.Item label="样本数">{d?.dataset.recordCount.toLocaleString('zh-CN')}</Descriptions.Item><Descriptions.Item label="标签">{d?.dataset.tags.map((t) => <Tag key={t}>{t}</Tag>)}</Descriptions.Item><Descriptions.Item label="预览状态">{d?.previewStatus} · {d?.previewDiagnostic}</Descriptions.Item></Descriptions></Card><Tabs items={[{ key: 'versions', label: '版本历史', children: <Table rowKey="versionId" dataSource={d?.versions ?? []} pagination={false} columns={[{ title: '版本', dataIndex: 'versionName' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: '内容安全', dataIndex: 'contentSafetyStatus' }, { title: '诊断', dataIndex: 'diagnosticMessage' }]} /> }, { key: 'files', label: '文件元数据', children: <Table rowKey="id" dataSource={d?.files ?? []} pagination={false} columns={[{ title: '文件', dataIndex: 'fileId' }, { title: '角色', dataIndex: 'fileRole' }, { title: 'Object Key', dataIndex: 'objectKey' }, { title: '大小', render: (_, r: { sizeBytes?: number | null }) => fmtSize(r.sizeBytes) }]} /> }, { key: 'lineage', label: '血缘', children: <Table rowKey="lineageId" dataSource={d?.lineage ?? []} pagination={false} columns={[{ title: '来源', dataIndex: 'sourceType' }, { title: 'Source ID', dataIndex: 'sourceId' }, { title: '目标', dataIndex: 'targetId' }, { title: '转换', dataIndex: 'transformType' }]} /> }, { key: 'access', label: '权限授权', children: <Table rowKey="grantId" dataSource={d?.grants ?? []} pagination={false} columns={[{ title: '用户', dataIndex: 'userName' }, { title: '状态', dataIndex: 'status' }, { title: '有效期', dataIndex: 'expiresAt' }]} /> }]} /></div>;
}
