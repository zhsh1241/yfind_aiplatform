import { Alert, Button, Card, Descriptions, Drawer, Form, Input, InputNumber, Modal, Select, Space, Steps, Table, Tabs, Tag, Typography, Upload, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type UIEvent as ReactUIEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  dataApi,
  getAccessToken,
  platformApi,
  type AnnotationLabelTemplate,
  type AnnotationLabelTemplateInput,
  type AnnotationSourceDataset,
  type AnnotationExternalBinding,
  type AnnotationReviewItem,
  type AnnotationTaskSummary,
  type AnnotationTrainingExport,
  type DatasetAnnotationTask,
  type DataSourceSummary,
  type DataSourceSyncTask,
  type DataStandardProfile,
  type DataStandardTask,
  type DatasetDetail,
  type DatasetSummary,
  type DatasetUploadSession,
  type DatasetVersion,
  type FileObjectSummary,
  type OperatorDetail,
  type OperatorSummary,
  type PipelineDetail,
  type PipelineEdge,
  type PipelineNode,
  type PipelineRunDetail,
  type PipelineSaveInput,
  type PipelineVariable,
} from '../platform/platformApi';
import { useSessionStore } from '../platform/sessionStore';

const color = (status?: string) => ['ACTIVE', 'PUBLISHED', 'TESTED', 'OK', 'AVAILABLE', 'BOUND'].includes(status ?? '')
  ? 'green'
  : ['UNCONFIGURED', 'DRAFT', 'PAUSED'].includes(status ?? '') ? 'orange' : ['FAILED', 'DISABLED', 'ARCHIVED'].includes(status ?? '') ? 'red' : 'blue';
