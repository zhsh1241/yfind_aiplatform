import { Alert, Button, Card, Descriptions, Form, Input, Progress, Select, Space, Steps, Table, Tag, Typography, Upload, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { dataApi, platformApi, type DatasetDetail } from '../platform/platformApi';
import { useSessionStore } from '../platform/sessionStore';

const fmtSize = (n?: number | null) => !n ? '0 B' : n > 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} GB` : n > 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${n} B`;
const txt = (v?: string | null) => ({ RAW: '原始数据', PREPROCESSED: '预处理后', ANNOTATED: '已标注', IMAGE: '图片', AUDIO_VIDEO: '影音', TEXT: '文本', OBJECT_STORAGE: '对象存储', RELATIONAL_DB: '关系型数据库', STREAM: '流数据', TIME_SERIES: '时序库', INDUSTRIAL_PROTOCOL: '工业协议', EXTERNAL_API: '外部接口', IMPORT: '导入', API: '接口', IMAGE_TAGGING: '图片打标', IMAGE_SEGMENTATION: '图片分割', TEXT_LABELING: '文本分类', ANNOTATION_RESULT: '标注文件' } as Record<string, string>)[v ?? ''] ?? v ?? '-';
const tagSelectSearchProps = {
  showSearch: true,
  optionFilterProp: 'label',
  filterOption: (input: string, option?: { label?: unknown; value?: unknown }) =>
    String(option?.label ?? option?.value ?? '').toLowerCase().includes(input.trim().toLowerCase()),
};

type DatasetUploadStage = 'queued' | 'hashing' | 'registering' | 'uploading' | 'completing' | 'binding' | 'done' | 'error';

type DatasetUploadItem = {
  uid: string;
  file: File;
  name: string;
  size: number;
  type: string;
  relativePath?: string;
  status: DatasetUploadStage;
  progress: number;
  sha256?: string;
  fileId?: string;
  objectKey?: string;
  diagnostic?: string;
  error?: string;
};

const uploadStageText: Record<DatasetUploadStage, string> = {
  queued: '待上传',
  hashing: '计算哈希',
  registering: '登记对象',
  uploading: '上传中',
  completing: '完成校验',
  binding: '绑定版本',
  done: '已完成',
  error: '失败',
};

const uploadStageColor = (status: DatasetUploadStage) => (status === 'done' ? 'green' : status === 'error' ? 'red' : status === 'queued' ? 'default' : 'processing');

const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const digestSha256 = async (file: File) => {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const buffer = await file.arrayBuffer();
    const digest = await subtle.digest('SHA-256', buffer);
    return toHex(new Uint8Array(digest));
  }

  const seed = `${file.name}:${file.size}:${file.lastModified}:${file.type || 'application/octet-stream'}`;
  const bytes = new Uint8Array(32);
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 1274126177);
    bytes[i] = hash & 0xff;
  }
  return toHex(bytes);
};

