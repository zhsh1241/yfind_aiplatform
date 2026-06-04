import { DownloadOutlined, EyeOutlined, InboxOutlined, PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
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
  type FileObjectSummary,
  type ModelAccessPermission,
  type ModelCreateInput,
  type ModelFramework,
  type ModelScope,
  type ModelSource,
  type ModelSummary,
  type ModelTaskType,
  type ModelVersion,
  type ModelVersionStatus,
} from '../platform/platformApi';
import { useSessionStore } from '../platform/sessionStore';

const FRAMEWORK_OPTIONS: { value: ModelFramework; label: string }[] = [
  { value: 'PYTORCH', label: 'PyTorch' },
  { value: 'TENSORFLOW', label: 'TensorFlow' },
  { value: 'PADDLE', label: 'Paddle' },
  { value: 'ONNX', label: 'ONNX' },
];

const TASK_TYPE_OPTIONS: { value: ModelTaskType; label: string }[] = [
  { value: 'OBJECT_DETECTION', label: '目标检测' },
  { value: 'IMAGE_CLASSIFICATION', label: '图像分类' },
  { value: 'SEMANTIC_SEGMENTATION', label: '语义分割' },
  { value: 'NLP_TEXT_CLASSIFICATION', label: '文本分类' },
  { value: 'TIME_SERIES_FORECAST', label: '时序预测' },
  { value: 'ANOMALY_DETECTION', label: '异常检测' },
];

const SCOPE_OPTIONS: { value: ModelScope; label: string }[] = [
  { value: 'PLATFORM', label: '平台级' },
  { value: 'BU', label: 'BU 共享' },
  { value: 'PRIVATE', label: '仅 owner' },
];

const SOURCE_OPTIONS: { value: ModelSource; label: string }[] = [
  { value: 'LOCAL_UPLOAD', label: '本地导入' },
  { value: 'TRAINING_OUTPUT', label: '训练产物' },
  { value: 'EXTERNAL_IMPORT', label: '外部导入' },
  { value: 'PLATFORM_BUILT_IN', label: '平台内置' },
];

const ACCESS_PERMISSION_OPTIONS: { value: ModelAccessPermission; label: string }[] = [
  { value: 'VIEW', label: '查看' },
  { value: 'DOWNLOAD', label: '下载' },
  { value: 'USE_FOR_TRAINING', label: '训练复用' },
  { value: 'DEPLOY', label: '部署' },
];

const MODEL_FILE_EXTENSIONS = ['.pt', '.pth', '.onnx', '.zip'];

const STATUS_ACTIONS: Record<ModelVersionStatus, { label: string; targetStatus: ModelVersionStatus }[]> = {
  DEVELOPMENT: [{ label: '提交测试', targetStatus: 'TESTING' }],
  TESTING: [{ label: '发布 Production', targetStatus: 'PRODUCTION' }, { label: '标记废弃', targetStatus: 'DEPRECATED' }],
  PRODUCTION: [{ label: '标记废弃', targetStatus: 'DEPRECATED' }],
  DEPRECATED: [],
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN');
}