const fmtSize = (n?: number | null) => !n ? '0 B' : n > 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} GB` : n > 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${n} B`;
const txt = (v?: string | null) => ({ RAW: '原始数据', PREPROCESSED: '预处理后', ANNOTATED: '已标注', IMAGE: '图片', AUDIO_VIDEO: '影音', TEXT: '文本', TABULAR: '表格', EVENT: '事件', TIME_SERIES: '时序库', TELEMETRY: '遥测', FILE: '文件', OBJECT: '对象', OBJECT_STORAGE: '对象存储', RELATIONAL_DB: '关系型数据库', STREAM: '流数据', INDUSTRIAL_PROTOCOL: '工业协议', EXTERNAL_API: '外部接口', IMPORT: '导入', API: '外部接口', IMAGE_TAGGING: '图片打标', IMAGE_SEGMENTATION: '图片分割', TEXT_LABELING: '文本分类', ANNOTATION_RESULT: '标注文件', VISUAL_PREPROCESS: '视觉预处理', IMAGE_PROCESSING: '图片处理', VIDEO_PROCESSING: '视频处理', QUALITY_ENHANCEMENT: '质量增强', WATERMARK: '水印', FRAME_EXTRACTION: '抽帧', TRADITIONAL_ONLY: '传统增强', CONFIRMED: '已确认', PENDING_CONFIRMATION: '待确认', READY: '就绪' } as Record<string, string>)[v ?? ''] ?? v ?? '-';
const localFileRowKey = (file: File) => `${(file as File & { webkitRelativePath?: string }).webkitRelativePath ?? file.name}-${file.size}-${file.lastModified}`;
const localFileRelativePath = (file: File) => (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
const LOCAL_UPLOAD_BATCH_MAX_FILES = 10;
const LOCAL_UPLOAD_BATCH_MAX_BYTES = 8 * 1024 * 1024;
const ANNOTATION_THUMB_ITEM_HEIGHT = 116;
const ANNOTATION_THUMB_OVERSCAN = 4;
const ANNOTATION_THUMB_PANEL_FALLBACK_HEIGHT = 560;
const ANNOTATION_WORKBENCH_PAGE_SIZE = 50;
const SESSION_STORAGE_KEY = 'smp.session.v1';
const ANNOTATION_POLYGON_VERTEX_RADIUS = 2.6;
const ANNOTATION_POLYGON_VERTEX_RADIUS_SELECTED = 3.4;
const ANNOTATION_POLYGON_VERTEX_HIT_RADIUS = 7;
const ANNOTATION_SHAPE_STROKE_WIDTH = 1.4;
const ANNOTATION_SHAPE_STROKE_WIDTH_SELECTED = 2.4;
const ANNOTATION_DRAFT_STROKE_WIDTH = 1.35;
const ANNOTATION_DRAFT_POLYGON_VERTEX_RADIUS = 2.2;
const ANNOTATION_DRAFT_POLYGON_CLOSE_RADIUS = 3.1;
const ANNOTATION_DRAFT_POLYGON_HIT_RADIUS = 7;
const ANNOTATION_POLYGON_CENTER_MARK_SIZE = 6;

const splitLocalUploadBatches = (files: File[]) => {
  const batches: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;

  files.forEach((file) => {
    const exceedsFileCount = current.length >= LOCAL_UPLOAD_BATCH_MAX_FILES;
    const exceedsBytes = current.length > 0 && currentBytes + file.size > LOCAL_UPLOAD_BATCH_MAX_BYTES;
    if (exceedsFileCount || exceedsBytes) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.size;
  });

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
};

const safeJson = (value?: string | null) => {
  try {
    return JSON.stringify(JSON.parse(value || '{}'), null, 2);
  } catch {
    return value || '{}';
  }
};

const parseObjectConfig = (value?: string | null) => {
  try {
    const parsed = JSON.parse(value || '{}') as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

const stringifyObjectConfig = (value: Record<string, unknown>) => JSON.stringify(value, null, 2);
const stableJson = (value: unknown) => JSON.stringify(value);
const fmtDateTime = (value?: string | null) => value ? value.replace('T', ' ').replace('Z', '') : '-';

const toSaveInput = (detail: PipelineDetail, nodes: PipelineNode[], edges: PipelineEdge[], variables: PipelineVariable[]): PipelineSaveInput => ({
  name: detail.pipeline.name,
  tenantId: detail.pipeline.tenantId,
  projectId: detail.pipeline.projectId,
  description: detail.pipeline.description,
  templateCode: detail.pipeline.templateCode,
  sourceDatasetId: detail.pipeline.sourceDatasetId,
  sourceVersionId: detail.pipeline.sourceVersionId,
  resultDatasetConfig: {
    datasetName: `${detail.pipeline.name} 输出`,
    datasetType: 'PREPROCESSED',
    datasetDataType: detail.pipeline.sourceDatasetDataType === 'AUDIO_VIDEO' ? 'IMAGE' : 'IMAGE',
    autoActivate: false,
  },
  nodes,
  edges,
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
const lsStatusType = (status?: string) => ['PROJECT_SYNCED', 'TASK_SYNCED', 'RESULT_IMPORTED'].includes(status ?? '') ? 'success' : status === 'UNCONFIGURED' ? 'warning' : status?.includes('FAILED') || status?.includes('AUTH') || status?.includes('UNREACHABLE') ? 'error' : 'info';
const annotationClasses = ['焊接气孔', '裂纹', '夹渣', '未熔合'];
const annotationClassPalette = ['#ff6533', '#1a6bff', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const industrialSampleImages: Record<string, { url: string; title: string; source: string }> = {
  'TENANT-CABIN/weld/batch3/0001.jpg': {
    url: '/industrial-samples/tig-welding.jpg',
    title: 'Industrial TIG welding sample',
    source: 'Wikimedia Commons: TIG welding.jpg',
  },
  'TENANT-CABIN/weld/batch3/0002.jpg': {
    url: '/industrial-samples/foundry-blowhole.jpg',
    title: 'Industrial foundry blowhole sample',
    source: 'Wikimedia Commons: Foundry defect blowhole.jpg',
  },
  'weld/0001.jpg': {
    url: '/industrial-samples/tig-welding.jpg',
    title: 'Industrial TIG welding sample',
    source: 'Wikimedia Commons: TIG welding.jpg',
  },
};

function readStoredAccessToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { accessToken?: unknown };
    return typeof parsed.accessToken === 'string' && parsed.accessToken ? parsed.accessToken : null;
  } catch {
    return null;
  }
}

function useAnnotationSamplePreviewUrls(fileIds: string[]) {
  const token = useSessionStore((state) => state.token) ?? getAccessToken() ?? readStoredAccessToken();
  const [blobPreviewUrls, setBlobPreviewUrls] = useState<Record<string, string>>({});
  const objectUrlCacheRef = useRef<Record<string, string>>({});
  const fileIdKey = fileIds.join('|');
  const directUrls = useMemo(() => Object.fromEntries(fileIds.map((fileId) => [fileId, platformApi.fileContentUrl(fileId)])), [fileIdKey, fileIds]);
  const useBlobPreview = !!token && typeof window !== 'undefined' && typeof URL.createObjectURL === 'function' && fileIds.length > 0;

  useEffect(() => {
    if (!useBlobPreview) {
      return;
    }

    let cancelled = false;
    const pendingFileIds = fileIds.filter((fileId) => !objectUrlCacheRef.current[fileId]);

    if (pendingFileIds.length === 0) {
      setBlobPreviewUrls((current) => current);
      return;
    }

    void (async () => {
      const entries = await Promise.all(pendingFileIds.map(async (fileId) => {
        const directUrl = directUrls[fileId];
        try {
          const response = await fetch(directUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          return [fileId, objectUrl] as const;
        } catch {
          return [fileId, ''] as const;
        }
      }));

      if (cancelled) {
        entries.forEach(([, previewUrl]) => {
          if (previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
          }
        });
        return;
      }
      setBlobPreviewUrls((current) => {
        const next = { ...current };
        entries.forEach(([fileId, previewUrl]) => {
          objectUrlCacheRef.current[fileId] = previewUrl;
          next[fileId] = previewUrl;
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [directUrls, fileIds, token, useBlobPreview]);

  useEffect(() => () => {
    Object.values(objectUrlCacheRef.current).forEach((previewUrl) => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    });
    objectUrlCacheRef.current = {};
  }, []);

  const previewUrls = useMemo(
    () => Object.fromEntries(fileIds.map((fileId) => [fileId, useBlobPreview ? (blobPreviewUrls[fileId] ?? '') : directUrls[fileId]])),
    [blobPreviewUrls, directUrls, fileIdKey, fileIds, useBlobPreview],
  );

  return previewUrls;
}

const visualOperatorLabel = (operator: OperatorSummary) => {
  const parts = [
    operator.categoryGroup ? txt(operator.categoryGroup) : null,
    txt(operator.category),
    operator.subCategory ? txt(operator.subCategory) : null,
  ].filter(Boolean);
  return parts.join(' / ');
};

const datasetStatusText = (status?: string | null) => ({
  ACTIVE: '已激活',
  CONFIRMED: '已确认',
  PENDING_CONFIRMATION: '待确认',
  READY: '就绪',
  DRAFT: '草稿',
  ARCHIVED: '已归档',
} as Record<string, string>)[status ?? ''] ?? status ?? '-';

const annotationSourceLabel = (item: AnnotationSourceDataset) => [
  item.name,
  `（${item.datasetId}）`,
  `· ${txt(item.datasetType)}/${txt(item.dataType)}`,
  item.sourceDatasetName ? `· 来源 ${item.sourceDatasetName}` : '',
  `· ${datasetStatusText(item.status)}`,
].join('');

const defaultPipelineNodeConfig = (operator: OperatorSummary, detail: PipelineDetail) => {
  switch (operator.operatorId) {
    case 'OP-READ-DATASET':
      return JSON.stringify({ datasetId: detail.pipeline.sourceDatasetId ?? 'DATASET-WELD-DEFECT' });
    case 'OP-IMG-WATERMARK':
      return JSON.stringify({
        previewWatermarkEnabled: true,
        artifactWatermarkEnabled: false,
        watermarkText: '',
        position: 'BOTTOM_RIGHT',
        opacity: 0.4,
      });
    case 'OP-IMG-ENHANCE':
      return JSON.stringify({
        enhancementMode: 'TRADITIONAL_ONLY',
        sharpen: true,
        denoise: true,
        brightnessContrastOptimize: true,
      });
    case 'OP-IMG-DENOISE':
      return JSON.stringify({ strength: 0.4 });
    case 'OP-IMG-SHARPEN':
      return JSON.stringify({ strength: 0.6 });
    case 'OP-VIDEO-FRAME-EXTRACT':
      return JSON.stringify({ mode: 'FIXED_INTERVAL', intervalSeconds: 2, outputImageFormat: 'JPG' });
    case 'OP-VIDEO-FPS-EXTRACT':
      return JSON.stringify({ mode: 'FIXED_FPS', targetFps: 5, outputImageFormat: 'JPG' });
    case 'OP-VIDEO-KEYFRAME':
      return JSON.stringify({ mode: 'KEYFRAME' });
    case 'OP-VIDEO-SEGMENT':
      return JSON.stringify({ segmentSeconds: 10 });
    case 'OP-VIDEO-RESOLUTION-UNIFY':
      return JSON.stringify({ width: 1280, height: 720 });
    case 'OP-VIDEO-FPS-UNIFY':
      return JSON.stringify({ targetFps: 25 });
    case 'OP-IMAGE-RESIZE':
      return JSON.stringify({ width: 1280, height: 720, keepAspectRatio: true });
    case 'OP-FORMAT-CONVERT':
      return JSON.stringify({ targetFormat: 'COCO' });
    default:
      return '{}';
  }
};

function PipelineNodeConfigForm({
  node,
  operator,
  onChange,
}: {
  node?: PipelineNode;
  operator?: Pick<OperatorSummary, 'operatorId' | 'name' | 'enhancementMode' | 'defaultOutputDatasetDataType' | 'annotationRiskLevel'> | null;
  onChange: (configJson: string) => void;
}) {
  const config = useMemo(() => parseObjectConfig(node?.configJson), [node?.configJson]);
  const operatorId = operator?.operatorId ?? node?.operatorId;
  if (!node || !operatorId) {
    return <Typography.Text type="secondary">请选择一个算子后编辑参数。</Typography.Text>;
  }
  if (!config) {
    return <Alert type="warning" showIcon message="当前参数 JSON 无法解析" description="请先修复原始 JSON，再继续使用结构化参数面板。" />;
  }

  const updateField = (key: string, value: unknown) => {
    onChange(stringifyObjectConfig({ ...config, [key]: value }));
  };
  const booleanOptions = [
    { value: true, label: '开启' },
    { value: false, label: '关闭' },
  ];

  const renderBoolean = (label: string, field: string) => (
    <Form.Item label={label}>
      <Select value={Boolean(config[field])} onChange={(value) => updateField(field, value)} options={booleanOptions} />
    </Form.Item>
  );

  switch (operatorId) {
    case 'OP-READ-DATASET':
      return (
        <Form layout="vertical">
          <Form.Item label="源数据集ID">
            <Input value={String(config.datasetId ?? '')} onChange={(event) => updateField('datasetId', event.target.value)} />
          </Form.Item>
        </Form>
      );
    case 'OP-IMG-WATERMARK':
      return (
        <Space direction="vertical" className="full-width">
          <Alert type="info" showIcon message="预览水印与产物水印分离" description="默认仅开启预览水印；若开启产物水印，结果集默认不可进入标注链路。" />
          <Form layout="vertical">
            {renderBoolean('预览水印', 'previewWatermarkEnabled')}
            {renderBoolean('产物水印', 'artifactWatermarkEnabled')}
            <Form.Item label="水印文本">
              <Input value={String(config.watermarkText ?? '')} onChange={(event) => updateField('watermarkText', event.target.value)} placeholder="例如：SMP Preview" />
            </Form.Item>
            <Form.Item label="位置">
              <Select
                value={String(config.position ?? 'BOTTOM_RIGHT')}
                onChange={(value) => updateField('position', value)}
                options={[
                  { value: 'TOP_LEFT', label: '左上' },
                  { value: 'TOP_RIGHT', label: '右上' },
                  { value: 'BOTTOM_LEFT', label: '左下' },
                  { value: 'BOTTOM_RIGHT', label: '右下' },
                  { value: 'CENTER', label: '居中' },
                ]}
              />
            </Form.Item>
            <Form.Item label="透明度">
              <InputNumber min={0.1} max={1} step={0.1} style={{ width: '100%' }} value={typeof config.opacity === 'number' ? config.opacity : 0.4} onChange={(value) => updateField('opacity', value ?? 0.4)} />
            </Form.Item>
          </Form>
        </Space>
      );
    case 'OP-IMG-ENHANCE':
      return (
        <Space direction="vertical" className="full-width">
          <Alert type="info" showIcon message="一期仅支持传统增强" description="固定支持锐化、去噪、亮度/对比度优化，不支持 AI 超分或生成式修复。" />
          <Form layout="vertical">
            <Form.Item label="增强模式">
              <Select value={String(config.enhancementMode ?? operator?.enhancementMode ?? 'TRADITIONAL_ONLY')} onChange={(value) => updateField('enhancementMode', value)} options={[{ value: 'TRADITIONAL_ONLY', label: '传统增强' }]} />
            </Form.Item>
            {renderBoolean('锐化增强', 'sharpen')}
            {renderBoolean('去噪增强', 'denoise')}
            {renderBoolean('亮度/对比度优化', 'brightnessContrastOptimize')}
          </Form>
        </Space>
      );
    case 'OP-IMG-DENOISE':
    case 'OP-IMG-SHARPEN':
      return (
        <Form layout="vertical">
          <Form.Item label="强度">
            <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} value={typeof config.strength === 'number' ? config.strength : operatorId === 'OP-IMG-SHARPEN' ? 0.6 : 0.4} onChange={(value) => updateField('strength', value ?? (operatorId === 'OP-IMG-SHARPEN' ? 0.6 : 0.4))} />
          </Form.Item>
        </Form>
      );
    case 'OP-VIDEO-FRAME-EXTRACT':
      return (
        <Space direction="vertical" className="full-width">
          <Alert type="info" showIcon message="抽帧结果默认输出图片型 PREPROCESSED 数据集" />
          <Form layout="vertical">
            <Form.Item label="抽帧模式">
              <Select value={String(config.mode ?? 'FIXED_INTERVAL')} onChange={(value) => updateField('mode', value)} options={[{ value: 'FIXED_INTERVAL', label: '固定间隔抽帧' }]} />
            </Form.Item>
            <Form.Item label="抽帧间隔（秒）">
              <InputNumber min={1} step={1} style={{ width: '100%' }} value={typeof config.intervalSeconds === 'number' ? config.intervalSeconds : 2} onChange={(value) => updateField('intervalSeconds', value ?? 2)} />
            </Form.Item>
            <Form.Item label="输出图片格式">
              <Select value={String(config.outputImageFormat ?? 'JPG')} onChange={(value) => updateField('outputImageFormat', value)} options={[{ value: 'JPG', label: 'JPG' }, { value: 'PNG', label: 'PNG' }]} />
            </Form.Item>
          </Form>
        </Space>
      );
    case 'OP-VIDEO-FPS-EXTRACT':
      return (
        <Space direction="vertical" className="full-width">
          <Alert type="info" showIcon message="抽帧结果默认输出图片型 PREPROCESSED 数据集" />
          <Form layout="vertical">
            <Form.Item label="抽帧模式">
              <Select value={String(config.mode ?? 'FIXED_FPS')} onChange={(value) => updateField('mode', value)} options={[{ value: 'FIXED_FPS', label: '固定帧率抽帧' }]} />
            </Form.Item>
            <Form.Item label="目标帧率">
              <InputNumber min={1} step={1} style={{ width: '100%' }} value={typeof config.targetFps === 'number' ? config.targetFps : 5} onChange={(value) => updateField('targetFps', value ?? 5)} />
            </Form.Item>
            <Form.Item label="输出图片格式">
              <Select value={String(config.outputImageFormat ?? 'JPG')} onChange={(value) => updateField('outputImageFormat', value)} options={[{ value: 'JPG', label: 'JPG' }, { value: 'PNG', label: 'PNG' }]} />
            </Form.Item>
          </Form>
        </Space>
      );
    case 'OP-VIDEO-KEYFRAME':
      return (
        <Space direction="vertical" className="full-width">
          <Alert type="info" showIcon message="关键帧提取为次优先策略" description="一期仍优先推荐固定间隔抽帧或固定帧率抽帧。" />
          <Form layout="vertical">
            <Form.Item label="抽帧模式">
              <Select value={String(config.mode ?? 'KEYFRAME')} onChange={(value) => updateField('mode', value)} options={[{ value: 'KEYFRAME', label: '关键帧提取' }]} />
            </Form.Item>
          </Form>
        </Space>
      );
    case 'OP-VIDEO-SEGMENT':
      return (
        <Form layout="vertical">
          <Form.Item label="分段时长（秒）">
            <InputNumber min={1} step={1} style={{ width: '100%' }} value={typeof config.segmentSeconds === 'number' ? config.segmentSeconds : 10} onChange={(value) => updateField('segmentSeconds', value ?? 10)} />
          </Form.Item>
        </Form>
      );
    case 'OP-VIDEO-RESOLUTION-UNIFY':
    case 'OP-IMAGE-RESIZE':
      return (
        <Form layout="vertical">
          <Form.Item label="宽度">
            <InputNumber min={1} step={1} style={{ width: '100%' }} value={typeof config.width === 'number' ? config.width : 1280} onChange={(value) => updateField('width', value ?? 1280)} />
          </Form.Item>
          <Form.Item label="高度">
            <InputNumber min={1} step={1} style={{ width: '100%' }} value={typeof config.height === 'number' ? config.height : 720} onChange={(value) => updateField('height', value ?? 720)} />
          </Form.Item>
          {operatorId === 'OP-IMAGE-RESIZE' ? renderBoolean('保持宽高比', 'keepAspectRatio') : null}
        </Form>
      );
    case 'OP-VIDEO-FPS-UNIFY':
      return (
        <Form layout="vertical">
          <Form.Item label="统一目标帧率">
            <InputNumber min={1} step={1} style={{ width: '100%' }} value={typeof config.targetFps === 'number' ? config.targetFps : 25} onChange={(value) => updateField('targetFps', value ?? 25)} />
          </Form.Item>
        </Form>
      );
    case 'OP-FORMAT-CONVERT':
      return (
        <Form layout="vertical">
          <Form.Item label="目标格式">
            <Select
              value={String(config.targetFormat ?? 'COCO')}
              onChange={(value) => updateField('targetFormat', value)}
              options={[
                { value: 'COCO', label: 'COCO' },
                { value: 'YOLO', label: 'YOLO' },
                { value: 'JSONL', label: 'JSONL' },
                { value: 'PNG', label: 'PNG' },
                { value: 'JPG', label: 'JPG' },
              ]}
            />
          </Form.Item>
        </Form>
      );
    default:
      return <Alert type="info" showIcon message={`${operator?.name ?? node.label} 当前未定义专属参数面板，可直接编辑下方原始 JSON。`} />;
  }
}

type DraftBox = { x: number; y: number; w: number; h: number };
type AnnotationPoint = { x: number; y: number };
type AnnotationShape = 'rect' | 'ellipse' | 'polygon';
type AnnotationBox = { id: string; x: number; y: number; w: number; h: number; label: string; cls: number; shape: AnnotationShape; confidence?: number; source?: 'manual' | 'ai' };
type AnnotationPolygon = { id: string; points: AnnotationPoint[]; label: string; cls: number; confidence?: number; source?: 'manual' | 'ai' };
type DragState = { boxId: string; start: { x: number; y: number }; origin: { x: number; y: number } };
type PolygonVertexDragState = { polygonId: string; pointIndex: number; pointerId: number };
type PolygonEdgeDragState = {
  polygonId: string;
  edgeIndex: number;
  pointerId: number;
  start: AnnotationPoint;
  originStart: AnnotationPoint;
  originEnd: AnnotationPoint;
};
type AnnotationSnapshot = { boxes: AnnotationBox[]; polygons: AnnotationPolygon[]; selectedShapeId: string };
type AnnotationEditorState = AnnotationSnapshot & { history: AnnotationSnapshot[]; historyIndex: number };
type AnnotationEditorAction =
  | { type: 'reset'; boxes: AnnotationBox[]; polygons: AnnotationPolygon[]; selectedShapeId?: string }
  | { type: 'commit'; boxes: AnnotationBox[]; polygons: AnnotationPolygon[]; selectedShapeId?: string }
  | { type: 'commit-current'; selectedShapeId?: string }
  | { type: 'move-box'; boxId: string; x: number; y: number }
  | { type: 'replace-current'; boxes: AnnotationBox[]; polygons: AnnotationPolygon[] }
  | { type: 'select'; selectedShapeId: string }
  | { type: 'undo' }
  | { type: 'redo' };
const editableWorkStatuses = ['PENDING', 'DRAFT', 'REJECTED'];
const canEditWorkItem = (status?: string | null) => editableWorkStatuses.includes(status ?? '');
const canAutoStartAnnotationTask = (status?: string | null) => status === 'ASSIGNED';
const annotationTaskDefaults = {
  name: '焊缝缺陷检测标注任务',
  scene: 'IMAGE_TAGGING',
  reviewEnabled: true,
  prelabelEnabled: false,
  labelStudioEnabled: true,
} as const;
const shapeText = (shape: AnnotationShape) => ({ rect: '矩形', ellipse: '椭圆', polygon: '多边形' })[shape];
const parseTemplateLabels = (labelSchemaJson?: string | null) => {
  try {
    const parsed = JSON.parse(labelSchemaJson || '{}') as { labels?: unknown };
    if (!Array.isArray(parsed.labels)) return [];
    return parsed.labels
      .map((item) => typeof item === 'string' ? item : (item && typeof item === 'object' && 'name' in item ? String((item as { name?: unknown }).name ?? '') : ''))
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};
const annotationSceneOptions = [
  { value: 'IMAGE_TAGGING', label: '图片打标' },
  { value: 'IMAGE_SEGMENTATION', label: '图片分割' },
];
const annotationTemplateSceneOptions = [
  ...annotationSceneOptions,
  { value: 'TEXT_LABELING', label: '文本分类' },
];
const annotationLabelTypeOptions = [
  { value: 'BOUNDING_BOX', label: '边界框' },
  { value: 'CATEGORY', label: '分类标签' },
  { value: 'POLYGON', label: '多边形' },
  { value: 'TEXT_CLASSIFICATION', label: '文本分类' },
];
const defaultLabelSchema = (scene?: string) => scene === 'IMAGE_SEGMENTATION'
  ? '{"labels":["裂纹区域","气孔区域"]}'
  : scene === 'TEXT_LABELING'
    ? '{"labels":["质量投诉","设备故障","工艺咨询"],"dataType":"TEXT"}'
    : '{"labels":["裂纹","气孔"]}';
const parseInlineLabels = (value?: string) => Array.from(new Set(String(value ?? '').split(/[\n,，]/).map((item) => item.trim()).filter(Boolean)));
const labelStudioXmlForTemplate = (scene?: string, labelSchemaJson?: string, fallbackXml?: string) => {
  if (fallbackXml?.trim()) return fallbackXml.trim();
  const parsedLabels = parseTemplateLabels(labelSchemaJson);
  const labels = parsedLabels.length ? parsedLabels : ['待确认标签'];
  if (scene === 'TEXT_LABELING') {
    const choiceNodes = labels.map((label) => `<Choice value="${label}"/>`).join('');
    return `<View><Text name="text" value="$text"/><Choices name="label" toName="text" choice="single">${choiceNodes}</Choices></View>`;
  }
  const labelNodes = labels.map((label) => `<Label value="${label}"/>`).join('');
  if (scene === 'IMAGE_SEGMENTATION') {
    return `<View><Image name="image" value="$image"/><PolygonLabels name="label" toName="image">${labelNodes}</PolygonLabels></View>`;
  }
  return `<View><Image name="image" value="$image"/><RectangleLabels name="label" toName="image">${labelNodes}</RectangleLabels></View>`;
};
const polygonPoints = (box: DraftBox) => [
  [box.x + box.w * 0.5, box.y],
  [box.x + box.w, box.y + box.h * 0.28],
  [box.x + box.w * 0.82, box.y + box.h],
  [box.x + box.w * 0.18, box.y + box.h],
  [box.x, box.y + box.h * 0.28],
].map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(' ');
const polygonPath = (points: AnnotationPoint[]) => points.map((point) => `${Math.round(point.x)},${Math.round(point.y)}`).join(' ');
const polygonCentroid = (points: AnnotationPoint[]) => {
  if (!points.length) return { x: 0, y: 0 };
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: Math.round(sum.x / points.length), y: Math.round(sum.y / points.length) };
};
let annotationShapeSequence = 0;
const nextAnnotationShapeId = (prefix: 'box' | 'poly') => `${prefix}-${++annotationShapeSequence}`;
const safeSetPointerCapture = (element: Element | null | undefined, pointerId: number) => {
  if (element && 'setPointerCapture' in element && typeof element.setPointerCapture === 'function') {
    element.setPointerCapture(pointerId);
  }
};
const safeReleasePointerCapture = (element: Element | null | undefined, pointerId: number) => {
  if (element && 'hasPointerCapture' in element && typeof element.hasPointerCapture === 'function' && element.hasPointerCapture(pointerId) && 'releasePointerCapture' in element && typeof element.releasePointerCapture === 'function') {
    element.releasePointerCapture(pointerId);
  }
};
const normalizeLabelIndex = (value: unknown, labels: string[]) => {
  const total = Math.max(labels.length, 1);
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(Math.trunc(numeric), total - 1));
};
const clampAnnotationPoint = (point: AnnotationPoint): AnnotationPoint => ({
  x: Math.max(0, Math.min(520, Math.round(point.x))),
  y: Math.max(0, Math.min(340, Math.round(point.y))),
});
const normalizePoint = (value: unknown): AnnotationPoint | null => {
  if (!value || typeof value !== 'object') return null;
  const x = Number((value as { x?: unknown }).x);
  const y = Number((value as { y?: unknown }).y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
};
const serializeAnnotationPayload = (scene: string | undefined, boxes: AnnotationBox[], polygons: AnnotationPolygon[]) => JSON.stringify(scene === 'IMAGE_SEGMENTATION'
  ? {
    polygons: polygons.map((polygon) => ({ id: polygon.id, label: polygon.label, cls: polygon.cls, source: polygon.source ?? 'manual', confidence: polygon.confidence, points: polygon.points })),
  }
  : {
    boxes: boxes.map((box) => ({ id: box.id, label: box.label, cls: box.cls, shape: box.shape, x: box.x, y: box.y, w: box.w, h: box.h, source: box.source ?? 'manual', confidence: box.confidence })),
  });
const parseAnnotationPayload = (scene?: string, rawJson?: string | null, labels: string[] = annotationClasses) => {
  if (!rawJson?.trim()) {
    return { boxes: [] as AnnotationBox[], polygons: [] as AnnotationPolygon[] };
  }
  try {
    const parsed = JSON.parse(rawJson) as { boxes?: unknown[]; polygons?: unknown[] };
    if (scene === 'IMAGE_SEGMENTATION') {
      const polygons = Array.isArray(parsed.polygons)
        ? parsed.polygons.map((item, index) => {
          const points = Array.isArray((item as { points?: unknown[] }).points)
            ? ((item as { points?: unknown[] }).points ?? []).map(normalizePoint).filter(Boolean) as AnnotationPoint[]
            : [];
          if (points.length < 3) return null;
          const cls = normalizeLabelIndex((item as { cls?: unknown }).cls ?? index, labels);
          return {
            id: String((item as { id?: unknown }).id ?? `poly-${index + 1}`),
            label: String((item as { label?: unknown }).label ?? labels[cls] ?? annotationClasses[cls % annotationClasses.length]),
            cls,
            confidence: typeof (item as { confidence?: unknown }).confidence === 'number' ? Number((item as { confidence?: unknown }).confidence) : undefined,
            source: ((item as { source?: unknown }).source === 'ai' ? 'ai' : 'manual') as 'manual' | 'ai',
            points,
          } satisfies AnnotationPolygon;
        }).filter(Boolean) as AnnotationPolygon[]
        : [];
      if (polygons.length) return { boxes: [] as AnnotationBox[], polygons };
      const fallbackPolygons = Array.isArray(parsed.boxes)
        ? parsed.boxes.map((item, index) => {
          const x = Number((item as { x?: unknown }).x);
          const y = Number((item as { y?: unknown }).y);
          const w = Number((item as { w?: unknown }).w);
          const h = Number((item as { h?: unknown }).h);
          if (![x, y, w, h].every(Number.isFinite)) return null;
          const cls = normalizeLabelIndex((item as { cls?: unknown }).cls ?? index, labels);
          return {
            id: String((item as { id?: unknown }).id ?? `poly-box-${index + 1}`),
            label: String((item as { label?: unknown }).label ?? labels[cls] ?? annotationClasses[cls % annotationClasses.length]),
            cls,
            confidence: typeof (item as { confidence?: unknown }).confidence === 'number' ? Number((item as { confidence?: unknown }).confidence) : undefined,
            source: ((item as { source?: unknown }).source === 'ai' ? 'ai' : 'manual') as 'manual' | 'ai',
            points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }],
          } satisfies AnnotationPolygon;
        }).filter(Boolean) as AnnotationPolygon[]
        : [];
      return { boxes: [] as AnnotationBox[], polygons: fallbackPolygons };
    }
    const boxes = Array.isArray(parsed.boxes)
      ? parsed.boxes.map((item, index) => {
        const cls = normalizeLabelIndex((item as { cls?: unknown }).cls ?? index, labels);
        const x = Number((item as { x?: unknown }).x);
        const y = Number((item as { y?: unknown }).y);
        const w = Number((item as { w?: unknown }).w);
        const h = Number((item as { h?: unknown }).h);
        if (![x, y, w, h].every(Number.isFinite)) return null;
        return {
          id: String((item as { id?: unknown }).id ?? `box-${index + 1}`),
          x, y, w, h,
          label: String((item as { label?: unknown }).label ?? labels[cls] ?? annotationClasses[cls % annotationClasses.length]),
          cls,
          shape: (((item as { shape?: unknown }).shape ?? 'rect') === 'ellipse' ? 'ellipse' : ((item as { shape?: unknown }).shape ?? 'rect') === 'polygon' ? 'polygon' : 'rect') as AnnotationShape,
          confidence: typeof (item as { confidence?: unknown }).confidence === 'number' ? Number((item as { confidence?: unknown }).confidence) : undefined,
          source: ((item as { source?: unknown }).source === 'ai' ? 'ai' : 'manual') as 'manual' | 'ai',
        } satisfies AnnotationBox;
      }).filter(Boolean) as AnnotationBox[]
      : [];
    return { boxes, polygons: [] as AnnotationPolygon[] };
  } catch {
    return { boxes: [] as AnnotationBox[], polygons: [] as AnnotationPolygon[] };
  }
};
const normalizeAnnotationPayload = (scene?: string, rawJson?: string | null, labels: string[] = annotationClasses) => {
  const parsed = parseAnnotationPayload(scene, rawJson, labels);
  return serializeAnnotationPayload(scene, parsed.boxes, parsed.polygons);
};
const initialAnnotationEditorState: AnnotationEditorState = {
  boxes: [],
  polygons: [],
  selectedShapeId: '',
  history: [{ boxes: [], polygons: [], selectedShapeId: '' }],
  historyIndex: 0,
};
const pushAnnotationHistory = (state: AnnotationEditorState, boxes: AnnotationBox[], polygons: AnnotationPolygon[], selectedShapeId?: string): AnnotationEditorState => {
  const selected = selectedShapeId !== undefined ? selectedShapeId : state.selectedShapeId;
  const nextSelected = [...boxes, ...polygons].some((shape) => shape.id === selected) ? selected : boxes[0]?.id ?? polygons[0]?.id ?? '';
  const snapshot = { boxes, polygons, selectedShapeId: nextSelected };
  const snapshots = [...state.history.slice(0, state.historyIndex + 1), snapshot];
  return { ...snapshot, history: snapshots, historyIndex: snapshots.length - 1 };
};
const annotationEditorReducer = (state: AnnotationEditorState, action: AnnotationEditorAction): AnnotationEditorState => {
  if (action.type === 'reset') {
    const selectedShapeId = action.selectedShapeId ?? action.boxes[0]?.id ?? action.polygons[0]?.id ?? '';
    const snapshot = { boxes: action.boxes, polygons: action.polygons, selectedShapeId };
    return { ...snapshot, history: [snapshot], historyIndex: 0 };
  }
  if (action.type === 'commit') return pushAnnotationHistory(state, action.boxes, action.polygons, action.selectedShapeId);
  if (action.type === 'commit-current') return pushAnnotationHistory(state, state.boxes, state.polygons, action.selectedShapeId);
  if (action.type === 'move-box') {
    return {
      ...state,
      boxes: state.boxes.map((box) => box.id === action.boxId ? {
        ...box,
        x: Math.max(0, Math.min(520 - box.w, action.x)),
        y: Math.max(0, Math.min(340 - box.h, action.y)),
      } : box),
      selectedShapeId: action.boxId,
    };
  }
  if (action.type === 'replace-current') return { ...state, boxes: action.boxes, polygons: action.polygons };
  if (action.type === 'select') return { ...state, selectedShapeId: action.selectedShapeId };
  if (action.type === 'undo') {
    if (state.historyIndex <= 0) return state;
    const historyIndex = state.historyIndex - 1;
    const snapshot = state.history[historyIndex] ?? initialAnnotationEditorState.history[0];
    return { ...state, ...snapshot, historyIndex };
  }
  if (action.type === 'redo') {
    if (state.historyIndex >= state.history.length - 1) return state;
    const historyIndex = state.historyIndex + 1;
    const snapshot = state.history[historyIndex] ?? initialAnnotationEditorState.history[0];
    return { ...state, ...snapshot, historyIndex };
  }
  return state;
};

export function AnnotationTasksPage() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { openCreateTask?: boolean; datasetId?: string } };
  const currentTenantId = useSessionStore((state) => state.user?.tenantId);
  const qc = useQueryClient();
  const [msg, holder] = message.useMessage();
  const [status, setStatus] = useState<string>();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [enteringTaskId, setEnteringTaskId] = useState<string>();
  const [taskForm] = Form.useForm<{
    name: string;
    sourceDatasetId?: string;
    sourceVersionId?: string | null;
    templateId?: string;
    templateMode?: 'EXISTING' | 'INLINE_CREATE';
    inlineLabels?: string;
    inlineTemplateName?: string;
    scene: string;
    reviewEnabled: boolean;
    prelabelEnabled: boolean;
    labelStudioEnabled: boolean;
    note?: string;
  }>();
  const [templateForm] = Form.useForm<AnnotationLabelTemplateInput>();
  const taskScene = Form.useWatch('scene', taskForm) ?? 'IMAGE_TAGGING';
  const selectedTaskDatasetId = Form.useWatch('sourceDatasetId', taskForm);
  const taskTemplateMode = Form.useWatch('templateMode', taskForm) ?? 'INLINE_CREATE';
  const templateScene = Form.useWatch('scene', templateForm);
  const templateSchema = Form.useWatch('labelSchemaJson', templateForm);
  const overview = useQuery({ queryKey: ['annotation-overview'], queryFn: dataApi.annotationOverview });
  const tasks = useQuery({ queryKey: ['annotation-tasks', status], queryFn: () => dataApi.annotationTasks({ status }) });
  const sourceDatasets = useQuery({ queryKey: ['annotation-source-datasets', taskScene], queryFn: () => dataApi.annotationSourceDatasets({ scene: taskScene, pageSize: 100 }) });
  const templates = useQuery({ queryKey: ['annotation-templates'], queryFn: () => dataApi.labelTemplates() });
  const inv = useCallback(() => Promise.all([
    qc.invalidateQueries({ queryKey: ['annotation-overview'] }),
    qc.invalidateQueries({ queryKey: ['annotation-tasks'] }),
    qc.invalidateQueries({ queryKey: ['annotation-templates'] }),
  ]), [qc]);
  const createTask = useMutation({
    mutationFn: async (values: {
      name: string;
      sourceDatasetId: string;
      sourceVersionId?: string | null;
      templateId?: string;
      templateMode?: 'EXISTING' | 'INLINE_CREATE';
      inlineLabels?: string;
      inlineTemplateName?: string;
      scene: string;
      reviewEnabled: boolean;
      prelabelEnabled: boolean;
      labelStudioEnabled: boolean;
      note?: string;
    }) => {
      let templateId = values.templateId;
      let inlineLabels: string[] | undefined;
      let inlineTemplateName: string | undefined;
      if (values.templateMode === 'INLINE_CREATE' || !templateId) {
        inlineLabels = parseInlineLabels(values.inlineLabels);
        if (inlineLabels.length === 0) {
          throw new Error('请至少输入一个标签。');
        }
        inlineTemplateName = values.inlineTemplateName?.trim() || `${selectedTaskDataset?.name ?? '数据集'} ${txt(values.scene)}模板`;
        templateId = undefined;
      }
      return dataApi.createAnnotationTask({
        ...values,
        prelabelEnabled: false,
        templateId,
        inlineLabels,
        inlineTemplateName,
        assigneeIds: [],
        reviewerIds: [],
        prelabelModelSource: 'TODO_CONFIRM_PRELABEL_MODEL_SOURCE',
        prelabelConfidence: 0.7,
      });
    },
    onSuccess: async () => { setWizardOpen(false); await inv(); msg.success('标注任务已创建'); },
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
  const annotationDatasets = (sourceDatasets.data?.items ?? []).filter((item) => item.dataType === 'IMAGE');
  const selectableTaskTemplates = publishedTemplates.filter((item) => item.scene === taskScene);
  const selectedTaskDataset = annotationDatasets.find((item) => item.datasetId === selectedTaskDatasetId);
  const openWorkbench = useCallback((taskId: string) => {
    nav(`/annwork?taskId=${encodeURIComponent(taskId)}`, { state: { taskId } });
  }, [nav]);
  const enterWorkbench = useCallback(async (task: AnnotationTaskSummary) => {
    try {
      setEnteringTaskId(task.taskId);
      if (canAutoStartAnnotationTask(task.status)) {
        await dataApi.startAnnotationTask(task.taskId);
        await inv();
      }
      openWorkbench(task.taskId);
    } catch (error) {
      msg.error(error instanceof Error ? error.message : '进入标注工作台失败');
    } finally {
      setEnteringTaskId(undefined);
    }
  }, [inv, msg, openWorkbench]);
  const openTaskWizard = useCallback((datasetId?: string) => {
    const selectedDataset = annotationDatasets.find((item) => item.datasetId === datasetId) ?? annotationDatasets[0];
    const defaultScene = annotationTaskDefaults.scene;
    const defaultTemplateId = publishedTemplates.find((item) => item.scene === defaultScene)?.templateId;
    setWizardOpen(true);
    taskForm.resetFields();
    taskForm.setFieldsValue({
      ...annotationTaskDefaults,
      sourceDatasetId: selectedDataset?.datasetId,
      sourceVersionId: selectedDataset?.currentVersionId ?? undefined,
      templateId: defaultTemplateId,
      templateMode: 'INLINE_CREATE',
      inlineLabels: annotationClasses.join('，'),
      inlineTemplateName: `${selectedDataset?.name ?? '数据集'} ${txt(defaultScene)}模板`,
    });
  }, [annotationDatasets, publishedTemplates, taskForm]);

  useEffect(() => {
    if (!wizardOpen) return;
    const currentTemplateId = taskForm.getFieldValue('templateId');
    if (currentTemplateId && !selectableTaskTemplates.some((item) => item.templateId === currentTemplateId)) {
      taskForm.setFieldValue('templateId', selectableTaskTemplates[0]?.templateId);
    }
    if (taskTemplateMode === 'EXISTING' && !currentTemplateId && selectableTaskTemplates.length) {
      taskForm.setFieldValue('templateId', selectableTaskTemplates[0]?.templateId);
    }
    if (selectableTaskTemplates.length === 0 && taskTemplateMode !== 'INLINE_CREATE') {
      taskForm.setFieldValue('templateMode', 'INLINE_CREATE');
    }
  }, [taskForm, selectableTaskTemplates, taskTemplateMode, wizardOpen]);

  useEffect(() => {
    if (!wizardOpen || !selectedTaskDataset) return;
    const currentVersionId = taskForm.getFieldValue('sourceVersionId');
    if (!currentVersionId || currentVersionId !== selectedTaskDataset.currentVersionId) {
      taskForm.setFieldValue('sourceVersionId', selectedTaskDataset.currentVersionId ?? undefined);
    }
  }, [selectedTaskDataset, taskForm, wizardOpen]);

  useEffect(() => {
    if (!loc.state?.openCreateTask || sourceDatasets.isLoading) return;
    const timer = window.setTimeout(() => {
      openTaskWizard(loc.state?.datasetId);
      if (loc.state?.datasetId && !annotationDatasets.some((item) => item.datasetId === loc.state?.datasetId)) {
        msg.warning('当前仅支持从 ACTIVE 图片数据集创建标注任务，请重新确认数据集状态。');
      }
    }, 0);
    nav('/ann', { replace: true });
    return () => window.clearTimeout(timer);
  }, [annotationDatasets, sourceDatasets.isLoading, loc.state, msg, nav, openTaskWizard]);
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
          <Typography.Text type="secondary">数据集 · 标签模板/任务 · Label Studio 生产化联通 · 发布 ANNOTATED 数据集</Typography.Text>
        </div>
        <Space wrap>
          <Button onClick={() => setTemplateOpen(true)}>标签模板</Button>
          <Button type="primary" onClick={() => openTaskWizard()}>＋ 新建标注任务</Button>
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
          { title: '标注类型', dataIndex: 'sceneLabel', render: (v) => <Tag>{v}</Tag> },
          { title: '进度', render: (_, r) => `${pct(r.annotatedCount, r.totalCount)}%（${r.annotatedCount}/${r.totalCount}）` },
          { title: '标注员', render: (_, r) => r.assignees.filter((u) => u.role === 'ANNOTATOR').map((u) => u.displayName).join('、') || '-' },
          { title: '质量评分', dataIndex: 'qualityScore', render: (v) => v == null ? '待质检' : <Tag color={v >= 90 ? 'green' : 'orange'}>{v}</Tag> },
          { title: '截止', dataIndex: 'deadline', render: (v) => v ? new Date(v).toLocaleDateString('zh-CN') : 'TODO_CONFIRM_ANNOTATION_DEADLINE' },
          { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{annStatusText(v)}</Tag> },
          { title: '操作', render: (_, r) => <Space><Button size="small" type="primary" loading={enteringTaskId === r.taskId} onClick={() => void enterWorkbench(r)} disabled={['COMPLETED', 'CANCELLED'].includes(r.status)}>{canAutoStartAnnotationTask(r.status) ? '开始并进入标注' : '进入标注'}</Button><a onClick={() => syncLs.mutate(r.taskId)}>同步 Label Studio project</a><a onClick={() => void navigator.clipboard?.writeText(r.taskId)}>复制ID</a></Space> },
        ]}
      />
      <Modal title="＋ 新建标注任务" open={wizardOpen} onCancel={() => setWizardOpen(false)} footer={null} destroyOnHidden width={760}>
        <Steps size="small" current={1} items={[{ title: '选择数据集' }, { title: '配置模板' }, { title: '分派审核' }]} style={{ marginBottom: 16 }} />
        <Alert type="info" showIcon title="数据集范围说明" description="这里不是数据集总览页；仅展示可用于创建标注任务的 ACTIVE 图片数据集。默认自动选中首个可用数据集，并优先使用“直接输入标签”；如需复用模板也可手动切换。" style={{ marginBottom: 12 }} />
        <Form form={taskForm} layout="vertical" onFinish={(v) => {
          if (!v.sourceDatasetId) return;
          createTask.mutate({ ...v, sourceDatasetId: v.sourceDatasetId, sourceVersionId: v.sourceVersionId ?? undefined });
        }} initialValues={annotationTaskDefaults}>
          <Form.Item name="sourceDatasetId" label="源数据集（仅 ACTIVE 且可标注图片数据集）" rules={[{ required: true, message: '请选择源数据集' }]}>
            <Select
              placeholder="请选择要创建标注任务的数据集"
              options={annotationDatasets.map((d) => ({ value: d.datasetId, label: annotationSourceLabel(d) }))}
            />
          </Form.Item>
          <Form.Item name="sourceVersionId" label="数据版本"><Input placeholder="选择数据集后自动带出 currentVersionId" /></Form.Item>
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="scene" label="标注场景"><Select options={annotationSceneOptions} onChange={(scene) => taskForm.setFieldsValue({ templateId: undefined, templateMode: 'INLINE_CREATE', inlineTemplateName: `${selectedTaskDataset?.name ?? '数据集'} ${txt(scene)}模板` })} /></Form.Item>
          <Form.Item name="templateMode" label="标签来源"><Select options={[{ value: 'EXISTING', label: '选择已发布模板' }, { value: 'INLINE_CREATE', label: '直接输入标签并自动建模板' }]} /></Form.Item>
          {taskTemplateMode === 'EXISTING' ? (
            <Form.Item name="templateId" label="标签模板（按场景过滤，必须 PUBLISHED）" rules={[{ required: true, message: '请选择标签模板，或切换为直接输入标签。' }]} extra={selectableTaskTemplates.length === 0 ? '当前场景无可用模板，可切换为“直接输入标签并自动建模板”。' : undefined}>
              <Select
                placeholder={selectableTaskTemplates.length ? '请选择标签模板' : '当前场景无可用模板'}
                disabled={!selectableTaskTemplates.length}
                options={selectableTaskTemplates.map((t) => ({ value: t.templateId, label: `${t.name} · ${t.scene}` }))}
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item name="inlineTemplateName" label="自动生成的模板名称"><Input /></Form.Item>
              <Form.Item name="inlineLabels" label="标签列表" rules={[{ required: true, message: '请至少输入一个标签' }, { validator: async (_rule, value) => { if (parseInlineLabels(value).length === 0) throw new Error('请至少输入一个标签'); } }]} extra="支持逗号、顿号或换行分隔，例如：裂纹，气孔，夹渣"><Input.TextArea rows={4} placeholder="裂纹，气孔，夹渣" /></Form.Item>
            </>
          )}
          <Space wrap>
            <Form.Item name="reviewEnabled" label="审核"><Select options={[{ value: true, label: '启用审核' }, { value: false, label: '不审核' }]} /></Form.Item>
          </Space>
          <Form.Item name="note" label="备注"><Input.TextArea rows={2} /></Form.Item>
          <Alert type="info" showIcon title="分派策略" description="默认先创建未分派任务，避免跨 BU 账号拦截；后续可在任务页再分派标注员/审核员。" style={{ marginBottom: 12 }} />
          <Button type="primary" htmlType="submit" loading={createTask.isPending}>创建任务</Button>
        </Form>
      </Modal>
      <Drawer title={<Typography.Title level={4} style={{ margin: 0 }}>标签模板</Typography.Title>} open={templateOpen} onClose={() => setTemplateOpen(false)} size="large">
        <Alert type="info" showIcon title="Label Studio label config seam" description="模板会生成 <View> XML；workspace/storage/token 仍保留 TODO_CONFIRM_*。" style={{ marginBottom: 16 }} />
        <Table<AnnotationLabelTemplate> rowKey="templateId" dataSource={templates.data ?? []} pagination={false} columns={[{ title: '名称', dataIndex: 'name' }, { title: '场景', dataIndex: 'scene' }, { title: '类型', dataIndex: 'labelType' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }]} />
        <Form
          form={templateForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={{ name: '焊缝图片打标模板', tenantId: currentTenantId, scene: 'IMAGE_TAGGING', labelType: 'BOUNDING_BOX', labelSchemaJson: defaultLabelSchema('IMAGE_TAGGING') }}
          onFinish={(v) => createTemplate.mutate({ ...v, labelStudioConfigXml: labelStudioXmlForTemplate(v.scene, v.labelSchemaJson, v.labelStudioConfigXml) })}
        >
          <Form.Item name="name" label="模板名称"><Input /></Form.Item>
          <Form.Item name="tenantId" label="BU"><Input /></Form.Item>
          <Form.Item name="scene" label="场景"><Select options={annotationTemplateSceneOptions} onChange={(scene) => templateForm.setFieldsValue({ labelType: scene === 'TEXT_LABELING' ? 'TEXT_CLASSIFICATION' : scene === 'IMAGE_SEGMENTATION' ? 'POLYGON' : 'BOUNDING_BOX', labelSchemaJson: defaultLabelSchema(scene) })} /></Form.Item>
          <Form.Item name="labelType" label="标注类型"><Select options={annotationLabelTypeOptions} /></Form.Item>
          <Form.Item name="labelSchemaJson" label="标签 Schema"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="labelStudioConfigXml" label="Label Studio XML（可选；留空自动生成）"><Input.TextArea rows={4} placeholder={labelStudioXmlForTemplate(templateScene, templateSchema)} /></Form.Item>
          <Alert type="success" showIcon title={templateScene === 'TEXT_LABELING' ? '文本分类模板将自动生成 Text + Choices 的 Label Studio XML' : '当前支持图片打标、图片分割与文本分类；图片模板将自动生成 Image + RectangleLabels/PolygonLabels XML'} style={{ marginBottom: 12 }} />
          <Button htmlType="submit" loading={createTemplate.isPending}>创建并发布模板</Button>
        </Form>
      </Drawer>
    </div>
  );
}

export function AnnotationWorkbenchPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { taskId?: string }; search?: string };
  const canvasRef = useRef<SVGSVGElement | null>(null);
  const thumbListRef = useRef<HTMLElement | null>(null);
  const [msg, holder] = message.useMessage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [thumbListHeight, setThumbListHeight] = useState(ANNOTATION_THUMB_PANEL_FALLBACK_HEIGHT);
  const [thumbScrollTop, setThumbScrollTop] = useState(0);
  const [failedThumbPreviewIds, setFailedThumbPreviewIds] = useState<Record<string, true>>({});
  const [failedCanvasPreviewKeys, setFailedCanvasPreviewKeys] = useState<Record<string, true>>({});
  const [editor, dispatchEditor] = useReducer(annotationEditorReducer, initialAnnotationEditorState);
  const { boxes, polygons, selectedShapeId } = editor;
  const latestAnnotationPayloadRef = useRef('');
  const silentSaveRef = useRef(false);
  const [isAutoNavigating, setIsAutoNavigating] = useState(false);
  const [activeClass, setActiveClass] = useState(0);
  const [activeShape, setActiveShape] = useState<AnnotationShape>('rect');
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [draftBox, setDraftBox] = useState<DraftBox | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [polygonDraftPoints, setPolygonDraftPoints] = useState<AnnotationPoint[]>([]);
  const [polygonVertexDrag, setPolygonVertexDrag] = useState<PolygonVertexDragState | null>(null);
  const [polygonEdgeDrag, setPolygonEdgeDrag] = useState<PolygonEdgeDragState | null>(null);
  const [selectedPolygonEdgeIndex, setSelectedPolygonEdgeIndex] = useState<number | null>(null);
  const [selectedPolygonPointIndex, setSelectedPolygonPointIndex] = useState<number | null>(null);
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [syncedBinding, setSyncedBinding] = useState<AnnotationExternalBinding | null>(null);
  const requestedTaskId = useMemo(() => {
    const routeTaskId = loc.state?.taskId;
    if (routeTaskId) return routeTaskId;
    const queryTaskId = new URLSearchParams(loc.search ?? '').get('taskId');
    return queryTaskId ?? undefined;
  }, [loc.search, loc.state?.taskId]);
  const tasks = useQuery({ queryKey: ['annotation-workbench-tasks'], queryFn: () => dataApi.annotationTasks({ status: 'IN_PROGRESS' }) });
  const taskId = requestedTaskId ?? tasks.data?.items[0]?.taskId ?? 'ANN-WELD-Q2';
  const detail = useQuery({ queryKey: ['annotation-detail', taskId], queryFn: () => dataApi.annotationTaskDetail(taskId), enabled: Boolean(taskId) });
  const taskTotalCount = detail.data?.task.totalCount ?? 0;
  const currentPage = Math.floor(selectedIndex / ANNOTATION_WORKBENCH_PAGE_SIZE) + 1;
  const workItemsPage = useQuery({
    queryKey: ['annotation-work-items', taskId, currentPage],
    queryFn: () => dataApi.annotationWorkItems(taskId, { page: currentPage, pageSize: ANNOTATION_WORKBENCH_PAGE_SIZE }),
    enabled: Boolean(taskId),
    placeholderData: (previousData) => previousData,
  });
  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = taskTotalCount > currentPage * ANNOTATION_WORKBENCH_PAGE_SIZE ? currentPage + 1 : null;
  useQuery({
    queryKey: ['annotation-work-items', taskId, prevPage],
    queryFn: () => dataApi.annotationWorkItems(taskId, { page: prevPage ?? 1, pageSize: ANNOTATION_WORKBENCH_PAGE_SIZE }),
    enabled: Boolean(taskId) && prevPage != null,
  });
  useQuery({
    queryKey: ['annotation-work-items', taskId, nextPage],
    queryFn: () => dataApi.annotationWorkItems(taskId, { page: nextPage ?? 1, pageSize: ANNOTATION_WORKBENCH_PAGE_SIZE }),
    enabled: Boolean(taskId) && nextPage != null,
  });
  const save = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: string }) => dataApi.saveAnnotationDraft(id, payload), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['annotation-detail', taskId] }); await qc.invalidateQueries({ queryKey: ['annotation-work-items', taskId] }); if (!silentSaveRef.current) msg.success('草稿已保存'); silentSaveRef.current = false; }, onError: (e: Error) => { silentSaveRef.current = false; msg.error(e.message); } });
  const submit = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: string }) => dataApi.submitAnnotationWorkItem(id, payload), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['annotation-detail', taskId] }); await qc.invalidateQueries({ queryKey: ['annotation-work-items', taskId] }); msg.success('标注结果已提交，等待审核'); }, onError: (e: Error) => msg.error(e.message) });
  const sync = useMutation({ mutationFn: dataApi.syncLabelStudioTask, onSuccess: async (r) => { setSyncedBinding(r); await qc.invalidateQueries({ queryKey: ['annotation-detail', taskId] }); (r.lastSyncStatus === 'TASK_SYNCED' ? msg.success : msg.warning)(`Label Studio ${r.lastSyncStatus}: ${r.diagnosticMessage}`); }, onError: (e: Error) => msg.error(e.message) });
  const task = detail.data?.task;
  const scene = task?.scene ?? 'IMAGE_TAGGING';
  const isSegmentation = scene === 'IMAGE_SEGMENTATION';
  const templatesQuery = useQuery({
    queryKey: ['annotation-workbench-templates', scene],
    queryFn: () => dataApi.labelTemplates({ scene }),
    enabled: Boolean(scene),
  });
  const activeTemplate = useMemo(
    () => (templatesQuery.data ?? []).find((item) => item.templateId === task?.templateId),
    [task?.templateId, templatesQuery.data],
  );
  const workbenchLabels = useMemo(() => {
    const taskSchemaLabels = parseTemplateLabels((detail.data?.task as AnnotationTaskSummary & { labelSchemaJson?: string | null } | undefined)?.labelSchemaJson);
    if (taskSchemaLabels.length) return taskSchemaLabels;
    const templateSchemaLabels = parseTemplateLabels(activeTemplate?.labelSchemaJson);
    return templateSchemaLabels.length ? templateSchemaLabels : annotationClasses;
  }, [activeTemplate?.labelSchemaJson, detail.data?.task]);
  const workbenchClassColors = useMemo(
    () => workbenchLabels.map((_, index) => annotationClassPalette[index % annotationClassPalette.length]),
    [workbenchLabels],
  );
  const effectiveActiveClass = normalizeLabelIndex(activeClass, workbenchLabels);
  const workbenchClassHotkeyText = useMemo(() => {
    const upper = Math.min(workbenchLabels.length, 9);
    return upper <= 1 ? '1' : `1-${upper}`;
  }, [workbenchLabels.length]);
  const items = workItemsPage.data?.items ?? [];
  const queueItems = items.length
    ? items
    : [{ workItemId: 'EMPTY', taskId, sampleKey: '暂无样本', sampleFileId: null, annotatorId: null, annotatorName: null, status: 'DRAFT', predictionJson: null, annotationJson: null, submittedAt: null, updatedAt: '' }];
  const editableIndex = items.findIndex((item) => canEditWorkItem(item.status));
  const pageOffset = (currentPage - 1) * ANNOTATION_WORKBENCH_PAGE_SIZE;
  const pageSelectedIndex = Math.max(0, selectedIndex - pageOffset);
  const effectiveSelectedIndex = pageSelectedIndex === 0 && items[0] && items[0].status === 'REVIEW_PENDING' && editableIndex > 0 ? editableIndex : pageSelectedIndex;
  const visibleThumbCount = Math.max(1, Math.ceil(thumbListHeight / ANNOTATION_THUMB_ITEM_HEIGHT));
  const thumbStartIndex = Math.max(0, Math.floor(thumbScrollTop / ANNOTATION_THUMB_ITEM_HEIGHT) - ANNOTATION_THUMB_OVERSCAN);
  const thumbEndIndex = Math.min(queueItems.length, thumbStartIndex + visibleThumbCount + ANNOTATION_THUMB_OVERSCAN * 2);
  const visibleThumbItems = queueItems.slice(thumbStartIndex, thumbEndIndex);
  const selectedItem = items[effectiveSelectedIndex] ?? items[0];
  const sampleFileIds = useMemo(() => {
    const indexes = new Set<number>();
    for (let index = Math.max(0, thumbStartIndex - 1); index < Math.min(queueItems.length, thumbEndIndex + 1); index += 1) {
      indexes.add(index);
    }
    for (let index = Math.max(0, effectiveSelectedIndex - 1); index <= Math.min(queueItems.length - 1, effectiveSelectedIndex + 1); index += 1) {
      indexes.add(index);
    }
    return Array.from(indexes)
      .map((index) => queueItems[index]?.sampleFileId)
      .filter((fileId): fileId is string => Boolean(fileId));
  }, [effectiveSelectedIndex, queueItems, thumbEndIndex, thumbStartIndex]);
  const samplePreviewUrls = useAnnotationSamplePreviewUrls(sampleFileIds);
  const externalBinding = syncedBinding ?? detail.data?.externalBinding;
  const total = task?.totalCount ?? workItemsPage.data?.total ?? Math.max(items.length, 1);
  const currentNo = Math.min(selectedIndex + 1, total);
  const canEditSelectedItem = canEditWorkItem(selectedItem?.status);
  const canSubmit = selectedItem && selectedItem.status !== 'APPROVED' && selectedItem.status !== 'REVIEW_PENDING';
  const selectedSamplePreviewUrl = selectedItem?.sampleFileId ? samplePreviewUrls[selectedItem.sampleFileId] : null;
  const selectedSampleMetadata = selectedItem ? industrialSampleImages[selectedItem.sampleKey] : null;
  const selectedSampleImage = selectedItem
    ? selectedItem.sampleFileId
      ? (selectedSamplePreviewUrl
        ? {
          url: selectedSamplePreviewUrl,
          title: selectedSampleMetadata ? `${selectedItem.sampleKey} · ${selectedSampleMetadata.title}` : selectedItem.sampleKey,
          source: selectedSampleMetadata?.source ?? 'annotation_work_item.sampleFileId',
        }
        : null)
      : (selectedSampleMetadata ?? (selectedItem.sampleImageUrl ? { url: selectedItem.sampleImageUrl, title: selectedItem.sampleKey, source: 'annotation_work_item.sampleImageUrl' } : null))
    : null;
  const selectedSampleImageKey = selectedItem?.sampleFileId ?? selectedItem?.sampleImageUrl ?? selectedItem?.sampleKey ?? 'EMPTY';
  const selectedSampleImageFailed = Boolean(selectedSampleImage && failedCanvasPreviewKeys[selectedSampleImageKey]);
  const currentBox = boxes.find((box) => box.id === selectedShapeId);
  const currentPolygon = polygons.find((polygon) => polygon.id === selectedShapeId);
  const currentPolygonCenter = currentPolygon ? polygonCentroid(currentPolygon.points) : null;
  const effectiveSelectedPolygonPointIndex = currentPolygon && selectedPolygonPointIndex != null && selectedPolygonPointIndex < currentPolygon.points.length
    ? selectedPolygonPointIndex
    : null;
  const selectedPolygonPoint = currentPolygon && effectiveSelectedPolygonPointIndex != null ? currentPolygon.points[effectiveSelectedPolygonPointIndex] ?? null : null;
  const workbenchShortcutGroups = useMemo(() => isSegmentation ? [
    { group: '分割工具', items: [['P', '开始多边形'], ['Enter / Double Click', '完成闭合'], ['Delete', '删除顶点/区域'], ['单击线条', '选中连接线'], ['双击线条', '新增顶点'], ['鼠标拖拽', '移动选中顶点/连接线']] },
    { group: '类别选择', items: [[workbenchClassHotkeyText, '切换类别'], ['Ctrl+Z', '撤销'], ['Ctrl+Y', '重做'], ['Space', '下一张']] },
  ] : [
    { group: '绘制工具', items: [['W', '矩形框'], ['E', '椭圆框'], ['P', '多边形框'], ['D / Delete', '删除所选']] },
    { group: '类别选择', items: [[workbenchClassHotkeyText, '切换类别'], ['Ctrl+Z', '撤销'], ['Ctrl+Y', '重做'], ['Space', '下一张']] },
  ], [isSegmentation, workbenchClassHotkeyText]);
  const annotationPayload = useMemo(() => serializeAnnotationPayload(scene, boxes, polygons), [boxes, polygons, scene]);
  const selectedItemSavedPayload = useMemo(() => normalizeAnnotationPayload(scene, selectedItem?.annotationJson, workbenchLabels), [scene, selectedItem?.annotationJson, workbenchLabels]);
  const hasUnsavedChanges = canEditSelectedItem && Boolean(selectedItem?.workItemId) && annotationPayload !== selectedItemSavedPayload;
  const commitBoxes = useCallback((updater: AnnotationBox[] | ((items: AnnotationBox[]) => AnnotationBox[]), nextSelectedId?: string) => {
    const next = typeof updater === 'function' ? updater(boxes) : updater;
    dispatchEditor({ type: 'commit', boxes: next, polygons, selectedShapeId: nextSelectedId });
  }, [boxes, polygons]);
  const commitPolygons = useCallback((updater: AnnotationPolygon[] | ((items: AnnotationPolygon[]) => AnnotationPolygon[]), nextSelectedId?: string) => {
    const next = typeof updater === 'function' ? updater(polygons) : updater;
    dispatchEditor({ type: 'commit', boxes, polygons: next, selectedShapeId: nextSelectedId });
  }, [boxes, polygons]);
  const undo = useCallback(() => dispatchEditor({ type: 'undo' }), []);
  const redo = useCallback(() => dispatchEditor({ type: 'redo' }), []);
  const handleThumbListScroll = useCallback((event: ReactUIEvent<HTMLElement>) => {
    setThumbScrollTop(event.currentTarget.scrollTop);
  }, []);

  const syncCurrent = () => selectedItem?.workItemId && sync.mutate(selectedItem.workItemId);
  const markThumbPreviewFailed = useCallback((fileId: string) => {
    setFailedThumbPreviewIds((current) => current[fileId] ? current : { ...current, [fileId]: true });
  }, []);
  const clearThumbPreviewFailed = useCallback((fileId: string) => {
    setFailedThumbPreviewIds((current) => {
      if (!current[fileId]) return current;
      const next = { ...current };
      delete next[fileId];
      return next;
    });
  }, []);
  const markCanvasPreviewFailed = useCallback((imageKey: string) => {
    setFailedCanvasPreviewKeys((current) => current[imageKey] ? current : { ...current, [imageKey]: true });
  }, []);
  const clearCanvasPreviewFailed = useCallback((imageKey: string) => {
    setFailedCanvasPreviewKeys((current) => {
      if (!current[imageKey]) return current;
      const next = { ...current };
      delete next[imageKey];
      return next;
    });
  }, []);
  const finalizePolygon = useCallback(() => {
    if (polygonDraftPoints.length < 3) {
      msg.warning('图片分割至少需要 3 个点才能闭合多边形');
      return;
    }
    const id = nextAnnotationShapeId('poly');
    const polygon = { id, points: polygonDraftPoints, label: workbenchLabels[effectiveActiveClass], cls: effectiveActiveClass, source: 'manual' as const };
    commitPolygons((items) => [...items, polygon], id);
    setPolygonDraftPoints([]);
    setActiveShape('polygon');
    setSelectedPolygonEdgeIndex(null);
    msg.success(`已新增分割区域：${workbenchLabels[effectiveActiveClass]}`);
  }, [commitPolygons, effectiveActiveClass, msg, polygonDraftPoints, workbenchLabels]);
  const closeDraftPolygon = useCallback((event?: { stopPropagation?: () => void }) => {
    event?.stopPropagation?.();
    if (polygonDraftPoints.length < 3) return;
    finalizePolygon();
  }, [finalizePolygon, polygonDraftPoints.length]);
  const saveCurrent = useCallback(async (options?: { silent?: boolean }) => {
    if (!selectedItem?.workItemId) return false;
    if (!canEditWorkItem(selectedItem.status)) {
      if (!options?.silent) {
        msg.warning('当前样本已提交/已审核，不能保存草稿，请切换到草稿或待标注样本');
      }
      return false;
    }
    const payload = latestAnnotationPayloadRef.current || annotationPayload;
    if (options?.silent && payload === selectedItemSavedPayload) {
      return true;
    }
    silentSaveRef.current = Boolean(options?.silent);
    await save.mutateAsync({ id: selectedItem.workItemId, payload });
    return true;
  }, [annotationPayload, msg, save, selectedItem, selectedItemSavedPayload]);
  const submitCurrent = useCallback(() => {
    if (!selectedItem?.workItemId) return;
    if (!canEditWorkItem(selectedItem.status) && selectedItem.status !== 'SUBMITTED') {
      msg.warning('当前样本已提交/已审核，不能重复提交');
      return;
    }
    submit.mutate({ id: selectedItem.workItemId, payload: annotationPayload });
  }, [annotationPayload, msg, selectedItem, submit]);
  const navigateToIndex = useCallback(async (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(Math.max(total - 1, 0), nextIndex));
    if (boundedIndex === selectedIndex || isAutoNavigating) return;
    try {
      setIsAutoNavigating(true);
      if (hasUnsavedChanges) {
        const saved = await saveCurrent({ silent: true });
        if (!saved) return;
      }
      setSelectedIndex(boundedIndex);
    } finally {
      setIsAutoNavigating(false);
    }
  }, [hasUnsavedChanges, isAutoNavigating, saveCurrent, selectedIndex, total]);
  const goPrev = useCallback(() => void navigateToIndex(selectedIndex - 1), [navigateToIndex, selectedIndex]);
  const goNext = useCallback(() => void navigateToIndex(selectedIndex + 1), [navigateToIndex, selectedIndex]);
  const selectClass = useCallback((idx: number) => {
    setActiveClass(normalizeLabelIndex(idx, workbenchLabels));
  }, [workbenchLabels]);
  const updatePolygonVertex = useCallback((polygonId: string, pointIndex: number, point: AnnotationPoint, commit: boolean) => {
    const nextPolygons = polygons.map((polygon) => {
      if (polygon.id !== polygonId) return polygon;
      return {
        ...polygon,
        points: polygon.points.map((item, index) => index === pointIndex ? clampAnnotationPoint(point) : item),
      };
    });
    if (commit) {
      dispatchEditor({ type: 'commit', boxes, polygons: nextPolygons, selectedShapeId: polygonId });
      return;
    }
    dispatchEditor({ type: 'replace-current', boxes, polygons: nextPolygons });
  }, [boxes, polygons]);
  const insertPolygonVertex = useCallback((polygonId: string, edgeIndex: number, point: AnnotationPoint, commit: boolean) => {
    const nextPoint = clampAnnotationPoint(point);
    const nextPolygons = polygons.map((polygon) => {
      if (polygon.id !== polygonId) return polygon;
      const nextPoints = [...polygon.points];
      nextPoints.splice(edgeIndex + 1, 0, nextPoint);
      return { ...polygon, points: nextPoints };
    });
    if (commit) {
      dispatchEditor({ type: 'commit', boxes, polygons: nextPolygons, selectedShapeId: polygonId });
      return;
    }
    dispatchEditor({ type: 'replace-current', boxes, polygons: nextPolygons });
  }, [boxes, polygons]);
  const updatePolygonEdge = useCallback((polygonId: string, edgeIndex: number, startPoint: AnnotationPoint, endPoint: AnnotationPoint, commit: boolean) => {
    const nextStart = clampAnnotationPoint(startPoint);
    const nextEnd = clampAnnotationPoint(endPoint);
    const nextPolygons = polygons.map((polygon) => {
      if (polygon.id !== polygonId) return polygon;
      const targetIndex = (edgeIndex + 1) % polygon.points.length;
      return {
        ...polygon,
        points: polygon.points.map((item, index) => {
          if (index === edgeIndex) return nextStart;
          if (index === targetIndex) return nextEnd;
          return item;
        }),
      };
    });
    if (commit) {
      dispatchEditor({ type: 'commit', boxes, polygons: nextPolygons, selectedShapeId: polygonId });
      return;
    }
    dispatchEditor({ type: 'replace-current', boxes, polygons: nextPolygons });
  }, [boxes, polygons]);
  const deleteSelectedVertex = useCallback(() => {
    if (!selectedShapeId || effectiveSelectedPolygonPointIndex == null) return false;
    const targetPolygon = polygons.find((polygon) => polygon.id === selectedShapeId);
    if (!targetPolygon) return false;
    if (targetPolygon.points.length <= 3) {
      msg.warning('多边形至少需要保留 3 个顶点');
      return true;
    }
    const nextPointIndex = Math.min(effectiveSelectedPolygonPointIndex, targetPolygon.points.length - 2);
    commitPolygons((items) => items.map((polygon) => polygon.id === selectedShapeId
      ? { ...polygon, points: polygon.points.filter((_, index) => index !== effectiveSelectedPolygonPointIndex) }
      : polygon), selectedShapeId);
    setSelectedPolygonEdgeIndex(null);
    setSelectedPolygonPointIndex(nextPointIndex);
    msg.success('已删除选中顶点');
    return true;
  }, [commitPolygons, effectiveSelectedPolygonPointIndex, msg, polygons, selectedShapeId]);
  const deleteSelectedShape = useCallback(() => {
    if (!selectedShapeId) return;
    if (deleteSelectedVertex()) return;
    if (isSegmentation) {
      setSelectedPolygonEdgeIndex(null);
      setSelectedPolygonPointIndex(null);
      commitPolygons((items) => items.filter((polygon) => polygon.id !== selectedShapeId), polygons.find((polygon) => polygon.id !== selectedShapeId)?.id ?? '');
      return;
    }
    commitBoxes((items) => items.filter((box) => box.id !== selectedShapeId), boxes.find((box) => box.id !== selectedShapeId)?.id ?? '');
  }, [boxes, commitBoxes, commitPolygons, deleteSelectedVertex, isSegmentation, polygons, selectedShapeId]);
  const createManualShape = useCallback((shape: AnnotationShape) => {
    if (isSegmentation) {
      setActiveShape('polygon');
      setPolygonDraftPoints([]);
      setSelectedPolygonEdgeIndex(null);
      setSelectedPolygonPointIndex(null);
      msg.info('图片分割请在画布上逐点点击绘制区域，点击首点/双击或点击“完成多边形”闭合');
      return;
    }
    const id = nextAnnotationShapeId('box');
    const box = { id, x: 86 + boxes.length * 6, y: 230, w: 96, h: 58, label: workbenchLabels[effectiveActiveClass], cls: effectiveActiveClass, shape, source: 'manual' as const };
    setActiveShape(shape);
    commitBoxes((items) => [...items, box], id);
    msg.success(`已新增标注框：${workbenchLabels[effectiveActiveClass]}（${shapeText(shape)}）`);
  }, [boxes.length, commitBoxes, effectiveActiveClass, isSegmentation, msg, workbenchLabels]);
  const svgPoint = (event: { clientX: number; clientY: number }) => {
    const svg = canvasRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = Math.max(0, Math.min(520, ((event.clientX - rect.left) / rect.width) * 520));
    const y = Math.max(0, Math.min(340, ((event.clientY - rect.top) / rect.height) * 340));
    return { x: Math.round(x), y: Math.round(y) };
  };
  const startDraw = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('.annotation-shape-group')) return;
    if (isSegmentation) {
      if (!canEditSelectedItem) {
        msg.warning('当前样本已提交/已审核，不能新增分割区域');
        return;
      }
      const point = svgPoint(event);
      setPolygonDraftPoints((items) => [...items, point]);
      setActiveShape('polygon');
      setSelectedPolygonEdgeIndex(null);
      setSelectedPolygonPointIndex(null);
      return;
    }
    const point = svgPoint(event);
    setDrawStart(point);
    setDraftBox({ x: point.x, y: point.y, w: 0, h: 0 });
    safeSetPointerCapture(event.currentTarget, event.pointerId);
  };
  const moveDraw = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (polygonVertexDrag) {
      const point = svgPoint(event);
      updatePolygonVertex(polygonVertexDrag.polygonId, polygonVertexDrag.pointIndex, point, false);
      return;
    }
    if (polygonEdgeDrag) {
      const point = svgPoint(event);
      const dx = point.x - polygonEdgeDrag.start.x;
      const dy = point.y - polygonEdgeDrag.start.y;
      updatePolygonEdge(
        polygonEdgeDrag.polygonId,
        polygonEdgeDrag.edgeIndex,
        { x: polygonEdgeDrag.originStart.x + dx, y: polygonEdgeDrag.originStart.y + dy },
        { x: polygonEdgeDrag.originEnd.x + dx, y: polygonEdgeDrag.originEnd.y + dy },
        false,
      );
      return;
    }
    if (isSegmentation) return;
    if (dragState) {
      const point = svgPoint(event);
      const dx = point.x - dragState.start.x;
      const dy = point.y - dragState.start.y;
      dispatchEditor({ type: 'move-box', boxId: dragState.boxId, x: dragState.origin.x + dx, y: dragState.origin.y + dy });
      return;
    }
    if (!drawStart) return;
    const point = svgPoint(event);
    setDraftBox({
      x: Math.min(drawStart.x, point.x),
      y: Math.min(drawStart.y, point.y),
      w: Math.abs(point.x - drawStart.x),
      h: Math.abs(point.y - drawStart.y),
    });
  };
  const finishDraw = (event?: ReactPointerEvent<SVGSVGElement>) => {
    if (event) safeReleasePointerCapture(event.currentTarget, event.pointerId);
    if (polygonVertexDrag) {
      const point = event ? svgPoint(event) : selectedPolygonPoint ?? null;
      if (point) {
        updatePolygonVertex(polygonVertexDrag.polygonId, polygonVertexDrag.pointIndex, point, true);
      } else {
        dispatchEditor({ type: 'commit-current', selectedShapeId: polygonVertexDrag.polygonId });
      }
      setSelectedPolygonEdgeIndex(null);
      setPolygonVertexDrag(null);
      return;
    }
    if (polygonEdgeDrag) {
      const point = event ? svgPoint(event) : polygonEdgeDrag.start;
      const dx = point.x - polygonEdgeDrag.start.x;
      const dy = point.y - polygonEdgeDrag.start.y;
      updatePolygonEdge(
        polygonEdgeDrag.polygonId,
        polygonEdgeDrag.edgeIndex,
        { x: polygonEdgeDrag.originStart.x + dx, y: polygonEdgeDrag.originStart.y + dy },
        { x: polygonEdgeDrag.originEnd.x + dx, y: polygonEdgeDrag.originEnd.y + dy },
        true,
      );
      setSelectedPolygonEdgeIndex(polygonEdgeDrag.edgeIndex);
      setPolygonEdgeDrag(null);
      return;
    }
    if (isSegmentation) return;
    if (dragState) {
      dispatchEditor({ type: 'commit-current', selectedShapeId: dragState.boxId });
      setDragState(null);
      return;
    }
    if (draftBox && draftBox.w >= 8 && draftBox.h >= 8) {
      const id = nextAnnotationShapeId('box');
      commitBoxes((items) => [...items, { id, ...draftBox, label: workbenchLabels[effectiveActiveClass], cls: effectiveActiveClass, shape: activeShape, source: 'manual' }], id);
      msg.success(`已新增标注框：${workbenchLabels[effectiveActiveClass]}`);
    }
    setDrawStart(null);
    setDraftBox(null);
  };
  const startDragBox = (event: ReactPointerEvent<SVGGElement>, box: AnnotationBox) => {
    if (isSegmentation) return;
    if (!canEditSelectedItem) {
      msg.warning('当前样本已提交/已审核，不能拖动标注框');
      return;
    }
    event.stopPropagation();
    const point = svgPoint(event);
    dispatchEditor({ type: 'select', selectedShapeId: box.id });
    setActiveClass(box.cls);
    setActiveShape(box.shape);
    setDragState({ boxId: box.id, start: point, origin: { x: box.x, y: box.y } });
    safeSetPointerCapture(canvasRef.current, event.pointerId);
  };
  const startDragPolygonVertex = (event: ReactPointerEvent<SVGCircleElement>, polygon: AnnotationPolygon, pointIndex: number) => {
    if (!canEditSelectedItem) {
      msg.warning('当前样本已提交/已审核，不能编辑分割顶点');
      return;
    }
    event.stopPropagation();
    dispatchEditor({ type: 'select', selectedShapeId: polygon.id });
    setActiveClass(polygon.cls);
    setActiveShape('polygon');
    setSelectedPolygonEdgeIndex(null);
    setSelectedPolygonPointIndex(pointIndex);
    setPolygonVertexDrag({ polygonId: polygon.id, pointIndex, pointerId: event.pointerId });
    safeSetPointerCapture(canvasRef.current, event.pointerId);
  };
  const startDragPolygonEdge = (event: ReactPointerEvent<SVGLineElement>, polygon: AnnotationPolygon, edgeIndex: number) => {
    if (!canEditSelectedItem) {
      msg.warning('当前样本已提交/已审核，不能移动连接线');
      return;
    }
    event.stopPropagation();
    const point = svgPoint(event);
    const startPoint = polygon.points[edgeIndex];
    const endPoint = polygon.points[(edgeIndex + 1) % polygon.points.length];
    if (!startPoint || !endPoint) return;
    dispatchEditor({ type: 'select', selectedShapeId: polygon.id });
    setActiveClass(polygon.cls);
    setActiveShape('polygon');
    setSelectedPolygonEdgeIndex(edgeIndex);
    setSelectedPolygonPointIndex(null);
    setPolygonEdgeDrag({
      polygonId: polygon.id,
      edgeIndex,
      pointerId: event.pointerId,
      start: point,
      originStart: startPoint,
      originEnd: endPoint,
    });
    safeSetPointerCapture(canvasRef.current, event.pointerId);
  };
  const addPolygonVertexOnEdge = useCallback((event: ReactMouseEvent<SVGLineElement>, polygon: AnnotationPolygon, edgeIndex: number) => {
    if (!canEditSelectedItem) {
      msg.warning('当前样本已提交/已审核，不能新增连接点');
      return;
    }
    event.stopPropagation();
    const point = svgPoint(event);
    insertPolygonVertex(polygon.id, edgeIndex, point, true);
    dispatchEditor({ type: 'select', selectedShapeId: polygon.id });
    setActiveClass(polygon.cls);
    setActiveShape('polygon');
    setSelectedPolygonEdgeIndex(edgeIndex);
    setSelectedPolygonPointIndex(edgeIndex + 1);
    msg.success('已在线条上新增顶点');
  }, [canEditSelectedItem, insertPolygonVertex, msg]);
  useEffect(() => {
    latestAnnotationPayloadRef.current = annotationPayload;
  }, [annotationPayload]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPolygonDraftPoints([]);
      setPolygonVertexDrag(null);
      setPolygonEdgeDrag(null);
      setSelectedPolygonEdgeIndex(null);
      setSelectedPolygonPointIndex(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedIndex, scene, taskId]);
  useEffect(() => {
    if (!selectedItem) return;
    const parsed = parseAnnotationPayload(scene, selectedItem.annotationJson, workbenchLabels);
    const selectedId = parsed.polygons[0]?.id ?? parsed.boxes[0]?.id ?? '';
    dispatchEditor({ type: 'reset', boxes: parsed.boxes, polygons: parsed.polygons, selectedShapeId: selectedId });
    const current = parsed.polygons[0] ?? parsed.boxes[0];
    const timer = window.setTimeout(() => {
      setActiveClass(normalizeLabelIndex(current?.cls ?? 0, workbenchLabels));
      setActiveShape(scene === 'IMAGE_SEGMENTATION'
        ? 'polygon'
        : (current && 'shape' in current && (current.shape === 'rect' || current.shape === 'ellipse' || current.shape === 'polygon')
          ? current.shape
          : 'rect'));
      setSelectedPolygonEdgeIndex(null);
      setSelectedPolygonPointIndex(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [scene, selectedItem, workbenchLabels]);
  useEffect(() => {
    const thumbList = thumbListRef.current;
    if (!thumbList) return;

    const measure = () => {
      setThumbListHeight(thumbList.clientHeight || ANNOTATION_THUMB_PANEL_FALLBACK_HEIGHT);
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(thumbList);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const thumbList = thumbListRef.current;
    if (!thumbList || queueItems.length <= 1) return;
    const itemTop = effectiveSelectedIndex * ANNOTATION_THUMB_ITEM_HEIGHT;
    const itemBottom = itemTop + ANNOTATION_THUMB_ITEM_HEIGHT;
    const viewportTop = thumbList.scrollTop;
    const viewportBottom = viewportTop + (thumbList.clientHeight || ANNOTATION_THUMB_PANEL_FALLBACK_HEIGHT);

    if (itemTop < viewportTop) {
      thumbList.scrollTop = itemTop;
      setThumbScrollTop(itemTop);
      return;
    }
    if (itemBottom > viewportBottom) {
      const nextScrollTop = Math.max(0, itemBottom - (thumbList.clientHeight || ANNOTATION_THUMB_PANEL_FALLBACK_HEIGHT));
      thumbList.scrollTop = nextScrollTop;
      setThumbScrollTop(nextScrollTop);
    }
  }, [effectiveSelectedIndex, queueItems.length]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        undo();
        event.preventDefault();
      } else if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
        redo();
        event.preventDefault();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        void saveCurrent();
        event.preventDefault();
      } else if (/^[1-9]$/.test(event.key)) {
        const targetIndex = Number(event.key) - 1;
        if (targetIndex < workbenchLabels.length) {
          selectClass(targetIndex);
          event.preventDefault();
        }
      } else if (event.key.toLowerCase() === 'd' || event.key === 'Delete') {
        deleteSelectedShape();
        event.preventDefault();
      } else if (event.key === 'Enter' && isSegmentation) {
        finalizePolygon();
        event.preventDefault();
      } else if (event.code === 'Space' || event.key === 'ArrowRight') {
        goNext();
        event.preventDefault();
      } else if (event.key === 'ArrowLeft') {
        goPrev();
        event.preventDefault();
      } else if (event.key === '?') {
        setShortcutOpen(true);
        event.preventDefault();
      } else if (event.key.toLowerCase() === 'w') {
        createManualShape('rect');
        event.preventDefault();
      } else if (event.key.toLowerCase() === 'e') {
        createManualShape('ellipse');
        event.preventDefault();
      } else if (event.key.toLowerCase() === 'p') {
        createManualShape('polygon');
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [createManualShape, deleteSelectedShape, finalizePolygon, goNext, goPrev, isSegmentation, redo, saveCurrent, selectClass, undo, workbenchLabels.length]);

  return (
    <div className="content-page annotation-workbench-page">
      {holder}
      <Typography.Title level={3} className="annotation-workbench-heading">标注工作台</Typography.Title>
      <div className="annotation-workbench-shell">
        <div className="annotation-toolbar" role="toolbar" aria-label="标注工作台操作栏">
          <Button size="small" onClick={() => nav('/ann')}>← 返回</Button>
          <Space size={6} wrap>
            <Typography.Text strong>{task?.name ?? '焊接缺陷标注 v3'}</Typography.Text>
            <Tag color={color(task?.status)}>{annStatusText(task?.status)}</Tag>
            <Typography.Text type="secondary" className="mono">{currentNo} / {total}</Typography.Text>
          </Space>
          <Tag color="green" className="mono">● 00:47:23 / ~60m</Tag>
          <Space className="annotation-toolbar-actions" wrap>
            <Button size="small" onClick={() => setShortcutOpen(true)}>快捷键 ?</Button>
            <Button size="small" onClick={goPrev} disabled={selectedIndex === 0 || isAutoNavigating}>上一张 ←</Button>
            <Button size="small" onClick={goNext} disabled={!total || selectedIndex >= total - 1 || isAutoNavigating}>下一张 →</Button>
            {!isSegmentation ? <Button size="small" type={activeShape === 'rect' ? 'primary' : 'default'} ghost={activeShape === 'rect'} onClick={() => createManualShape('rect')}>矩形框 W</Button> : null}
            {!isSegmentation ? <Button size="small" type={activeShape === 'ellipse' ? 'primary' : 'default'} ghost={activeShape === 'ellipse'} onClick={() => createManualShape('ellipse')}>椭圆框 E</Button> : null}
            <Button size="small" type={activeShape === 'polygon' ? 'primary' : 'default'} ghost={activeShape === 'polygon'} onClick={() => createManualShape('polygon')}>{isSegmentation ? '开始多边形 P' : '多边形框 P'}</Button>
            {isSegmentation ? <Button size="small" onClick={finalizePolygon} disabled={polygonDraftPoints.length < 3}>完成多边形 Enter</Button> : null}
            {isSegmentation ? <Button size="small" onClick={deleteSelectedVertex} disabled={!currentPolygon || selectedPolygonPointIndex == null}>删除顶点 Delete</Button> : null}
            <Button size="small" onClick={deleteSelectedShape} disabled={!selectedShapeId}>删除所选 D</Button>
            <Button size="small" onClick={undo} disabled={editor.historyIndex <= 0}>撤销 Ctrl+Z</Button>
            <Button size="small" onClick={redo} disabled={editor.historyIndex >= editor.history.length - 1}>重做 Ctrl+Y</Button>
            <Button size="small" onClick={syncCurrent} loading={sync.isPending} disabled={!selectedItem}>同步 Label Studio task</Button>
            {externalBinding?.externalTaskId ? <Button size="small" href={externalBinding.externalTaskUrl ?? externalBinding.launchUrl ?? undefined} target="_blank">打开 Label Studio task</Button> : null}
            <Button size="small" onClick={() => { void saveCurrent(); }} loading={save.isPending} disabled={!selectedItem || !canEditSelectedItem}>保存标注</Button>
            <Button size="small" type="primary" onClick={submitCurrent} loading={submit.isPending} disabled={!canSubmit}>提交审核</Button>
          </Space>
        </div>

        <Alert
          type={lsStatusType(externalBinding?.lastSyncStatus)}
          showIcon
          title={`Label Studio ${externalBinding?.lastSyncStatus ?? '状态待同步'}`}
          description={<Space direction="vertical" size={2}><span>{externalBinding?.diagnosticMessage ?? 'TODO_CONFIRM_LABEL_STUDIO_BASE_URL'}</span>{externalBinding?.externalTaskId ? <a href={externalBinding.externalTaskUrl ?? externalBinding.launchUrl ?? undefined} target="_blank" rel="noreferrer">打开 Label Studio task：{externalBinding.externalTaskId}</a> : externalBinding?.externalProjectId ? <a href={externalBinding.launchUrl ?? undefined} target="_blank" rel="noreferrer">打开 Label Studio project：{externalBinding.externalProjectId}</a> : null}</Space>}
          className="annotation-ls-alert"
        />
        {items[0]?.status === 'REVIEW_PENDING' && editableIndex > 0 && effectiveSelectedIndex === editableIndex ? (
          <Alert
            type="info"
            showIcon
            title="已自动选择可编辑样本"
            description={`队列第一张是 ${annStatusText(items[0].status)}，保存草稿会触发后端状态冲突；当前已切到 ${selectedItem?.sampleKey ?? '可编辑样本'}。`}
            className="annotation-ls-alert"
          />
        ) : null}

        <div className="annotation-workbench-layout">
          <aside ref={thumbListRef} className="annotation-thumb-list" aria-label="样本队列" onScroll={handleThumbListScroll}>
            <h4 className="annotation-panel-title">样本队列</h4>
            <div style={{ paddingTop: thumbStartIndex * ANNOTATION_THUMB_ITEM_HEIGHT, paddingBottom: (queueItems.length - thumbEndIndex) * ANNOTATION_THUMB_ITEM_HEIGHT }}>
              {visibleThumbItems.map((item, offset) => {
                const idx = thumbStartIndex + offset;
                const absoluteIndex = pageOffset + idx;
                return (
                  <button key={item.workItemId} className={`annotation-thumb ${idx === effectiveSelectedIndex ? 'active' : ''}`} onClick={() => void navigateToIndex(absoluteIndex)} type="button">
                    <span className="annotation-thumb-image">
                      {item.sampleFileId && !failedThumbPreviewIds[item.sampleFileId] && samplePreviewUrls[item.sampleFileId]
                        ? <img src={samplePreviewUrls[item.sampleFileId]} alt={item.sampleKey} loading="lazy" onLoad={() => clearThumbPreviewFailed(item.sampleFileId!)} onError={() => markThumbPreviewFailed(item.sampleFileId!)} />
                        : industrialSampleImages[item.sampleKey]
                          ? <img src={industrialSampleImages[item.sampleKey].url} alt={item.sampleKey} loading="lazy" />
                          : <span className="annotation-thumb-weld">{item.sampleFileId ? '加载中' : ''}</span>}
                      {item.status === 'REVIEW_PENDING' || item.status === 'APPROVED' ? <span className="annotation-thumb-done" /> : null}
                    </span>
                    <span className="annotation-thumb-name">{item.sampleKey}</span>
                    <Tag color={color(item.status)}>{annStatusText(item.status)}</Tag>
                  </button>
                );
              })}
            </div>
            {!canEditSelectedItem ? <Alert type="warning" showIcon title="只读样本" description="已提交/已审核样本不能拖动或保存草稿，请选择 DRAFT/PENDING/REJECTED 样本。" className="annotation-readonly-alert" /> : null}
          </aside>

          <main className="annotation-canvas-panel" aria-label="原生标注画布">
            <svg
              ref={canvasRef}
              className="annotation-canvas"
              viewBox="0 0 520 340"
              role="img"
              aria-label="焊缝缺陷标注画布"
              tabIndex={0}
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={finishDraw}
              onPointerCancel={finishDraw}
              onDoubleClick={() => isSegmentation && polygonDraftPoints.length >= 3 ? finalizePolygon() : undefined}
            >
              <defs>
                <linearGradient id="ann-img-bg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1c2840" />
                  <stop offset="50%" stopColor="#243050" />
                  <stop offset="100%" stopColor="#1a2236" />
                </linearGradient>
                <filter id="annotation-shape-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="1.8" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 0.45 0"
                    result="glow"
                  />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect width="520" height="340" fill="url(#ann-img-bg)" />
              {selectedSampleImage && !selectedSampleImageFailed ? (
                <>
                  <image href={selectedSampleImage.url} x="0" y="0" width="520" height="340" preserveAspectRatio="xMidYMid slice" data-testid="annotation-industrial-image" onLoad={() => clearCanvasPreviewFailed(selectedSampleImageKey)} onError={() => markCanvasPreviewFailed(selectedSampleImageKey)} />
                  <rect width="520" height="340" fill="rgba(7, 12, 24, .28)" />
                </>
              ) : (
                <>
                  <line x1="0" y1="170" x2="520" y2="170" stroke="#2a3d5a" strokeWidth="28" />
                  <line x1="0" y1="170" x2="520" y2="170" stroke="#1e2f48" strokeWidth="16" />
                  <line x1="0" y1="170" x2="520" y2="168" stroke="#2c3f5c" strokeWidth="4" strokeDasharray="8 4" />
                  {[60, 140, 210, 300, 380, 450].map((x, i) => <circle key={x} cx={x} cy={158 + ((i % 3) * 8)} r={3 + (i % 2)} fill="#16253a" opacity="0.7" />)}
                </>
              )}
              <rect className="annotation-draw-layer" width="520" height="340" fill="transparent" data-testid="annotation-draw-layer" />
              {!isSegmentation ? boxes.map((box) => (
                <g key={box.id} onPointerDown={(event) => startDragBox(event, box)} onClick={() => { dispatchEditor({ type: 'select', selectedShapeId: box.id }); setActiveClass(box.cls); setActiveShape(box.shape); }} className={`annotation-shape-group ${box.source === 'ai' ? 'annotation-ai-box-group' : ''}`} data-testid={`annotation-box-${box.id}`}>
                  {box.shape === 'ellipse' ? <ellipse cx={box.x + box.w / 2} cy={box.y + box.h / 2} rx={box.w / 2} ry={box.h / 2} fill={`${workbenchClassColors[box.cls]}18`} stroke={box.source === 'ai' ? '#a78bfa' : workbenchClassColors[box.cls]} strokeOpacity={selectedShapeId === box.id ? 1 : 0.7} strokeWidth={selectedShapeId === box.id ? ANNOTATION_SHAPE_STROKE_WIDTH_SELECTED : ANNOTATION_SHAPE_STROKE_WIDTH} strokeDasharray={selectedShapeId === box.id ? undefined : '4 2'} filter={selectedShapeId === box.id ? 'url(#annotation-shape-glow)' : undefined} />
                    : box.shape === 'polygon' ? <polygon points={polygonPoints(box)} fill={`${workbenchClassColors[box.cls]}18`} stroke={box.source === 'ai' ? '#a78bfa' : workbenchClassColors[box.cls]} strokeOpacity={selectedShapeId === box.id ? 1 : 0.7} strokeWidth={selectedShapeId === box.id ? ANNOTATION_SHAPE_STROKE_WIDTH_SELECTED : ANNOTATION_SHAPE_STROKE_WIDTH} strokeDasharray={selectedShapeId === box.id ? undefined : '4 2'} filter={selectedShapeId === box.id ? 'url(#annotation-shape-glow)' : undefined} />
                      : <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={`${workbenchClassColors[box.cls]}18`} stroke={box.source === 'ai' ? '#a78bfa' : workbenchClassColors[box.cls]} strokeOpacity={selectedShapeId === box.id ? 1 : 0.7} strokeWidth={selectedShapeId === box.id ? ANNOTATION_SHAPE_STROKE_WIDTH_SELECTED : ANNOTATION_SHAPE_STROKE_WIDTH} strokeDasharray={box.source === 'ai' || selectedShapeId !== box.id ? '6 3' : undefined} rx="2" filter={selectedShapeId === box.id ? 'url(#annotation-shape-glow)' : undefined} />}
                  <rect x={box.x} y={box.y - 18} width={box.label.length * 11 + (box.source === 'ai' ? 38 : 10)} height={box.source === 'ai' ? 18 : 16} fill={box.source === 'ai' ? 'rgba(139,92,246,.78)' : `${workbenchClassColors[box.cls]}dd`} rx="3" />
                  <text x={box.x + 4} y={box.y - 6} fill="#fff" fontSize="11" fontFamily="system-ui">{box.label}{box.source === 'ai' ? ` ${Math.round((box.confidence ?? 0) * 100)}%` : ''}</text>
                  {selectedShapeId === box.id ? [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].map(([cx, cy]) => <rect key={`${cx}-${cy}`} x={cx - 4} y={cy - 4} width="8" height="8" fill="#fff" stroke={workbenchClassColors[box.cls]} strokeWidth="1.5" rx="1" />) : null}
                </g>
              )) : polygons.map((polygon) => {
                const center = polygonCentroid(polygon.points);
                return (
                  <g key={polygon.id} onClick={() => { dispatchEditor({ type: 'select', selectedShapeId: polygon.id }); setActiveClass(polygon.cls); setActiveShape('polygon'); setSelectedPolygonEdgeIndex(null); setSelectedPolygonPointIndex(null); }} className={`annotation-shape-group ${polygon.source === 'ai' ? 'annotation-ai-box-group' : ''}`} data-testid={`annotation-polygon-${polygon.id}`}>
                    <polygon points={polygonPath(polygon.points)} fill={`${workbenchClassColors[polygon.cls]}18`} stroke={polygon.source === 'ai' ? '#a78bfa' : workbenchClassColors[polygon.cls]} strokeOpacity={selectedShapeId === polygon.id ? 1 : 0.7} strokeWidth={selectedShapeId === polygon.id ? ANNOTATION_SHAPE_STROKE_WIDTH_SELECTED : ANNOTATION_SHAPE_STROKE_WIDTH} strokeDasharray={polygon.source === 'ai' || selectedShapeId !== polygon.id ? '6 3' : undefined} filter={selectedShapeId === polygon.id ? 'url(#annotation-shape-glow)' : undefined} />
                    {selectedShapeId === polygon.id ? polygon.points.map((point, index) => {
                      const nextPoint = polygon.points[(index + 1) % polygon.points.length];
                      if (!nextPoint) return null;
                      const isEdgeSelected = (polygonEdgeDrag?.polygonId === polygon.id && polygonEdgeDrag.edgeIndex === index)
                        || (selectedPolygonEdgeIndex === index);
                      return (
                        <line
                          key={`edge-${polygon.id}-${index}`}
                          x1={point.x}
                          y1={point.y}
                          x2={nextPoint.x}
                          y2={nextPoint.y}
                          stroke={isEdgeSelected ? '#ffffff' : workbenchClassColors[polygon.cls]}
                          strokeWidth={isEdgeSelected ? 10 : 8}
                          strokeOpacity={0.001}
                          onPointerDown={(event) => startDragPolygonEdge(event, polygon, index)}
                          onClick={(event) => {
                            event.stopPropagation();
                            dispatchEditor({ type: 'select', selectedShapeId: polygon.id });
                            setActiveClass(polygon.cls);
                            setActiveShape('polygon');
                            setSelectedPolygonEdgeIndex(index);
                            setSelectedPolygonPointIndex(null);
                          }}
                          onDoubleClick={(event) => addPolygonVertexOnEdge(event, polygon, index)}
                          data-testid={`annotation-polygon-edge-${polygon.id}-${index}`}
                        />
                      );
                    }) : null}
                    <rect x={center.x - (ANNOTATION_POLYGON_CENTER_MARK_SIZE / 2)} y={center.y - (ANNOTATION_POLYGON_CENTER_MARK_SIZE / 2)} width={ANNOTATION_POLYGON_CENTER_MARK_SIZE} height={ANNOTATION_POLYGON_CENTER_MARK_SIZE} fill="#fff" stroke={workbenchClassColors[polygon.cls]} strokeWidth="1.25" rx="1" />
                    <rect x={center.x - 4} y={center.y - 22} width={polygon.label.length * 11 + (polygon.source === 'ai' ? 38 : 10)} height={polygon.source === 'ai' ? 18 : 16} fill={polygon.source === 'ai' ? 'rgba(139,92,246,.78)' : `${workbenchClassColors[polygon.cls]}dd`} rx="3" />
                    <text x={center.x} y={center.y - 10} fill="#fff" fontSize="11" fontFamily="system-ui">{polygon.label}{polygon.source === 'ai' ? ` ${Math.round((polygon.confidence ?? 0) * 100)}%` : ''}</text>
                    {selectedShapeId === polygon.id ? polygon.points.map((point, index) => (
                      <g key={`${polygon.id}-${index}`}>
                        <circle cx={point.x} cy={point.y} r={ANNOTATION_POLYGON_VERTEX_HIT_RADIUS} fill="transparent" onPointerDown={(event) => startDragPolygonVertex(event, polygon, index)} onClick={(event) => { event.stopPropagation(); dispatchEditor({ type: 'select', selectedShapeId: polygon.id }); setActiveClass(polygon.cls); setActiveShape('polygon'); setSelectedPolygonEdgeIndex(null); setSelectedPolygonPointIndex(index); }} data-testid={`annotation-polygon-vertex-${polygon.id}-${index}`} />
                        <circle cx={point.x} cy={point.y} r={selectedPolygonPointIndex === index ? ANNOTATION_POLYGON_VERTEX_RADIUS_SELECTED : ANNOTATION_POLYGON_VERTEX_RADIUS} fill="#fff" stroke={workbenchClassColors[polygon.cls]} strokeWidth={selectedPolygonPointIndex === index ? '2' : '1.1'} pointerEvents="none" />
                      </g>
                    )) : null}
                  </g>
                );
              })}
              {!isSegmentation && draftBox ? (activeShape === 'ellipse'
                ? <ellipse cx={draftBox.x + draftBox.w / 2} cy={draftBox.y + draftBox.h / 2} rx={draftBox.w / 2} ry={draftBox.h / 2} fill={`${workbenchClassColors[effectiveActiveClass]}18`} stroke={workbenchClassColors[effectiveActiveClass]} strokeWidth={ANNOTATION_DRAFT_STROKE_WIDTH} strokeDasharray="4 2" data-testid="annotation-draft-box" />
                : activeShape === 'polygon'
                  ? <polygon points={polygonPoints(draftBox)} fill={`${workbenchClassColors[effectiveActiveClass]}18`} stroke={workbenchClassColors[effectiveActiveClass]} strokeWidth={ANNOTATION_DRAFT_STROKE_WIDTH} strokeDasharray="4 2" data-testid="annotation-draft-box" />
                  : <rect x={draftBox.x} y={draftBox.y} width={draftBox.w} height={draftBox.h} fill={`${workbenchClassColors[effectiveActiveClass]}18`} stroke={workbenchClassColors[effectiveActiveClass]} strokeWidth={ANNOTATION_DRAFT_STROKE_WIDTH} strokeDasharray="4 2" rx="2" data-testid="annotation-draft-box" />) : null}
              {isSegmentation && polygonDraftPoints.length ? (
                <>
                  {polygonDraftPoints.length >= 3 ? <polygon points={polygonPath(polygonDraftPoints)} fill={`${workbenchClassColors[effectiveActiveClass]}18`} stroke="none" data-testid="annotation-draft-polygon-closed-preview" /> : null}
                  <polyline points={polygonPath(polygonDraftPoints)} fill="none" stroke={workbenchClassColors[effectiveActiveClass]} strokeWidth={ANNOTATION_DRAFT_STROKE_WIDTH} strokeDasharray="4 2" data-testid="annotation-draft-polygon" />
                  {polygonDraftPoints.map((point, index) => {
                    const canClose = index === 0 && polygonDraftPoints.length >= 3;
                    return (
                      <g key={`draft-${index}`}>
                        <circle cx={point.x} cy={point.y} r={ANNOTATION_DRAFT_POLYGON_HIT_RADIUS} fill="transparent" style={canClose ? { cursor: 'pointer' } : undefined} onPointerDown={(event) => event.stopPropagation()} onClick={canClose ? closeDraftPolygon : (event) => event.stopPropagation()} data-testid={canClose ? 'annotation-draft-polygon-close-target' : `annotation-draft-polygon-point-${index}`} />
                        <circle cx={point.x} cy={point.y} r={canClose ? ANNOTATION_DRAFT_POLYGON_CLOSE_RADIUS : ANNOTATION_DRAFT_POLYGON_VERTEX_RADIUS} fill={canClose ? '#fff' : workbenchClassColors[effectiveActiveClass]} stroke={workbenchClassColors[effectiveActiveClass]} strokeWidth={canClose ? '1.5' : '0.95'} pointerEvents="none" />
                      </g>
                    );
                  })}
                </>
              ) : null}
            </svg>
            {selectedSampleImageFailed ? <div className="annotation-image-error">当前样本图片加载失败，请切换样本或稍后重试</div> : null}
            {selectedSampleImage ? <div className="annotation-sample-caption" data-testid="annotation-sample-caption">{selectedSampleImage.title} · {selectedSampleImage.source}</div> : null}
            <div className="annotation-canvas-hint">{isSegmentation ? '逐点点击绘制分割区域 · 点击首点/双击/Enter 完成闭合 · 单击线条可选中并拖动连接线 · 双击线条可新增顶点 · Space 下一张 · Ctrl+S 保存当前标注' : '拖拽绘制框 · 右键删除 · Space 下一张 · Ctrl+S 保存当前标注'}</div>
          </main>

          <aside className="annotation-right-panel">
            <h4 className="annotation-panel-title">标注类别</h4>
            {workbenchLabels.map((name, idx) => (
              <button key={name} className={`annotation-class-row ${effectiveActiveClass === idx ? 'active' : ''}`} style={{ borderColor: effectiveActiveClass === idx ? workbenchClassColors[idx] : 'transparent' }} onClick={() => selectClass(idx)} type="button" aria-pressed={effectiveActiveClass === idx}>
                <span className="annotation-class-color" style={{ background: workbenchClassColors[idx] }} />
                <span>{name}</span>
                {idx < 9 ? <kbd>{idx + 1}</kbd> : null}
              </button>
            ))}
            <div className="annotation-panel-divider" />
            <h4 className="annotation-panel-title">{isSegmentation ? '当前分割区域属性' : '当前框属性'}</h4>
            {currentPolygon ? <div className="annotation-box-meta">
              <div>类别：<span data-testid="annotation-current-label" style={{ color: workbenchClassColors[currentPolygon.cls] }}>{currentPolygon.label}</span></div>
              <div>顶点数：<span data-testid="annotation-polygon-point-count">{currentPolygon.points.length}</span></div>
              <div>选中顶点：<span data-testid="annotation-selected-polygon-point">{selectedPolygonPointIndex == null ? '未选择' : `#${selectedPolygonPointIndex + 1}`}</span></div>
              <div>选中线段：<span data-testid="annotation-selected-polygon-edge">{selectedPolygonEdgeIndex == null ? '未选择' : `#${selectedPolygonEdgeIndex + 1}`}</span></div>
              <div>顶点坐标：<span data-testid="annotation-selected-polygon-point-coords">{selectedPolygonPoint ? `(${selectedPolygonPoint.x}, ${selectedPolygonPoint.y})` : '-'}</span></div>
              <div>中心：({currentPolygonCenter?.x ?? 0}, {currentPolygonCenter?.y ?? 0})</div>
              <div>形状：<span data-testid="annotation-current-shape">多边形区域</span></div>
              <div>分割区域数：<span data-testid="annotation-polygon-count">{polygons.length}</span></div>
            </div> : currentBox ? <div className="annotation-box-meta">
              <div>类别：<span data-testid="annotation-current-label" style={{ color: workbenchClassColors[currentBox.cls] }}>{currentBox.label}</span></div>
              <div>坐标：({currentBox.x}, {currentBox.y})</div>
              <div>尺寸：{currentBox.w} × {currentBox.h}</div>
              <div>形状：<span data-testid="annotation-current-shape">{shapeText(currentBox.shape)}</span></div>
              <div>标注框数：<span data-testid="annotation-box-count">{boxes.length}</span></div>
            </div> : <Typography.Text type="secondary">{isSegmentation ? '点击区域或在画布上逐点创建多边形' : '点击框体选中'}</Typography.Text>}
            <div className="annotation-panel-divider" />
            <h4 className="annotation-panel-title">快捷键</h4>
            {workbenchShortcutGroups.flatMap((group) => group.items).map(([key, text]) => (
              <div className="annotation-shortcut-row" key={key}><kbd>{key}</kbd><span>{text}</span></div>
            ))}
            <div className="annotation-panel-divider" />
            <div className="annotation-box-meta">
              <div>源数据集：<span>{task?.sourceDatasetName ?? '-'}</span></div>
              <div>标签模板：<span>{task?.templateName ?? '-'}</span></div>
              <div>进度：<span>{pct(task?.annotatedCount, task?.totalCount)}%</span></div>
              <div>保存内容：<span>{isSegmentation ? `${polygons.length} 个分割区域` : `${boxes.length} 个框`}</span></div>
            </div>
          </aside>
        </div>
      </div>

      <Modal title="快捷键参考" open={shortcutOpen} onCancel={() => setShortcutOpen(false)} footer={null} width={560}>
        <Typography.Text type="secondary">标注工作台 · 提升 3× 标注效率</Typography.Text>
        <div className="annotation-shortcut-modal">
          {workbenchShortcutGroups.map((group) => <Card size="small" key={group.group} title={group.group}>{group.items.map(([key, text]) => <div className="annotation-shortcut-row" key={key}><kbd>{key}</kbd><span>{text}</span></div>)}</Card>)}
        </div>
      </Modal>
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
  const publish = useMutation({ mutationFn: dataApi.publishAnnotationDataset, onSuccess: (r) => msg.success(`已发布 ANNOTATED 数据集：${r.outputDatasetId}，标注文件：${r.annotationArtifactFileId ?? '待生成'}`), onError: (e: Error) => msg.error(e.message) });
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
      <Alert type="info" showIcon title="审核规则" description="审核人与标注员必须分离；通过后可执行质量检查并发布 ANNOTATED 数据集，同时生成 ANNOTATION_RESULT 标注文件并写入 ANNOTATION 血缘。" style={{ marginBottom: 16 }} />
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
  const [draftEdges, setDraftEdges] = useState<PipelineEdge[]>();
  const [addOpen, setAddOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [operatorKeyword, setOperatorKeyword] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>();
  const [latestRun, setLatestRun] = useState<PipelineRunDetail | null>(null);
  const pipelines = useQuery({ queryKey: ['pipelines'], queryFn: () => dataApi.pipelines() });
  const pipelineId = selectedPipelineId ?? pipelines.data?.items[0]?.pipelineId;
  const pipeline = useQuery({ queryKey: ['pipeline-detail', pipelineId], queryFn: () => dataApi.pipelineDetail(pipelineId!), enabled: Boolean(pipelineId) });
  const operators = useQuery({ queryKey: ['operators', operatorKeyword], queryFn: () => dataApi.operators({ keyword: operatorKeyword, categoryGroup: 'VISUAL_PREPROCESS', supportsPreview: true }) });
  const overview = useQuery({ queryKey: ['data-standard-overview'], queryFn: dataApi.dataStandardOverview });
  const profile = useQuery({ queryKey: ['data-standard-profile', selectedDatasetId], queryFn: () => dataApi.dataStandardProfile(selectedDatasetId!), enabled: Boolean(selectedDatasetId) });
  const nodes = draftNodes ?? pipeline.data?.nodes ?? [];
  const edges = draftEdges ?? pipeline.data?.edges ?? [];
  const variables = useMemo(
    () => pipeline.data?.variables.map((item) => ({ ...item, valueJson: item.valueMasked })) ?? [],
    [pipeline.data?.variables],
  );
  const selectedNode = nodes.find((item) => item.nodeId === selectedNodeId) ?? nodes[0];
  const selectedOperator = operators.data?.items.find((item) => item.operatorId === selectedNode?.operatorId);
  const validationIssues = pipeline.data?.validation.errors ?? [];
  const validationWarnings = pipeline.data?.validation.warnings ?? [];
  const selectedNodeIndex = selectedNode ? nodes.findIndex((item) => item.nodeId === selectedNode.nodeId) : -1;
  const hasDraftChanges = useMemo(
    () => stableJson(nodes) !== stableJson(pipeline.data?.nodes ?? []) || stableJson(edges) !== stableJson(pipeline.data?.edges ?? []),
    [edges, nodes, pipeline.data?.edges, pipeline.data?.nodes],
  );
  const savePipeline = useMutation({
    mutationFn: () => dataApi.updatePipeline(pipelineId!, toSaveInput(pipeline.data!, nodes, edges, variables)),
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
    mutationFn: () => dataApi.runPipeline(pipelineId!, { triggerMode: 'MANUAL', sampleDatasetId: pipeline.data?.pipeline.sourceDatasetId ?? undefined }),
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ['pipeline-detail', pipelineId] });
      await qc.invalidateQueries({ queryKey: ['datasets'] });
      await qc.invalidateQueries({ queryKey: ['annotation-source-datasets'] });
      setLatestRun(result);
      setRunOpen(true);
      msg.success('视觉预处理运行完成，已生成待确认预处理数据集。');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const confirmPreprocessedDataset = useMutation({
    mutationFn: (datasetId: string) => dataApi.confirmPreprocessedDataset(datasetId, { decision: 'CONFIRM', comment: '预处理样例满足标注前检查要求' }),
    onSuccess: async (result) => {
      if (latestRun) {
        setLatestRun({ ...latestRun, activation: result });
      }
      await qc.invalidateQueries({ queryKey: ['pipeline-detail', pipelineId] });
      await qc.invalidateQueries({ queryKey: ['annotation-source-datasets'] });
      msg.success('预处理结果已确认，可继续激活。');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const activatePreprocessedDataset = useMutation({
    mutationFn: (input: { datasetId: string; targetVersionId?: string | null }) => dataApi.activatePreprocessedDataset(input.datasetId, { targetVersionId: input.targetVersionId ?? null, activationNote: '人工确认通过，允许进入标注来源列表' }),
    onSuccess: async (result) => {
      if (latestRun) {
        setLatestRun({ ...latestRun, activation: result });
      }
      await qc.invalidateQueries({ queryKey: ['pipeline-detail', pipelineId] });
      await qc.invalidateQueries({ queryKey: ['datasets'] });
      await qc.invalidateQueries({ queryKey: ['annotation-source-datasets'] });
      msg.success('预处理数据集已激活，可用于后续标注。');
    },
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
  const previewDatasetId = latestRun?.run.outputDatasetId ?? pipeline.data?.runs[0]?.outputDatasetId ?? null;
  const activation = latestRun?.activation;
  const previewProcessParams = parseObjectConfig(latestRun?.preview?.processParamsJson);
  const previewOperatorChainJson = latestRun?.preview?.operatorChainJson ?? null;
  const previewOperatorChain = useMemo(() => {
    const parsed = parseObjectConfig(previewOperatorChainJson);
    if (Array.isArray(parsed)) return parsed.map(String);
    try {
      const fallback = JSON.parse(previewOperatorChainJson ?? '[]') as unknown;
      return Array.isArray(fallback) ? fallback.map(String) : [];
    } catch {
      return [];
    }
  }, [previewOperatorChainJson]);
  const setNodes = (updater: (items: PipelineNode[]) => PipelineNode[]) => {
    setDraftNodes((items) => updater(items ?? pipeline.data?.nodes ?? []));
  };
  const addNode = (operator: OperatorSummary) => {
    const pipelineDetail = pipeline.data;
    if (!pipelineDetail) return;
    const nextId = `node-${operator.operatorId.toLowerCase().replaceAll('_', '-').replaceAll('op-', '')}-${nodes.length + 1}`;
    const nextNode: PipelineNode = {
      nodeId: nextId,
      operatorId: operator.operatorId,
      operatorName: operator.name,
      label: operator.name,
      positionX: 120 + nodes.length * 160,
      positionY: 260,
      configJson: defaultPipelineNodeConfig(operator, pipelineDetail),
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
  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    const targetId = selectedNode.nodeId;
    const remainingNodes = nodes.filter((item) => item.nodeId !== targetId);
    const remainingEdges = edges.filter((item) => item.sourceNodeId !== targetId && item.targetNodeId !== targetId);
    setDraftNodes(remainingNodes);
    setDraftEdges(remainingEdges);
    const nextNode = remainingNodes[Math.min(selectedNodeIndex, Math.max(remainingNodes.length - 1, 0))];
    setSelectedNodeId(nextNode?.nodeId);
    msg.success(`已删除节点：${selectedNode.label}`);
  };
  const formatSelectedNodeConfig = () => {
    const config = parseObjectConfig(selectedNode?.configJson);
    if (!config) {
      msg.warning('当前 JSON 无法格式化，请先修复语法错误。');
      return;
    }
    updateSelectedNodeConfig(stringifyObjectConfig(config));
    msg.success('当前节点配置已格式化。');
  };
  const resetSelectedNodeConfig = () => {
    if (!selectedNode || !selectedOperator || !pipeline.data) return;
    updateSelectedNodeConfig(defaultPipelineNodeConfig(selectedOperator, pipeline.data));
    msg.success(`已恢复 ${selectedOperator.name} 的默认参数。`);
  };
  const selectAdjacentNode = (offset: -1 | 1) => {
    if (!nodes.length) return;
    const nextIndex = selectedNodeIndex < 0 ? 0 : Math.min(nodes.length - 1, Math.max(0, selectedNodeIndex + offset));
    setSelectedNodeId(nodes[nextIndex]?.nodeId);
  };
  const focusFirstValidationIssue = () => {
    const firstIssueNodeId = validationIssues.find((item) => item.nodeId)?.nodeId;
    if (!firstIssueNodeId) {
      msg.info('当前校验问题没有绑定到具体节点。');
      return;
    }
    setSelectedNodeId(firstIssueNodeId);
    msg.warning('已定位到首个校验问题节点。');
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
          <Typography.Text type="secondary">视觉预处理 Pipeline · 图片/视频预处理算子 · 运行后生成待确认 PREPROCESSED 数据集</Typography.Text>
        </div>
        <Space wrap>
          <Select
            value={pipelineId}
            style={{ width: 240 }}
            onChange={(value) => {
              setSelectedPipelineId(value);
              setSelectedNodeId(undefined);
              setDraftNodes(undefined);
              setDraftEdges(undefined);
            }}
            options={(pipelines.data?.items ?? []).map((item) => ({ value: item.pipelineId, label: item.name }))}
          />
          <Button onClick={() => setAddOpen(true)}>＋ 添加算子</Button>
          <Button onClick={() => saveVersion.mutate()} loading={saveVersion.isPending}>保存快照</Button>
          <Button type={hasDraftChanges ? 'primary' : 'default'} onClick={() => savePipeline.mutate()} loading={savePipeline.isPending}>💾 保存</Button>
          <Button type="primary" onClick={() => runPipeline.mutate()} loading={runPipeline.isPending} disabled={!pipeline.data.validation.valid || nodes.length === 0}>▶ 沙箱运行</Button>
        </Space>
      </div>
      <Alert type="info" showIcon title="F017 视觉预处理闭环" description="固定图片传统增强、视频抽帧输出图片型 PREPROCESSED 数据集；运行成功后不会自动激活，必须先预览确认再人工激活。" style={{ marginBottom: 16 }} />
      <div className="pipeline-summary-grid">
        <Card size="small" title="编辑状态">
          <Space wrap>
            <Tag color={hasDraftChanges ? 'orange' : 'green'}>{hasDraftChanges ? '有未保存变更' : '已与后端同步'}</Tag>
            <Tag color={pipeline.data.validation.valid ? 'green' : 'red'}>{pipeline.data.validation.valid ? '运行前校验通过' : '运行前需修复'}</Tag>
            <Tag color="blue">当前节点 {nodes.length}</Tag>
            <Tag color="purple">已选节点 {selectedNode ? `${selectedNodeIndex + 1}/${nodes.length}` : '0/0'}</Tag>
          </Space>
        </Card>
        <Card size="small" title="输入与结果策略">
          <Space wrap>
            <Typography.Text>源数据集：{pipeline.data.pipeline.sourceDatasetId ?? '未绑定'}</Typography.Text>
            <Typography.Text>源类型：{txt(pipeline.data.pipeline.sourceDatasetDataType)}</Typography.Text>
            <Typography.Text>默认结果：PREPROCESSED / IMAGE</Typography.Text>
          </Space>
        </Card>
      </div>
      <div className="pipeline-grid">
        <Card title={<Space><span>DAG 画布</span><Tag color={pipeline.data.validation.valid ? 'green' : 'red'}>{pipeline.data.validation.diagnosticCode}</Tag></Space>} className="pipeline-canvas-card">
          <PipelineCanvas nodes={nodes} edges={edges} selectedNodeId={selectedNode?.nodeId} onSelect={setSelectedNodeId} onMove={moveNode} />
          <Typography.Text type="secondary">拖拽节点可重新排序 · 从左侧算子库拖入可添加新节点 · 当前节点 {nodes.length} 个</Typography.Text>
          <div className="pipeline-validation-panel">
            {validationIssues.length > 0 ? (
              <Alert
                type="error"
                showIcon
                title={`存在 ${validationIssues.length} 个校验问题`}
                description={(
                  <Space direction="vertical" className="full-width">
                    {validationIssues.map((issue) => <Typography.Text key={`${issue.code}-${issue.nodeId ?? 'global'}`}>{issue.nodeId ? `[${issue.nodeId}] ` : ''}{issue.message}</Typography.Text>)}
                    <Button size="small" onClick={focusFirstValidationIssue}>定位首个问题节点</Button>
                  </Space>
                )}
              />
            ) : null}
            {validationWarnings.length > 0 ? <Alert type="warning" showIcon title={`运行提示（${validationWarnings.length}）`} description={validationWarnings.join('；')} /> : null}
            {!pipeline.data.validation.valid ? <Typography.Text type="secondary">当前 DAG 未通过校验，已禁用“沙箱运行”。请先修复校验问题并保存。</Typography.Text> : null}
          </div>
        </Card>
        <div className="pipeline-sidebar">
          <Card title="算子库" className="operator-library">
            <Input.Search placeholder="搜索算子名称、类型或功能描述…" value={operatorKeyword} onChange={(event) => setOperatorKeyword(event.target.value)} style={{ marginBottom: 12 }} />
            <Space direction="vertical" className="full-width">
              {marketplaceOperators.slice(0, 8).map((op) => (
                <Card key={op.operatorId} size="small" className="operator-chip" onClick={() => addNode(op)}>
                  <Space direction="vertical" size={2}>
                    <Space>
                      <Tag color={op.kind === 'BUILTIN' ? 'blue' : 'purple'}>{txt(op.category)}</Tag>
                      {op.dataType ? <Tag color="geekblue">{txt(op.dataType)}</Tag> : null}
                      {op.supportsPreview ? <Tag color="green">支持预览</Tag> : null}
                      <b>{op.name}</b>
                    </Space>
                    <Typography.Text type="secondary">{op.description}</Typography.Text>
                    <Typography.Text type="secondary">{visualOperatorLabel(op)}{op.enhancementMode ? ` · ${txt(op.enhancementMode)}` : ''}</Typography.Text>
                  </Space>
                </Card>
              ))}
            </Space>
          </Card>
          <Card title={`⚙ ${selectedNode?.label ?? '算子配置'}`} className="node-config-card">
            <Space direction="vertical" className="full-width">
              <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label="算子">{selectedOperator?.name ?? selectedNode?.operatorName}</Descriptions.Item>
                <Descriptions.Item label="阶段">{selectedOperator?.stage ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="处理类目">{selectedOperator ? visualOperatorLabel(selectedOperator) : '-'}</Descriptions.Item>
                <Descriptions.Item label="状态"><Tag color={color(selectedNode?.status)}>{selectedNode?.status ?? 'READY'}</Tag></Descriptions.Item>
              </Descriptions>
              <Space wrap className="pipeline-node-toolbar">
                <Button size="small" onClick={() => selectAdjacentNode(-1)} disabled={selectedNodeIndex <= 0}>上一节点</Button>
                <Button size="small" onClick={() => selectAdjacentNode(1)} disabled={selectedNodeIndex < 0 || selectedNodeIndex >= nodes.length - 1}>下一节点</Button>
                <Button size="small" onClick={resetSelectedNodeConfig} disabled={!selectedNode || !selectedOperator}>恢复默认参数</Button>
                <Button size="small" onClick={formatSelectedNodeConfig} disabled={!selectedNode}>格式化 JSON</Button>
                <Button size="small" danger onClick={deleteSelectedNode} disabled={!selectedNode}>删除节点</Button>
              </Space>
              <Card size="small" title="结构化参数面板">
                <PipelineNodeConfigForm node={selectedNode} operator={selectedOperator} onChange={updateSelectedNodeConfig} />
              </Card>
              <Typography.Text strong>原始配置 JSON</Typography.Text>
              <Input.TextArea rows={8} value={safeJson(selectedNode?.configJson)} onChange={(event) => updateSelectedNodeConfig(event.target.value)} />
              <Alert type="success" showIcon title="算子验证通过" description={`输入: 42,850 条；预计输出: 42,850 条；${selectedOperator?.defaultOutputDatasetDataType ? `默认输出 ${txt(selectedOperator.defaultOutputDatasetDataType)} 型结果；` : ''}${selectedOperator?.annotationRiskLevel ? ` 标注风险 ${selectedOperator.annotationRiskLevel}` : ''}`} />
            </Space>
          </Card>
        </div>
      </div>
      <div className="pipeline-panels">
        <Card title="运行历史">
          <Table rowKey="runId" dataSource={pipeline.data.runs} pagination={false} columns={[
            { title: 'Run ID', dataIndex: 'runId' },
            { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> },
            { title: '耗时', dataIndex: 'durationMs', render: (v) => v ? `${Math.round(v / 1000)}s` : '-' },
            { title: '输出数据集', dataIndex: 'outputDatasetId', render: (v) => v ?? '-' },
            { title: '结果状态', dataIndex: 'resultDatasetStatus', render: (v) => v ? <Tag color={color(v)}>{datasetStatusText(v)}</Tag> : '-' },
            { title: '结果计数', render: (_, r) => r.totalCount != null ? `${r.successCount ?? 0}/${r.totalCount} 成功 · 跳过 ${r.skippedCount ?? 0} · 失败 ${r.failedCount ?? 0}` : '-' },
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
        <Card title="全局变量与结果策略">
          <Table rowKey="name" dataSource={variables} pagination={false} columns={[
            { title: '变量名', dataIndex: 'name' },
            { title: '类型', dataIndex: 'valueType' },
            { title: '来源', dataIndex: 'valueKind', render: (v) => <Tag>{v}</Tag> },
            { title: '值', render: (_, r) => r.valueJson ?? r.valueMasked },
            { title: '必填', dataIndex: 'required', render: (v) => v ? '是' : '否' },
          ]} />
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 12 }}
            message="视频抽帧默认输出图片型 PREPROCESSED 数据集"
            description="运行成功后不会自动激活；必须先预览/确认，再手动激活为后续标注可用数据集。"
          />
          <Descriptions size="small" bordered column={1} style={{ marginTop: 12 }}>
            <Descriptions.Item label="模板代码">{pipeline.data.pipeline.templateCode ?? 'VISUAL_PREPROCESS'}</Descriptions.Item>
            <Descriptions.Item label="源数据集">{pipeline.data.pipeline.sourceDatasetId ?? '未绑定'}</Descriptions.Item>
            <Descriptions.Item label="源类型">{txt(pipeline.data.pipeline.sourceDatasetDataType)}</Descriptions.Item>
            <Descriptions.Item label="默认结果策略">输出 PREPROCESSED / IMAGE；运行成功后需预览确认并人工激活</Descriptions.Item>
          </Descriptions>
        </Card>
      </div>
      <Drawer title="添加算子" open={addOpen} onClose={() => setAddOpen(false)} width={680}>
        <Input.Search placeholder="搜索算子名称、类型或功能描述…" value={operatorKeyword} onChange={(event) => setOperatorKeyword(event.target.value)} style={{ marginBottom: 16 }} />
        <div className="operator-market-grid">{marketplaceOperators.map((op) => <Card key={op.operatorId} hoverable onClick={() => addNode(op)}><Space direction="vertical"><Space wrap><Tag>{txt(op.category)}</Tag>{op.dataType ? <Tag color="geekblue">{txt(op.dataType)}</Tag> : null}{op.supportsPreview ? <Tag color="green">支持预览</Tag> : null}</Space><Typography.Title level={5}>{op.name}</Typography.Title><Typography.Text type="secondary">{op.description}</Typography.Text><Typography.Text type="secondary">{visualOperatorLabel(op)}{op.defaultOutputDatasetDataType ? ` · 输出 ${txt(op.defaultOutputDatasetDataType)}` : ''}</Typography.Text><div><Tag color="blue">调用 {op.usageCount}</Tag><Tag color="orange">Pipeline {op.pipelineCount}</Tag></div></Space></Card>)}</div>
      </Drawer>
      <Drawer title="沙箱运行详情" open={runOpen} onClose={() => setRunOpen(false)} width={720}>
        <Alert type="success" showIcon title={latestRun?.run.diagnosticMessage ?? 'VISUAL_PREPROCESS_RUN_SUCCEEDED'} description="已生成待确认预处理数据集；请先预览样例和失败摘要，再执行确认与激活。" />
        {latestRun ? (
          <Space direction="vertical" className="full-width" style={{ marginTop: 16 }}>
            <Card title="结果处置工作台" size="small">
              <Steps
                size="small"
                current={activation?.status === 'ACTIVE' ? 2 : activation?.confirmed ? 1 : 0}
                items={[
                  { title: '运行完成', description: '已生成待确认结果集' },
                  { title: '人工确认', description: activation?.confirmed ? `已确认 ${fmtDateTime(activation.confirmedAt)}` : '检查样例与失败摘要' },
                  { title: '激活入链', description: activation?.status === 'ACTIVE' ? `已激活 ${fmtDateTime(activation.activatedAt)}` : '激活后进入标注来源列表' },
                ]}
              />
            </Card>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="输出数据集">{latestRun.run.outputDatasetId ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="当前状态">{latestRun.activation ? <Tag color={color(latestRun.activation.status)}>{datasetStatusText(latestRun.activation.status)}</Tag> : '-'}</Descriptions.Item>
              <Descriptions.Item label="成功/总数">{latestRun.preview ? `${latestRun.preview.successCount}/${latestRun.preview.totalCount}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="跳过/失败">{latestRun.preview ? `${latestRun.preview.skippedCount}/${latestRun.preview.failedCount}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="预览水印">{latestRun.preview?.previewWatermarkApplied ? '已应用' : '未应用'}</Descriptions.Item>
              <Descriptions.Item label="产物水印">{latestRun.preview?.artifactWatermarkApplied ? '已写入' : '未写入'}</Descriptions.Item>
              <Descriptions.Item label="标注可用">{latestRun.activation ? (latestRun.activation.annotationEligible ? '可进入标注链路' : `不可用：${latestRun.activation.blockReason ?? '已阻断'}`) : '-'}</Descriptions.Item>
              <Descriptions.Item label="处理模式">{latestRun.preview?.enhancementMode ? txt(latestRun.preview.enhancementMode) : latestRun.preview?.frameExtractionMode ?? '-'}</Descriptions.Item>
            </Descriptions>
            {latestRun.preview ? (
              <>
                <div className="pipeline-run-summary-grid">
                  <Card size="small">
                    <Typography.Title level={4}>{latestRun.preview.successCount}</Typography.Title>
                    <Typography.Text type="secondary">成功样本</Typography.Text>
                  </Card>
                  <Card size="small">
                    <Typography.Title level={4}>{latestRun.preview.skippedCount}</Typography.Title>
                    <Typography.Text type="secondary">跳过样本</Typography.Text>
                  </Card>
                  <Card size="small">
                    <Typography.Title level={4}>{latestRun.preview.failedCount}</Typography.Title>
                    <Typography.Text type="secondary">失败样本</Typography.Text>
                  </Card>
                  <Card size="small">
                    <Typography.Title level={4}>{previewOperatorChain.length || latestRun.nodeRuns.length}</Typography.Title>
                    <Typography.Text type="secondary">算子链节点</Typography.Text>
                  </Card>
                </div>
                <Alert
                  type={activation?.status === 'ACTIVE' ? 'success' : activation?.confirmed ? 'info' : 'warning'}
                  showIcon
                  title={activation?.status === 'ACTIVE' ? '该结果已完成激活，可进入标注链路' : activation?.confirmed ? '已确认，下一步请手动激活' : '下一步请先人工确认结果，再执行激活'}
                  description={activation?.annotationEligible ? '结果集满足进入标注来源列表的条件。' : `当前限制：${activation?.blockReason ?? '若开启产物水印或未激活，将阻断标注链路。'}`}
                />
                <Card title="样例预览工作台">
                  <div className="pipeline-run-sample-grid">
                    {latestRun.preview.samplePairs.map((row) => (
                      <Card key={`${row.label}-${row.beforeExample}`} size="small" title={row.label}>
                        <Descriptions size="small" column={1}>
                          <Descriptions.Item label="处理前">{row.beforeExample}</Descriptions.Item>
                          <Descriptions.Item label="处理后">{row.afterExample}</Descriptions.Item>
                        </Descriptions>
                      </Card>
                    ))}
                  </div>
                </Card>
                <Card title="失败 / 跳过摘要">
                  <Space direction="vertical" className="full-width">
                    <Typography.Text>失败原因：{latestRun.preview.failedReasons.join('；') || '无'}</Typography.Text>
                    <Typography.Text>跳过原因：{latestRun.preview.skippedReasons.join('；') || '无'}</Typography.Text>
                    <Typography.Text>警告：{latestRun.preview.warnings.join('；') || '无'}</Typography.Text>
                  </Space>
                </Card>
                <Card title="处理参数与算子链">
                  <Space wrap style={{ marginBottom: 12 }}>
                    {previewOperatorChain.map((item) => <Tag key={item} color="blue">{item}</Tag>)}
                  </Space>
                  <Tabs
                    items={[
                      {
                        key: 'params',
                        label: '处理参数',
                        children: <pre className="schema-preview">{safeJson(previewProcessParams ? stringifyObjectConfig(previewProcessParams) : latestRun.preview.processParamsJson)}</pre>,
                      },
                      {
                        key: 'chain',
                        label: '原始算子链',
                        children: <pre className="schema-preview">{safeJson(latestRun.preview.operatorChainJson)}</pre>,
                      },
                    ]}
                  />
                </Card>
              </>
            ) : null}
            <Space wrap>
              <Button
                type="primary"
                disabled={!previewDatasetId || Boolean(activation?.confirmed)}
                loading={confirmPreprocessedDataset.isPending}
                onClick={() => previewDatasetId && confirmPreprocessedDataset.mutate(previewDatasetId)}
              >
                确认预处理结果
              </Button>
              <Button
                disabled={!previewDatasetId || !activation?.confirmed || activation.status === 'ACTIVE'}
                loading={activatePreprocessedDataset.isPending}
                onClick={() => previewDatasetId && activatePreprocessedDataset.mutate({ datasetId: previewDatasetId, targetVersionId: activation?.targetVersionId })}
              >
                激活为标注可用数据集
              </Button>
            </Space>
          </Space>
        ) : null}
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
  const qc = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const [msg, holder] = message.useMessage();
  const [keyword, setKeyword] = useState('');
  const [datasetType, setDatasetType] = useState<string>();
  const [accessLevel, setAccessLevel] = useState<string>();
  const [selected, setSelected] = useState<DatasetSummary | null>(null);
  const [editing, setEditing] = useState<DatasetSummary | null>(null);
  const q = useQuery({
    queryKey: ['datasets', keyword, datasetType, accessLevel],
    queryFn: () => dataApi.datasets({ keyword, datasetType, accessLevel }),
  });
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') ?? false;
  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['datasets'] }),
    qc.invalidateQueries({ queryKey: ['dataset-detail'] }),
  ]);
  const updateDataset = useMutation({
    mutationFn: ({ datasetId, input }: { datasetId: string; input: { name?: string; accessLevel?: string; tags?: string[]; description?: string } }) => dataApi.updateDataset(datasetId, input),
    onSuccess: async () => {
      setEditing(null);
      await refresh();
      msg.success('数据集元信息已更新');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const archiveDataset = useMutation({
    mutationFn: (datasetId: string) => dataApi.archiveDataset(datasetId),
    onSuccess: async () => {
      await refresh();
      msg.success('数据集已归档，后续仅可只读查看');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const hardDeleteDataset = useMutation({
    mutationFn: (datasetId: string) => dataApi.deleteDataset(datasetId),
    onSuccess: async () => {
      await refresh();
      msg.success('数据集已彻底删除');
    },
    onError: (e: Error) => msg.error(e.message),
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
      {holder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>数据集管理</Typography.Title>
          <Typography.Text type="secondary">共 {q.data?.stats.total ?? 0} 个数据集 · 合计 {fmtSize(q.data?.stats.totalSizeBytes)}</Typography.Text>
        </div>
        <Space><Button onClick={() => nav('/ann')}>查看标注任务</Button><Button type="primary" onClick={() => nav('/up')}>＋ 新建数据集</Button></Space>
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
          { title: '当前版本', dataIndex: 'currentVersionName' },
          { title: '版本数', dataIndex: 'versionCount', render: (value) => <Tag color="purple">{value}</Tag> },
          { title: '样本', dataIndex: 'recordCount' },
          { title: '大小', render: (_, r) => fmtSize(r.sizeBytes) },
          { title: '权限', dataIndex: 'accessLevel', render: (v) => <Tag color={v === 'RESTRICTED' ? 'red' : 'blue'}>{v}</Tag> },
          { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> },
          {
            title: '操作',
            render: (_, r) => (
              <Space wrap>
                <a onClick={() => nav('/dsdetail', { state: { datasetId: r.datasetId } })}>详情</a>
                <a onClick={() => setSelected(r)}>版本</a>
                <a onClick={() => nav('/ann', { state: { openCreateTask: true, datasetId: r.datasetId } })}>创建标注任务</a>
                {r.mutable ? <a onClick={() => setEditing(r)}>编辑</a> : null}
                {r.status !== 'ARCHIVED' && r.mutable ? (
                  <a onClick={() => Modal.confirm({ title: `归档 ${r.name}？`, content: '归档后仅可只读查看，不能再编辑、建版本、追加或解绑文件。', okText: '确认归档', onOk: () => archiveDataset.mutateAsync(r.datasetId) })}>归档</a>
                ) : null}
                {isSuperAdmin ? (
                  <a
                    style={{ color: r.hardDeletable ? '#cf1322' : undefined }}
                    onClick={() => Modal.confirm({
                      title: `彻底删除 ${r.name}？`,
                      content: r.hardDeletable ? '该操作不可恢复，仅用于已归档且无引用的数据集。' : '当前数据集暂不满足彻底删除条件，请先归档并确保无引用。',
                      okButtonProps: { danger: true, disabled: !r.hardDeletable },
                      okText: '确认删除',
                      onOk: () => hardDeleteDataset.mutateAsync(r.datasetId),
                    })}
                  >
                    彻底删除
                  </a>
                ) : null}
              </Space>
            ),
          },
        ]}
      />
      <Drawer title={`版本 · ${selected?.name}`} open={Boolean(selected)} onClose={() => setSelected(null)} size="default">
        <DatasetVersionList datasetId={selected?.datasetId} />
      </Drawer>
      <Modal title={`编辑元信息 · ${editing?.name ?? ''}`} open={Boolean(editing)} onCancel={() => setEditing(null)} footer={null} destroyOnHidden>
        <Form
          layout="vertical"
          initialValues={editing ? { name: editing.name, accessLevel: editing.accessLevel, tags: editing.tags.join('，'), description: editing.description ?? '' } : undefined}
          onFinish={(values) => editing && updateDataset.mutate({
            datasetId: editing.datasetId,
            input: {
              name: values.name,
              accessLevel: values.accessLevel,
              tags: String(values.tags ?? '').split(/[,，]/).map((item: string) => item.trim()).filter(Boolean),
              description: values.description,
            },
          })}
        >
          <Form.Item name="name" label="数据集名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="accessLevel" label="访问级别" rules={[{ required: true }]}><Select options={['PUBLIC', 'TEAM', 'PRIVATE', 'RESTRICTED'].map((v) => ({ value: v, label: v }))} /></Form.Item>
          <Form.Item name="tags" label="标签"><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={updateDataset.isPending}>保存元信息</Button>
        </Form>
      </Modal>
    </div>
  );
}

function DatasetVersionList({ datasetId }: { datasetId?: string }) {
  const q = useQuery({ queryKey: ['dataset-detail', datasetId], queryFn: () => dataApi.datasetDetail(datasetId!), enabled: Boolean(datasetId) });
  return <Table<DatasetVersion> rowKey="versionId" dataSource={q.data?.versions ?? []} pagination={false} columns={[{ title: '版本', render: (_, r) => <Space><span>{r.versionName}</span>{r.isCurrent ? <Tag color="blue">当前</Tag> : null}</Space> }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: '来源版本', dataIndex: 'sourceVersionId', render: (v) => v ?? '首版本' }, { title: '文件数', dataIndex: 'fileCount' }, { title: '安全', dataIndex: 'contentSafetyStatus' }, { title: '可删除', render: (_, r) => r.deletable ? '是' : r.deleteBlockedReason ?? '否' }, { title: '文件大小', render: (_, r) => fmtSize(r.sizeBytes) }]} />;
}

function PipelineCanvas({ nodes, edges, selectedNodeId, onSelect, onMove }: { nodes: PipelineNode[]; edges: PipelineEdge[]; selectedNodeId?: string; onSelect: (nodeId: string) => void; onMove: (nodeId: string, dx: number, dy: number) => void }) {
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.nodeId, node])), [nodes]);
  const dragRef = useRef<{ nodeId: string; startX: number; startY: number } | null>(null);
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
          onPointerDown={(event) => {
            dragRef.current = { nodeId: node.nodeId, startX: event.clientX, startY: event.clientY };
            const target = event.currentTarget as HTMLButtonElement & {
              setPointerCapture?: (pointerId: number) => void;
            };
            target.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current || dragRef.current.nodeId !== node.nodeId || event.buttons !== 1) return;
            const dx = event.clientX - dragRef.current.startX;
            const dy = event.clientY - dragRef.current.startY;
            if (dx !== 0 || dy !== 0) {
              onMove(node.nodeId, dx, dy);
              dragRef.current = { nodeId: node.nodeId, startX: event.clientX, startY: event.clientY };
            }
          }}
          onPointerUp={(event) => {
            const target = event.currentTarget as HTMLButtonElement & {
              hasPointerCapture?: (pointerId: number) => boolean;
              releasePointerCapture?: (pointerId: number) => void;
            };
            if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture?.(event.pointerId);
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
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
  const [dataType, setDataType] = useState<string>();
  const [detailId, setDetailId] = useState<string>();
  const [customOpen, setCustomOpen] = useState(false);
  const operators = useQuery({
    queryKey: ['operators-market', keyword, category, dataType],
    queryFn: () => dataApi.operators({ keyword, category, categoryGroup: 'VISUAL_PREPROCESS', dataType, supportsPreview: true }),
  });
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
          <Typography.Text type="secondary">视觉预处理算子目录 · 图片处理 / 视频处理 · 预览能力 / 输出类型 / 标注风险</Typography.Text>
        </div>
        <Button type="primary" onClick={() => setCustomOpen(true)}>+ 自定义算子</Button>
      </div>
      <Alert type="warning" showIcon title="视觉预处理冻结能力说明" description="图片质量提高一期仅支持传统增强；预览水印与产物水印分离；视频抽帧默认输出 IMAGE 型 PREPROCESSED 数据集。" style={{ marginBottom: 16 }} />
      <div className="opmarket-layout">
        <Card className="opmarket-cats">
          <div className={!category ? 'opmarket-cat active' : 'opmarket-cat'} onClick={() => setCategory(undefined)}>全部算子</div>
          {(operators.data?.categories ?? []).map((item) => <div key={item.category} className={category === item.category ? 'opmarket-cat active' : 'opmarket-cat'} onClick={() => setCategory(item.category)}>{txt(item.category)}<Tag>{item.count}</Tag></div>)}
          <Alert type="info" showIcon message="图片/视频处理目录" description="首批内置图片加水印、图片质量提高、去噪/锐化、视频抽帧、固定帧率抽帧等算子已冻结。" />
        </Card>
        <div>
          <Space style={{ marginBottom: 16 }} wrap>
            <Input.Search placeholder="搜索算子…" value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ width: 260 }} />
            <Select allowClear placeholder="数据类型" value={dataType} onChange={setDataType} style={{ width: 140 }} options={[{ value: 'IMAGE', label: '图片' }, { value: 'AUDIO_VIDEO', label: '视频' }]} />
            <Tag color="blue">总调用次数 {operators.data?.stats.total ?? 0}</Tag>
            <Tag color="green">内置 {operators.data?.stats.builtin ?? 0}</Tag>
            <Tag color="purple">自定义 {operators.data?.stats.custom ?? 0}</Tag>
          </Space>
          <div className="operator-market-grid">
            {rows.map((op) => <Card key={op.operatorId} hoverable onClick={() => setDetailId(op.operatorId)}><Space direction="vertical"><Space wrap><Tag color={op.kind === 'BUILTIN' ? 'blue' : 'purple'}>{op.kind}</Tag><Tag>{txt(op.category)}</Tag>{op.dataType ? <Tag color="geekblue">{txt(op.dataType)}</Tag> : null}{op.supportsPreview ? <Tag color="green">支持预览</Tag> : null}</Space><Typography.Title level={5}>{op.name}</Typography.Title><Typography.Text type="secondary">{op.description}</Typography.Text><Typography.Text type="secondary">{visualOperatorLabel(op)}{op.enhancementMode ? ` · ${txt(op.enhancementMode)}` : ''}{op.defaultOutputDatasetDataType ? ` · 输出 ${txt(op.defaultOutputDatasetDataType)}` : ''}</Typography.Text><Space wrap><Tag>调用 {op.usageCount}</Tag><Tag>引用Pipeline数 {op.pipelineCount}</Tag><Tag>错误率 {(op.errorRate * 100).toFixed(1)}%</Tag></Space></Space></Card>)}
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
        <Descriptions.Item label="分类">{visualOperatorLabel(detail.operator)}</Descriptions.Item>
        <Descriptions.Item label="状态"><Tag color={color(detail.operator.status)}>{detail.operator.status}</Tag></Descriptions.Item>
        <Descriptions.Item label="数据类型">{detail.operator.dataType ? txt(detail.operator.dataType) : '-'}</Descriptions.Item>
        <Descriptions.Item label="支持预览">{detail.operator.supportsPreview ? '是' : '否'}</Descriptions.Item>
        <Descriptions.Item label="总调用次数">{detail.operator.usageCount}</Descriptions.Item>
        <Descriptions.Item label="引用Pipeline数">{detail.operator.pipelineCount}</Descriptions.Item>
        <Descriptions.Item label="Endpoint">{detail.endpointMasked ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Credential">{detail.credentialRefMasked ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="增强模式">{detail.operator.enhancementMode ? txt(detail.operator.enhancementMode) : '-'}</Descriptions.Item>
        <Descriptions.Item label="默认输出类型">{detail.operator.defaultOutputDatasetDataType ? txt(detail.operator.defaultOutputDatasetDataType) : '-'}</Descriptions.Item>
      </Descriptions>
      <Card title="Before / After 示例"><Space direction="vertical"><Typography.Text>Before: {detail.operator.beforeExample}</Typography.Text><Typography.Text>After: {detail.operator.afterExample}</Typography.Text></Space></Card>
      {detail.annotationRiskNotice || detail.frozenDefaults ? (
        <Card title="冻结默认项与标注风险">
          <Space direction="vertical" className="full-width">
            {detail.annotationRiskNotice ? <Alert type="warning" showIcon message={detail.annotationRiskNotice} /> : null}
            {detail.frozenDefaults ? <pre className="schema-preview">{safeJson(JSON.stringify(detail.frozenDefaults))}</pre> : null}
          </Space>
        </Card>
      ) : null}
      <Card title="参数 Schema"><pre className="schema-preview">{safeJson(detail.parameterSchemaJson)}</pre></Card>
      <Table rowKey="reviewId" dataSource={detail.reviews} pagination={false} columns={[{ title: '审核状态', dataIndex: 'status' }, { title: '原因', dataIndex: 'reason' }, { title: '提交时间', dataIndex: 'submittedAt' }]} />
      {detail.operator.status === 'SUBMITTED' ? <Button type="primary" loading={loading} onClick={() => onApprove(detail.operator.operatorId)}>审核通过并发布</Button> : null}
    </Space>
  );
}

export function DatasetUploadPage() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { appendTarget?: { datasetId: string; versionId: string } } };
  const currentTenantId = useSessionStore((state) => state.user?.tenantId);
  const [msg, holder] = message.useMessage();
  const [creationMode, setCreationMode] = useState<'DATA_SOURCE_IMPORT' | 'LOCAL_UPLOAD'>(loc.state?.appendTarget ? 'LOCAL_UPLOAD' : 'DATA_SOURCE_IMPORT');
  const [targetAction, setTargetAction] = useState<'CREATE_DATASET' | 'APPEND_VERSION'>(loc.state?.appendTarget ? 'APPEND_VERSION' : 'CREATE_DATASET');
  const [targetDatasetId, setTargetDatasetId] = useState<string | undefined>(loc.state?.appendTarget?.datasetId);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DatasetDetail | null>(null);
  const [uploadSession, setUploadSession] = useState<DatasetUploadSession | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string>();
  const [selectedLocalFiles, setSelectedLocalFiles] = useState<File[]>([]);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const qc = useQueryClient();
  const sources = useQuery({ queryKey: ['data-sources'], queryFn: dataApi.dataSources });
  const datasetsQuery = useQuery({ queryKey: ['upload-target-datasets'], queryFn: () => dataApi.datasets() });
  const activeSources = (sources.data ?? []).filter((s) => s.status === 'ACTIVE' && s.diagnosticCode === 'OK');
  const appendTargets = (datasetsQuery.data?.items ?? []).filter((item) => item.status === 'ACTIVE' && item.mutable && Boolean(item.currentVersionId));
  const selectedAppendDataset = appendTargets.find((item) => item.datasetId === targetDatasetId);
  const effectiveCreationMode: 'DATA_SOURCE_IMPORT' | 'LOCAL_UPLOAD' = activeSources.length === 0 ? 'LOCAL_UPLOAD' : creationMode;
  const files = useQuery({ queryKey: ['platform-files'], queryFn: platformApi.files, enabled: step >= 1 && effectiveCreationMode === 'DATA_SOURCE_IMPORT' });
  const uploadSessionQuery = useQuery({
    queryKey: ['dataset-upload-session', uploadSession?.sessionId],
    queryFn: () => dataApi.datasetUploadSession(uploadSession!.sessionId),
    enabled: Boolean(uploadSession?.sessionId) && uploadSession?.status === 'PROCESSING',
    refetchInterval: (query) => {
      const session = query.state.data as DatasetUploadSession | undefined;
      return session && ['READY', 'SECURITY_PENDING', 'FAILED', 'CANCELLED'].includes(session.status) ? false : 400;
    },
  });
  const activeUploadSession = uploadSessionQuery.data ?? uploadSession;
  const isCommitPolling = activeUploadSession?.status === 'PROCESSING';
  const handledTerminalSessionRef = useRef<string | null>(null);
  const appendLocalFiles = useCallback((files: File[]) => {
    setSelectedLocalFiles((items) => {
      const next = [...items, ...files];
      const seen = new Set<string>();
      return next.filter((item) => {
        const key = localFileRowKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  }, []);
  const handleFolderInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    appendLocalFiles(Array.from(event.target.files ?? []));
    event.currentTarget.value = '';
  }, [appendLocalFiles]);
  useEffect(() => {
    if (!uploadSessionQuery.data) return;
    if (!['READY', 'SECURITY_PENDING', 'FAILED', 'CANCELLED'].includes(uploadSessionQuery.data.status)) return;
    const handledKey = `${uploadSessionQuery.data.sessionId}:${uploadSessionQuery.data.status}`;
    if (handledTerminalSessionRef.current === handledKey) return;
    handledTerminalSessionRef.current = handledKey;
    if (uploadSessionQuery.data.status === 'FAILED' || uploadSessionQuery.data.status === 'CANCELLED') {
      msg.error(`本地上传处理失败：${uploadSessionQuery.data.diagnosticMessage}`);
      return;
    }
    void qc.invalidateQueries({ queryKey: ['datasets'] });
    msg.success(uploadSessionQuery.data.targetAction === 'APPEND_VERSION'
      ? (uploadSessionQuery.data.status === 'READY' ? '文件已追加到既有版本。' : '文件已追加到既有版本，内容安全仍待处理。')
      : (uploadSessionQuery.data.status === 'READY' ? '本地上传数据集已创建完成。' : '本地上传已完成文件绑定，内容安全仍待处理。'));
    if (uploadSessionQuery.data.datasetId) {
      nav('/dsdetail', { state: { datasetId: uploadSessionQuery.data.datasetId, selectedVersionId: uploadSessionQuery.data.versionId ?? uploadSessionQuery.data.targetVersionId, versionStatus: uploadSessionQuery.data.versionStatus, targetAction: uploadSessionQuery.data.targetAction, fromLocalUpload: true } });
    }
  }, [msg, nav, qc, uploadSessionQuery.data]);
  const resetFlow = (mode: 'DATA_SOURCE_IMPORT' | 'LOCAL_UPLOAD') => {
    setCreationMode(mode);
    setStep(0);
    setDraft(null);
    setUploadSession(null);
    handledTerminalSessionRef.current = null;
    setSelectedFileId(undefined);
    setSelectedLocalFiles([]);
    if (mode !== 'LOCAL_UPLOAD') {
      setTargetAction('CREATE_DATASET');
      setTargetDatasetId(undefined);
    }
  };
  const create = useMutation({
    mutationFn: dataApi.createDataset,
    onSuccess: async (created) => {
      setDraft(created);
      await qc.invalidateQueries({ queryKey: ['datasets'] });
      setStep(1);
      msg.success('数据源导入草稿已创建，请继续登记文件事实。');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const createUploadSession = useMutation({
    mutationFn: dataApi.createDatasetUploadSession,
    onSuccess: (created) => {
      setUploadSession(created);
      setStep(1);
      msg.success('本地上传会话已创建，请选择图片或 zip 包。');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const uploadFiles = useMutation({
    mutationFn: async ({ sessionId, uploadFiles }: { sessionId: string; uploadFiles: File[] }) => {
      const batches = splitLocalUploadBatches(uploadFiles);
      let session: DatasetUploadSession | null = null;
      for (const batch of batches) {
        session = await dataApi.uploadDatasetSessionFiles(sessionId, batch);
      }
      if (!session) {
        throw new Error('请选择本地图片或 zip 包后再上传。');
      }
      return { session, batchCount: batches.length, fileCount: uploadFiles.length };
    },
    onSuccess: ({ session, batchCount, fileCount }) => {
      setUploadSession(session);
      setStep(2);
      setSelectedLocalFiles([]);
      msg.success(batchCount > 1 ? `文件已分 ${batchCount} 批上传并完成平台登记（共 ${fileCount} 个文件）。` : '文件已上传并完成平台登记。');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const commitUploadSession = useMutation({
    mutationFn: (sessionId: string) => dataApi.commitDatasetUploadSession(sessionId, { publishRequested: false }),
    onSuccess: (session) => {
      setUploadSession(session);
      if (session.status === 'PROCESSING') {
        msg.info('正在提交数据集，平台将持续刷新阶段进度。');
        return;
      }
      void qc.invalidateQueries({ queryKey: ['datasets'] });
      msg.success(session.targetAction === 'APPEND_VERSION'
        ? (session.status === 'READY' ? '文件已追加到既有版本。' : '文件已追加到既有版本，内容安全仍待处理。')
        : (session.status === 'READY' ? '本地上传数据集已创建完成。' : '本地上传已完成文件绑定，内容安全仍待处理。'));
      if (session.datasetId) {
        nav('/dsdetail', { state: { datasetId: session.datasetId, selectedVersionId: session.versionId ?? session.targetVersionId, versionStatus: session.versionStatus, targetAction: session.targetAction } });
      }
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const attach = useMutation({
    mutationFn: ({ fileId }: { fileId: string }) => dataApi.attachFile(draft!.dataset.datasetId, draft!.versions[0].versionId, { fileId, fileRole: 'RAW' }),
    onSuccess: async () => {
      const refreshed = await dataApi.datasetDetail(draft!.dataset.datasetId);
      setDraft(refreshed);
      setStep(2);
      msg.success('文件登记完成，hash/size 校验通过并已绑定版本草稿。');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const fileRows = files.data?.items ?? [];
  return (
    <div className="content-page">
      {holder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>新建数据集 / 上传向导</Typography.Title>
          <Typography.Text type="secondary">双路径创建 · Ant Design Upload.Dragger · 数据源导入保持兼容 · 无可用数据源时支持本地上传图片</Typography.Text>
        </div>
      </div>
      <Card>
        <Alert type="info" showIcon style={{ marginBottom: 16 }} title="复用 F007 文件元数据 seam" description="数据源导入路径继续复用 platform_file_object 文件事实；本地上传路径新增 upload session + 图片文件登记能力。" />
        <Steps
          current={step}
          items={[
            { title: '填写元数据' },
            { title: effectiveCreationMode === 'LOCAL_UPLOAD' ? '上传文件' : '登记文件' },
            { title: effectiveCreationMode === 'LOCAL_UPLOAD' ? '提交数据集' : '预览确认' },
          ]}
          style={{ marginBottom: 24 }}
        />
        {step === 0 && (
          <Form
            layout="vertical"
            initialValues={{ name: '新建视觉数据集', dataType: 'IMAGE', accessLevel: 'TEAM', tags: '质检,工业视觉' }}
            onFinish={(values) => {
              const tags = String(values.tags ?? '').split(/[,，]/).map((item: string) => item.trim()).filter(Boolean);
              if (effectiveCreationMode === 'DATA_SOURCE_IMPORT') {
                if (!values.sourceId) {
                  msg.error('请选择一个可用数据源后再继续。');
                  return;
                }
                create.mutate({
                  name: values.name,
                  tenantId: currentTenantId!,
                  datasetType: 'RAW',
                  dataType: values.dataType,
                  accessLevel: values.accessLevel,
                  tags,
                  description: values.description,
                  recordCount: Number(values.recordCount ?? 0),
                  sourceId: values.sourceId,
                });
                return;
              }
              if (targetAction === 'APPEND_VERSION' && (!targetDatasetId || !selectedAppendDataset?.currentVersionId)) {
                msg.error('请选择一个可追加的目标数据集。');
                return;
              }
              createUploadSession.mutate({
                name: targetAction === 'APPEND_VERSION' ? (selectedAppendDataset?.name ?? values.name) : values.name,
                tenantId: currentTenantId,
                datasetType: 'RAW',
                dataType: 'IMAGE',
                accessLevel: values.accessLevel,
                tags,
                description: values.description,
                creationMode: 'LOCAL_UPLOAD',
                targetAction,
                targetDatasetId: targetAction === 'APPEND_VERSION' ? targetDatasetId : undefined,
                targetVersionId: targetAction === 'APPEND_VERSION' ? selectedAppendDataset?.currentVersionId ?? undefined : undefined,
              });
            }}
          >
            <Form.Item label="创建方式">
              <Select
                value={effectiveCreationMode}
                onChange={(value) => resetFlow(value)}
                options={[
                  { value: 'DATA_SOURCE_IMPORT', label: '从数据源导入', disabled: activeSources.length === 0 },
                  { value: 'LOCAL_UPLOAD', label: '本地上传图片' },
                ]}
              />
            </Form.Item>
            {activeSources.length === 0 ? (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                title="当前无可用数据源"
                description={
                  <Space wrap>
                    <span>你可以直接上传图片创建数据集，或先去配置数据源。</span>
                    <Button size="small" type="primary" onClick={() => resetFlow('LOCAL_UPLOAD')}>直接上传图片</Button>
                    <Button size="small" onClick={() => nav('/datasrc')}>去创建数据源</Button>
                  </Space>
                }
              />
            ) : null}
            <Form.Item name="name" label="数据集名称" rules={[{ required: true, message: '请输入数据集名称' }]}><Input /></Form.Item>
            <Form.Item name="dataType" label="数据类型"><Select disabled={effectiveCreationMode === 'LOCAL_UPLOAD'} options={['IMAGE', 'TEXT', 'AUDIO', 'VIDEO', 'TABULAR'].map((v) => ({ value: v, label: txt(v) }))} /></Form.Item>
            <Form.Item name="accessLevel" label="访问级别"><Select options={['PUBLIC', 'TEAM', 'PRIVATE', 'RESTRICTED'].map((v) => ({ value: v, label: v }))} /></Form.Item>
            {effectiveCreationMode === 'LOCAL_UPLOAD' ? (
              <>
                <Form.Item label="上传目标">
                  <Select
                    value={targetAction}
                    onChange={(value) => setTargetAction(value)}
                    options={[
                      { value: 'CREATE_DATASET', label: '创建新数据集' },
                      { value: 'APPEND_VERSION', label: '追加到既有当前版本' },
                    ]}
                  />
                </Form.Item>
                {targetAction === 'APPEND_VERSION' ? (
                  <>
                    <Form.Item label="目标数据集" required>
                      <Select
                        value={targetDatasetId}
                        onChange={setTargetDatasetId}
                        options={appendTargets.map((item) => ({ value: item.datasetId, label: `${item.name} · ${item.currentVersionName ?? item.currentVersionId}` }))}
                      />
                    </Form.Item>
                    <Alert
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                      title="追加模式说明"
                      description={`仅允许追加到当前版本。当前目标版本：${selectedAppendDataset?.currentVersionName ?? selectedAppendDataset?.currentVersionId ?? '未选择'}。提交后不会创建影子数据集。`}
                    />
                  </>
                ) : null}
              </>
            ) : null}
            {effectiveCreationMode === 'DATA_SOURCE_IMPORT' && activeSources.length > 0 ? (
              <Form.Item name="sourceId" label="来源数据源" rules={[{ required: true, message: '请选择来源数据源' }]}>
                <Select options={activeSources.map((s) => ({ value: s.sourceId, label: `${s.name} · ${txt(s.sourceType)}` }))} />
              </Form.Item>
            ) : null}
            <Form.Item name="tags" label="标签"><Input /></Form.Item>
            <Form.Item name="description" label="描述"><Input.TextArea rows={3} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={create.isPending || createUploadSession.isPending}>
              {effectiveCreationMode === 'LOCAL_UPLOAD' ? '下一步：创建上传会话' : '下一步：初始化数据集'}
            </Button>
          </Form>
        )}
        {step === 1 && effectiveCreationMode === 'DATA_SOURCE_IMPORT' && (
          <Space direction="vertical" className="full-width">
            <Alert type="info" showIcon title="文件登记 seam" description="选择 F007 platform_file_object，提交后后端执行 AVAILABLE、sha256 与 size 校验，并绑定到当前版本草稿。" />
            <div className="dataset-upload-drop">
              <Upload.Dragger multiple directory accept="image/*,.zip" showUploadList={false} beforeUpload={() => false}>
                <p className="ant-upload-drag-icon">⬆</p>
                <p className="ant-upload-text">拖拽文件或文件夹</p>
                <p className="ant-upload-hint">数据源导入路径仅展示拖拽能力占位；实际绑定仍以下方 F007 文件对象清单为准。</p>
              </Upload.Dragger>
            </div>
            <Table<FileObjectSummary> rowKey="fileId" dataSource={fileRows} pagination={false} rowSelection={{ type: 'radio', selectedRowKeys: selectedFileId ? [selectedFileId] : [], onChange: (keys) => setSelectedFileId(String(keys[0])) }} columns={[{ title: '文件 ID', dataIndex: 'fileId' }, { title: 'Object Key', dataIndex: 'objectKey' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: 'hash 校验', render: (_, r) => r.expectedSha256 === r.sha256 ? '通过' : '不一致' }, { title: '大小', render: (_, r) => fmtSize(r.sizeBytes) }]} />
            <Button type="primary" disabled={!selectedFileId} loading={attach.isPending} onClick={() => selectedFileId && attach.mutate({ fileId: selectedFileId })}>完成文件登记并绑定版本</Button>
          </Space>
        )}
        {step === 1 && effectiveCreationMode === 'LOCAL_UPLOAD' && uploadSession && (
          <Space direction="vertical" className="full-width">
            <Alert type="info" showIcon title={`上传会话 ${uploadSession.sessionId}`} description={`阶段：${uploadSession.progress.phase} · ${uploadSession.progress.percent}%`} />
            {uploadSession.targetAction === 'APPEND_VERSION' ? <Alert type="warning" showIcon title="本次将追加到既有版本" description={`${uploadSession.targetDatasetId ?? '-'} / ${uploadSession.targetVersionId ?? '-'}`} /> : null}
            <div className="dataset-upload-drop">
              <Upload.Dragger
                multiple
                accept="image/*,.zip"
                showUploadList={false}
                beforeUpload={(file) => {
                  appendLocalFiles([file as File]);
                  return false;
                }}
              >
                <p className="ant-upload-drag-icon">⬆</p>
                <p className="ant-upload-text">拖拽文件，或点击选择图片 / zip 包</p>
                <p className="ant-upload-hint">如果要导入整个文件夹，请使用下方“选择文件夹”。选择后会先展示在下方表格，再点击“上传并登记到平台”。平台会按大小自动分批上传，避免大批量图片一次性提交失败。</p>
              </Upload.Dragger>
            </div>
            <input
              ref={folderInputRef}
              type="file"
              multiple
              accept="image/*,.zip"
              onChange={handleFolderInputChange}
              style={{ display: 'none' }}
              {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
            />
            <Space wrap>
              <Button onClick={() => folderInputRef.current?.click()}>选择文件夹</Button>
              <Button onClick={() => setSelectedLocalFiles([])} disabled={selectedLocalFiles.length === 0 || uploadFiles.isPending}>清空已选</Button>
              <Button type="primary" disabled={selectedLocalFiles.length === 0} loading={uploadFiles.isPending} onClick={() => uploadFiles.mutate({ sessionId: uploadSession.sessionId, uploadFiles: selectedLocalFiles })}>上传并登记到平台</Button>
            </Space>
            <Table<{ key: string; name: string; relativePath?: string; type: string; size: number }>
              rowKey="key"
              dataSource={selectedLocalFiles.map((file) => ({ key: localFileRowKey(file), name: file.name, relativePath: localFileRelativePath(file), type: file.type || 'application/octet-stream', size: file.size }))}
              pagination={false}
              locale={{ emptyText: '请选择本地图片或 zip 包。' }}
              columns={[
                {
                  title: '文件名',
                  dataIndex: 'name',
                  render: (value: string, row: { relativePath?: string }) => <Space direction="vertical" size={0}><Typography.Text strong>{value}</Typography.Text>{row.relativePath ? <Typography.Text type="secondary">{row.relativePath}</Typography.Text> : null}</Space>,
                },
                { title: '类型', dataIndex: 'type' },
                { title: '大小', dataIndex: 'size', render: (value: number) => fmtSize(value) },
              ]}
            />
          </Space>
        )}
        {step === 2 && effectiveCreationMode === 'DATA_SOURCE_IMPORT' && (
          <Space direction="vertical" className="full-width">
            <Alert type="warning" showIcon title="文件上传 seam 已初始化" description="真实对象存储/内容安全服务未配置时保持 TODO_CONFIRM_MINIO_* / SECURITY_PENDING，不伪造发布成功。" />
            <Table rowKey="bindingId" dataSource={draft?.files ?? []} pagination={false} columns={[{ title: '文件', dataIndex: 'fileId' }, { title: '状态', dataIndex: 'status' }, { title: 'Object Key', dataIndex: 'objectKey' }, { title: '大小', render: (_, r: { sizeBytes?: number | null }) => fmtSize(r.sizeBytes) }]} />
            <Button type="primary" onClick={() => draft?.dataset.datasetId && nav('/dsdetail', { state: { datasetId: draft.dataset.datasetId } })}>查看数据集详情</Button>
          </Space>
        )}
        {step === 2 && effectiveCreationMode === 'LOCAL_UPLOAD' && activeUploadSession && (
          <Space direction="vertical" className="full-width">
            <Alert
              type={['READY', 'SECURITY_PENDING'].includes(activeUploadSession.status) ? 'success' : activeUploadSession.status === 'FAILED' ? 'error' : 'info'}
              showIcon
              title={`阶段进度：${activeUploadSession.progress.phase} · ${activeUploadSession.progress.percent}%`}
              description={isCommitPolling ? '平台正在执行内容安全校验、元数据索引和版本写入，请等待自动刷新。' : activeUploadSession.diagnosticMessage}
            />
            {activeUploadSession.targetAction === 'APPEND_VERSION' ? <Alert type="warning" showIcon title="追加结果" description={`目标 dataset/version：${activeUploadSession.targetDatasetId} / ${activeUploadSession.targetVersionId}，versionStatus=${activeUploadSession.versionStatus ?? '-'}`} /> : null}
            <Alert type={activeUploadSession.summary.rejectedFiles > 0 ? 'warning' : 'success'} showIcon title={`已接收 ${activeUploadSession.summary.acceptedFiles} 个文件，拒绝 ${activeUploadSession.summary.rejectedFiles} 个文件`} description={activeUploadSession.diagnosticMessage} />
            <Table rowKey={(row) => `${row.fileName}-${row.fileId ?? 'rejected'}`} dataSource={activeUploadSession.files} pagination={false} columns={[{ title: '文件名', dataIndex: 'fileName' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: '大小', dataIndex: 'sizeBytes', render: (value: number | null) => fmtSize(value) }, { title: '诊断', dataIndex: 'diagnosticMessage' }]} />
            <Space wrap>
              <Button onClick={() => setStep(1)}>继续追加文件</Button>
              <Button type="primary" disabled={activeUploadSession.summary.acceptedFiles === 0 || isCommitPolling} loading={commitUploadSession.isPending || isCommitPolling} onClick={() => commitUploadSession.mutate(activeUploadSession.sessionId)}>{isCommitPolling ? '处理中...' : activeUploadSession.targetAction === 'APPEND_VERSION' ? '提交并追加到既有版本' : '提交并创建数据集'}</Button>
            </Space>
          </Space>
        )}
      </Card>
    </div>
  );
}

export function DatasetDetailPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const loc = useLocation() as { state?: { datasetId?: string; selectedVersionId?: string; versionStatus?: string; targetAction?: string; fromLocalUpload?: boolean } };
  const user = useSessionStore((state) => state.user);
  const datasetId = loc.state?.datasetId ?? 'DATASET-WELD-DEFECT';
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(loc.state?.selectedVersionId);
  const [editOpen, setEditOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const detail = useQuery({ queryKey: ['dataset-detail', datasetId, selectedVersionId], queryFn: () => dataApi.datasetDetail(datasetId, selectedVersionId) });
  const candidate = useQuery({ queryKey: ['dataset-annotation-candidate', datasetId], queryFn: () => dataApi.datasetAnnotationCandidate(datasetId) });
  const annTasks = useQuery({ queryKey: ['dataset-annotation-tasks', datasetId], queryFn: () => dataApi.datasetAnnotationTasks(datasetId) });
  const ref = useMutation({ mutationFn: () => dataApi.reference(datasetId), onError: () => undefined });
  const [msg, holder] = message.useMessage();
  const [taskForm] = Form.useForm<{ name: string; scene: string; templateId?: string; templateMode?: 'EXISTING' | 'INLINE_CREATE'; inlineLabels?: string; inlineTemplateName?: string }>();
  const [taskOpen, setTaskOpen] = useState(false);
  const [exportTask, setExportTask] = useState<DatasetAnnotationTask | null>(null);
  const [previewFile, setPreviewFile] = useState<{ fileId: string; name: string } | null>(null);
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') ?? false;
  const refreshDetail = async (versionId?: string) => {
    if (versionId) setSelectedVersionId(versionId);
    await qc.invalidateQueries({ queryKey: ['datasets'] });
    await qc.invalidateQueries({ queryKey: ['dataset-detail', datasetId] });
    await qc.invalidateQueries({ queryKey: ['dataset-detail', datasetId, versionId ?? selectedVersionId] });
  };
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
  const platformFiles = useQuery({ queryKey: ['platform-files-attach', datasetId], queryFn: platformApi.files, enabled: attachOpen });
  const updateDataset = useMutation({
    mutationFn: (input: { name?: string; accessLevel?: string; tags?: string[]; description?: string }) => dataApi.updateDataset(datasetId, input),
    onSuccess: async () => {
      setEditOpen(false);
      await refreshDetail();
      msg.success('数据集元信息已更新');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const createVersion = useMutation({
    mutationFn: (input: { versionName?: string; sourceVersionId?: string | null; inheritPreviousFiles?: boolean; description?: string }) => dataApi.createVersion(datasetId, input),
    onSuccess: async (created) => {
      setVersionOpen(false);
      await refreshDetail(created.versionId);
      msg.success(`版本 ${created.versionName} 已创建并切换为当前版本`);
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const deleteVersion = useMutation({
    mutationFn: (versionId: string) => dataApi.deleteVersion(datasetId, versionId),
    onSuccess: async (result) => {
      await refreshDetail(result.currentVersionId);
      msg.success(`版本已删除，当前版本已回退到 ${result.currentVersionName}`);
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const attach = useMutation({
    mutationFn: ({ versionId, fileId }: { versionId: string; fileId: string }) => dataApi.attachFile(datasetId, versionId, { fileId, fileRole: 'RAW' }),
    onSuccess: async () => {
      setAttachOpen(false);
      await refreshDetail();
      msg.success('文件已追加到当前版本');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const unbind = useMutation({
    mutationFn: ({ versionId, bindingId }: { versionId: string; bindingId: string }) => dataApi.unbindFile(datasetId, versionId, bindingId),
    onSuccess: async () => {
      await refreshDetail();
      msg.success('文件绑定已解绑，底层文件对象未删除');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const archive = useMutation({
    mutationFn: () => dataApi.archiveDataset(datasetId),
    onSuccess: async () => {
      await refreshDetail();
      msg.success('数据集已归档');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const hardDelete = useMutation({
    mutationFn: () => dataApi.deleteDataset(datasetId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['datasets'] });
      msg.success('数据集已彻底删除');
      nav('/ds');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const createTask = useMutation({
    mutationFn: async (values: { name: string; templateId?: string; scene: string; templateMode?: 'EXISTING' | 'INLINE_CREATE'; inlineLabels?: string; inlineTemplateName?: string }) => {
      let templateId = values.templateId;
      let inlineLabels: string[] | undefined;
      let inlineTemplateName: string | undefined;
      if (values.templateMode === 'INLINE_CREATE' || !templateId) {
        inlineLabels = parseInlineLabels(values.inlineLabels);
        if (inlineLabels.length === 0) {
          throw new Error('请至少输入一个标签。');
        }
        inlineTemplateName = values.inlineTemplateName?.trim() || `${d?.dataset.name ?? '数据集'} ${txt(values.scene)}模板`;
        templateId = undefined;
      }
      return dataApi.createDatasetAnnotationTask(datasetId, {
        ...values,
        sourceDatasetId: datasetId,
        sourceVersionId: candidate.data?.currentVersionId,
        templateId,
        inlineLabels,
        inlineTemplateName,
        reviewEnabled: true,
        labelStudioEnabled: true,
        assigneeIds: [],
        reviewerIds: [],
      });
    },
    onSuccess: async () => {
      setTaskOpen(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['dataset-annotation-tasks', datasetId] }),
        qc.invalidateQueries({ queryKey: ['dataset-annotation-candidate', datasetId] }),
      ]);
      msg.success('已从数据集创建标注任务');
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const createExport = useMutation({
    mutationFn: ({ taskId, format }: { taskId: string; format: string }) => dataApi.createAnnotationExport(taskId, { format }),
    onSuccess: async () => { setExportTask(null); await qc.invalidateQueries({ queryKey: ['dataset-annotation-tasks', datasetId] }); msg.success('导出请求已创建'); },
    onError: (e: Error) => msg.error(e.message),
  });
  const exportDownload = useMutation({
    mutationFn: (exportId: string) => dataApi.annotationExportDownloadUrl(exportId),
    onSuccess: (result) => { if (result.downloadUrl) { window.open(result.downloadUrl, '_blank', 'noopener,noreferrer'); msg.success('已打开训练包下载链接'); } else { msg.warning(`训练包下载状态未就绪：${result.diagnosticCode}`); } },
    onError: (e: Error) => msg.error(e.message),
  });
  const d = detail.data;
  const selectedVersion = d?.selectedVersion;
  const canWriteSelectedVersion = Boolean(
    d
    && selectedVersion
    && d.dataset.status !== 'ARCHIVED'
    && d.dataset.mutable
    && d.selectedVersionId === d.dataset.currentVersionId
    && selectedVersion.mutable
    && selectedVersion.isCurrent,
  );
  const fileColumns = [
    { title: '文件 ID', dataIndex: 'fileId' },
    { title: '角色', dataIndex: 'fileRole', render: (v: string) => <Tag>{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={color(v)}>{v}</Tag> },
    { title: 'Object Key', dataIndex: 'objectKey', render: (v: string) => <Typography.Text className="mono" copyable>{v}</Typography.Text> },
    { title: 'Content-Type', dataIndex: 'contentType', render: (v: string | null) => v ?? '-' },
    { title: '大小', render: (_: unknown, r: { sizeBytes?: number | null }) => fmtSize(r.sizeBytes) },
    { title: 'SHA256', dataIndex: 'sha256', render: (v: string | null) => v ? <Typography.Text className="mono" copyable>{v}</Typography.Text> : '-' },
    { title: '下载', render: (_: unknown, r: { fileId: string; status: string }) => <Button size="small" disabled={r.status !== 'BOUND'} loading={download.isPending} onClick={() => download.mutate(r.fileId)}>获取下载链接</Button> },
    { title: '绑定 ID', dataIndex: 'bindingId', render: (v: string) => <Typography.Text className="mono" copyable>{v}</Typography.Text> },
    { title: '解绑', render: (_: unknown, r: { bindingId: string; versionId: string }) => canWriteSelectedVersion ? <Button size="small" danger loading={unbind.isPending} onClick={() => Modal.confirm({ title: '解绑当前版本文件？', content: '仅删除当前版本的绑定关系，不删除底层文件对象。', okText: '确认解绑', onOk: () => unbind.mutateAsync({ versionId: r.versionId, bindingId: r.bindingId }) })}>解绑</Button> : null },
  ];
  const canCreateAnnotationTask = Boolean(
    candidate.data
      ? candidate.data.status === 'ACTIVE' && candidate.data.dataType === 'IMAGE' && candidate.data.currentVersionId
      : d?.dataset.status === 'ACTIVE' && d?.dataset.dataType === 'IMAGE' && d?.selectedVersionId,
  );
  const nextVersionName = d ? `v${(d.dataset.versionCount ?? 0) + 1}` : 'v2';
  const taskScene = Form.useWatch('scene', taskForm) ?? 'IMAGE_TAGGING';
  const taskTemplateMode = Form.useWatch('templateMode', taskForm) ?? 'INLINE_CREATE';
  const sceneTemplates = useMemo(() => (candidate.data?.templates ?? []).filter((template) => template.scene === taskScene), [candidate.data?.templates, taskScene]);
  useEffect(() => {
    if (!taskOpen) return;
    const currentTemplateId = taskForm.getFieldValue('templateId');
    if (!sceneTemplates.some((template) => template.templateId === currentTemplateId)) {
      taskForm.setFieldsValue({ templateId: sceneTemplates[0]?.templateId });
    }
    if (sceneTemplates.length === 0 && taskTemplateMode !== 'INLINE_CREATE') {
      taskForm.setFieldsValue({ templateMode: 'INLINE_CREATE' });
    }
  }, [sceneTemplates, taskForm, taskOpen, taskTemplateMode]);
  useEffect(() => {
    if (!taskOpen) return;
    const defaultScene = 'IMAGE_TAGGING';
    const defaultTemplateId = (candidate.data?.templates ?? []).find((template) => template.scene === defaultScene)?.templateId;
    taskForm.setFieldsValue({
      name: `${d?.dataset.name ?? '数据集'} 标注任务`,
      scene: defaultScene,
      templateId: defaultTemplateId,
      templateMode: 'INLINE_CREATE',
      inlineLabels: annotationClasses.join('，'),
      inlineTemplateName: `${d?.dataset.name ?? '数据集'} ${txt(defaultScene)}模板`,
    });
  }, [candidate.data?.templates, d?.dataset.name, taskForm, taskOpen]);
  return (
    <div className="content-page">
      {holder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>{d?.dataset.name ?? '数据集详情'}</Typography.Title>
          <Typography.Text type="secondary">概览 · 版本切换 · 所选版本视图 · 文件绑定 · 权限 · 血缘</Typography.Text>
        </div>
        <Space wrap>
          <Button onClick={() => ref.mutate()}>请求引用检查</Button>
          <Button onClick={() => setEditOpen(true)} disabled={!d?.dataset.mutable}>编辑元信息</Button>
          <Button onClick={() => setVersionOpen(true)} disabled={!d?.dataset.mutable || d?.dataset.status === 'ARCHIVED'}>新建版本</Button>
          <Button onClick={() => setAttachOpen(true)} disabled={!canWriteSelectedVersion}>追加文件</Button>
          <Button onClick={() => nav('/up', { state: { appendTarget: canWriteSelectedVersion ? { datasetId, versionId: d!.selectedVersionId } : undefined } })} disabled={!canWriteSelectedVersion}>上传向导追加</Button>
          <Button onClick={() => Modal.confirm({ title: '归档当前数据集？', content: '归档后所有写操作将被禁止，仅保留只读查看。', okText: '确认归档', onOk: () => archive.mutateAsync() })} disabled={d?.dataset.status === 'ARCHIVED' || !d?.dataset.mutable}>归档</Button>
          {isSuperAdmin ? <Button danger disabled={!d?.dataset.hardDeletable} onClick={() => Modal.confirm({ title: '彻底删除当前数据集？', content: '仅用于已归档且无引用的数据集，删除后不可恢复。', okText: '确认彻底删除', okButtonProps: { danger: true }, onOk: () => hardDelete.mutateAsync() })}>彻底删除</Button> : null}
          <Button type="primary" disabled={!canCreateAnnotationTask} onClick={() => setTaskOpen(true)}>创建标注任务</Button>
        </Space>
      </div>
      {!canCreateAnnotationTask ? <Alert type="warning" showIcon style={{ marginBottom: 16 }} title="当前数据集尚未达到可发起标注任务的状态" description="仅 ACTIVE / 可用状态的 IMAGE 数据集可继续发起标注任务。" /> : null}
      {d && !canWriteSelectedVersion ? <Alert type="info" showIcon style={{ marginBottom: 16 }} title="当前为只读版本视图" description="只有“当前版本”且版本可变时，才允许追加文件、解绑文件或使用上传向导追加。" /> : null}
      {ref.data ? <Alert type="success" showIcon title={`DatasetReference 可用：${ref.data.versionId}`} style={{ marginBottom: 16 }} /> : null}
      {loc.state?.targetAction === 'APPEND_VERSION' && loc.state?.versionStatus ? (
        <Alert
          type={loc.state.versionStatus === 'SECURITY_PENDING' ? 'warning' : 'info'}
          showIcon
          style={{ marginBottom: 16 }}
          title="上传向导追加已完成"
          description={`targetAction=APPEND_VERSION，versionStatus=${loc.state.versionStatus}`}
        />
      ) : null}
      <Card loading={detail.isLoading}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="数据类型">{txt(d?.dataset.dataType)}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag color={color(d?.dataset.status)}>{d?.dataset.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="权限"><Tag color={d?.dataset.accessLevel === 'RESTRICTED' ? 'red' : 'blue'}>{d?.dataset.accessLevel}</Tag></Descriptions.Item>
          <Descriptions.Item label="版本总数">{d?.dataset.versionCount ?? 0}</Descriptions.Item>
          <Descriptions.Item label="当前版本">{d?.dataset.currentVersionName ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="所选版本">
            <Space wrap>
              <Select
                value={d?.selectedVersionId}
                style={{ width: 240 }}
                onChange={setSelectedVersionId}
                options={(d?.versions ?? []).map((item) => ({ value: item.versionId, label: `${item.versionName}${item.isCurrent ? '（当前）' : ''}` }))}
              />
              {selectedVersion?.isCurrent ? <Tag color="blue">当前版本</Tag> : <Tag>旧版本</Tag>}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="样本数">{d?.dataset.recordCount?.toLocaleString('zh-CN') ?? 0}</Descriptions.Item>
          <Descriptions.Item label="标签">{d?.dataset.tags.map((t) => <Tag key={t}>{t}</Tag>)}</Descriptions.Item>
          <Descriptions.Item label="预览状态">{d?.previewStatus} · {d?.previewDiagnostic}</Descriptions.Item>
          <Descriptions.Item label="管理员硬删除">{d?.dataset.hardDeletable ? <Tag color="red">满足条件</Tag> : '未满足条件'}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title={`所选版本 · ${selectedVersion?.versionName ?? '-'}`} style={{ marginTop: 16 }} loading={detail.isLoading}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="版本状态"><Tag color={color(selectedVersion?.status)}>{selectedVersion?.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="内容安全">{selectedVersion?.contentSafetyStatus}</Descriptions.Item>
          <Descriptions.Item label="来源版本">{selectedVersion?.sourceVersionId ?? '首版本'}</Descriptions.Item>
          <Descriptions.Item label="文件数">{selectedVersion?.fileCount ?? 0}</Descriptions.Item>
          <Descriptions.Item label="样本数">{selectedVersion?.recordCount ?? 0}</Descriptions.Item>
          <Descriptions.Item label="大小">{fmtSize(selectedVersion?.sizeBytes)}</Descriptions.Item>
          <Descriptions.Item label="诊断">{selectedVersion?.diagnosticCode ?? '-'} / {selectedVersion?.diagnosticMessage ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="可删除">{selectedVersion?.deletable ? '是' : selectedVersion?.deleteBlockedReason ?? '否'}</Descriptions.Item>
        </Descriptions>
        {selectedVersion?.deletable ? (
          <Button
            style={{ marginTop: 16 }}
            danger
            onClick={() => Modal.confirm({
              title: `删除版本 ${selectedVersion.versionName}？`,
              content: '删除后会按 contract 回退 currentVersion，仅删除该版本及其文件绑定关系。',
              okText: '确认删除版本',
              okButtonProps: { danger: true },
              onOk: () => deleteVersion.mutateAsync(selectedVersion.versionId),
            })}
          >
            删除当前查看版本
          </Button>
        ) : null}
      </Card>
      <Card title={`文件信息（所选版本 ${d?.files.length ?? 0}）`} style={{ marginTop: 16 }} loading={detail.isLoading}>
        <Table rowKey="bindingId" dataSource={d?.files ?? []} pagination={false} columns={fileColumns} locale={{ emptyText: '当前所选版本暂无已绑定文件。' }} />
      </Card>
      {(d?.files ?? []).filter((file) => file.contentType?.startsWith('image/')).length > 0 ? (
        <Card title={`图片预览（${(d?.files ?? []).filter((file) => file.contentType?.startsWith('image/')).length}）`} style={{ marginTop: 16 }} loading={detail.isLoading}>
          <Space wrap>{(d?.files ?? []).filter((file) => file.contentType?.startsWith('image/')).map((file) => <Button key={file.bindingId} onClick={() => setPreviewFile({ fileId: file.fileId, name: file.objectKey.split('/').slice(-1)[0] ?? file.fileId })}>预览 {file.objectKey.split('/').slice(-1)[0] ?? file.fileId}</Button>)}</Space>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>当前仅对 image/* 文件展示预览入口。</Typography.Paragraph>
        </Card>
      ) : null}
      <Tabs
        items={[
          {
            key: 'annotation',
            label: '标注任务/训练导出',
            children: <Space direction="vertical" className="full-width">
              <Alert type={canCreateAnnotationTask ? 'success' : 'warning'} showIcon title="ACTIVE IMAGE 数据集可创建标注任务" description={`${candidate.data?.diagnosticCode ?? 'LOADING'} · ${candidate.data?.diagnosticMessage ?? '正在加载候选状态'}；${candidate.data?.diagnosticCode === 'ANNOTATION_TEMPLATE_REQUIRED' ? '当前可在创建任务时直接输入标签，系统会自动生成并发布模板。' : 'COCO/YOLO/VOC/Mask 均包含图片副本，训练环境默认采用自包含导出包。'}`} />
              <Space wrap><Button type="primary" disabled={!canCreateAnnotationTask} onClick={() => setTaskOpen(true)}>从数据集创建标注任务</Button><Typography.Text type="secondary">当前版本：{candidate.data?.currentVersionId ?? '-'}</Typography.Text></Space>
              <Table<DatasetAnnotationTask> rowKey={(r) => r.task.taskId} dataSource={annTasks.data ?? []} loading={annTasks.isLoading} expandable={{ expandedRowRender: (r) => <Table<AnnotationTrainingExport> rowKey="exportId" dataSource={r.exports} pagination={false} columns={[{ title: '格式', dataIndex: 'format' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: '包含', render: (_v, item) => item.packageIncludesImages ? '包含图片副本和 metadata' : '仅 metadata' }, { title: '有效期', render: (_v, item) => item.expiresAt ? item.expiresAt.slice(0, 10) : '-' }, { title: '大小', render: (_v, item) => fmtSize(item.sizeBytes) }, { title: '诊断', render: (_v, item) => `${item.diagnosticCode} · ${item.diagnosticMessage}` }, { title: '下载', render: (_v, item) => <Button size="small" disabled={!item.exportId || item.status !== 'AVAILABLE'} loading={exportDownload.isPending} onClick={() => exportDownload.mutate(item.exportId)}>获取下载链接</Button> }]} locale={{ emptyText: '暂无训练格式导出' }} /> }} columns={[{ title: '任务', render: (_v, r) => <Space direction="vertical" size={0}><Typography.Text strong>{r.task.name}</Typography.Text><Typography.Text type="secondary" className="mono">{r.task.taskId}</Typography.Text></Space> }, { title: '场景', render: (_v, r) => txt(r.task.scene) }, { title: '状态', render: (_v, r) => <Tag color={color(r.task.status)}>{annStatusText(r.task.status)}</Tag> }, { title: '进度', render: (_v, r) => `${r.task.reviewedCount}/${r.task.totalCount}` }, { title: '质量分', render: (_v, r) => r.task.qualityScore ?? '-' }, { title: '操作', render: (_v, r) => <Space wrap><Button size="small" type="primary" onClick={() => nav(`/annwork?taskId=${encodeURIComponent(r.task.taskId)}`, { state: { taskId: r.task.taskId } })}>进入标注</Button><Button size="small" onClick={() => setExportTask(r)}>生成训练包</Button></Space> }]} />
            </Space>,
          },
          {
            key: 'versions',
            label: '版本历史',
            children: <Table rowKey="versionId" dataSource={d?.versions ?? []} pagination={false} columns={[{ title: '版本', render: (_, r) => <Space><a onClick={() => setSelectedVersionId(r.versionId)}>{r.versionName}</a>{r.isCurrent ? <Tag color="blue">当前</Tag> : null}</Space> }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: '来源版本', dataIndex: 'sourceVersionId', render: (v) => v ?? '首版本' }, { title: '内容安全', dataIndex: 'contentSafetyStatus' }, { title: '文件数', dataIndex: 'fileCount' }, { title: '诊断', dataIndex: 'diagnosticMessage' }]} />,
          },
          { key: 'files', label: `文件元数据（${d?.files.length ?? 0}）`, children: <Table rowKey="bindingId" dataSource={d?.files ?? []} pagination={false} columns={fileColumns} locale={{ emptyText: '暂无文件元数据' }} /> },
          { key: 'lineage', label: '血缘', children: <Table rowKey="lineageId" dataSource={d?.lineage ?? []} pagination={false} columns={[{ title: '来源', dataIndex: 'sourceType' }, { title: 'Source ID', dataIndex: 'sourceId' }, { title: '目标', dataIndex: 'targetId' }, { title: '转换', dataIndex: 'transformType' }]} /> },
          { key: 'access', label: '权限授权', children: <Table rowKey="grantId" dataSource={d?.grants ?? []} pagination={false} columns={[{ title: '用户', dataIndex: 'userName' }, { title: '状态', dataIndex: 'status' }, { title: '有效期', dataIndex: 'expiresAt' }]} /> },
        ]}
      />
      <Modal title="编辑数据集元信息" open={editOpen} onCancel={() => setEditOpen(false)} footer={null} destroyOnHidden>
        <Form
          layout="vertical"
          initialValues={d ? { name: d.dataset.name, accessLevel: d.dataset.accessLevel, tags: d.dataset.tags.join('，'), description: d.dataset.description ?? '' } : undefined}
          onFinish={(values) => updateDataset.mutate({ name: values.name, accessLevel: values.accessLevel, tags: String(values.tags ?? '').split(/[,，]/).map((item: string) => item.trim()).filter(Boolean), description: values.description })}
        >
          <Form.Item name="name" label="数据集名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="accessLevel" label="访问级别" rules={[{ required: true }]}><Select options={['PUBLIC', 'TEAM', 'PRIVATE', 'RESTRICTED'].map((v) => ({ value: v, label: v }))} /></Form.Item>
          <Form.Item name="tags" label="标签"><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={updateDataset.isPending}>保存元信息</Button>
        </Form>
      </Modal>
      <Modal title="新建版本" open={versionOpen} onCancel={() => setVersionOpen(false)} footer={null} destroyOnHidden>
        <Form
          layout="vertical"
          initialValues={{ versionName: nextVersionName, sourceVersionId: d?.dataset.currentVersionId, inheritPreviousFiles: 'true', description: '' }}
          onFinish={(values) => createVersion.mutate({ versionName: values.versionName, sourceVersionId: values.sourceVersionId, inheritPreviousFiles: values.inheritPreviousFiles === 'true', description: values.description })}
        >
          <Form.Item name="versionName" label="版本号" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sourceVersionId" label="来源版本"><Select options={(d?.versions ?? []).map((item) => ({ value: item.versionId, label: item.versionName }))} /></Form.Item>
          <Form.Item name="inheritPreviousFiles" label="是否复制来源文件集合"><Select options={[{ value: 'true', label: '复制来源文件集合' }, { value: 'false', label: '创建空版本' }]} /></Form.Item>
          <Form.Item name="description" label="版本备注"><Input.TextArea rows={3} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={createVersion.isPending}>创建版本</Button>
        </Form>
      </Modal>
      <Modal title="追加文件到当前版本" open={attachOpen} onCancel={() => setAttachOpen(false)} footer={null} destroyOnHidden width={880}>
        <Alert type="info" showIcon style={{ marginBottom: 16 }} title="仅追加当前版本" description={`所选版本需等于 currentVersion，当前目标：${d?.dataset.currentVersionName ?? '-'} / ${d?.selectedVersionId ?? '-'}`} />
        <Table
          rowKey="fileId"
          dataSource={platformFiles.data?.items ?? []}
          pagination={false}
          columns={[
            { title: '文件 ID', dataIndex: 'fileId' },
            { title: 'Object Key', dataIndex: 'objectKey' },
            { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> },
            { title: '大小', render: (_, r) => fmtSize(r.sizeBytes) },
            { title: '操作', render: (_, r) => <Button type="link" disabled={!canWriteSelectedVersion} loading={attach.isPending} onClick={() => d && attach.mutate({ versionId: d.selectedVersionId, fileId: r.fileId })}>追加到当前版本</Button> },
          ]}
        />
      </Modal>
      <Modal title="从数据集创建标注任务" open={taskOpen} onCancel={() => setTaskOpen(false)} footer={null} destroyOnHidden>
        <Form form={taskForm} layout="vertical" onFinish={(v) => createTask.mutate(v)}>
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="scene" label="标注场景"><Select options={[{ value: 'IMAGE_TAGGING', label: '图片打标' }, { value: 'IMAGE_SEGMENTATION', label: '图片分割' }]} onChange={(scene) => taskForm.setFieldsValue({ templateId: undefined, templateMode: 'INLINE_CREATE', inlineTemplateName: `${d?.dataset.name ?? '数据集'} ${txt(scene)}模板` })} /></Form.Item>
          <Form.Item name="templateMode" label="标签来源"><Select options={[{ value: 'EXISTING', label: '选择已发布模板' }, { value: 'INLINE_CREATE', label: '直接输入标签并自动建模板' }]} /></Form.Item>
          {taskTemplateMode === 'EXISTING' ? (
            <Form.Item name="templateId" label="标签模板" rules={[{ required: true, message: '请选择标签模板，或切换为直接输入标签。' }]} extra={sceneTemplates.length === 0 ? '当前场景暂无已发布模板，可切换为“直接输入标签并自动建模板”。' : undefined}><Select options={sceneTemplates.map((t) => ({ value: t.templateId, label: t.name }))} placeholder={sceneTemplates.length === 0 ? '当前场景暂无已发布模板' : '请选择标签模板'} /></Form.Item>
          ) : (
            <>
              <Form.Item name="inlineTemplateName" label="自动生成的模板名称"><Input /></Form.Item>
              <Form.Item name="inlineLabels" label="标签列表" rules={[{ required: true, message: '请至少输入一个标签' }, { validator: async (_rule, value) => { if (parseInlineLabels(value).length === 0) throw new Error('请至少输入一个标签'); } }]} extra="支持逗号、顿号或换行分隔，例如：裂纹，气孔，夹渣"><Input.TextArea rows={4} placeholder="裂纹，气孔，夹渣" /></Form.Item>
            </>
          )}
          <Alert type="info" showIcon style={{ marginBottom: 12 }} title="任务创建说明" description="如果选择“直接输入标签”，系统会在后端自动生成并发布模板，再创建标注任务；你也可以直接复用已发布模板。" />
          <Button type="primary" htmlType="submit" loading={createTask.isPending}>创建任务</Button>
        </Form>
      </Modal>
      <Modal title={`生成训练格式导出：${exportTask?.task.name ?? ''}`} open={!!exportTask} onCancel={() => setExportTask(null)} footer={null} destroyOnHidden>
        <Form layout="vertical" initialValues={{ format: candidate.data?.supportedFormats?.[0] ?? 'SMP_JSONL' }} onFinish={(v) => exportTask && createExport.mutate({ taskId: exportTask.task.taskId, format: v.format })}>
          <Alert type="info" showIcon title="导出策略" description="COCO/YOLO/VOC/Mask 包含图片副本和 metadata。超过 200MB 进入异步生成。" style={{ marginBottom: 16 }} />
          <Form.Item name="format" label="训练格式"><Select options={(candidate.data?.supportedFormats ?? []).map((f) => ({ value: f, label: f }))} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={createExport.isPending}>生成训练包</Button>
        </Form>
      </Modal>
      <Modal title={`图片预览：${previewFile?.name ?? ''}`} open={!!previewFile} footer={null} width={960} onCancel={() => setPreviewFile(null)} destroyOnHidden>
        <ImagePreviewPanel fileId={previewFile?.fileId} />
      </Modal>
    </div>
  );
}

function ImagePreviewPanel({ fileId }: { fileId?: string }) {
  const previewUrl = fileId ? platformApi.fileContentUrl(fileId) : '';
  if (!fileId) return null;
  return (
    <Space direction="vertical" className="full-width" size={12}>
      <Alert type="info" showIcon message="预览通过后端鉴权接口读取图片内容。" />
      <img src={previewUrl} alt="dataset preview" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8, background: '#f5f5f5' }} />
      <Space>
        <Button onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}>新窗口打开原图</Button>
        <Typography.Text type="secondary" className="mono">{previewUrl}</Typography.Text>
      </Space>
    </Space>
  );
}
