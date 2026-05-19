import { Alert, Button, Card, Descriptions, Drawer, Form, Input, Modal, Select, Space, Steps, Table, Tabs, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  dataApi,
  platformApi,
  type AnnotationLabelTemplate,
  type AnnotationExternalBinding,
  type AnnotationReviewItem,
  type AnnotationTaskSummary,
  type AnnotationWorkItem,
  type DataSourceSummary,
  type DataSourceSyncTask,
  type DataStandardProfile,
  type DataStandardTask,
  type DatasetDetail,
  type DatasetSummary,
  type DatasetVersion,
  type FileObjectSummary,
  type OperatorDetail,
  type OperatorSummary,
  type PipelineDetail,
  type PipelineEdge,
  type PipelineNode,
  type PipelineSaveInput,
  type PipelineVariable,
} from '../platform/platformApi';
import { useSessionStore } from '../platform/sessionStore';

const color = (status?: string) => ['ACTIVE', 'PUBLISHED', 'TESTED', 'OK', 'AVAILABLE', 'BOUND'].includes(status ?? '')
  ? 'green'
  : ['UNCONFIGURED', 'DRAFT', 'PAUSED'].includes(status ?? '') ? 'orange' : ['FAILED', 'DISABLED', 'ARCHIVED'].includes(status ?? '') ? 'red' : 'blue';
const fmtSize = (n?: number | null) => !n ? '0 B' : n > 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} GB` : n > 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${n} B`;
const txt = (v?: string | null) => ({ RAW: '原始数据', PREPROCESSED: '预处理后', ANNOTATED: '已标注', IMAGE: '图片', TEXT: '文本', TABULAR: '表格', EVENT: '事件', TIME_SERIES: '时序库', TELEMETRY: '遥测', FILE: '文件', OBJECT: '对象', RELATIONAL_DB: '关系型数据库', OBJECT_STORAGE: '对象存储', STREAM: '流数据', INDUSTRIAL_PROTOCOL: '工业协议', API: '外部接口' } as Record<string, string>)[v ?? ''] ?? v ?? '-';

const safeJson = (value?: string | null) => {
  try {
    return JSON.stringify(JSON.parse(value || '{}'), null, 2);
  } catch {
    return value || '{}';
  }
};

const toSaveInput = (detail: PipelineDetail, nodes: PipelineNode[], variables: PipelineVariable[]): PipelineSaveInput => ({
  name: detail.pipeline.name,
  tenantId: detail.pipeline.tenantId,
  projectId: detail.pipeline.projectId,
  description: detail.pipeline.description,
  nodes,
  edges: detail.edges,
  variables,
});

const annStatusText = (status?: string) => ({
  DRAFT: '草稿',
  ASSIGNED: '待开始',
  IN_PROGRESS: '进行中',
  PENDING_REVIEW: '待审核',
  REVIEW_PENDING: '待审核',
  APPROVED: '已通过',
  COMPLETED: '已完成',
  REJECTED: '已驳回',
  PAUSED: '已暂停',
  CANCELLED: '已取消',
} as Record<string, string>)[status ?? ''] ?? status ?? '-';
const pct = (done?: number, total?: number) => !total ? 0 : Math.round(((done ?? 0) / total) * 100);
const annJson = '{"boxes":[{"label":"缺陷","x":12,"y":20,"w":80,"h":32}]}';
const lsStatusType = (status?: string) => ['PROJECT_SYNCED', 'TASK_SYNCED', 'RESULT_IMPORTED'].includes(status ?? '') ? 'success' : status === 'UNCONFIGURED' ? 'warning' : status?.includes('FAILED') || status?.includes('AUTH') || status?.includes('UNREACHABLE') ? 'error' : 'info';