function formatBytes(value?: number | null) {
  if (!value) return '0 B';
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(2)} GB`;
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function fileExtension(objectKey?: string | null) {
  const name = objectKey?.split('/').pop()?.toLowerCase() ?? '';
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.slice(dotIndex) : '';
}

function isModelFileObject(file: FileObjectSummary) {
  return file.assetType.toUpperCase() === 'MODEL'
    && file.status.toUpperCase() === 'AVAILABLE'
    && MODEL_FILE_EXTENSIONS.includes(fileExtension(file.objectKey));
}

function OneLineText({ value, width = 220, type }: { value?: string | null; width?: number | string; type?: 'secondary' }) {
  const text = value || '-';
  return (
    <Typography.Text
      type={type}
      title={text}
      ellipsis
      style={{ display: 'inline-block', maxWidth: width, verticalAlign: 'bottom' }}
    >
      {text}
    </Typography.Text>
  );
}

function statusColor(status?: string | null) {
  switch (status) {
    case 'PRODUCTION':
    case 'ACTIVE':
    case 'PASSED':
    case 'APPROVED':
      return 'green';
    case 'TESTING':
    case 'PENDING':
    case 'IMPORTED_PROOF':
      return 'blue';
    case 'DEPRECATED':
    case 'FAILED':
    case 'REJECTED':
      return 'red';
    case 'DEVELOPMENT':
      return 'gold';
    default:
      return 'default';
  }
}

function parseTags(value: string) {
  return value
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function modelEmptyDescription() {
  return '暂无可见模型，请调整筛选条件或先创建模型。';
}

type ModelSelectorProps = {
  value?: string;
  onChange?: (value?: string) => void;
  allowTrainingOnly?: boolean;
};

export function ModelSelector({ value, onChange, allowTrainingOnly = true }: ModelSelectorProps) {
  const [keyword, setKeyword] = useState('');
  const modelQuery = useQuery({
    queryKey: ['model-selector-models', keyword],
    queryFn: () => platformApi.models({ keyword, page: 1, pageSize: 100 }),
  });

  const versionQuery = useQuery({
    queryKey: ['model-selector-versions', keyword, modelQuery.data?.items.map((item) => item.modelId).join('|')],
    enabled: Boolean(modelQuery.data),
    queryFn: async () => {
      const models = modelQuery.data?.items ?? [];
      const versionGroups = await Promise.all(
        models.map(async (model) => ({
          model,
          versions: await platformApi.modelVersions(model.modelId),
        })),
      );
      return versionGroups.flatMap(({ model, versions }) =>
        versions
          .filter((version) => version.status !== 'DEPRECATED')
          .filter((version) => (allowTrainingOnly ? version.permissionSummary.canUseForTraining : version.permissionSummary.canView))
          .map((version) => ({
            value: version.versionId,
            label: `${model.name} · ${version.versionNo} · ${model.framework}`,
          })),
      );
    },
  });

  const options = useMemo(() => versionQuery.data ?? [], [versionQuery.data]);

  return (
    <Space orientation="vertical" className="full-width" size={8}>
      <Input.Search
        allowClear
        placeholder="检索可复用预训练模型"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />
      <Select
        aria-label="model-selector"
        showSearch
        allowClear
        className="full-width"
        placeholder="选择可用于训练的模型版本"
        optionFilterProp="label"
        options={options}
        value={value}
        onChange={(nextValue) => onChange?.(nextValue)}
        notFoundContent={modelQuery.isLoading || versionQuery.isLoading ? '加载中...' : '没有符合条件的模型版本'}
      />
    </Space>
  );
}

export function ModelRegistryPage() {
  const queryClient = useQueryClient();
  const [messageApi, messageContext] = message.useMessage();
  const [modalApi, modalContext] = Modal.useModal();
  const [filters, setFilters] = useState({
    keyword: '',
    tag: undefined as string | undefined,
    framework: undefined as string | undefined,
    taskType: undefined as string | undefined,
    scope: undefined as string | undefined,
    status: undefined as string | undefined,
    ownerOrgId: undefined as string | undefined,
    page: 1,
    pageSize: 20,
  });
  const [selectedModelId, setSelectedModelId] = useState<string>();
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [createVersionOpen, setCreateVersionOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectorVersionId, setSelectorVersionId] = useState<string>();
  const [modelForm] = Form.useForm<ModelCreateInput & { tagsText?: string }>();
  const [versionForm] = Form.useForm<{
    versionNo: string;
    fileObjectId: string;
    runtimeRequirements?: string;
    metricsSummary?: string;
    evaluationStatus?: string;
    evaluationProof?: string;
    setAsCurrent?: boolean;
  }>();
  const [accessForm] = Form.useForm<{
    versionId?: string;
    permission: ModelAccessPermission;
    reason?: string;
    expiresAt?: string;
  }>();
  const [editForm] = Form.useForm<{
    name?: string;
    description?: string;
    inputFormat?: string;
    outputFormat?: string;
    runtimeRequirements?: string;
    tagsText?: string;
    scope?: ModelScope;
    scopeChangeReason?: string;
  }>();

  const modelQuery = useQuery({
    queryKey: ['model-registry', filters],
    queryFn: () => platformApi.models(filters),
  });

  const selectedModel = useQuery({
    queryKey: ['model-detail', selectedModelId],
    queryFn: () => platformApi.modelDetail(selectedModelId!),
    enabled: Boolean(selectedModelId),
  });

  const fileQuery = useQuery({
    queryKey: ['platform-files', 'model-registry', 'MODEL', 'AVAILABLE'],
    queryFn: () => platformApi.filesByQuery({ assetType: 'MODEL', status: 'AVAILABLE' }),
  });

  const activeDetail = selectedModel.data;
  const activeVersion = activeDetail?.versions.find((item) => item.versionId === selectedVersionId) ?? activeDetail?.versions[0];
  const activePermissionSummary = activeVersion?.permissionSummary ?? activeDetail?.permissionSummary;
  const activeDownloadAvailable = activeVersion?.downloadAvailable ?? Boolean(activePermissionSummary?.canDownload);
  const activeTransitionActions = activeVersion?.transitionActions ?? [];
  const currentUserPermissions = useSessionStore((state) => state.user?.permissions ?? []);
  const canCreateModel = currentUserPermissions.includes('model:model:write');
  const canEditActiveModel = Boolean(activeDetail?.permissionSummary.canEditModel ?? activeDetail?.permissionSummary.canManage);
  const canCreateActiveVersion = Boolean(activeDetail?.permissionSummary.canCreateVersion ?? activeDetail?.permissionSummary.canManage);
  const canApproveActiveAccess = Boolean(activeDetail?.permissionSummary.canApproveAccess);

  const accessRequestQuery = useQuery({
    queryKey: ['model-access-requests', selectedModelId, 'PENDING'],
    queryFn: () => platformApi.modelAccessRequests(selectedModelId!, { status: 'PENDING' }),
    enabled: Boolean(selectedModelId && canApproveActiveAccess),
  });
  const accessRequests = accessRequestQuery.data ?? [];

  const refreshAccessRequests = async () => {
    if (selectedModelId) {
      await queryClient.invalidateQueries({ queryKey: ['model-access-requests', selectedModelId] });
    }
  };

  const refreshModels = async () => {
    await queryClient.invalidateQueries({ queryKey: ['model-registry'] });
    if (selectedModelId) {
      await queryClient.invalidateQueries({ queryKey: ['model-detail', selectedModelId] });
    }
  };

  const createModelMutation = useMutation({
    mutationFn: (values: ModelCreateInput & { tagsText?: string }) =>
      platformApi.createModel({
        ...values,
        tags: parseTags(values.tagsText ?? ''),
      }),
    onSuccess: async (created) => {
      messageApi.success(`模型 ${created.name} 已创建`);
      setCreateOpen(false);
      modelForm.resetFields();
      setSelectedModelId(created.modelId);
      await refreshModels();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const updateModelMutation = useMutation({
    mutationFn: (values: { name?: string; description?: string; inputFormat?: string; outputFormat?: string; runtimeRequirements?: string; tagsText?: string; scope?: ModelScope; scopeChangeReason?: string }) =>
      platformApi.updateModel(selectedModelId!, {
        ...values,
        tags: parseTags(values.tagsText ?? ''),
      }),
    onSuccess: async () => {
      messageApi.success('模型元数据已更新');
      setEditOpen(false);
      await refreshModels();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const createVersionMutation = useMutation({
    mutationFn: (values: {
      versionNo: string;
      fileObjectId: string;
      runtimeRequirements?: string;
      metricsSummary?: string;
      evaluationStatus?: string;
      evaluationProof?: string;
      setAsCurrent?: boolean;
    }) =>
      platformApi.createModelVersion(selectedModelId!, {
        versionNo: values.versionNo,
        fileObjectId: values.fileObjectId,
        runtimeRequirements: values.runtimeRequirements,
        metricsSummary: values.metricsSummary ? JSON.parse(values.metricsSummary) : undefined,
        evaluationStatus: values.evaluationStatus,
        evaluationProof: values.evaluationProof,
        setAsCurrent: values.setAsCurrent,
      }),
    onSuccess: async (created) => {
      messageApi.success(`版本 ${created.versionNo} 已创建`);
      setCreateVersionOpen(false);
      versionForm.resetFields();
      setSelectedVersionId(created.versionId);
      await refreshModels();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ versionId, targetStatus }: { versionId: string; targetStatus: ModelVersionStatus }) =>
      platformApi.transitionModelVersion(selectedModelId!, versionId, { targetStatus }),
    onSuccess: async (version) => {
      messageApi.success(`版本已流转到 ${version.status}`);
      setSelectedVersionId(version.versionId);
      await refreshModels();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const deleteVersionMutation = useMutation({
    mutationFn: (versionId: string) => platformApi.deleteModelVersion(selectedModelId!, versionId),
    onSuccess: async (result) => {
      if (result.blocked) {
        modalApi.error({
          title: '该模型版本当前被推理服务引用，请先下线相关服务',
          content: (
            <Space orientation="vertical">
              {result.activeReferences.map((item) => (
                <Typography.Text key={item.serviceId}>{item.serviceName} · {item.status}</Typography.Text>
              ))}
            </Space>
          ),
        });
      } else {
        messageApi.success('模型版本已删除');
      }
      await refreshModels();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const accessMutation = useMutation({
    mutationFn: (values: { versionId?: string; permission: ModelAccessPermission; reason?: string; expiresAt?: string }) =>
      platformApi.requestModelAccess(selectedModelId!, values),
    onSuccess: async () => {
      messageApi.success('跨 BU 访问申请已提交');
      setAccessOpen(false);
      accessForm.resetFields();
      await refreshAccessRequests();
      await refreshModels();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const approveAccessMutation = useMutation({
    mutationFn: (requestId: string) => platformApi.approveModelAccessRequest(requestId, { reviewComment: '页面审批通过' }),
    onSuccess: async () => {
      messageApi.success('模型访问申请已审批通过');
      await refreshAccessRequests();
      await refreshModels();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const rejectAccessMutation = useMutation({
    mutationFn: (requestId: string) => platformApi.rejectModelAccessRequest(requestId, { reviewComment: '页面审批拒绝' }),
    onSuccess: async () => {
      messageApi.success('模型访问申请已拒绝');
      await refreshAccessRequests();
      await refreshModels();
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const downloadMutation = useMutation({
    mutationFn: (versionId: string) => platformApi.modelDownloadUrl(selectedModelId!, versionId),
    onSuccess: (result) => {
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
      messageApi.success(`下载地址已生成，有效期 ${result.expiresInSeconds} 秒`);
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const versionColumns: ColumnsType<ModelVersion> = [
    {
      title: '版本',
      dataIndex: 'versionNo',
      width: 96,
      render: (_, record) => (
        <Button type="link" onClick={() => setSelectedVersionId(record.versionId)}>
          {record.versionNo}
        </Button>
      ),
    },
    {
      title: '文件',
      width: 260,
      render: (_, record) => (
        <div style={{ maxWidth: 240 }}>
          <OneLineText value={record.fileName} width={240} />
          <br />
          <OneLineText value={record.fileObjectId} width={180} type="secondary" />
        </div>
      ),
    },
    {
      title: '状态',
      width: 92,
      render: (_, record) => <Tag color={statusColor(record.status)}>{record.status}</Tag>,
    },
    {
      title: '评估',
      width: 128,
      render: (_, record) => <Tag color={statusColor(record.evaluationStatus)}>{record.evaluationStatus}</Tag>,
    },
    {
      title: '大小',
      width: 88,
      render: (_, record) => formatBytes(record.fileSizeBytes),
    },
    {
      title: '动作',
      width: 180,
      render: (_, record) => (
        <Space wrap>
          {(record.transitionActions ?? []).map((targetStatus) => ({
            label: STATUS_ACTIONS[record.status]?.find((action) => action.targetStatus === targetStatus)?.label ?? `流转到 ${targetStatus}`,
            targetStatus,
          })).map((action) => (
            <Button
              key={action.targetStatus}
              size="small"
              onClick={() => transitionMutation.mutate({ versionId: record.versionId, targetStatus: action.targetStatus })}
              loading={transitionMutation.isPending}
            >
              {action.label}
            </Button>
          ))}
          <Button
            size="small"
            icon={<DownloadOutlined />}
            disabled={!record.downloadAvailable}
            onClick={() => downloadMutation.mutate(record.versionId)}
            loading={downloadMutation.isPending}
          >
            下载
          </Button>
          {record.permissionSummary.canDeleteVersion ? (
            <Button danger size="small" onClick={() => deleteVersionMutation.mutate(record.versionId)} loading={deleteVersionMutation.isPending}>
              删除
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const modelColumns: ColumnsType<ModelSummary> = [
    {
      title: '模型名称',
      dataIndex: 'name',
      render: (_, record) => (
        <Button type="link" onClick={() => {
          setSelectedModelId(record.modelId);
          setSelectedVersionId(record.currentVersionId ?? undefined);
        }}>
          {record.name}
        </Button>
      ),
    },
    { title: '框架', dataIndex: 'framework' },
    { title: '任务类型', dataIndex: 'taskType' },
    { title: 'Scope', render: (_, record) => <Tag color="geekblue">{record.scope}</Tag> },
    { title: '当前版本', render: (_, record) => record.currentVersionNo ?? '未创建版本' },
    { title: '版本状态', render: (_, record) => record.currentVersionStatus ? <Tag color={statusColor(record.currentVersionStatus)}>{record.currentVersionStatus}</Tag> : '-' },
    {
      title: '权限',
      render: (_, record) => (
        <Space wrap>
          {record.permissionSummary.canView ? <Tag color="green">可查看</Tag> : null}
          {record.permissionSummary.canDownload ? <Tag color="blue">可下载</Tag> : null}
          {record.permissionSummary.canUseForTraining ? <Tag color="gold">可训练复用</Tag> : null}
        </Space>
      ),
    },
  ];

  const fileOptions = (fileQuery.data?.items ?? [])
    .filter(isModelFileObject)
    .map((item: FileObjectSummary) => ({
      value: item.fileId,
      label: `${item.fileId} · ${item.objectKey} · ${formatBytes(item.sizeBytes)}`,
    }));

  const summaryStats = {
    total: modelQuery.data?.total ?? 0,
    production: (modelQuery.data?.items ?? []).filter((item) => item.currentVersionStatus === 'PRODUCTION').length,
    crossBu: (modelQuery.data?.items ?? []).filter((item) => item.scope === 'PLATFORM').length,
    trainingReady: (modelQuery.data?.items ?? []).filter((item) => item.permissionSummary.canUseForTraining).length,
  };

  return (
    <div className="content-page">
      {messageContext}
      {modalContext}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>模型中心</Typography.Title>
          <Typography.Text type="secondary">统一纳管模型、模型版本、下载审计与跨 BU 复用入口。</Typography.Text>
        </div>
        <Space>
          <Button icon={<SafetyCertificateOutlined />} onClick={() => setAccessOpen(true)} disabled={!selectedModelId}>
            跨 BU 访问申请
          </Button>
          {canCreateActiveVersion ? (
            <Button icon={<InboxOutlined />} onClick={() => setCreateVersionOpen(true)} disabled={!selectedModelId}>
              创建版本
            </Button>
          ) : null}
          {canCreateModel ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建模型
            </Button>
          ) : null}
        </Space>
      </div>

      <Row gutter={[16, 16]} className="summary-grid">
        <Col xs={24} md={6}><Card><Statistic title="模型总数" value={summaryStats.total} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="生产版本" value={summaryStats.production} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="平台共享模型" value={summaryStats.crossBu} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="可训练复用" value={summaryStats.trainingReady} /></Card></Col>
      </Row>

      <Card className="page-card" title="预训练模型选择器">
          <Space orientation="vertical" className="full-width">
          <Typography.Text type="secondary">该组件供 `train` / `exp` / `eval` 后续复用，仅展示当前用户可见且未废弃的模型版本。</Typography.Text>
          <ModelSelector value={selectorVersionId} onChange={setSelectorVersionId} />
          {selectorVersionId ? <Tag color="green">已选择版本 {selectorVersionId}</Tag> : null}
        </Space>
      </Card>

      <div className="model-registry-layout">
        <Card className="page-card" title="模型目录" extra={<Tag color="blue">TASK-model-registry-foundation</Tag>}>
          <Space wrap className="full-width" style={{ marginBottom: 16 }}>
            <Input.Search
              allowClear
              placeholder="按名称/描述/标签搜索"
              style={{ width: 280 }}
              onSearch={(keyword) => setFilters((prev) => ({ ...prev, keyword, page: 1 }))}
            />
            <Input.Search
              allowClear
              placeholder="按标签筛选"
              style={{ width: 180 }}
              onSearch={(tag) => setFilters((prev) => ({ ...prev, tag: tag.trim() || undefined, page: 1 }))}
            />
            <Input.Search
              allowClear
              placeholder="Owner BU / 组织 ID"
              style={{ width: 200 }}
              onSearch={(ownerOrgId) => setFilters((prev) => ({ ...prev, ownerOrgId: ownerOrgId.trim() || undefined, page: 1 }))}
            />
            <Select allowClear placeholder="框架" style={{ width: 160 }} options={FRAMEWORK_OPTIONS} onChange={(framework) => setFilters((prev) => ({ ...prev, framework, page: 1 }))} />
            <Select allowClear placeholder="任务类型" style={{ width: 180 }} options={TASK_TYPE_OPTIONS} onChange={(taskType) => setFilters((prev) => ({ ...prev, taskType, page: 1 }))} />
            <Select allowClear placeholder="共享范围" style={{ width: 160 }} options={SCOPE_OPTIONS} onChange={(scope) => setFilters((prev) => ({ ...prev, scope, page: 1 }))} />
            <Select allowClear placeholder="版本状态" style={{ width: 160 }} options={['DEVELOPMENT', 'TESTING', 'PRODUCTION', 'DEPRECATED'].map((item) => ({ value: item, label: item }))} onChange={(status) => setFilters((prev) => ({ ...prev, status, page: 1 }))} />
          </Space>
          <Table
            rowKey="modelId"
            loading={modelQuery.isLoading}
            columns={modelColumns}
            dataSource={modelQuery.data?.items ?? []}
            locale={{ emptyText: modelEmptyDescription() }}
            pagination={{
              current: filters.page,
              pageSize: filters.pageSize,
              total: modelQuery.data?.total ?? 0,
              onChange: (page, pageSize) => setFilters((prev) => ({ ...prev, page, pageSize })),
            }}
          />
        </Card>

        <Drawer
          title={activeDetail ? `${activeDetail.name} · 模型详情` : '模型详情'}
          size={560}
          mask={false}
          open={Boolean(selectedModelId)}
          onClose={() => {
            setSelectedModelId(undefined);
            setSelectedVersionId(undefined);
          }}
        >
          {!activeDetail && selectedModel.isLoading ? <Typography.Text>加载中...</Typography.Text> : null}
          {!activeDetail && !selectedModel.isLoading ? <Empty description="请选择左侧模型查看详情" /> : null}
          {activeDetail ? (
            <Space orientation="vertical" className="full-width" size={16}>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="模型 ID">{activeDetail.modelId}</Descriptions.Item>
                <Descriptions.Item label="框架 / 任务">{activeDetail.framework} / {activeDetail.taskType}</Descriptions.Item>
                <Descriptions.Item label="Scope / 来源">{activeDetail.scope} / {activeDetail.source}</Descriptions.Item>
                <Descriptions.Item label="输入 / 输出">{activeDetail.inputFormat} / {activeDetail.outputFormat}</Descriptions.Item>
                <Descriptions.Item label="标签">
                  <Space wrap>{activeDetail.tags.length ? activeDetail.tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : '未设置'}</Space>
                </Descriptions.Item>
                <Descriptions.Item label="运行要求">{activeDetail.runtimeRequirements || '未填写'}</Descriptions.Item>
                <Descriptions.Item label="权限摘要">
                  <Space wrap>
                    {activeDetail.permissionSummary.canView ? <Tag color="green">可查看</Tag> : null}
                    {activeDetail.permissionSummary.canDownload ? <Tag color="blue">可下载</Tag> : null}
                    {activeDetail.permissionSummary.canUseForTraining ? <Tag color="gold">可训练复用</Tag> : null}
                    {activeDetail.permissionSummary.canManage ? <Tag color="purple">可管理</Tag> : null}
                  </Space>
                </Descriptions.Item>
              </Descriptions>

              <Space>
                {canEditActiveModel ? (
                  <Button icon={<EyeOutlined />} onClick={() => {
                    editForm.setFieldsValue({
                      name: activeDetail.name,
                      description: activeDetail.description ?? '',
                      inputFormat: activeDetail.inputFormat,
                      outputFormat: activeDetail.outputFormat,
                      runtimeRequirements: activeDetail.runtimeRequirements ?? '',
                      tagsText: activeDetail.tags.join(', '),
                      scope: activeDetail.scope,
                    });
                    setEditOpen(true);
                  }}>
                    编辑元数据
                  </Button>
                ) : null}
                {canCreateActiveVersion ? (
                  <Button icon={<InboxOutlined />} onClick={() => setCreateVersionOpen(true)}>
                    创建版本
                  </Button>
                ) : null}
                <Button icon={<SafetyCertificateOutlined />} onClick={() => setAccessOpen(true)}>
                  跨 BU 访问申请
                </Button>
                {!activeDetail.permissionSummary.canView ? (
                  <Alert type="warning" showIcon message="该模型属于其他 BU，请申请跨 BU 授权" />
                ) : null}
              </Space>

              <Card size="small" title="版本历史">
                <Table
                  rowKey="versionId"
                  size="small"
                  tableLayout="fixed"
                  columns={versionColumns}
                  dataSource={activeDetail.versions}
                  pagination={false}
                  locale={{ emptyText: '该模型尚未创建版本，请先绑定模型文件对象。' }}
                />
              </Card>

              <Card size="small" title={`当前选中版本 ${activeVersion?.versionNo ?? ''}`}>
                {activeVersion ? (
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="版本状态"><Tag color={statusColor(activeVersion.status)}>{activeVersion.status}</Tag></Descriptions.Item>
                    <Descriptions.Item label="评估状态"><Tag color={statusColor(activeVersion.evaluationStatus)}>{activeVersion.evaluationStatus}</Tag></Descriptions.Item>
                    <Descriptions.Item label="文件">
                      <Space size={4} wrap={false}>
                        <OneLineText value={activeVersion.fileName} width={320} />
                        <Typography.Text type="secondary">· {activeVersion.fileExtension} · {formatBytes(activeVersion.fileSizeBytes)}</Typography.Text>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="对象存储">
                      <Space size={4} wrap={false} style={{ maxWidth: '100%' }}>
                        <OneLineText value={activeVersion.storageBucket} width={110} />
                        <Typography.Text type="secondary">/</Typography.Text>
                        <OneLineText value={activeVersion.storageKey} width={360} />
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="指标摘要">{activeVersion.metricsSummary ? JSON.stringify(activeVersion.metricsSummary) : '暂无'}</Descriptions.Item>
                    <Descriptions.Item label="评估证明">{activeVersion.evaluationProof ?? '暂无'}</Descriptions.Item>
                    <Descriptions.Item label="活跃引用">{activeVersion.activeDeploymentCount}</Descriptions.Item>
                    <Descriptions.Item label="版本权限">
                      <Space wrap>
                        {activePermissionSummary?.canView ? <Tag color="green">可查看</Tag> : null}
                        {activePermissionSummary?.canDownload ? <Tag color="blue">可下载</Tag> : null}
                        {activePermissionSummary?.canUseForTraining ? <Tag color="gold">可训练复用</Tag> : null}
                        {activePermissionSummary?.canManage ? <Tag color="purple">可管理</Tag> : null}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="下载可用">{activeDownloadAvailable ? '可生成 10 分钟下载链接' : '当前用户不可下载'}</Descriptions.Item>
                    <Descriptions.Item label="可执行流转">{activeTransitionActions.length ? activeTransitionActions.join(' / ') : '无'}</Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Empty description="没有可展示的版本明细" />
                )}
              </Card>

              <Card size="small" title="审计事件">
                {activeDetail.auditEvents.length ? (
                  <Timeline
                    items={activeDetail.auditEvents.map((item) => ({
                      color: item.result === 'SUCCESS' ? 'green' : item.result === 'BLOCKED' ? 'red' : 'blue',
                      content: `${item.action} · ${item.operatorName} · ${formatDateTime(item.occurredAt)}`,
                    }))}
                  />
                ) : (
                  <Empty description="暂无审计记录" />
                )}
              </Card>

              <Card size="small" title="访问申请审批">
                {accessRequestQuery.isLoading ? <Typography.Text>加载访问申请...</Typography.Text> : null}
                {!accessRequestQuery.isLoading && accessRequests.length ? (
                  <Table
                    size="small"
                    rowKey="requestId"
                    pagination={false}
                    dataSource={accessRequests}
                    columns={[
                      { title: '申请 ID', dataIndex: 'requestId' },
                      { title: '权限', dataIndex: 'permission' },
                      { title: '状态', render: (_, record) => <Tag color={statusColor(record.status)}>{record.status}</Tag> },
                      { title: '原因', dataIndex: 'reason' },
                      {
                        title: '操作',
                        render: (_, record) => record.status === 'PENDING' && canApproveActiveAccess ? (
                          <Space>
                            <Button size="small" onClick={() => approveAccessMutation.mutate(record.requestId)} loading={approveAccessMutation.isPending}>审批通过</Button>
                            <Button size="small" danger onClick={() => rejectAccessMutation.mutate(record.requestId)} loading={rejectAccessMutation.isPending}>拒绝</Button>
                          </Space>
                        ) : '-',
                      },
                    ]}
                  />
                ) : !accessRequestQuery.isLoading ? (
                  <Empty description="暂无待处理访问申请" />
                ) : null}
              </Card>
            </Space>
          ) : null}
        </Drawer>
      </div>

      <Modal
        title="创建模型"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void modelForm.submit()}
        confirmLoading={createModelMutation.isPending}
      >
        <Form
          layout="vertical"
          form={modelForm}
          initialValues={{ framework: 'PYTORCH', taskType: 'OBJECT_DETECTION', scope: 'BU', source: 'LOCAL_UPLOAD' }}
          onFinish={(values) => createModelMutation.mutate(values)}
        >
          <Form.Item name="name" label="模型名称" rules={[{ required: true, message: '请输入模型名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="模型描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="framework" label="框架" rules={[{ required: true, message: '请选择框架' }]}><Select options={FRAMEWORK_OPTIONS} /></Form.Item></Col>
            <Col span={12}><Form.Item name="taskType" label="任务类型" rules={[{ required: true, message: '请选择任务类型' }]}><Select options={TASK_TYPE_OPTIONS} /></Form.Item></Col>
          </Row>
          <Form.Item name="inputFormat" label="输入格式" rules={[{ required: true, message: '请输入输入格式' }]}>
            <Input placeholder="image:640x640 RGB" />
          </Form.Item>
          <Form.Item name="outputFormat" label="输出格式" rules={[{ required: true, message: '请输入输出格式' }]}>
            <Input placeholder="bbox[class,score,x1,y1,x2,y2]" />
          </Form.Item>
          <Form.Item name="runtimeRequirements" label="运行要求"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="tagsText" label="标签"><Input placeholder="用逗号分隔" /></Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="scope" label="共享范围" rules={[{ required: true, message: '请选择共享范围' }]}><Select options={SCOPE_OPTIONS} /></Form.Item></Col>
            <Col span={12}><Form.Item name="source" label="来源" rules={[{ required: true, message: '请选择来源' }]}><Select options={SOURCE_OPTIONS} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="编辑模型元数据"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => void editForm.submit()}
        confirmLoading={updateModelMutation.isPending}
      >
        <Form layout="vertical" form={editForm} onFinish={(values) => updateModelMutation.mutate(values)}>
          <Form.Item name="name" label="模型名称"><Input /></Form.Item>
          <Form.Item name="description" label="模型描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="inputFormat" label="输入格式"><Input /></Form.Item>
          <Form.Item name="outputFormat" label="输出格式"><Input /></Form.Item>
          <Form.Item name="runtimeRequirements" label="运行要求"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="tagsText" label="标签"><Input /></Form.Item>
          <Form.Item name="scope" label="共享范围"><Select options={SCOPE_OPTIONS} /></Form.Item>
          <Form.Item name="scopeChangeReason" label="跨 BU 共享原因"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title="创建版本"
        open={createVersionOpen}
        onCancel={() => setCreateVersionOpen(false)}
        onOk={() => void versionForm.submit()}
        confirmLoading={createVersionMutation.isPending}
      >
        <Form layout="vertical" form={versionForm} initialValues={{ evaluationStatus: 'NONE', setAsCurrent: true }} onFinish={(values) => createVersionMutation.mutate(values)}>
          <Form.Item name="versionNo" label="版本号" rules={[{ required: true, message: '请输入版本号' }]}>
            <Input placeholder="v1.0" />
          </Form.Item>
          <Form.Item name="fileObjectId" label="平台文件对象" rules={[{ required: true, message: '请选择模型文件对象' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              loading={fileQuery.isLoading}
              options={fileOptions}
              placeholder="只能选择已上传且可用的模型文件（.pt/.pth/.onnx/.zip）"
              notFoundContent={fileQuery.isLoading ? '加载模型文件...' : '暂无可用模型文件'}
            />
          </Form.Item>
          <Form.Item name="runtimeRequirements" label="运行要求"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="metricsSummary" label="指标摘要 JSON"><Input.TextArea rows={3} placeholder='{"mAP50":0.91,"latencyMs":18}' /></Form.Item>
          <Form.Item name="evaluationStatus" label="评估状态"><Select options={['NONE', 'PASSED', 'FAILED', 'IMPORTED_PROOF'].map((item) => ({ value: item, label: item }))} /></Form.Item>
          <Form.Item name="evaluationProof" label="外部评估证明"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="setAsCurrent" label="设为当前版本" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="跨 BU 访问申请"
        open={accessOpen}
        onCancel={() => setAccessOpen(false)}
        onOk={() => void accessForm.submit()}
        confirmLoading={accessMutation.isPending}
      >
        <Form layout="vertical" form={accessForm} initialValues={{ permission: 'USE_FOR_TRAINING' }} onFinish={(values) => accessMutation.mutate(values)}>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            title="该模型属于其他 BU，请申请跨 BU 授权"
          />
          <Form.Item name="versionId" label="目标版本">
            <Select allowClear options={(activeDetail?.versions ?? []).map((item) => ({ value: item.versionId, label: `${item.versionNo} · ${item.status}` }))} />
          </Form.Item>
          <Form.Item name="permission" label="申请权限" rules={[{ required: true, message: '请选择权限' }]}>
            <Select options={ACCESS_PERMISSION_OPTIONS} />
          </Form.Item>
          <Form.Item name="reason" label="申请原因"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="expiresAt" label="期望到期时间"><Input placeholder="2026-12-31T23:59:59Z" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
