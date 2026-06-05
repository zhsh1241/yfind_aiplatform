import { DownloadOutlined, EyeOutlined, ExperimentOutlined, FileSearchOutlined, ImportOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Descriptions, Drawer, Empty, Form, Input, Modal, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import {
  platformApi,
  type ModelEvaluationArtifact,
  type ModelEvaluationCompare,
  type ModelEvaluationDetail,
  type ModelEvaluationRun,
} from '../platform/platformApi';

const STATUS_OPTIONS = [
  { value: 'READY', label: 'READY' },
  { value: 'PASSED', label: 'PASSED' },
  { value: 'FAILED', label: 'FAILED' },
];

const STATUS_COLOR: Record<string, string> = {
  READY: 'blue',
  RUNNING: 'processing',
  PASSED: 'green',
  FAILED: 'red',
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN');
}

function formatMetricValue(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '-';
  return Number.isInteger(value) ? String(value) : value.toFixed(value < 1 ? 4 : 2);
}

function parseJsonObject(value: string, fieldName: string) {
  try {
    const parsed = JSON.parse(value || '{}');
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('not object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`${fieldName} 必须是 JSON 对象`);
  }
}

function parseJsonArray(value: string | undefined, fieldName: string) {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) throw new Error('not array');
    return parsed as unknown[];
  } catch {
    throw new Error(`${fieldName} 必须是 JSON 数组`);
  }
}

function jsonPreview(value: unknown) {
  if (value == null) return '暂无数据';
  if (Array.isArray(value) && value.length === 0) return '暂无数据';
  if (typeof value === 'object' && Object.keys(value as Record<string, unknown>).length === 0) return '暂无数据';
  return JSON.stringify(value, null, 2);
}

function pickVersionIds(run?: ModelEvaluationRun, detail?: ModelEvaluationDetail) {
  const ids = [run?.versionId, detail?.run.versionId].filter(Boolean) as string[];
  return Array.from(new Set(ids));
}