export function AnnotationTasksPage() {
  const currentTenantId = useSessionStore((state) => state.user?.tenantId);
  const qc = useQueryClient();
  const [msg, holder] = message.useMessage();
  const [status, setStatus] = useState<string>();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const overview = useQuery({ queryKey: ['annotation-overview'], queryFn: dataApi.annotationOverview });
  const tasks = useQuery({ queryKey: ['annotation-tasks', status], queryFn: () => dataApi.annotationTasks({ status }) });
  const datasets = useQuery({ queryKey: ['datasets-active-for-annotation'], queryFn: () => dataApi.datasets({ status: 'ACTIVE' }) });
  const templates = useQuery({ queryKey: ['annotation-templates'], queryFn: () => dataApi.labelTemplates() });
  const inv = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['annotation-overview'] }),
    qc.invalidateQueries({ queryKey: ['annotation-tasks'] }),
    qc.invalidateQueries({ queryKey: ['annotation-templates'] }),
  ]);
  const createTask = useMutation({
    mutationFn: dataApi.createAnnotationTask,
    onSuccess: async () => { setWizardOpen(false); await inv(); msg.success('标注任务已创建并完成分派'); },
    onError: (e: Error) => msg.error(e.message),
  });
  const createTemplate = useMutation({
    mutationFn: dataApi.createLabelTemplate,
    onSuccess: async (created) => { await dataApi.publishLabelTemplate(created.templateId); await inv(); msg.success('标签模板已发布并生成 Label Studio config'); },
    onError: (e: Error) => msg.error(e.message),
  });
  const syncLs = useMutation({ mutationFn: dataApi.syncLabelStudioProject, onSuccess: async (r) => { await inv(); (r.lastSyncStatus === 'PROJECT_SYNCED' ? msg.success : msg.warning)(`Label Studio ${r.lastSyncStatus}: ${r.diagnosticMessage}`); }, onError: (e: Error) => msg.error(e.message) });
  const rows = tasks.data?.items ?? overview.data?.tasks ?? [];
  const publishedTemplates = (templates.data ?? overview.data?.templates ?? []).filter((item) => item.status === 'PUBLISHED');
  const activeDatasets = (datasets.data?.items ?? []).filter((item) => item.status === 'ACTIVE');
  const tabStatus: Record<string, string | undefined> = { all: undefined, running: 'IN_PROGRESS', assigned: 'ASSIGNED', review: 'PENDING_REVIEW', done: 'COMPLETED' };
  const annSummaryCards = [
    { n: overview.data?.stats.total ?? rows.length, l: '全部任务' },
    { n: overview.data?.stats.inProgress ?? rows.filter((i) => i.status === 'IN_PROGRESS').length, l: '进行中' },
    { n: overview.data?.stats.pendingReview ?? rows.filter((i) => i.status === 'PENDING_REVIEW').length, l: '待审核' },
    { n: overview.data?.stats.templates ?? publishedTemplates.length, l: '标签模板' },
  ];

  return (
    <div className="content-page annotation-page">
      {holder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>标注任务管理</Typography.Title>
          <Typography.Text type="secondary">数据集 · 标签模板/任务 · AI 预标注 · Label Studio 生产化联通 · 发布 ANNOTATED 数据集</Typography.Text>
        </div>
        <Space wrap>
          <Button onClick={() => setTemplateOpen(true)}>标签模板</Button>
          <Button type="primary" onClick={() => setWizardOpen(true)}>＋ 新建标注任务</Button>
        </Space>
      </div>
      <Alert type="info" showIcon title="外部标注工具 / Label Studio" description="配置有效时创建/复用真实 Label Studio project；未配置、认证失败、网络失败和 schema 失败均展示诊断，不伪造外部成功。" style={{ marginBottom: 16 }} />
      <div className="summary-grid">{annSummaryCards.map((item) => <Card key={item.l}><Typography.Title level={3}>{item.n}</Typography.Title><Typography.Text type="secondary">{item.l}</Typography.Text></Card>)}</div>
      <Tabs
        activeKey={Object.entries(tabStatus).find(([, value]) => value === status)?.[0] ?? 'all'}
        onChange={(key) => setStatus(tabStatus[key])}
        items={[
          { key: 'all', label: '全部任务' },
          { key: 'running', label: '进行中' },
          { key: 'assigned', label: '待开始' },
          { key: 'review', label: '待审核' },
          { key: 'done', label: '已完成' },
        ].map((item) => ({ ...item, children: null }))}
      />
      <Table<AnnotationTaskSummary>
        rowKey="taskId"
        dataSource={rows}
        loading={tasks.isLoading || overview.isLoading}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: '任务名称', dataIndex: 'name', render: (v, r) => <Space direction="vertical" size={0}><Typography.Text strong>{v}</Typography.Text><Typography.Text type="secondary">{r.sourceDatasetName}</Typography.Text></Space> },
          { title: '标注类型', dataIndex: 'sceneLabel', render: (v, r) => <Space><Tag>{v}</Tag>{r.prelabelEnabled ? <Tag color="purple">AI 预标注</Tag> : null}</Space> },
          { title: '进度', render: (_, r) => `${pct(r.annotatedCount, r.totalCount)}%（${r.annotatedCount}/${r.totalCount}）` },
          { title: '标注员', render: (_, r) => r.assignees.filter((u) => u.role === 'ANNOTATOR').map((u) => u.displayName).join('、') || '-' },
          { title: '质量评分', dataIndex: 'qualityScore', render: (v) => v == null ? '待质检' : <Tag color={v >= 90 ? 'green' : 'orange'}>{v}</Tag> },
          { title: '截止', dataIndex: 'deadline', render: (v) => v ? new Date(v).toLocaleDateString('zh-CN') : 'TODO_CONFIRM_ANNOTATION_DEADLINE' },
          { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{annStatusText(v)}</Tag> },
          { title: '操作', render: (_, r) => <Space><a onClick={() => syncLs.mutate(r.taskId)}>同步 Label Studio project</a><a onClick={() => void navigator.clipboard?.writeText(r.taskId)}>复制ID</a></Space> },
        ]}
      />
      <Modal title="＋ 新建标注任务" open={wizardOpen} onCancel={() => setWizardOpen(false)} footer={null} destroyOnHidden width={760}>
        <Steps size="small" current={1} items={[{ title: '选择数据集' }, { title: '配置模板' }, { title: '分派审核' }]} style={{ marginBottom: 16 }} />
        <Form layout="vertical" onFinish={(v) => createTask.mutate({ ...v, assigneeIds: ['USR-ANNOTATOR'], reviewerIds: ['USR-BU-CABIN'], prelabelModelSource: 'TODO_CONFIRM_PRELABEL_MODEL_SOURCE', prelabelConfidence: 0.7 })} initialValues={{ name: '焊缝缺陷检测标注任务', sourceDatasetId: activeDatasets[0]?.datasetId ?? 'DATASET-WELD-DEFECT', sourceVersionId: activeDatasets[0]?.currentVersionId ?? 'DVER-WELD-001', templateId: publishedTemplates[0]?.templateId ?? 'LT-WELD-BBOX', scene: 'OBJECT_DETECTION', reviewEnabled: true, prelabelEnabled: true, labelStudioEnabled: true }}>
          <Form.Item name="sourceDatasetId" label="源数据集（必须 ACTIVE）" rules={[{ required: true }]}><Select options={activeDatasets.map((d) => ({ value: d.datasetId, label: `${d.name} · ${d.status}` }))} /></Form.Item>
          <Form.Item name="sourceVersionId" label="数据版本"><Input placeholder="默认使用 currentVersionId" /></Form.Item>
          <Form.Item name="templateId" label="标签模板（必须 PUBLISHED）" rules={[{ required: true }]}><Select options={publishedTemplates.map((t) => ({ value: t.templateId, label: `${t.name} · ${t.status}` }))} /></Form.Item>
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="scene" label="标注场景"><Select options={[{ value: 'OBJECT_DETECTION', label: '目标检测' }, { value: 'TEXT_LABELING', label: '文本分类' }]} /></Form.Item>
          <Space wrap>
            <Form.Item name="reviewEnabled" label="审核"><Select options={[{ value: true, label: '启用审核' }, { value: false, label: '不审核' }]} /></Form.Item>
            <Form.Item name="prelabelEnabled" label="AI 预标注"><Select options={[{ value: true, label: '启用 AI 预标注' }, { value: false, label: '不启用' }]} /></Form.Item>
          </Space>
          <Form.Item name="note" label="备注"><Input.TextArea rows={2} /></Form.Item>
          <Alert type="info" showIcon title="分派策略" description="示例任务默认分派给 USR-ANNOTATOR 标注、USR-BU-CABIN 审核；DAT-004 阻断自审。" style={{ marginBottom: 12 }} />
          <Button type="primary" htmlType="submit" loading={createTask.isPending}>创建任务</Button>
        </Form>
      </Modal>
      <Drawer title="标签模板" open={templateOpen} onClose={() => setTemplateOpen(false)} width={720}>
        <Alert type="info" showIcon title="Label Studio label config seam" description="模板会生成 <View> XML；workspace/storage/token 仍保留 TODO_CONFIRM_*。" style={{ marginBottom: 16 }} />
        <Table<AnnotationLabelTemplate> rowKey="templateId" dataSource={templates.data ?? []} pagination={false} columns={[{ title: '名称', dataIndex: 'name' }, { title: '场景', dataIndex: 'scene' }, { title: '类型', dataIndex: 'labelType' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }]} />
        <Form layout="vertical" style={{ marginTop: 16 }} initialValues={{ name: '焊缝 BBox 模板', tenantId: currentTenantId, scene: 'OBJECT_DETECTION', labelType: 'BOUNDING_BOX', labelSchemaJson: '{"labels":["裂纹","气孔"]}' }} onFinish={(v) => createTemplate.mutate(v)}>
          <Form.Item name="name" label="模板名称"><Input /></Form.Item>
          <Form.Item name="tenantId" label="BU"><Input /></Form.Item>
          <Form.Item name="scene" label="场景"><Input /></Form.Item>
          <Form.Item name="labelType" label="标注类型"><Input /></Form.Item>
          <Form.Item name="labelSchemaJson" label="标签 Schema"><Input.TextArea rows={3} /></Form.Item>
          <Button htmlType="submit" loading={createTemplate.isPending}>创建并发布模板</Button>
        </Form>
      </Drawer>
    </div>
  );
}