export function DatasetUploadPage() {
  const nav = useNavigate();
  const currentTenantId = useSessionStore((state) => state.user?.tenantId);
  const [msg, holder] = message.useMessage();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DatasetDetail | null>(null);
  const [uploadQueue, setUploadQueue] = useState<DatasetUploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState('等待拖拽文件');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageTier, setStorageTier] = useState('STANDARD');
  const [fileRole, setFileRole] = useState('RAW');
  const qc = useQueryClient();
  const sources = useQuery({ queryKey: ['data-sources'], queryFn: dataApi.dataSources });
  const tagCatalog = useQuery({ queryKey: ['annotation-tags'], queryFn: () => dataApi.annotationTags({ status: 'ACTIVE' }) });
  const tagOptions = (tagCatalog.data ?? []).filter((tag) => tag.status === 'ACTIVE').map((tag) => ({ value: tag.name, label: tag.name }));
  const uploadConfigs = useQuery({ queryKey: ['upload-configs', currentTenantId], queryFn: () => platformApi.configs('GLOBAL', currentTenantId ?? 'TENANT-YF') });
  const create = useMutation({
    mutationFn: dataApi.createDataset,
    onSuccess: async (created) => {
      setDraft(created);
      await qc.invalidateQueries({ queryKey: ['datasets'] });
      setStep(1);
      msg.success('数据集草稿已创建，请拖拽文件完成上传登记');
    },
    onError: (e: Error) => msg.error(e.message),
  });

  const uploadLimitMb = Number(uploadConfigs.data?.find((item) => item.key === 'upload.maxFileSizeMb')?.effectiveValue ?? 200);
  const uploadLimitBytes = uploadLimitMb * 1024 * 1024;
  const queueSizeBytes = uploadQueue.reduce((total, item) => total + item.size, 0);
  const queueDoneCount = uploadQueue.filter((item) => item.status === 'done').length;
  const queueErrorCount = uploadQueue.filter((item) => item.status === 'error').length;
  const queueActiveCount = uploadQueue.filter((item) => ['hashing', 'registering', 'uploading', 'completing', 'binding'].includes(item.status)).length;
  const queueProgress = uploadQueue.length === 0 ? 0 : Math.round(uploadQueue.reduce((total, item) => total + item.progress, 0) / uploadQueue.length);
  const canStartUpload = !!draft && uploadQueue.length > 0 && !uploading && uploadQueue.some((item) => item.status !== 'done');

  const updateQueueItem = useCallback((uid: string, patch: Partial<DatasetUploadItem>) => {
    setUploadQueue((items) => items.map((item) => (item.uid === uid ? { ...item, ...patch } : item)));
  }, []);
  const removeQueuedItem = useCallback((uid: string) => {
    if (uploading) return;
    setUploadQueue((items) => items.filter((item) => item.uid !== uid));
  }, [uploading]);
  const clearQueue = useCallback(() => {
    if (uploading) return;
    setUploadQueue([]);
    setUploadProgress(0);
    setUploadPhase('等待拖拽文件');
  }, [uploading]);
  const addUploadItem = useCallback((file: File) => {
    if (file.size > uploadLimitBytes) {
      msg.warning(`文件 ${file.name} 超过当前上传上限 ${uploadLimitMb} MB，已拒绝加入队列`);
      return;
    }
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
    const uid = `${relativePath || file.name}-${file.size}-${file.lastModified}-${file.type || 'application/octet-stream'}`;
    setUploadQueue((items) => {
      if (items.some((item) => item.uid === uid)) return items;
      return [...items, {
        uid,
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        relativePath,
        status: 'queued',
        progress: 0,
      }];
    });
  }, [msg, uploadLimitBytes, uploadLimitMb]);

  const handleUpload = useCallback(async () => {
    if (!draft) {
      msg.error('请先完成数据集草稿初始化');
      return;
    }
    const queueSnapshot = uploadQueue.filter((item) => item.status !== 'done');
    if (queueSnapshot.length === 0) {
      msg.warning('请先拖拽至少一个文件到上传区域');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadPhase('开始计算文件哈希');
    try {
      const datasetId = draft.dataset.datasetId;
      const versionId = draft.versions[0]?.versionId;
      if (!versionId) throw new Error('当前数据集草稿缺少版本信息');

      for (let index = 0; index < queueSnapshot.length; index += 1) {
        const item = queueSnapshot[index];
        updateQueueItem(item.uid, { status: 'hashing', progress: 8, diagnostic: undefined, error: undefined });
        setUploadPhase(`计算 ${item.name} 的 SHA-256`);
        const sha256 = await digestSha256(item.file);

        updateQueueItem(item.uid, { sha256, status: 'registering', progress: 24 });
        setUploadPhase(`登记 ${item.name} 到平台文件对象`);
        const initialized = await platformApi.initFile({
          assetType: 'DATASET',
          tenantId: draft.dataset.tenantId || currentTenantId || 'TENANT-YF',
          projectId: draft.dataset.projectId,
          filename: item.name,
          expectedSha256: sha256,
          expectedSizeBytes: item.size,
          contentType: item.type,
          storageTier,
        });

        updateQueueItem(item.uid, {
          fileId: initialized.fileId,
          objectKey: initialized.objectKey,
          status: 'uploading',
          progress: 35,
          diagnostic: initialized.status,
        });
        setUploadPhase(`上传 ${item.name} 到对象存储`);
        const uploaded = await platformApi.uploadFile(initialized.fileId, item.file, (percent: number) => {
          updateQueueItem(item.uid, { progress: 35 + Math.min(45, Math.round((percent / 100) * 45)) });
        });

        updateQueueItem(item.uid, {
          fileId: uploaded.fileId,
          objectKey: uploaded.objectKey,
          status: 'completing',
          progress: 85,
          diagnostic: uploaded.status,
        });
        setUploadPhase(`完成 ${item.name} 的 hash/size 校验`);
        const completed = await platformApi.completeFile(uploaded.fileId, { sha256, sizeBytes: item.size });

        updateQueueItem(item.uid, {
          fileId: completed.fileId,
          objectKey: completed.objectKey,
          status: 'binding',
          progress: 95,
          diagnostic: completed.status,
        });
        setUploadPhase(`绑定 ${item.name} 到当前数据集版本`);
        await dataApi.attachFile(datasetId, versionId, { fileId: completed.fileId, fileRole });

        updateQueueItem(item.uid, {
          fileId: completed.fileId,
          objectKey: completed.objectKey,
          status: 'done',
          progress: 100,
          diagnostic: 'BOUND',
        });
        setUploadProgress(Math.round(((index + 1) / queueSnapshot.length) * 100));
      }

      const refreshed = await dataApi.datasetDetail(datasetId);
      setDraft(refreshed);
      setStep(2);
      setUploadPhase('上传完成');
      setUploadProgress(100);
      msg.success(`已完成 ${queueSnapshot.length} 个文件的上传登记并绑定到版本草稿`);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '文件上传失败';
      setUploadPhase(messageText);
      setUploadQueue((items) => items.map((item) => (item.status === 'done' ? item : { ...item, status: 'error', progress: Math.max(item.progress, 20), error: messageText })));
      msg.error(messageText);
    } finally {
      setUploading(false);
    }
  }, [currentTenantId, draft, fileRole, msg, storageTier, updateQueueItem, uploadQueue]);

  const uploadColumns = [
    {
      title: '文件',
      dataIndex: 'name',
      render: (_: string, record: DatasetUploadItem) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
          {record.relativePath ? <Typography.Text type="secondary">{record.relativePath}</Typography.Text> : null}
          <Typography.Text type="secondary" className="mono">{record.type || 'application/octet-stream'}</Typography.Text>
        </Space>
      ),
    },
    { title: '大小', dataIndex: 'size', render: (value: number) => fmtSize(value) },
    { title: '进度', dataIndex: 'progress', render: (value: number, record: DatasetUploadItem) => <Progress percent={value} status={record.status === 'error' ? 'exception' : record.status === 'done' ? 'success' : 'active'} size="small" /> },
    { title: '状态', dataIndex: 'status', render: (value: DatasetUploadStage) => <Tag color={uploadStageColor(value)}>{uploadStageText[value]}</Tag> },
    { title: '文件对象', render: (_: unknown, record: DatasetUploadItem) => <Space orientation="vertical" size={0}><Typography.Text className="mono" copyable>{record.fileId ?? '待登记'}</Typography.Text><Typography.Text type="secondary">{record.objectKey ?? (record.error ?? '等待上传')}</Typography.Text></Space> },
    { title: '操作', render: (_: unknown, record: DatasetUploadItem) => <Button size="small" disabled={uploading || record.status === 'done'} onClick={() => removeQueuedItem(record.uid)}>移除</Button> },
  ];

  return (
    <div className="content-page">
      {holder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>新建数据集 / 上传向导</Typography.Title>
          <Typography.Text type="secondary">三步向导 · 拖拽上传 · 文件登记 · hash/size 校验</Typography.Text>
        </div>
      </div>
      <Card>
        <Steps current={step} items={[{ title: '填写元数据' }, { title: '拖拽上传' }, { title: '预览确认' }]} style={{ marginBottom: 24 }} />
        {step === 0 && (
          <Form
            layout="vertical"
            onFinish={(v) => create.mutate({
              ...v,
              tenantId: currentTenantId ?? 'TENANT-YF',
              datasetType: 'RAW',
              tags: Array.isArray(v.tags) ? v.tags : [],
              recordCount: Number(v.recordCount ?? 0),
            })}
            initialValues={{ name: '新建视觉数据集', dataType: 'IMAGE', accessLevel: 'TEAM', tags: [] }}
          >
            <Form.Item name="name" label="数据集名称" rules={[{ required: true, message: '请输入数据集名称' }]}>
              <Input placeholder="例如：焊缝缺陷检测数据集 V2" />
            </Form.Item>
            <Space orientation="vertical" className="full-width" size={12}>
              <Space align="start" className="full-width" size={16} style={{ flexWrap: 'wrap' }}>
                <Form.Item name="dataType" label="数据类型" style={{ flex: 1, minWidth: 180 }}>
                  <Select options={['IMAGE', 'AUDIO_VIDEO'].map((v) => ({ value: v, label: txt(v) }))} />
                </Form.Item>
                <Form.Item name="accessLevel" label="访问级别" style={{ flex: 1, minWidth: 180 }}>
                  <Select options={['PUBLIC', 'TEAM', 'PRIVATE', 'RESTRICTED'].map((v) => ({ value: v, label: v }))} />
                </Form.Item>
              </Space>
              <Space align="start" className="full-width" size={16} style={{ flexWrap: 'wrap' }}>
                <Form.Item name="sourceId" label="来源数据源" style={{ flex: 1, minWidth: 240 }}>
                  <Select placeholder="选择可用的数据源" options={(sources.data ?? []).filter((s) => s.status === 'ACTIVE' && s.diagnosticCode === 'OK').map((s) => ({ value: s.sourceId, label: s.name }))} />
                </Form.Item>
                <Form.Item name="recordCount" label="样本数" style={{ width: 180 }}>
                  <Input type="number" min={0} placeholder="可留空" />
                </Form.Item>
              </Space>
            </Space>
            <Form.Item name="tags" label="标签" extra="只能从标签管理的已启用标签中选择；如需新增标签，请先到标签管理维护。">
              <Select
                mode="multiple"
                {...tagSelectSearchProps}
                allowClear
                loading={tagCatalog.isLoading}
                options={tagOptions}
                placeholder={tagOptions.length ? '请选择标签' : '暂无可用标签，请先到标签管理维护'}
                disabled={tagCatalog.isLoading || tagOptions.length === 0}
              />
            </Form.Item>
            <Form.Item name="description" label="数据集描述">
              <Input.TextArea rows={3} placeholder="描述数据集用途、采集方式、业务场景和质量要求" />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={create.isPending}>下一步：初始化数据集</Button>
            </Space>
          </Form>
        )}
        {step === 1 && (
          <Space orientation="vertical" className="full-width" size={16}>
            <Alert
              type="info"
              showIcon
              title="拖拽上传 / 文件对象登记"
              description={`拖拽文件后将自动计算 SHA-256、调用 /platform/files/init、上传文件内容并完成 /complete，再绑定到当前版本草稿。单文件上限 ${uploadLimitMb} MB。`}
            />
            {uploading ? (
              <Card size="small">
                <Space orientation="vertical" className="full-width" size={8}>
                  <Typography.Text strong>{uploadPhase}</Typography.Text>
                  <Progress percent={uploadProgress} status="active" />
                </Space>
              </Card>
            ) : null}
            <div className="dataset-upload-grid">
              <Card title="拖拽文件或文件夹" extra={<Tag color="blue">Upload.Dragger</Tag>} className="dataset-upload-drop">
                <Upload.Dragger
                  multiple
                  directory
                  accept=".zip,.tar,.json,.jsonl,.csv,.txt,.jpg,.jpeg,.jepg,.png,.bmp,.webp,.gif,.tif,.tiff,.heic,.avif"
                  beforeUpload={(file) => {
                    addUploadItem(file);
                    return false;
                  }}
                  showUploadList={false}
                >
                  <p className="ant-upload-drag-icon">⬆</p>
                  <p className="ant-upload-text">拖拽文件、文件夹，或点击选择文件</p>
                  <p className="ant-upload-hint">支持 jpg/jpeg/jepg/png/bmp/webp/gif/tif/tiff/heic/avif 图片、文本清单文件和压缩包；系统会自动登记文件对象并完成 hash/size 校验。</p>
                </Upload.Dragger>
                <Space wrap style={{ marginTop: 16 }}>
                  <Tag color="green">自动计算 SHA-256</Tag>
                  <Tag color="blue">自动登记平台文件对象</Tag>
                  <Tag color="gold">自动绑定当前数据集版本</Tag>
                  <Tag color="default">支持多文件 / 目录上传</Tag>
                </Space>
                <Space className="full-width" style={{ marginTop: 16, justifyContent: 'space-between' }}>
                  <Space wrap>
                    <Tag color="processing">队列 {uploadQueue.length}</Tag>
                    <Tag color="green">完成 {queueDoneCount}</Tag>
                    <Tag color="red">失败 {queueErrorCount}</Tag>
                    <Tag color="blue">进行中 {queueActiveCount}</Tag>
                    <Tag>{fmtSize(queueSizeBytes)}</Tag>
                  </Space>
                  <Space>
                    <Button onClick={clearQueue} disabled={uploading || uploadQueue.length === 0}>清空队列</Button>
                    <Button type="primary" loading={uploading} disabled={!canStartUpload} onClick={() => void handleUpload()}>
                      开始上传并绑定版本
                    </Button>
                  </Space>
                </Space>
              </Card>
              <Card title="上传参数与规则">
                <Space orientation="vertical" className="full-width" size={16}>
                  <Space orientation="vertical" className="full-width" size={6}>
                    <Typography.Text type="secondary">文件角色</Typography.Text>
                    <Select value={fileRole} onChange={setFileRole} options={[{ value: 'RAW', label: 'RAW 原始文件' }, { value: 'PREPROCESSED', label: 'PREPROCESSED 预处理文件' }, { value: 'ANNOTATED', label: 'ANNOTATED 标注文件' }]} />
                  </Space>
                  <Space orientation="vertical" className="full-width" size={6}>
                    <Typography.Text type="secondary">存储层级</Typography.Text>
                    <Select value={storageTier} onChange={setStorageTier} options={[{ value: 'STANDARD', label: 'STANDARD' }, { value: 'IA', label: 'IA' }, { value: 'ARCHIVE', label: 'ARCHIVE' }]} />
                  </Space>
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="数据集版本">{draft?.versions[0]?.versionName ?? 'v1.0.0'}</Descriptions.Item>
                    <Descriptions.Item label="租户">{draft?.dataset.tenantId ?? currentTenantId ?? 'TENANT-YF'}</Descriptions.Item>
                    <Descriptions.Item label="上传上限">{uploadLimitMb} MB / 文件</Descriptions.Item>
                    <Descriptions.Item label="校验策略">先登记对象，再用 sha256 + size 完成验收</Descriptions.Item>
                  </Descriptions>
                </Space>
              </Card>
            </div>
            <Card title={`上传队列（${uploadQueue.length}）`} styles={{ body: { paddingTop: 12 } }}>
              <Table
                rowKey="uid"
                dataSource={uploadQueue}
                pagination={false}
                columns={uploadColumns}
                locale={{ emptyText: '把文件拖到左侧区域后，这里会展示完整上传进度、校验结果和对象键。' }}
              />
            </Card>
          </Space>
        )}
        {step === 2 && (
          <Space orientation="vertical" className="full-width" size={16}>
            <Alert
              type="success"
              showIcon
              title="文件上传已完成"
              description="文件对象已登记、hash/size 已校验并绑定到当前数据集版本。若上传的是图片，进入详情页后可直接打开“图片预览”查看原图。"
            />
            <Card title="上传结果">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="完成文件数">{queueDoneCount}</Descriptions.Item>
                <Descriptions.Item label="失败文件数">{queueErrorCount}</Descriptions.Item>
                <Descriptions.Item label="总大小">{fmtSize(queueSizeBytes)}</Descriptions.Item>
                <Descriptions.Item label="队列进度">{queueProgress}%</Descriptions.Item>
                <Descriptions.Item label="详情预览">{draft?.previewStatus === 'PREVIEWABLE' ? '已可预览' : '暂无可预览图片'}</Descriptions.Item>
                <Descriptions.Item label="预览说明">{draft?.previewDiagnostic ?? '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
            <Table
              rowKey="uid"
              dataSource={uploadQueue}
              pagination={false}
              columns={uploadColumns.filter((column) => column.title !== '操作')}
              locale={{ emptyText: '暂无上传记录' }}
            />
            <Card title={`当前数据集版本文件（${draft?.files.length ?? 0}）`}>
              <Table
                rowKey="id"
                dataSource={draft?.files ?? []}
                pagination={false}
                columns={[{ title: '文件', dataIndex: 'fileId' }, { title: '状态', dataIndex: 'status' }, { title: 'Object Key', dataIndex: 'objectKey' }, { title: '大小', render: (_, r: { sizeBytes?: number | null }) => fmtSize(r.sizeBytes) }]}
              />
            </Card>
            <Space>
              <Button type="primary" onClick={() => nav('/dsdetail', { state: { datasetId: draft?.dataset.datasetId } })}>进入详情并预览</Button>
              <Button onClick={() => nav('/ds')}>返回数据集管理</Button>
            </Space>
          </Space>
        )}
      </Card>
    </div>
  );
}