export function ModelEvaluationPage() {
  const queryClient = useQueryClient();
  const [messageApi, messageContext] = message.useMessage();
  const [modalApi, modalContext] = Modal.useModal();
  const [filters, setFilters] = useState({ keyword: '', status: undefined as string | undefined, page: 1, pageSize: 20 });
  const [selectedRunId, setSelectedRunId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [compareVersionIds, setCompareVersionIds] = useState<string[]>([]);
  const [createForm] = Form.useForm();
  const [importForm] = Form.useForm();

  const listQuery = useQuery({
    queryKey: ['model-evaluations', filters],
    queryFn: () => platformApi.modelEvaluations(filters),
  });

  const selectedRun = useMemo(
    () => listQuery.data?.items.find((item) => item.evaluationRunId === selectedRunId),
    [listQuery.data?.items, selectedRunId],
  );

  const detailQuery = useQuery({
    queryKey: ['model-evaluation-detail', selectedRunId],
    enabled: Boolean(selectedRunId),
    queryFn: () => platformApi.modelEvaluationDetail(selectedRunId!),
  });

  const compareQuery = useQuery({
    queryKey: ['model-evaluation-compare', selectedRun?.modelId, compareVersionIds.join('|')],
    enabled: Boolean(selectedRun?.modelId) && compareVersionIds.length >= 2,
    queryFn: () => platformApi.compareModelEvaluations(selectedRun!.modelId, compareVersionIds),
  });

  const createMutation = useMutation({
    mutationFn: (values: { modelId: string; versionId: string; datasetVersionId: string; taskType?: string; thresholdConfig: string; metricConfig?: string; executorType?: string; notes?: string }) => platformApi.createModelEvaluation({
      modelId: values.modelId,
      versionId: values.versionId,
      datasetVersionId: values.datasetVersionId,
      taskType: values.taskType || 'OBJECT_DETECTION',
      thresholdConfig: parseJsonObject(values.thresholdConfig, '通过阈值'),
      metricConfig: parseJsonObject(values.metricConfig || '{}', '指标配置'),
      executorType: values.executorType || 'IMPORTED',
      notes: values.notes,
    }),
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({ queryKey: ['model-evaluations'] });
      setSelectedRunId(run.evaluationRunId);
      setCreateOpen(false);
      createForm.resetFields();
      messageApi.success('评估任务已创建');
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : '创建评估失败'),
  });

  const importMutation = useMutation({
    mutationFn: (values: { metricResults: string; reportSummary?: string; curveData?: string; confusionMatrix?: string; errorCases?: string; artifacts?: string; externalRunId?: string }) => platformApi.importModelEvaluationResults(selectedRunId!, {
      metricResults: parseJsonObject(values.metricResults, '指标结果'),
      reportSummary: values.reportSummary,
      curveData: parseJsonObject(values.curveData || '{}', '曲线数据'),
      confusionMatrix: parseJsonObject(values.confusionMatrix || '{}', '混淆矩阵'),
      errorCases: parseJsonArray(values.errorCases, '错误样例'),
      artifacts: parseJsonArray(values.artifacts, '报告 artifact') as Array<{ artifactType: string; fileObjectId?: string | null; name: string }>,
      externalRunId: values.externalRunId,
    }),
    onSuccess: async (detail) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['model-evaluations'] }),
        queryClient.invalidateQueries({ queryKey: ['model-evaluation-detail', selectedRunId] }),
      ]);
      setImportOpen(false);
      importForm.resetFields();
      messageApi.success(`评估结果已导入，状态 ${detail.run.status}`);
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : '导入评估结果失败'),
  });

  const downloadMutation = useMutation({
    mutationFn: (artifact: ModelEvaluationArtifact) => platformApi.modelEvaluationArtifactDownloadUrl(artifact.evaluationRunId, artifact.artifactId),
    onSuccess: (result) => {
      messageApi.success(`报告 artifact 下载地址已生成，有效期 ${result.expiresInSeconds} 秒`);
      modalApi.info({ title: '报告 artifact 下载地址', content: <Typography.Paragraph copyable>{result.downloadUrl}</Typography.Paragraph> });
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : '生成下载地址失败'),
  });

  const passedCount = listQuery.data?.items.filter((item) => item.status === 'PASSED').length ?? 0;
  const failedCount = listQuery.data?.items.filter((item) => item.status === 'FAILED').length ?? 0;
  const readyCount = listQuery.data?.items.filter((item) => item.status === 'READY').length ?? 0;

  const columns: ColumnsType<ModelEvaluationRun> = [
    {
      title: '模型 / 版本',
      dataIndex: 'modelName',
      render: (_value, record) => (
        <Space direction="vertical" size={0}>
          <Button type="link" className="link-button-inline" onClick={() => setSelectedRunId(record.evaluationRunId)}>{record.modelName}</Button>
          <Typography.Text type="secondary">{record.versionNo} · {record.modelId}</Typography.Text>
        </Space>
      ),
    },
    { title: '验证数据集', dataIndex: 'datasetName', render: (_value, record) => <span>{record.datasetName} / {record.datasetVersionName}</span> },
    { title: '任务类型', dataIndex: 'taskType' },
    { title: '状态', dataIndex: 'status', render: (status: string) => <Tag color={STATUS_COLOR[status] ?? 'default'}>{status}</Tag> },
    { title: '阈值', dataIndex: 'thresholdConfig', render: (value: Record<string, unknown>) => <Typography.Text>{Object.entries(value ?? {}).map(([key, item]) => `${key}≥${item}`).join('，') || '-'}</Typography.Text> },
    { title: '更新时间', dataIndex: 'updatedAt', render: formatDateTime },
    { title: '操作', render: (_value, record) => <Button icon={<EyeOutlined />} onClick={() => setSelectedRunId(record.evaluationRunId)}>详情</Button> },
  ];

  return (
    <div className="content-page model-evaluation-page">
      {messageContext}
      {modalContext}
      <Card className="page-card">
        <div className="page-hero">
          <div>
            <Typography.Title level={3}>模型评估</Typography.Title>
            <Typography.Paragraph type="secondary">
              TASK-model-evaluation-readiness：以真实 API 管理评估结果、报告 artifact 与 Production 发布门禁证据。
            </Typography.Paragraph>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void listQuery.refetch()}>刷新</Button>
            <Button type="primary" icon={<ExperimentOutlined />} onClick={() => setCreateOpen(true)}>创建评估</Button>
          </Space>
        </div>
        <div className="model-summary-grid">
          <Card className="model-summary-card model-summary-card-blue"><Statistic title="评估任务" value={listQuery.data?.total ?? 0} /></Card>
          <Card className="model-summary-card model-summary-card-green"><Statistic title="PASSED" value={passedCount} /></Card>
          <Card className="model-summary-card model-summary-card-gold"><Statistic title="READY" value={readyCount} /></Card>
          <Card className="model-summary-card model-summary-card-purple"><Statistic title="FAILED" value={failedCount} /></Card>
        </div>
      </Card>

      <Card className="page-card model-catalog-card">
        <Space className="model-filter-toolbar" wrap>
          <Input.Search
            allowClear
            placeholder="搜索模型、版本或评估 ID"
            value={filters.keyword}
            onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value, page: 1 }))}
            onSearch={(keyword) => setFilters((prev) => ({ ...prev, keyword, page: 1 }))}
            style={{ width: 280 }}
          />
          <Select allowClear placeholder="状态" options={STATUS_OPTIONS} value={filters.status} onChange={(status) => setFilters((prev) => ({ ...prev, status, page: 1 }))} style={{ width: 180 }} />
        </Space>
        <Table
          rowKey="evaluationRunId"
          columns={columns}
          dataSource={listQuery.data?.items ?? []}
          loading={listQuery.isLoading}
          locale={{ emptyText: <Empty description="暂无模型评估记录，请创建评估或导入评估结果。" /> }}
          pagination={{
            current: filters.page,
            pageSize: filters.pageSize,
            total: listQuery.data?.total ?? 0,
            onChange: (page, pageSize) => setFilters((prev) => ({ ...prev, page, pageSize })),
          }}
        />
      </Card>

      <Drawer
        title="评估详情"
        width={920}
        open={Boolean(selectedRunId)}
        onClose={() => { setSelectedRunId(undefined); setCompareVersionIds([]); }}
        extra={<Button icon={<ImportOutlined />} type="primary" disabled={!selectedRunId || detailQuery.data?.run.status !== 'READY'} onClick={() => setImportOpen(true)}>导入结果</Button>}
      >
        {detailQuery.isError ? <Alert type="error" showIcon message="评估详情加载失败" description="跨 BU 无授权用户不可查看评估报告或 artifact。" /> : null}
        {detailQuery.isLoading ? <Card loading /> : detailQuery.data ? <EvaluationDetail detail={detailQuery.data} onDownload={(artifact) => downloadMutation.mutate(artifact)} /> : null}
        <Card size="small" title="版本指标对比" extra={<FileSearchOutlined />} className="page-card">
          <Space direction="vertical" className="full-width">
            <Select
              mode="tags"
              className="full-width"
              placeholder="输入至少 2 个 versionId 后回车对比"
              value={compareVersionIds.length ? compareVersionIds : pickVersionIds(selectedRun, detailQuery.data)}
              onChange={setCompareVersionIds}
            />
            <CompareTable compare={compareQuery.data} loading={compareQuery.isFetching} />
          </Space>
        </Card>
      </Drawer>

      <Modal title="创建评估" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()} confirmLoading={createMutation.isPending} destroyOnHidden>
        <Form form={createForm} layout="vertical" onFinish={(values) => createMutation.mutate(values)} initialValues={{ taskType: 'OBJECT_DETECTION', executorType: 'IMPORTED', thresholdConfig: '{"mAP50":0.9}', metricConfig: '{}' }}>
          <Form.Item name="modelId" label="模型 ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="versionId" label="版本 ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="datasetVersionId" label="验证数据集版本 ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="taskType" label="任务类型"><Input /></Form.Item>
          <Form.Item name="thresholdConfig" label="通过阈值 JSON" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="metricConfig" label="指标配置 JSON"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="notes" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="导入评估结果" open={importOpen} onCancel={() => setImportOpen(false)} onOk={() => importForm.submit()} confirmLoading={importMutation.isPending} destroyOnHidden>
        <Form form={importForm} layout="vertical" onFinish={(values) => importMutation.mutate(values)} initialValues={{ metricResults: '{"mAP50":0.92}', curveData: '{"pr":[[0,1],[1,0.88]]}', confusionMatrix: '{"labels":["OK","NG"],"matrix":[[98,2],[4,96]]}', errorCases: '[{"sampleId":"IMG-001","reason":"反光误检"}]', artifacts: '[]' }}>
          <Form.Item name="metricResults" label="指标结果 JSON" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="reportSummary" label="报告摘要"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="curveData" label="曲线数据 JSON"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="confusionMatrix" label="混淆矩阵 JSON"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="errorCases" label="错误样例 JSON 数组"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="artifacts" label="报告 artifact JSON 数组"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="externalRunId" label="外部运行 ID"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function EvaluationDetail({ detail, onDownload }: { detail: ModelEvaluationDetail; onDownload: (artifact: ModelEvaluationArtifact) => void }) {
  return (
    <Space direction="vertical" className="full-width" size={16}>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="评估 ID">{detail.run.evaluationRunId}</Descriptions.Item>
        <Descriptions.Item label="状态"><Tag color={STATUS_COLOR[detail.run.status] ?? 'default'}>{detail.run.status}</Tag></Descriptions.Item>
        <Descriptions.Item label="模型版本">{detail.run.modelName} / {detail.run.versionNo}</Descriptions.Item>
        <Descriptions.Item label="验证数据集">{detail.run.datasetName} / {detail.run.datasetVersionName}</Descriptions.Item>
        <Descriptions.Item label="执行器">{detail.run.executorType}</Descriptions.Item>
        <Descriptions.Item label="完成时间">{formatDateTime(detail.run.completedAt)}</Descriptions.Item>
        <Descriptions.Item label="报告摘要" span={2}>{detail.run.reportSummary || '-'}</Descriptions.Item>
      </Descriptions>
      <Card size="small" title="指标快照">
        <Table
          rowKey="metricId"
          size="small"
          pagination={false}
          dataSource={detail.metrics}
          columns={[
            { title: '指标', dataIndex: 'metricName' },
            { title: '结果', dataIndex: 'metricValue', render: formatMetricValue },
            { title: '阈值', dataIndex: 'thresholdValue', render: formatMetricValue },
            { title: '结论', dataIndex: 'passed', render: (passed: boolean) => <Tag color={passed ? 'green' : 'red'}>{passed ? '通过' : '未通过'}</Tag> },
          ]}
        />
      </Card>
      <Card size="small" title="PR 曲线数据">
        <Typography.Paragraph>
          <pre>{jsonPreview(detail.curveData)}</pre>
        </Typography.Paragraph>
      </Card>
      <Card size="small" title="混淆矩阵">
        <Typography.Paragraph>
          <pre>{jsonPreview(detail.confusionMatrix)}</pre>
        </Typography.Paragraph>
      </Card>
      <Card size="small" title="错误样例摘要">
        <Typography.Paragraph>
          <pre>{jsonPreview(detail.errorCases)}</pre>
        </Typography.Paragraph>
      </Card>
      <Card size="small" title="报告 artifact">
        <Table
          rowKey="artifactId"
          size="small"
          pagination={false}
          dataSource={detail.artifacts}
          locale={{ emptyText: <Empty description="暂无报告 artifact" /> }}
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: '类型', dataIndex: 'artifactType' },
            { title: '下载策略', dataIndex: 'downloadPolicy' },
            { title: '操作', render: (_value, artifact) => <Button icon={<DownloadOutlined />} onClick={() => onDownload(artifact)}>下载地址</Button> },
          ]}
        />
      </Card>
      <Alert type="info" showIcon message="发布门禁" description="Production 发布必须存在 PASSED 评估记录；READY / FAILED 将阻断发布并记录审计。" />
    </Space>
  );
}

function CompareTable({ compare, loading }: { compare?: ModelEvaluationCompare; loading: boolean }) {
  return (
    <Table
      rowKey="metricName"
      size="small"
      loading={loading}
      pagination={false}
      dataSource={compare?.rows ?? []}
      locale={{ emptyText: <Empty description="至少选择两个版本后展示指标对比。" /> }}
      columns={[
        { title: '指标', dataIndex: 'metricName' },
        {
          title: '版本结果',
          render: (_value, row) => (
            <Space wrap>
              {row.values.map((value) => <Tag key={`${row.metricName}-${value.versionId}`} color={value.best ? 'green' : 'default'}>{value.versionNo}: {formatMetricValue(value.value)}{value.best ? ' · best' : ''}</Tag>)}
            </Space>
          ),
        },
      ]}
    />
  );
}