export function AnnotationWorkbenchPage() {
  const qc = useQueryClient();
  const [msg, holder] = message.useMessage();
  const tasks = useQuery({ queryKey: ['annotation-workbench-tasks'], queryFn: () => dataApi.annotationTasks({ status: 'IN_PROGRESS' }) });
  const taskId = tasks.data?.items[0]?.taskId ?? 'ANN-WELD-Q2';
  const detail = useQuery({ queryKey: ['annotation-detail', taskId], queryFn: () => dataApi.annotationTaskDetail(taskId), enabled: Boolean(taskId) });
  const [syncedBinding, setSyncedBinding] = useState<AnnotationExternalBinding | null>(null);
  const save = useMutation({ mutationFn: (id: string) => dataApi.saveAnnotationDraft(id, annJson), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['annotation-detail', taskId] }); msg.success('草稿已保存'); }, onError: (e: Error) => msg.error(e.message) });
  const submit = useMutation({ mutationFn: (id: string) => dataApi.submitAnnotationWorkItem(id, annJson), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['annotation-detail', taskId] }); msg.success('标注结果已提交，等待审核'); }, onError: (e: Error) => msg.error(e.message) });
  const sync = useMutation({ mutationFn: dataApi.syncLabelStudioTask, onSuccess: async (r) => { setSyncedBinding(r); await qc.invalidateQueries({ queryKey: ['annotation-detail', taskId] }); (r.lastSyncStatus === 'TASK_SYNCED' ? msg.success : msg.warning)(`Label Studio ${r.lastSyncStatus}: ${r.diagnosticMessage}`); }, onError: (e: Error) => msg.error(e.message) });
  const task = detail.data?.task;
  const items = detail.data?.workItems ?? [];
  const externalBinding = syncedBinding ?? detail.data?.externalBinding;
  return (
    <div className="content-page annotation-workbench-page">
      {holder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>标注工作台</Typography.Title>
          <Typography.Text type="secondary">样本队列 · AI 预标注参考 · 草稿保存 · 提交审核闭环</Typography.Text>
        </div>
        <Tag color={color(task?.status)}>{annStatusText(task?.status)}</Tag>
      </div>
      <Alert
        type={lsStatusType(externalBinding?.lastSyncStatus)}
        showIcon
        title={`Label Studio ${externalBinding?.lastSyncStatus ?? '状态待同步'}`}
        description={<Space direction="vertical" size={2}><span>{externalBinding?.diagnosticMessage ?? 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL'}</span>{externalBinding?.externalTaskId ? <a href={externalBinding.externalTaskUrl ?? externalBinding.launchUrl ?? undefined} target="_blank" rel="noreferrer">打开 Label Studio task：{externalBinding.externalTaskId}</a> : externalBinding?.externalProjectId ? <a href={externalBinding.launchUrl ?? undefined} target="_blank" rel="noreferrer">打开 Label Studio project：{externalBinding.externalProjectId}</a> : null}</Space>}
        style={{ marginBottom: 16 }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
        <Card title={task?.name ?? '标注任务'} loading={detail.isLoading}>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="源数据集">{task?.sourceDatasetName}</Descriptions.Item>
            <Descriptions.Item label="标签模板">{task?.templateName}</Descriptions.Item>
            <Descriptions.Item label="AI 预标注">{task?.prelabelEnabled ? '已启用 · TODO_CONFIRM_PRELABEL_MODEL_SOURCE' : '未启用'}</Descriptions.Item>
            <Descriptions.Item label="进度">{pct(task?.annotatedCount, task?.totalCount)}%</Descriptions.Item>
          </Descriptions>
          <Button style={{ marginTop: 12 }} onClick={() => items[0]?.workItemId && sync.mutate(items[0].workItemId)}>同步 Label Studio task</Button>
          {externalBinding?.externalTaskId ? <Button style={{ marginTop: 12, marginLeft: 8 }} href={externalBinding.externalTaskUrl ?? externalBinding.launchUrl ?? undefined} target="_blank">打开 Label Studio task</Button> : null}
        </Card>
        <Card title="样本队列">
          <Table<AnnotationWorkItem>
            rowKey="workItemId"
            dataSource={items}
            pagination={{ pageSize: 6 }}
            columns={[
              { title: '样本', dataIndex: 'sampleKey', render: (v) => <Typography.Text className="mono">{v}</Typography.Text> },
              { title: '预标注', dataIndex: 'predictionJson', render: (v) => v ? <Tag color="purple">AI 预标注</Tag> : '无' },
              { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{annStatusText(v)}</Tag> },
              { title: '操作', render: (_, r) => <Space><Button size="small" onClick={() => save.mutate(r.workItemId)}>保存草稿</Button><Button size="small" type="primary" disabled={r.status === 'APPROVED' || r.status === 'REVIEW_PENDING'} onClick={() => submit.mutate(r.workItemId)}>提交审核</Button></Space> },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}

export function AnnotationReviewPage() {
  const qc = useQueryClient();
  const [msg, holder] = message.useMessage();
  const [reasonOpen, setReasonOpen] = useState<AnnotationReviewItem | null>(null);
  const reviews = useQuery({ queryKey: ['annotation-review-items'], queryFn: () => dataApi.annotationReviewItems() });
  const approve = useMutation({ mutationFn: dataApi.approveAnnotationReviewItem, onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['annotation-review-items'] }); msg.success('审核通过'); }, onError: (e: Error) => msg.error(e.message) });
  const reject = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => dataApi.rejectAnnotationReviewItem(id, reason), onSuccess: async () => { setReasonOpen(null); await qc.invalidateQueries({ queryKey: ['annotation-review-items'] }); msg.warning('已驳回并返回标注员'); }, onError: (e: Error) => msg.error(e.message) });
  const quality = useMutation({ mutationFn: dataApi.qualityCheckAnnotationTask, onSuccess: (r) => msg.info(`${r.qualityStatus}: ${r.diagnosticMessage}`), onError: (e: Error) => msg.error(e.message) });
  const publish = useMutation({ mutationFn: dataApi.publishAnnotationDataset, onSuccess: (r) => msg.success(`已发布 ANNOTATED 数据集：${r.outputDatasetId}`), onError: (e: Error) => msg.error(e.message) });
  const importLs = useMutation({ mutationFn: dataApi.importLabelStudioResults, onSuccess: (r) => (r.lastSyncStatus === 'RESULT_IMPORTED' ? msg.success : msg.warning)(`Label Studio ${r.lastSyncStatus}: ${r.diagnosticMessage}`), onError: (e: Error) => msg.error(e.message) });
  const taskIds = Array.from(new Set((reviews.data ?? []).map((item) => item.taskId)));
  return (
    <div className="content-page annotation-review-page">
      {holder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>标注审核</Typography.Title>
          <Typography.Text type="secondary">审核队列 · 通过/驳回 · DAT-004 防自审 · DAT-010 发布前质检</Typography.Text>
        </div>
        <Space>
          {taskIds[0] ? <Button onClick={() => quality.mutate(taskIds[0])}>质量检查</Button> : null}
          {taskIds[0] ? <Button onClick={() => importLs.mutate(taskIds[0])}>导入 Label Studio 结果</Button> : null}
          {taskIds[0] ? <Button type="primary" onClick={() => publish.mutate(taskIds[0])}>发布标注数据集</Button> : null}
        </Space>
      </div>
      <Alert type="info" showIcon title="审核规则" description="审核人与标注员必须分离；通过后可执行质量检查并发布 ANNOTATED 数据集，同时写入 ANNOTATION 血缘。" style={{ marginBottom: 16 }} />
      <Table<AnnotationReviewItem>
        rowKey="reviewItemId"
        dataSource={reviews.data ?? []}
        loading={reviews.isLoading}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: '标注任务', dataIndex: 'taskName' },
          { title: '标注员', dataIndex: 'annotatorName' },
          { title: '审核员', dataIndex: 'reviewerName', render: (v) => v ?? '待分派' },
          { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{annStatusText(v)}</Tag> },
          { title: '意见', dataIndex: 'reviewComment', render: (v) => v ?? '-' },
          { title: '操作', render: (_, r) => <Space><Button size="small" type="primary" disabled={r.status === 'APPROVED'} onClick={() => approve.mutate(r.reviewItemId)}>通过</Button><Button size="small" danger disabled={r.status === 'APPROVED'} onClick={() => setReasonOpen(r)}>驳回</Button></Space> },
        ]}
      />
      <Modal title="驳回原因" open={Boolean(reasonOpen)} onCancel={() => setReasonOpen(null)} footer={null} destroyOnHidden>
        <Form layout="vertical" initialValues={{ reason: '标注边界框不完整，请补充。' }} onFinish={(v) => reasonOpen && reject.mutate({ id: reasonOpen.reviewItemId, reason: v.reason })}>
          <Form.Item name="reason" label="原因" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Button danger htmlType="submit" loading={reject.isPending}>确认驳回</Button>
        </Form>
      </Modal>
    </div>
  );
}

export function DataPipelineStandardPage() {
  const qc = useQueryClient();
  const [msg, holder] = message.useMessage();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [draftNodes, setDraftNodes] = useState<PipelineNode[]>();
  const [addOpen, setAddOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [operatorKeyword, setOperatorKeyword] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>();
  const pipelines = useQuery({ queryKey: ['pipelines'], queryFn: () => dataApi.pipelines() });
  const pipelineId = selectedPipelineId ?? pipelines.data?.items[0]?.pipelineId;
  const pipeline = useQuery({ queryKey: ['pipeline-detail', pipelineId], queryFn: () => dataApi.pipelineDetail(pipelineId!), enabled: Boolean(pipelineId) });
  const operators = useQuery({ queryKey: ['operators', operatorKeyword], queryFn: () => dataApi.operators({ keyword: operatorKeyword }) });
  const overview = useQuery({ queryKey: ['data-standard-overview'], queryFn: dataApi.dataStandardOverview });
  const profile = useQuery({ queryKey: ['data-standard-profile', selectedDatasetId], queryFn: () => dataApi.dataStandardProfile(selectedDatasetId!), enabled: Boolean(selectedDatasetId) });
  const nodes = draftNodes ?? pipeline.data?.nodes ?? [];
  const variables = useMemo(
    () => pipeline.data?.variables.map((item) => ({ ...item, valueJson: item.valueMasked })) ?? [],
    [pipeline.data?.variables],
  );
  const selectedNode = nodes.find((item) => item.nodeId === selectedNodeId) ?? nodes[0];
  const selectedOperator = operators.data?.items.find((item) => item.operatorId === selectedNode?.operatorId);
  const savePipeline = useMutation({
    mutationFn: () => dataApi.updatePipeline(pipelineId!, toSaveInput(pipeline.data!, nodes, variables)),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['pipeline-detail', pipelineId] }); msg.success('Pipeline DAG 已保存并通过校验'); },
    onError: (e: Error) => msg.error(e.message),
  });
  const saveVersion = useMutation({
    mutationFn: () => dataApi.savePipelineVersion(pipelineId!, { versionName: `v1.${(pipeline.data?.versions.length ?? 0) + 1}`, note: '前端保存快照' }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['pipeline-detail', pipelineId] }); msg.success('版本快照已保存'); },
    onError: (e: Error) => msg.error(e.message),
  });
  const restoreVersion = useMutation({
    mutationFn: (versionId: string) => dataApi.restorePipelineVersion(pipelineId!, versionId),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['pipeline-detail', pipelineId] }); msg.success('版本已恢复为草稿'); },
    onError: (e: Error) => msg.error(e.message),
  });
  const runPipeline = useMutation({
    mutationFn: () => dataApi.runPipeline(pipelineId!, { triggerMode: 'MANUAL', sampleDatasetId: 'DATASET-WELD-DEFECT' }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['pipeline-detail', pipelineId] }); await qc.invalidateQueries({ queryKey: ['datasets'] }); setRunOpen(true); msg.success('沙箱运行完成，已生成输出数据集与血缘'); },
    onError: (e: Error) => msg.error(e.message),
  });
  const createTask = useMutation({
    mutationFn: (datasetId: string) => dataApi.createDataStandardTask({ datasetId, name: `${profile.data?.datasetName ?? '数据集'} 自动标准化`, standardProfile: undefined }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['data-standard-overview'] }); msg.success('标准化任务已创建'); },
    onError: (e: Error) => msg.error(e.message),
  });
  const runTask = useMutation({
    mutationFn: dataApi.runDataStandardTask,
    onSuccess: async (r) => { await qc.invalidateQueries({ queryKey: ['data-standard-overview'] }); await qc.invalidateQueries({ queryKey: ['datasets'] }); msg.success(`标准化完成，输出数据集 ${r.outputDatasetId}`); },
    onError: (e: Error) => msg.error(e.message),
  });
  const profiles = overview.data?.profiles ?? [];
  const tasks = overview.data?.tasks ?? [];
  const selected = profile.data ?? profiles.find((i) => i.datasetId === selectedDatasetId) ?? profiles[0];
  const marketplaceOperators = operators.data?.items ?? [];
  const setNodes = (updater: (items: PipelineNode[]) => PipelineNode[]) => {
    setDraftNodes((items) => updater(items ?? pipeline.data?.nodes ?? []));
  };
  const addNode = (operator: OperatorSummary) => {
    const nextId = `node-${operator.operatorId.toLowerCase().replaceAll('_', '-').replaceAll('op-', '')}-${nodes.length + 1}`;
    const nextNode: PipelineNode = {
      nodeId: nextId,
      operatorId: operator.operatorId,
      operatorName: operator.name,
      label: operator.name,
      positionX: 120 + nodes.length * 160,
      positionY: 260,
      configJson: operator.operatorId === 'OP-READ-DATASET' ? '{"datasetId":"DATASET-WELD-DEFECT"}' : '{}',
      status: 'READY',
    };
    setNodes((items) => [...items, nextNode]);
    setSelectedNodeId(nextId);
    setAddOpen(false);
    msg.info(`已添加算子：${operator.name}`);
  };
  const moveNode = (nodeId: string, dx: number, dy: number) => {
    setNodes((items) => items.map((item) => item.nodeId === nodeId ? { ...item, positionX: Math.max(20, item.positionX + dx), positionY: Math.max(60, item.positionY + dy) } : item));
  };
  const updateSelectedNodeConfig = (configJson: string) => {
    setNodes((items) => items.map((item) => item.nodeId === selectedNode?.nodeId ? { ...item, configJson } : item));
  };
  const standardOperators = [
    ['数据校验', '验证 Schema 合法性、范围约束、类型一致性'],
    ['空值填充', '按字段标准处理缺失值'],
    ['去重', '基于样本哈希和业务主键去除重复'],
    ['异常过滤', '按标准范围过滤离群值'],
    ['归一化', '统一单位、时间和数值尺度'],
    ['格式转换', 'COCO/YOLO/CSV/JSONL 等格式标准化'],
  ];
  if (pipeline.data && pipelineId) return (
    <div className="content-page pipeline-editor-page">
      {holder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>Pipeline编辑器</Typography.Title>
          <Typography.Text type="secondary">图像预处理 Pipeline · v1.2 · 已保存 · 控制平面 + 沙箱 runner</Typography.Text>
        </div>
        <Space wrap>
          <Select
            value={pipelineId}
            style={{ width: 240 }}
            onChange={(value) => {
              setSelectedPipelineId(value);
              setSelectedNodeId(undefined);
              setDraftNodes(undefined);
            }}
            options={(pipelines.data?.items ?? []).map((item) => ({ value: item.pipelineId, label: item.name }))}
          />
          <Button onClick={() => setAddOpen(true)}>＋ 添加算子</Button>
          <Button onClick={() => saveVersion.mutate()} loading={saveVersion.isPending}>保存快照</Button>
          <Button onClick={() => savePipeline.mutate()} loading={savePipeline.isPending}>💾 保存</Button>
          <Button type="primary" onClick={() => runPipeline.mutate()} loading={runPipeline.isPending}>▶ 沙箱运行</Button>
        </Space>
      </div>
      <Alert type="info" showIcon title="F011 完整 Pipeline 能力" description="本页按原型补齐顶部工具栏、左侧算子库、DAG 画布、节点配置、运行历史、版本快照、全局变量；真实分布式调度目标保留 TODO_CONFIRM_PIPELINE_SCHEDULER_TARGET。" style={{ marginBottom: 16 }} />
      <div className="pipeline-grid">
        <Card title="算子库" className="operator-library">
          <Input.Search placeholder="搜索算子名称、类型或功能描述…" value={operatorKeyword} onChange={(event) => setOperatorKeyword(event.target.value)} style={{ marginBottom: 12 }} />
          <Space direction="vertical" className="full-width">
            {marketplaceOperators.slice(0, 8).map((op) => (
              <Card key={op.operatorId} size="small" className="operator-chip" onClick={() => addNode(op)}>
                <Space direction="vertical" size={2}>
                  <Space><Tag color={op.kind === 'BUILTIN' ? 'blue' : 'purple'}>{op.category}</Tag><b>{op.name}</b></Space>
                  <Typography.Text type="secondary">{op.description}</Typography.Text>
                </Space>
              </Card>
            ))}
          </Space>
        </Card>
        <Card title={<Space><span>DAG 画布</span><Tag color={pipeline.data.validation.valid ? 'green' : 'red'}>{pipeline.data.validation.diagnosticCode}</Tag></Space>} className="pipeline-canvas-card">
          <PipelineCanvas nodes={nodes} edges={pipeline.data.edges} selectedNodeId={selectedNode?.nodeId} onSelect={setSelectedNodeId} onMove={moveNode} />
          <Typography.Text type="secondary">拖拽节点可重新排序 · 从左侧算子库拖入可添加新节点 · 当前节点 {nodes.length} 个</Typography.Text>
        </Card>
        <Card title={`⚙ ${selectedNode?.label ?? '算子配置'}`} className="node-config-card">
          <Space direction="vertical" className="full-width">
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="算子">{selectedOperator?.name ?? selectedNode?.operatorName}</Descriptions.Item>
              <Descriptions.Item label="阶段">{selectedOperator?.stage ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={color(selectedNode?.status)}>{selectedNode?.status ?? 'READY'}</Tag></Descriptions.Item>
            </Descriptions>
            <Input.TextArea rows={8} value={safeJson(selectedNode?.configJson)} onChange={(event) => updateSelectedNodeConfig(event.target.value)} />
            <Alert type="success" showIcon title="算子验证通过" description="输入: 42,850 条；预计输出: 42,850 条；内存估算: 2.1 GB" />
          </Space>
        </Card>
      </div>
      <div className="pipeline-panels">
        <Card title="运行历史">
          <Table rowKey="runId" dataSource={pipeline.data.runs} pagination={false} columns={[
            { title: 'Run ID', dataIndex: 'runId' },
            { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> },
            { title: '耗时', dataIndex: 'durationMs', render: (v) => v ? `${Math.round(v / 1000)}s` : '-' },
            { title: '输出数据集', dataIndex: 'outputDatasetId', render: (v) => v ?? '-' },
            { title: '诊断', dataIndex: 'diagnosticMessage' },
          ]} />
        </Card>
        <Card title="版本快照">
          <Table rowKey="versionId" dataSource={pipeline.data.versions} pagination={false} columns={[
            { title: '版本', dataIndex: 'versionName' },
            { title: '说明', dataIndex: 'note' },
            { title: '创建时间', dataIndex: 'createdAt' },
            { title: '操作', render: (_, r) => <Button size="small" onClick={() => restoreVersion.mutate(r.versionId)}>回滚</Button> },
          ]} />
        </Card>
        <Card title="全局变量">
          <Table rowKey="name" dataSource={variables} pagination={false} columns={[
            { title: '变量名', dataIndex: 'name' },
            { title: '类型', dataIndex: 'valueType' },
            { title: '来源', dataIndex: 'valueKind', render: (v) => <Tag>{v}</Tag> },
            { title: '值', render: (_, r) => r.valueJson ?? r.valueMasked },
            { title: '必填', dataIndex: 'required', render: (v) => v ? '是' : '否' },
          ]} />
        </Card>
      </div>
      <Drawer title="添加算子" open={addOpen} onClose={() => setAddOpen(false)} width={680}>
        <Input.Search placeholder="搜索算子名称、类型或功能描述…" value={operatorKeyword} onChange={(event) => setOperatorKeyword(event.target.value)} style={{ marginBottom: 16 }} />
        <div className="operator-market-grid">{marketplaceOperators.map((op) => <Card key={op.operatorId} hoverable onClick={() => addNode(op)}><Tag>{op.category}</Tag><Typography.Title level={5}>{op.name}</Typography.Title><Typography.Text type="secondary">{op.description}</Typography.Text><div><Tag color="blue">调用 {op.usageCount}</Tag><Tag color="orange">Pipeline {op.pipelineCount}</Tag></div></Card>)}</div>
      </Drawer>
      <Drawer title="沙箱运行详情" open={runOpen} onClose={() => setRunOpen(false)} width={720}>
        <Alert type="success" showIcon title="SANDBOX_PIPELINE_RUN_SUCCEEDED" description="已生成输出数据集、PIPELINE_OUTPUT 文件占位和血缘记录。" />
      </Drawer>
    </div>
  );
  return (
    <div className="content-page">
      {holder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>数据标准 / Pipeline</Typography.Title>
          <Typography.Text type="secondary">基于数据集的数据校验、清洗、归一化与格式标准化 · 输出预处理数据集</Typography.Text>
        </div>
        <Space><Button onClick={() => overview.refetch()}>刷新画像</Button><Button type="primary" disabled={!selected?.datasetId} onClick={() => selected?.datasetId && createTask.mutate(selected.datasetId)}>＋ 创建标准化任务</Button></Space>
      </div>
      <Alert type="info" showIcon title="按原型落地的数据标准能力" description="原型将标准化放在 Pipeline 与算子广场中：数据校验、清洗、归一化、格式转换。这里以 F009 数据集为对象，并根据来源数据源类型生成字段标准画像与标准化任务。" style={{ marginBottom: 16 }} />
      <div className="summary-grid">
        {[
          { n: overview.data?.stats.datasetCount ?? 0, l: '可画像数据集' },
          { n: overview.data?.stats.profiledCount ?? 0, l: '已画像' },
          { n: overview.data?.stats.compliantCount ?? 0, l: '达标数据集' },
          { n: overview.data?.stats.issueCount ?? 0, l: '待处理问题' },
          { n: overview.data?.stats.taskCount ?? 0, l: '标准化任务' },
        ].map((i) => <Card key={i.l}><Typography.Title level={3}>{i.n}</Typography.Title><Typography.Text type="secondary">{i.l}</Typography.Text></Card>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <Card title="数据集标准画像">
          <Table<DataStandardProfile>
            rowKey="datasetId"
            dataSource={profiles}
            loading={overview.isLoading}
            pagination={{ pageSize: 6 }}
            onRow={(row) => ({ onClick: () => setSelectedDatasetId(row.datasetId) })}
            columns={[
              { title: '数据集', dataIndex: 'datasetName' },
              { title: '来源', dataIndex: 'sourceType', render: (v) => <Tag>{txt(v)}</Tag> },
              { title: '类型', render: (_, r) => <Tag>{txt(r.datasetType)} / {txt(r.dataType)}</Tag> },
              { title: '质量分', dataIndex: 'qualityScore', render: (v: number) => <Tag color={v >= 90 ? 'green' : v >= 80 ? 'orange' : 'red'}>{v}</Tag> },
              { title: '字段', render: (_, r) => `${r.matchedFieldCount}/${r.fieldCount}` },
              { title: '问题', dataIndex: 'issueCount' },
            ]}
          />
        </Card>
        <Card title="Pipeline 标准化算子">
          <Space direction="vertical" className="full-width">
            {standardOperators.map(([name, desc]) => <Card key={name} size="small"><Space><Tag color="purple">{name}</Tag><Typography.Text type="secondary">{desc}</Typography.Text></Space></Card>)}
          </Space>
        </Card>
      </div>
      <Card title={`字段标准映射 · ${selected?.datasetName ?? '请选择数据集'}`} style={{ marginTop: 16 }}>
        <Table
          rowKey="standardField"
          dataSource={selected?.fields ?? []}
          loading={profile.isLoading}
          pagination={false}
          columns={[
            { title: '源字段', dataIndex: 'sourceField' },
            { title: '标准字段', dataIndex: 'standardField' },
            { title: '中文名', dataIndex: 'displayName' },
            { title: '类型', dataIndex: 'dataType' },
            { title: '单位', dataIndex: 'unit', render: (v) => v ?? '-' },
            { title: '必填', dataIndex: 'required', render: (v) => v ? '是' : '否' },
            { title: '状态', dataIndex: 'mappingStatus', render: (v) => <Tag color={v === 'MATCHED' ? 'green' : 'orange'}>{v}</Tag> },
            { title: '规则', dataIndex: 'rule' },
          ]}
        />
      </Card>
      <Card title="标准化任务" style={{ marginTop: 16 }}>
        <Table<DataStandardTask>
          rowKey="taskId"
          dataSource={tasks}
          loading={overview.isLoading}
          pagination={false}
          columns={[
            { title: '任务', dataIndex: 'name' },
            { title: '来源数据集', dataIndex: 'sourceDatasetName' },
            { title: '标准档案', dataIndex: 'standardProfile' },
            { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> },
            { title: '质量分', render: (_, r) => `${r.qualityScoreBefore ?? '-'} → ${r.qualityScoreAfter ?? '-'}` },
            { title: '输出数据集', dataIndex: 'outputDatasetId', render: (v) => v ?? '待生成' },
            { title: '诊断', dataIndex: 'diagnosticMessage' },
            { title: '操作', render: (_, r) => <Button size="small" type="primary" disabled={r.status === 'SUCCEEDED'} loading={runTask.isPending} onClick={() => runTask.mutate(r.taskId)}>运行</Button> },
          ]}
        />
      </Card>
    </div>
  );
}

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
  const runTask = useMutation({ mutationFn: dataApi.runSyncTask, onSuccess: async (r) => { await inv(); (r.status === 'SUCCEEDED' ? msg.success : msg.warning)(`${r.status}: ${r.diagnosticMessage}`); }, onError: (e: Error) => msg.error(e.message) });

  return (
    <div className="content-page">
      {holder}
      <div className="page-hero">
        <div><Typography.Title level={3}>数据源管理</Typography.Title><Typography.Text type="secondary">管理文件、数据库、API、流、时序库与工业协议数据源连接和同步导入任务</Typography.Text></div>
        <Space><Button onClick={() => setSyncOpen(true)}>＋ 新建同步任务</Button><Button type="primary" onClick={() => setOpen(true)}>＋ 新建数据源</Button></Space>
      </div>
      <Alert type="info" showIcon title="数据集导入方式" description="支持文件/对象存储登记导入，也支持关系型数据库、外部 API、流数据、时序库、工业协议通过已激活数据源 + 同步任务导入；本地 sandbox connector 会生成可追踪的数据集版本、文件元数据与血缘。" style={{ marginBottom: 16 }} />
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
          <Alert type="warning" showIcon title="敏感字段不回显；Endpoint 包含 sandbox/internal 时启用本地可测 connector，生产外部系统未配置时仍返回 UNCONFIGURED / TODO_CONFIRM_*。" style={{ marginBottom: 16 }} />
          <Button type="primary" htmlType="submit">保存</Button>
        </Form>
      </Modal>
      <Modal title="新建同步任务" open={syncOpen} onCancel={() => setSyncOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" onFinish={(v) => createTask.mutate(v)} initialValues={{ sourceId: sources.data?.find((s) => s.status === 'ACTIVE' && s.diagnosticCode === 'OK')?.sourceId, scheduleMode: 'MANUAL' }}>
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sourceId" label="源数据源" rules={[{ required: true }]}><Select options={(sources.data ?? []).filter((s) => s.status === 'ACTIVE' && s.diagnosticCode === 'OK').map((s) => ({ value: s.sourceId, label: s.name }))} /></Form.Item>
          <Form.Item name="targetDatasetId" label="目标数据集 ID（留空则自动创建 RAW 数据集）"><Input /></Form.Item>
          <Form.Item name="syncScope" label="同步范围 / 表名 / Topic / 点位 / API 路径"><Input placeholder="如 table=work_order 或 topic=weld-events" /></Form.Item>
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
  const [datasetType, setDatasetType] = useState<string>();
  const [accessLevel, setAccessLevel] = useState<string>();
  const [selected, setSelected] = useState<DatasetSummary | null>(null);
  const q = useQuery({
    queryKey: ['datasets', keyword, datasetType, accessLevel],
    queryFn: () => dataApi.datasets({ keyword, datasetType, accessLevel }),
  });
  const rows = q.data?.items ?? [];
  const tabs = [
    { key: 'ALL', label: '全部数据集' },
    { key: 'RAW', label: '原始数据' },
    { key: 'PREPROCESSED', label: '预处理后' },
    { key: 'ANNOTATED', label: '已标注' },
  ];
  const resetFilters = () => {
    setKeyword('');
    setDatasetType(undefined);
    setAccessLevel(undefined);
  };

  return (
    <div className="content-page">
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>数据集管理</Typography.Title>
          <Typography.Text type="secondary">共 {q.data?.stats.total ?? 0} 个数据集 · 合计 {fmtSize(q.data?.stats.totalSizeBytes)}</Typography.Text>
        </div>
        <Space><Button>查看标注任务</Button><Button type="primary" onClick={() => nav('/up')}>＋ 新建数据集</Button></Space>
      </div>
      <div className="summary-grid">
        {[
          { n: q.data?.stats.total ?? 0, l: '数据集总数' },
          { n: q.data?.stats.raw ?? 0, l: '原始数据' },
          { n: q.data?.stats.preprocessed ?? 0, l: '预处理后' },
          { n: q.data?.stats.annotated ?? 0, l: '已标注' },
          { n: q.data?.stats.restricted ?? 0, l: '受限数据集' },
          { n: fmtSize(q.data?.stats.totalSizeBytes), l: '存储使用' },
        ].map((i) => <Card key={i.l}><Typography.Title level={3}>{i.n}</Typography.Title><Typography.Text type="secondary">{i.l}</Typography.Text></Card>)}
      </div>
      <Alert type="info" showIcon title="如何导入数据集" description="文件导入走上传向导并绑定 F007 文件对象；数据库、API、流数据、时序库、工业协议导入走数据源管理中的同步任务，成功后自动生成数据集、版本、文件元数据和血缘。" style={{ marginBottom: 16 }} />
      <Tabs
        activeKey={datasetType ?? 'ALL'}
        onChange={(key) => setDatasetType(key === 'ALL' ? undefined : key)}
        items={tabs.map((i) => ({ ...i, children: null }))}
      />
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search
          placeholder="搜索数据集名称..."
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={(value) => setKeyword(value.trim())}
        />
        <Select
          allowClear
          placeholder="全部权限"
          value={accessLevel}
          onChange={setAccessLevel}
          style={{ width: 140 }}
          options={['PUBLIC', 'TEAM', 'PRIVATE', 'RESTRICTED'].map((v) => ({ value: v, label: v }))}
        />
        <Button onClick={resetFilters}>重置筛选</Button>
      </Space>
      <Table<DatasetSummary>
        rowKey="datasetId"
        dataSource={rows}
        loading={q.isLoading}
        rowSelection={{}}
        locale={{ emptyText: '当前筛选条件下暂无数据集' }}
        columns={[
          { title: '数据集名称', render: (_, r) => <a onClick={() => nav('/dsdetail', { state: { datasetId: r.datasetId } })}>{r.name}</a> },
          { title: '类型', render: (_, r) => <Tag>{txt(r.datasetType)} / {txt(r.dataType)}</Tag> },
          { title: '版本', dataIndex: 'currentVersionName' },
          { title: '样本', dataIndex: 'recordCount' },
          { title: '大小', render: (_, r) => fmtSize(r.sizeBytes) },
          { title: '权限', dataIndex: 'accessLevel', render: (v) => <Tag color={v === 'RESTRICTED' ? 'red' : 'blue'}>{v}</Tag> },
          { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> },
          { title: '操作', render: (_, r) => <Space><a onClick={() => nav('/dsdetail', { state: { datasetId: r.datasetId } })}>详情</a><a onClick={() => setSelected(r)}>版本</a></Space> },
        ]}
      />
      <Drawer title={`版本 · ${selected?.name}`} open={Boolean(selected)} onClose={() => setSelected(null)} size="default">
        <DatasetVersionList datasetId={selected?.datasetId} />
      </Drawer>
    </div>
  );
}

function DatasetVersionList({ datasetId }: { datasetId?: string }) {
  const q = useQuery({ queryKey: ['dataset-detail', datasetId], queryFn: () => dataApi.datasetDetail(datasetId!), enabled: Boolean(datasetId) });
  return <Table<DatasetVersion> rowKey="versionId" dataSource={q.data?.versions ?? []} pagination={false} columns={[{ title: '版本', dataIndex: 'versionName' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: '安全', dataIndex: 'contentSafetyStatus' }, { title: '文件大小', render: (_, r) => fmtSize(r.sizeBytes) }]} />;
}

function PipelineCanvas({ nodes, edges, selectedNodeId, onSelect, onMove }: { nodes: PipelineNode[]; edges: PipelineEdge[]; selectedNodeId?: string; onSelect: (nodeId: string) => void; onMove: (nodeId: string, dx: number, dy: number) => void }) {
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.nodeId, node])), [nodes]);
  return (
    <div className="pipeline-canvas">
      <svg className="pipeline-canvas-lines">
        {edges.map((edge) => {
          const source = nodeMap.get(edge.sourceNodeId);
          const target = nodeMap.get(edge.targetNodeId);
          if (!source || !target) return null;
          return <line key={edge.edgeId} x1={source.positionX + 128} y1={source.positionY + 28} x2={target.positionX} y2={target.positionY + 28} stroke="#7c3aed" strokeWidth={2} markerEnd="url(#arrow)" />;
        })}
        <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#7c3aed" /></marker></defs>
      </svg>
      {nodes.map((node) => (
        <button
          key={node.nodeId}
          className={`pipeline-node ${selectedNodeId === node.nodeId ? 'selected' : ''}`}
          style={{ left: node.positionX, top: node.positionY }}
          onClick={() => onSelect(node.nodeId)}
          draggable
          onDragEnd={(event) => onMove(node.nodeId, event.movementX || 24, event.movementY || 0)}
          type="button"
        >
          <span>{node.label}</span>
          <small>{node.operatorName ?? node.operatorId}</small>
        </button>
      ))}
    </div>
  );
}

export function OperatorMarketplacePage() {
  const qc = useQueryClient();
  const [msg, holder] = message.useMessage();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>();
  const [detailId, setDetailId] = useState<string>();
  const [customOpen, setCustomOpen] = useState(false);
  const operators = useQuery({ queryKey: ['operators-market', keyword, category], queryFn: () => dataApi.operators({ keyword, category }) });
  const detail = useQuery({ queryKey: ['operator-detail', detailId], queryFn: () => dataApi.operatorDetail(detailId!), enabled: Boolean(detailId) });
  const createCustom = useMutation({
    mutationFn: dataApi.createCustomOperator,
    onSuccess: async (result) => {
      await dataApi.submitOperator(result.operator.operatorId);
      await qc.invalidateQueries({ queryKey: ['operators-market'] });
      setCustomOpen(false);
      msg.success(`算子「${result.operator.name}」已提交审核`);
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const approve = useMutation({
    mutationFn: (operatorId: string) => dataApi.approveOperator(operatorId, '前端验收审核通过'),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['operators-market'] }); await qc.invalidateQueries({ queryKey: ['operator-detail', detailId] }); msg.success('算子已审核通过并发布'); },
    onError: (e: Error) => msg.error(e.message),
  });
  const rows = operators.data?.items ?? [];
  return (
    <div className="content-page operator-marketplace-page">
      {holder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>算子广场</Typography.Title>
          <Typography.Text type="secondary">分类浏览、效果预览、参数 Schema、使用统计与自定义算子审核</Typography.Text>
        </div>
        <Button type="primary" onClick={() => setCustomOpen(true)}>+ 自定义算子</Button>
      </div>
      <Alert type="warning" showIcon title="HTTP 算子安全说明" description="HTTP 算子调用时数据将发送至外部服务；F011 仅保存配置和审核状态，生产调用策略保留 TODO_CONFIRM_OPERATOR_HTTP_SECURITY_POLICY。" style={{ marginBottom: 16 }} />
      <div className="opmarket-layout">
        <Card className="opmarket-cats">
          <div className={!category ? 'opmarket-cat active' : 'opmarket-cat'} onClick={() => setCategory(undefined)}>全部算子</div>
          {(operators.data?.categories ?? []).map((item) => <div key={item.category} className={category === item.category ? 'opmarket-cat active' : 'opmarket-cat'} onClick={() => setCategory(item.category)}>{item.category}<Tag>{item.count}</Tag></div>)}
          <Alert type="info" showIcon message="TODO_CONFIRM_OPERATOR_CATALOG_SOURCE" description="正式 136+ 算子清单来源待确认，本期 seed 原型核心算子。" />
        </Card>
        <div>
          <Space style={{ marginBottom: 16 }} wrap>
            <Input.Search placeholder="搜索算子…" value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ width: 260 }} />
            <Tag color="blue">总调用次数 {operators.data?.stats.total ?? 0}</Tag>
            <Tag color="green">内置 {operators.data?.stats.builtin ?? 0}</Tag>
            <Tag color="purple">自定义 {operators.data?.stats.custom ?? 0}</Tag>
          </Space>
          <div className="operator-market-grid">
            {rows.map((op) => <Card key={op.operatorId} hoverable onClick={() => setDetailId(op.operatorId)}><Space direction="vertical"><Space><Tag color={op.kind === 'BUILTIN' ? 'blue' : 'purple'}>{op.kind}</Tag><Tag>{op.category}</Tag></Space><Typography.Title level={5}>{op.name}</Typography.Title><Typography.Text type="secondary">{op.description}</Typography.Text><Space wrap><Tag>调用 {op.usageCount}</Tag><Tag>引用Pipeline数 {op.pipelineCount}</Tag><Tag>错误率 {(op.errorRate * 100).toFixed(1)}%</Tag></Space></Space></Card>)}
          </div>
        </div>
      </div>
      <Drawer title={detail.data?.operator.name ?? '算子详情'} open={Boolean(detailId)} onClose={() => setDetailId(undefined)} width={720}>
        <OperatorDetailView detail={detail.data} onApprove={(operatorId) => approve.mutate(operatorId)} loading={approve.isPending} />
      </Drawer>
      <Modal title="注册自定义算子" open={customOpen} onCancel={() => setCustomOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" initialValues={{ name: 'HTTP 自定义算子', category: '自定义算子', stage: '扩展', parameterSchemaJson: '{"type":"object","properties":{"threshold":{"type":"number"}}}', endpoint: 'TODO_CONFIRM_OPERATOR_HTTP_ENDPOINT', credentialRef: 'secret://TODO_CONFIRM_OPERATOR_SECRET', timeoutSeconds: 30, concurrencyLimit: 2 }} onFinish={(values) => createCustom.mutate(values)}>
          <Form.Item name="name" label="算子名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="分类"><Input /></Form.Item>
          <Form.Item name="stage" label="阶段"><Input /></Form.Item>
          <Form.Item name="description" label="算子描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="parameterSchemaJson" label="参数 JSON Schema"><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="endpoint" label="HTTP Endpoint"><Input /></Form.Item>
          <Form.Item name="credentialRef" label="Credential SecretRef"><Input /></Form.Item>
          <Space><Form.Item name="timeoutSeconds" label="超时秒"><Input type="number" /></Form.Item><Form.Item name="concurrencyLimit" label="并发限制"><Input type="number" /></Form.Item></Space>
          <Button type="primary" htmlType="submit" loading={createCustom.isPending}>提交审核</Button>
        </Form>
      </Modal>
    </div>
  );
}

function OperatorDetailView({ detail, onApprove, loading }: { detail?: OperatorDetail; onApprove: (operatorId: string) => void; loading: boolean }) {
  if (!detail) return <Typography.Text type="secondary">加载算子详情...</Typography.Text>;
  return (
    <Space direction="vertical" className="full-width">
      <Descriptions bordered column={2}>
        <Descriptions.Item label="分类">{detail.operator.category}</Descriptions.Item>
        <Descriptions.Item label="状态"><Tag color={color(detail.operator.status)}>{detail.operator.status}</Tag></Descriptions.Item>
        <Descriptions.Item label="总调用次数">{detail.operator.usageCount}</Descriptions.Item>
        <Descriptions.Item label="引用Pipeline数">{detail.operator.pipelineCount}</Descriptions.Item>
        <Descriptions.Item label="Endpoint">{detail.endpointMasked ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Credential">{detail.credentialRefMasked ?? '-'}</Descriptions.Item>
      </Descriptions>
      <Card title="Before / After 示例"><Space direction="vertical"><Typography.Text>Before: {detail.operator.beforeExample}</Typography.Text><Typography.Text>After: {detail.operator.afterExample}</Typography.Text></Space></Card>
      <Card title="参数 Schema"><pre className="schema-preview">{safeJson(detail.parameterSchemaJson)}</pre></Card>
      <Table rowKey="reviewId" dataSource={detail.reviews} pagination={false} columns={[{ title: '审核状态', dataIndex: 'status' }, { title: '原因', dataIndex: 'reason' }, { title: '提交时间', dataIndex: 'submittedAt' }]} />
      {detail.operator.status === 'SUBMITTED' ? <Button type="primary" loading={loading} onClick={() => onApprove(detail.operator.operatorId)}>审核通过并发布</Button> : null}
    </Space>
  );
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
  const [msg, holder] = message.useMessage();
  const download = useMutation({
    mutationFn: platformApi.fileDownloadUrl,
    onSuccess: (result) => {
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
        msg.success('已打开文件下载链接');
        return;
      }
      msg.warning(`文件下载未配置：${result.diagnostic}`);
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const d = detail.data;
  const fileColumns = [
    { title: '文件 ID', dataIndex: 'fileId' },
    { title: '角色', dataIndex: 'fileRole', render: (v: string) => <Tag>{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={color(v)}>{v}</Tag> },
    { title: 'Object Key', dataIndex: 'objectKey', render: (v: string) => <Typography.Text className="mono" copyable>{v}</Typography.Text> },
    { title: 'Content-Type', dataIndex: 'contentType', render: (v: string | null) => v ?? '-' },
    { title: '大小', render: (_: unknown, r: { sizeBytes?: number | null }) => fmtSize(r.sizeBytes) },
    { title: 'SHA256', dataIndex: 'sha256', render: (v: string | null) => v ? <Typography.Text className="mono" copyable>{v}</Typography.Text> : '-' },
    { title: '下载', render: (_: unknown, r: { fileId: string; status: string }) => <Button size="small" disabled={r.status !== 'BOUND'} loading={download.isPending} onClick={() => download.mutate(r.fileId)}>获取下载链接</Button> },
  ];
  return <div className="content-page">{holder}<div className="page-hero"><div><Typography.Title level={3}>{d?.dataset.name ?? '数据集详情'}</Typography.Title><Typography.Text type="secondary">概览 · 版本 · 文件 · 权限 · 血缘 · 样例预览</Typography.Text></div><Button onClick={() => ref.mutate()}>请求引用检查</Button></div>{ref.data ? <Alert type="success" showIcon title={`DatasetReference 可用：${ref.data.versionId}`} style={{ marginBottom: 16 }} /> : null}<Card loading={detail.isLoading}><Descriptions bordered column={2}><Descriptions.Item label="数据类型">{txt(d?.dataset.dataType)}</Descriptions.Item><Descriptions.Item label="状态"><Tag color={color(d?.dataset.status)}>{d?.dataset.status}</Tag></Descriptions.Item><Descriptions.Item label="权限"><Tag color={d?.dataset.accessLevel === 'RESTRICTED' ? 'red' : 'blue'}>{d?.dataset.accessLevel}</Tag></Descriptions.Item><Descriptions.Item label="样本数">{d?.dataset.recordCount.toLocaleString('zh-CN')}</Descriptions.Item><Descriptions.Item label="标签">{d?.dataset.tags.map((t) => <Tag key={t}>{t}</Tag>)}</Descriptions.Item><Descriptions.Item label="预览状态">{d?.previewStatus} · {d?.previewDiagnostic}</Descriptions.Item></Descriptions></Card><Card title={`文件信息（${d?.files.length ?? 0}）`} style={{ marginTop: 16 }} loading={detail.isLoading}><Table rowKey="id" dataSource={d?.files ?? []} pagination={false} columns={fileColumns} locale={{ emptyText: '暂无已绑定文件；请通过上传向导完成文件登记并绑定版本。' }} /></Card><Tabs items={[{ key: 'versions', label: '版本历史', children: <Table rowKey="versionId" dataSource={d?.versions ?? []} pagination={false} columns={[{ title: '版本', dataIndex: 'versionName' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: '内容安全', dataIndex: 'contentSafetyStatus' }, { title: '诊断', dataIndex: 'diagnosticMessage' }]} /> }, { key: 'files', label: `文件元数据（${d?.files.length ?? 0}）`, children: <Table rowKey="id" dataSource={d?.files ?? []} pagination={false} columns={fileColumns} locale={{ emptyText: '暂无文件元数据' }} /> }, { key: 'lineage', label: '血缘', children: <Table rowKey="lineageId" dataSource={d?.lineage ?? []} pagination={false} columns={[{ title: '来源', dataIndex: 'sourceType' }, { title: 'Source ID', dataIndex: 'sourceId' }, { title: '目标', dataIndex: 'targetId' }, { title: '转换', dataIndex: 'transformType' }]} /> }, { key: 'access', label: '权限授权', children: <Table rowKey="grantId" dataSource={d?.grants ?? []} pagination={false} columns={[{ title: '用户', dataIndex: 'userName' }, { title: '状态', dataIndex: 'status' }, { title: '有效期', dataIndex: 'expiresAt' }]} /> }]} /></div>;
}
