import { Alert, Button, Card, Descriptions, Drawer, Form, Input, Modal, Select, Space, Steps, Table, Tabs, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  dataApi,
  platformApi,
  type AnnotationLabelTemplate,
  type AnnotationLabelTemplateInput,
  type AnnotationExternalBinding,
  type AnnotationReviewItem,
  type AnnotationTaskSummary,
  type AnnotationTrainingExport,
  type DatasetAnnotationTask,
  type DataSourceSummary,
  type DataSourceSyncTask,
  type DataStandardProfile,
  type DataStandardTask,
  type DatasetSummary,
  type DatasetVersion,
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
const txt = (v?: string | null) => ({ RAW: '原始数据', PREPROCESSED: '预处理后', ANNOTATED: '已标注', IMAGE: '图片', AUDIO_VIDEO: '影音', TEXT: '文本', OBJECT_STORAGE: '对象存储', RELATIONAL_DB: '关系型数据库', STREAM: '流数据', TIME_SERIES: '时序库', INDUSTRIAL_PROTOCOL: '工业协议', EXTERNAL_API: '外部接口', IMPORT: '导入', API: '接口', IMAGE_TAGGING: '图片打标', IMAGE_SEGMENTATION: '图片分割', TEXT_LABELING: '文本分类', ANNOTATION_RESULT: '标注文件' } as Record<string, string>)[v ?? ''] ?? v ?? '-';

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
const lsStatusType = (status?: string) => ['PROJECT_SYNCED', 'TASK_SYNCED', 'RESULT_IMPORTED'].includes(status ?? '') ? 'success' : status === 'UNCONFIGURED' ? 'warning' : status?.includes('FAILED') || status?.includes('AUTH') || status?.includes('UNREACHABLE') ? 'error' : 'info';
const annotationClasses = ['焊接气孔', '裂纹', '夹渣', '未熔合'];
const annotationClassColors = ['#ff6533', '#1a6bff', '#10b981', '#f59e0b'];
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
type DraftBox = { x: number; y: number; w: number; h: number };
type AnnotationPoint = { x: number; y: number };
type AnnotationShape = 'rect' | 'ellipse' | 'polygon';
type AnnotationBox = { id: string; x: number; y: number; w: number; h: number; label: string; cls: number; shape: AnnotationShape; confidence?: number; source?: 'manual' | 'ai' };
type AnnotationPolygon = { id: string; points: AnnotationPoint[]; label: string; cls: number; confidence?: number; source?: 'manual' | 'ai' };
type AiSuggestionBox = AnnotationBox & { source: 'ai' };
type AiSuggestionPolygon = AnnotationPolygon & { source: 'ai' };
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
const prototypeBoxes: AnnotationBox[] = [
  { id: 'box-porosity-001', x: 62, y: 48, w: 110, h: 74, label: '焊接气孔', cls: 0, source: 'manual', shape: 'rect' },
  { id: 'box-crack-001', x: 240, y: 110, w: 88, h: 60, label: '裂纹', cls: 1, source: 'manual', shape: 'rect' },
  { id: 'box-slag-001', x: 140, y: 180, w: 130, h: 50, label: '夹渣', cls: 2, source: 'manual', shape: 'rect' },
  { id: 'box-fusion-001', x: 360, y: 60, w: 70, h: 82, label: '未熔合', cls: 3, source: 'manual', shape: 'rect' },
];
const aiSuggestionBoxes = [
  { id: 'ai-suggestion-porosity-001', x: 62, y: 240, w: 105, h: 58, label: '焊接气孔', cls: 0, shape: 'rect', confidence: 0.91, source: 'ai' },
  { id: 'ai-suggestion-crack-001', x: 298, y: 138, w: 84, h: 52, label: '裂纹', cls: 1, shape: 'rect', confidence: 0.78, source: 'ai' },
  { id: 'ai-suggestion-fusion-001', x: 170, y: 60, w: 90, h: 44, label: '未熔合', cls: 3, shape: 'rect', confidence: 0.65, source: 'ai' },
] satisfies AiSuggestionBox[];
const prototypeSegmentationPolygons: AnnotationPolygon[] = [
  { id: 'poly-crack-001', label: '裂纹', cls: 1, source: 'manual', points: [{ x: 146, y: 108 }, { x: 188, y: 92 }, { x: 238, y: 126 }, { x: 224, y: 178 }, { x: 162, y: 170 }] },
  { id: 'poly-porosity-001', label: '焊接气孔', cls: 0, source: 'manual', points: [{ x: 298, y: 172 }, { x: 338, y: 154 }, { x: 366, y: 192 }, { x: 350, y: 232 }, { x: 306, y: 224 }] },
];
const aiSuggestionPolygons = [
  { id: 'ai-poly-slag-001', label: '夹渣', cls: 2, source: 'ai', confidence: 0.84, points: [{ x: 84, y: 222 }, { x: 134, y: 204 }, { x: 154, y: 242 }, { x: 126, y: 278 }, { x: 78, y: 264 }] },
] satisfies AiSuggestionPolygon[];
const shortcutGroups = [
  { group: '绘制工具', items: [['W', '矩形框'], ['E', '椭圆框'], ['P', '多边形框'], ['D / Delete', '删除所选']] },
  { group: '类别选择', items: [['1-4', '切换类别'], ['Ctrl+Z', '撤销'], ['Ctrl+Y', '重做'], ['Space', '下一张']] },
];
const editableWorkStatuses = ['PENDING', 'DRAFT', 'REJECTED'];
const canEditWorkItem = (status?: string | null) => editableWorkStatuses.includes(status ?? '');
const canAutoStartAnnotationTask = (status?: string | null) => status === 'ASSIGNED';
const annotationTaskDefaults = {
  name: '焊缝缺陷检测标注任务',
  scene: 'IMAGE_TAGGING',
  reviewEnabled: true,
  prelabelEnabled: true,
  labelStudioEnabled: true,
} as const;
const shapeText = (shape: AnnotationShape) => ({ rect: '矩形', ellipse: '椭圆', polygon: '多边形' })[shape];
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
const labelStudioXmlForTemplate = (scene?: string, labelSchemaJson?: string, fallbackXml?: string) => {
  if (fallbackXml?.trim()) return fallbackXml.trim();
  let labels = ['待确认标签'];
  try {
    const parsed = JSON.parse(labelSchemaJson || '{}') as { labels?: unknown };
    if (Array.isArray(parsed.labels)) {
      labels = parsed.labels
        .map((item) => typeof item === 'string' ? item : (item && typeof item === 'object' && 'name' in item ? String((item as { name?: unknown }).name ?? '') : ''))
        .filter(Boolean);
    }
  } catch {
    // 保留默认标签，避免用户暂存中的 JSON 破坏页面操作。
  }
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
const parseAnnotationPayload = (scene?: string, rawJson?: string | null) => {
  if (!rawJson?.trim()) {
    return scene === 'IMAGE_SEGMENTATION'
      ? { boxes: [] as AnnotationBox[], polygons: [...prototypeSegmentationPolygons, ...aiSuggestionPolygons] as AnnotationPolygon[] }
      : { boxes: [...prototypeBoxes, ...aiSuggestionBoxes] as AnnotationBox[], polygons: [] as AnnotationPolygon[] };
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
          return {
            id: String((item as { id?: unknown }).id ?? `poly-${index + 1}`),
            label: String((item as { label?: unknown }).label ?? annotationClasses[index % annotationClasses.length]),
            cls: Number((item as { cls?: unknown }).cls ?? index % annotationClasses.length),
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
          return {
            id: String((item as { id?: unknown }).id ?? `poly-box-${index + 1}`),
            label: String((item as { label?: unknown }).label ?? annotationClasses[index % annotationClasses.length]),
            cls: Number((item as { cls?: unknown }).cls ?? index % annotationClasses.length),
            confidence: typeof (item as { confidence?: unknown }).confidence === 'number' ? Number((item as { confidence?: unknown }).confidence) : undefined,
            source: ((item as { source?: unknown }).source === 'ai' ? 'ai' : 'manual') as 'manual' | 'ai',
            points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }],
          } satisfies AnnotationPolygon;
        }).filter(Boolean) as AnnotationPolygon[]
        : [];
      return { boxes: [] as AnnotationBox[], polygons: fallbackPolygons.length ? fallbackPolygons : [...prototypeSegmentationPolygons, ...aiSuggestionPolygons] };
    }
    const boxes = Array.isArray(parsed.boxes)
      ? parsed.boxes.map((item, index) => {
        const x = Number((item as { x?: unknown }).x);
        const y = Number((item as { y?: unknown }).y);
        const w = Number((item as { w?: unknown }).w);
        const h = Number((item as { h?: unknown }).h);
        if (![x, y, w, h].every(Number.isFinite)) return null;
        return {
          id: String((item as { id?: unknown }).id ?? `box-${index + 1}`),
          x, y, w, h,
          label: String((item as { label?: unknown }).label ?? annotationClasses[index % annotationClasses.length]),
          cls: Number((item as { cls?: unknown }).cls ?? index % annotationClasses.length),
          shape: (((item as { shape?: unknown }).shape ?? 'rect') === 'ellipse' ? 'ellipse' : ((item as { shape?: unknown }).shape ?? 'rect') === 'polygon' ? 'polygon' : 'rect') as AnnotationShape,
          confidence: typeof (item as { confidence?: unknown }).confidence === 'number' ? Number((item as { confidence?: unknown }).confidence) : undefined,
          source: ((item as { source?: unknown }).source === 'ai' ? 'ai' : 'manual') as 'manual' | 'ai',
        } satisfies AnnotationBox;
      }).filter(Boolean) as AnnotationBox[]
      : [];
    return { boxes: boxes.length ? boxes : [...prototypeBoxes, ...aiSuggestionBoxes], polygons: [] as AnnotationPolygon[] };
  } catch {
    return scene === 'IMAGE_SEGMENTATION'
      ? { boxes: [] as AnnotationBox[], polygons: [...prototypeSegmentationPolygons, ...aiSuggestionPolygons] as AnnotationPolygon[] }
      : { boxes: [...prototypeBoxes, ...aiSuggestionBoxes] as AnnotationBox[], polygons: [] as AnnotationPolygon[] };
  }
};
const initialAnnotationEditorState: AnnotationEditorState = {
  boxes: [...prototypeBoxes, ...aiSuggestionBoxes],
  polygons: [],
  selectedShapeId: prototypeBoxes[0]?.id ?? '',
  history: [{ boxes: [...prototypeBoxes, ...aiSuggestionBoxes], polygons: [], selectedShapeId: prototypeBoxes[0]?.id ?? '' }],
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
    scene: string;
    reviewEnabled: boolean;
    prelabelEnabled: boolean;
    labelStudioEnabled: boolean;
    note?: string;
  }>();
  const [templateForm] = Form.useForm<AnnotationLabelTemplateInput>();
  const taskScene = Form.useWatch('scene', taskForm) ?? 'IMAGE_TAGGING';
  const selectedTaskDatasetId = Form.useWatch('sourceDatasetId', taskForm);
  const selectedTaskTemplateId = Form.useWatch('templateId', taskForm);
  const templateScene = Form.useWatch('scene', templateForm);
  const templateSchema = Form.useWatch('labelSchemaJson', templateForm);
  const overview = useQuery({ queryKey: ['annotation-overview'], queryFn: dataApi.annotationOverview });
  const tasks = useQuery({ queryKey: ['annotation-tasks', status], queryFn: () => dataApi.annotationTasks({ status }) });
  const datasets = useQuery({ queryKey: ['datasets-active-for-annotation'], queryFn: () => dataApi.datasets({ status: 'ACTIVE' }) });
  const templates = useQuery({ queryKey: ['annotation-templates'], queryFn: () => dataApi.labelTemplates() });
  const inv = useCallback(() => Promise.all([
    qc.invalidateQueries({ queryKey: ['annotation-overview'] }),
    qc.invalidateQueries({ queryKey: ['annotation-tasks'] }),
    qc.invalidateQueries({ queryKey: ['annotation-templates'] }),
  ]), [qc]);
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
  const annotationDatasets = activeDatasets.filter((item) => item.dataType === 'IMAGE');
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
    const selectedDataset = annotationDatasets.find((item) => item.datasetId === datasetId);
    setWizardOpen(true);
    taskForm.resetFields();
    taskForm.setFieldsValue({
      ...annotationTaskDefaults,
      sourceDatasetId: selectedDataset?.datasetId,
      sourceVersionId: selectedDataset?.currentVersionId ?? undefined,
    });
  }, [annotationDatasets, taskForm]);

  useEffect(() => {
    if (!wizardOpen) return;
    const currentTemplateId = taskForm.getFieldValue('templateId');
    if (currentTemplateId && !selectableTaskTemplates.some((item) => item.templateId === currentTemplateId)) {
      taskForm.setFieldValue('templateId', undefined);
    }
  }, [taskForm, selectableTaskTemplates, wizardOpen]);

  useEffect(() => {
    if (!wizardOpen || !selectedTaskDataset) return;
    const currentVersionId = taskForm.getFieldValue('sourceVersionId');
    if (!currentVersionId || currentVersionId !== selectedTaskDataset.currentVersionId) {
      taskForm.setFieldValue('sourceVersionId', selectedTaskDataset.currentVersionId ?? undefined);
    }
  }, [selectedTaskDataset, taskForm, wizardOpen]);

  useEffect(() => {
    if (!loc.state?.openCreateTask || datasets.isLoading) return;
    const timer = window.setTimeout(() => {
      openTaskWizard(loc.state?.datasetId);
      if (loc.state?.datasetId && !annotationDatasets.some((item) => item.datasetId === loc.state?.datasetId)) {
        msg.warning('当前仅支持从 ACTIVE 图片数据集创建标注任务，请重新确认数据集状态。');
      }
    }, 0);
    nav('/ann', { replace: true });
    return () => window.clearTimeout(timer);
  }, [annotationDatasets, datasets.isLoading, loc.state, msg, nav, openTaskWizard]);
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
          { title: '标注类型', dataIndex: 'sceneLabel', render: (v, r) => <Space><Tag>{v}</Tag>{r.prelabelEnabled ? <Tag color="purple">AI 预标注</Tag> : null}</Space> },
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
        <Alert type="info" showIcon title="数据集范围说明" description="这里不是数据集总览页；仅展示可用于创建标注任务的 ACTIVE 图片数据集。为避免误选，创建前必须手动确认源数据集。" style={{ marginBottom: 12 }} />
        <Form form={taskForm} layout="vertical" onFinish={(v) => {
          if (!v.sourceDatasetId || !v.templateId) return;
          createTask.mutate({ ...v, sourceDatasetId: v.sourceDatasetId, templateId: v.templateId, assigneeIds: ['USR-ANNOTATOR'], reviewerIds: ['USR-BU-CABIN'], prelabelModelSource: 'TODO_CONFIRM_PRELABEL_MODEL_SOURCE', prelabelConfidence: 0.7 });
        }} initialValues={annotationTaskDefaults}>
          <Form.Item name="sourceDatasetId" label="源数据集（仅 ACTIVE 图片数据集）" rules={[{ required: true, message: '请选择源数据集' }]}>
            <Select
              placeholder="请选择要创建标注任务的数据集"
              options={annotationDatasets.map((d) => ({ value: d.datasetId, label: `${d.name}（${d.datasetId}）· 当前版本 ${d.currentVersionName ?? d.currentVersionId ?? '未发布'} · ${d.status}` }))}
            />
          </Form.Item>
          <Form.Item name="sourceVersionId" label="数据版本"><Input placeholder="选择数据集后自动带出 currentVersionId" /></Form.Item>
          <Form.Item name="templateId" label="标签模板（按标注场景过滤，必须 PUBLISHED）" rules={[{ required: true, message: '请选择标签模板' }]}>
            <Select
              placeholder={selectableTaskTemplates.length ? '请选择标签模板' : '当前场景无可用模板'}
              disabled={!selectableTaskTemplates.length}
              options={selectableTaskTemplates.map((t) => ({ value: t.templateId, label: `${t.name} · ${t.scene}` }))}
            />
          </Form.Item>
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="scene" label="标注场景"><Select options={annotationSceneOptions} onChange={() => taskForm.setFieldValue('templateId', undefined)} /></Form.Item>
          <Space wrap>
            <Form.Item name="reviewEnabled" label="审核"><Select options={[{ value: true, label: '启用审核' }, { value: false, label: '不审核' }]} /></Form.Item>
            <Form.Item name="prelabelEnabled" label="AI 预标注"><Select options={[{ value: true, label: '启用 AI 预标注' }, { value: false, label: '不启用' }]} /></Form.Item>
          </Space>
          <Form.Item name="note" label="备注"><Input.TextArea rows={2} /></Form.Item>
          <Alert type="info" showIcon title="分派策略" description="示例任务默认分派给 USR-ANNOTATOR 标注、USR-BU-CABIN 审核；DAT-004 阻断自审。" style={{ marginBottom: 12 }} />
          <Button type="primary" htmlType="submit" loading={createTask.isPending} disabled={!selectedTaskDatasetId || !selectedTaskTemplateId || !selectableTaskTemplates.length}>创建任务</Button>
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
  const [msg, holder] = message.useMessage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editor, dispatchEditor] = useReducer(annotationEditorReducer, initialAnnotationEditorState);
  const { boxes, polygons, selectedShapeId } = editor;
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
  const [aiMode, setAiMode] = useState(true);
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
  const save = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: string }) => dataApi.saveAnnotationDraft(id, payload), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['annotation-detail', taskId] }); msg.success('草稿已保存'); }, onError: (e: Error) => msg.error(e.message) });
  const submit = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: string }) => dataApi.submitAnnotationWorkItem(id, payload), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['annotation-detail', taskId] }); msg.success('标注结果已提交，等待审核'); }, onError: (e: Error) => msg.error(e.message) });
  const sync = useMutation({ mutationFn: dataApi.syncLabelStudioTask, onSuccess: async (r) => { setSyncedBinding(r); await qc.invalidateQueries({ queryKey: ['annotation-detail', taskId] }); (r.lastSyncStatus === 'TASK_SYNCED' ? msg.success : msg.warning)(`Label Studio ${r.lastSyncStatus}: ${r.diagnosticMessage}`); }, onError: (e: Error) => msg.error(e.message) });
  const task = detail.data?.task;
  const scene = task?.scene ?? 'IMAGE_TAGGING';
  const isSegmentation = scene === 'IMAGE_SEGMENTATION';
  const items = detail.data?.workItems ?? [];
  const editableIndex = items.findIndex((item) => canEditWorkItem(item.status));
  const effectiveSelectedIndex = selectedIndex === 0 && items[0] && items[0].status === 'REVIEW_PENDING' && editableIndex > 0 ? editableIndex : selectedIndex;
  const selectedItem = items[effectiveSelectedIndex] ?? items[0];
  const externalBinding = syncedBinding ?? detail.data?.externalBinding;
  const total = task?.totalCount ?? Math.max(items.length, 1);
  const currentNo = Math.min(effectiveSelectedIndex + 1, total);
  const canEditSelectedItem = canEditWorkItem(selectedItem?.status);
  const canSubmit = selectedItem && selectedItem.status !== 'APPROVED' && selectedItem.status !== 'REVIEW_PENDING';
  const selectedSampleImage = selectedItem ? (industrialSampleImages[selectedItem.sampleKey] ?? (selectedItem.sampleImageUrl ? { url: selectedItem.sampleImageUrl, title: '????', source: 'annotation_work_item.sampleImageUrl' } : null)) : null;
  const currentBox = boxes.find((box) => box.id === selectedShapeId);
  const currentPolygon = polygons.find((polygon) => polygon.id === selectedShapeId);
  const currentPolygonCenter = currentPolygon ? polygonCentroid(currentPolygon.points) : null;
  const effectiveSelectedPolygonPointIndex = currentPolygon && selectedPolygonPointIndex != null && selectedPolygonPointIndex < currentPolygon.points.length
    ? selectedPolygonPointIndex
    : null;
  const selectedPolygonPoint = currentPolygon && effectiveSelectedPolygonPointIndex != null ? currentPolygon.points[effectiveSelectedPolygonPointIndex] ?? null : null;
  const workbenchShortcutGroups = useMemo(() => isSegmentation ? [
    { group: '分割工具', items: [['P', '开始多边形'], ['Enter / Double Click', '完成闭合'], ['Delete', '删除顶点/区域'], ['单击线条', '选中连接线'], ['双击线条', '新增顶点'], ['鼠标拖拽', '移动选中顶点/连接线']] },
    { group: '类别选择', items: [['1-4', '切换类别'], ['Ctrl+Z', '撤销'], ['Ctrl+Y', '重做'], ['Space', '下一张']] },
  ] : shortcutGroups, [isSegmentation]);
  const annotationPayload = useMemo(() => JSON.stringify(isSegmentation ? {
    polygons: polygons.map((polygon) => ({ id: polygon.id, label: polygon.label, cls: polygon.cls, source: polygon.source ?? 'manual', confidence: polygon.confidence, points: polygon.points })),
  } : {
    boxes: boxes.map((box) => ({ id: box.id, label: box.label, cls: box.cls, shape: box.shape, x: box.x, y: box.y, w: box.w, h: box.h, source: box.source ?? 'manual', confidence: box.confidence })),
  }), [boxes, isSegmentation, polygons]);
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

  const goPrev = useCallback(() => setSelectedIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setSelectedIndex((i) => Math.min(Math.max(items.length - 1, 0), i + 1)), [items.length]);
  const syncCurrent = () => selectedItem?.workItemId && sync.mutate(selectedItem.workItemId);
  const finalizePolygon = useCallback(() => {
    if (polygonDraftPoints.length < 3) {
      msg.warning('图片分割至少需要 3 个点才能闭合多边形');
      return;
    }
    const id = nextAnnotationShapeId('poly');
    const polygon = { id, points: polygonDraftPoints, label: annotationClasses[activeClass], cls: activeClass, source: 'manual' as const };
    commitPolygons((items) => [...items, polygon], id);
    setPolygonDraftPoints([]);
    setActiveShape('polygon');
    setSelectedPolygonEdgeIndex(null);
    msg.success(`已新增分割区域：${annotationClasses[activeClass]}`);
  }, [activeClass, commitPolygons, msg, polygonDraftPoints]);
  const saveCurrent = useCallback(() => {
    if (!selectedItem?.workItemId) return;
    if (!canEditWorkItem(selectedItem.status)) {
      msg.warning('当前样本已提交/已审核，不能保存草稿，请切换到草稿或待标注样本');
      return;
    }
    save.mutate({ id: selectedItem.workItemId, payload: annotationPayload });
  }, [annotationPayload, msg, save, selectedItem]);
  const submitCurrent = useCallback(() => {
    if (!selectedItem?.workItemId) return;
    if (!canEditWorkItem(selectedItem.status) && selectedItem.status !== 'SUBMITTED') {
      msg.warning('当前样本已提交/已审核，不能重复提交');
      return;
    }
    submit.mutate({ id: selectedItem.workItemId, payload: annotationPayload });
  }, [annotationPayload, msg, selectedItem, submit]);
  const selectClass = useCallback((idx: number) => {
    setActiveClass(idx);
    if (isSegmentation && selectedShapeId) {
      commitPolygons((items) => items.map((polygon) => polygon.id === selectedShapeId ? { ...polygon, cls: idx, label: annotationClasses[idx] } : polygon), selectedShapeId);
      return;
    }
    commitBoxes((items) => items.map((box) => box.id === selectedShapeId ? { ...box, cls: idx, label: annotationClasses[idx] } : box), selectedShapeId);
  }, [commitBoxes, commitPolygons, isSegmentation, selectedShapeId]);
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
    if (isSegmentation || shape === 'polygon') {
      setActiveShape('polygon');
      setPolygonDraftPoints([]);
      setSelectedPolygonEdgeIndex(null);
      setSelectedPolygonPointIndex(null);
      msg.info('图片分割请在画布上逐点点击绘制区域，双击或点击“完成多边形”闭合');
      return;
    }
    const id = nextAnnotationShapeId('box');
    const box = { id, x: 86 + boxes.length * 6, y: 230, w: 96, h: 58, label: annotationClasses[activeClass], cls: activeClass, shape, source: 'manual' as const };
    setActiveShape(shape);
    commitBoxes((items) => [...items, box], id);
    msg.success(`已新增标注框：${annotationClasses[activeClass]}（${shapeText(shape)}）`);
  }, [activeClass, boxes.length, commitBoxes, isSegmentation, msg]);
  const acceptAiShape = useCallback(() => {
    const selectedPolygon = polygons.find((item) => item.id === selectedShapeId);
    if (selectedPolygon?.source === 'ai') {
      commitPolygons((items) => items.map((item) => item.id === selectedPolygon.id ? { ...item, source: 'manual', confidence: undefined } : item), selectedPolygon.id);
      setActiveClass(selectedPolygon.cls);
      msg.success(`已采纳 AI 建议：${selectedPolygon.label}`);
      return;
    }
    const selectedBox = boxes.find((item) => item.id === selectedShapeId);
    if (selectedBox?.source === 'ai') {
      commitBoxes((items) => items.map((item) => item.id === selectedBox.id ? { ...item, source: 'manual', confidence: undefined } : item), selectedBox.id);
      setActiveClass(selectedBox.cls);
      msg.success(`已采纳 AI 建议：${selectedBox.label}`);
    }
  }, [boxes, commitBoxes, commitPolygons, msg, polygons, selectedShapeId]);
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
      commitBoxes((items) => [...items, { id, ...draftBox, label: annotationClasses[activeClass], cls: activeClass, shape: activeShape, source: 'manual' }], id);
      msg.success(`已新增标注框：${annotationClasses[activeClass]}`);
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
    const parsed = parseAnnotationPayload(scene, selectedItem.annotationJson ?? selectedItem.predictionJson);
    const selectedId = parsed.polygons[0]?.id ?? parsed.boxes[0]?.id ?? '';
    dispatchEditor({ type: 'reset', boxes: parsed.boxes, polygons: parsed.polygons, selectedShapeId: selectedId });
    const current = parsed.polygons[0] ?? parsed.boxes[0];
    const timer = window.setTimeout(() => {
      setActiveClass(current?.cls ?? 0);
      setActiveShape(scene === 'IMAGE_SEGMENTATION'
        ? 'polygon'
        : (current && 'shape' in current && (current.shape === 'rect' || current.shape === 'ellipse' || current.shape === 'polygon')
          ? current.shape
          : 'rect'));
      setSelectedPolygonEdgeIndex(null);
      setSelectedPolygonPointIndex(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [scene, selectedItem]);
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
        saveCurrent();
        event.preventDefault();
      } else if (/^[1-4]$/.test(event.key)) {
        selectClass(Number(event.key) - 1);
        event.preventDefault();
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
  }, [createManualShape, deleteSelectedShape, finalizePolygon, goNext, goPrev, isSegmentation, redo, saveCurrent, selectClass, undo]);

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
            <Button size="small" type={aiMode ? 'primary' : 'default'} ghost={aiMode} onClick={() => setAiMode((v) => !v)}>✦ AI 辅助{aiMode ? ' ON' : ''}</Button>
            <Button size="small" onClick={acceptAiShape} disabled={!aiMode || (currentPolygon?.source !== 'ai' && currentBox?.source !== 'ai')}>采纳 AI 建议</Button>
            <Button size="small" onClick={goPrev} disabled={effectiveSelectedIndex === 0}>上一张 ←</Button>
            <Button size="small" onClick={goNext} disabled={!items.length || effectiveSelectedIndex >= items.length - 1}>下一张 →</Button>
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
            <Button size="small" onClick={saveCurrent} loading={save.isPending} disabled={!selectedItem || !canEditSelectedItem}>保存标注</Button>
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
          <aside className="annotation-thumb-list" aria-label="样本队列">
            <h4 className="annotation-panel-title">样本队列</h4>
            {(items.length ? items : [{ workItemId: 'EMPTY', taskId, sampleKey: '暂无样本', sampleFileId: null, annotatorId: null, annotatorName: null, status: 'DRAFT', predictionJson: null, annotationJson: null, submittedAt: null, updatedAt: '' }]).map((item, idx) => (
              <button key={item.workItemId} className={`annotation-thumb ${idx === effectiveSelectedIndex ? 'active' : ''}`} onClick={() => setSelectedIndex(idx)} type="button">
                <span className="annotation-thumb-image">{industrialSampleImages[item.sampleKey] ? <img src={industrialSampleImages[item.sampleKey].url} alt={`${item.sampleKey} ?????????`} loading="lazy" /> : <span className="annotation-thumb-weld" />}{item.status === 'REVIEW_PENDING' || item.status === 'APPROVED' ? <span className="annotation-thumb-done" /> : null}</span>
                <span className="annotation-thumb-name">{item.sampleKey}</span>
                <Tag color={item.predictionJson ? 'purple' : color(item.status)}>{item.predictionJson ? 'AI 预标注' : annStatusText(item.status)}</Tag>
              </button>
            ))}
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
              </defs>
              <rect width="520" height="340" fill="url(#ann-img-bg)" />
              {selectedSampleImage ? (
                <>
                  <image href={selectedSampleImage.url} x="0" y="0" width="520" height="340" preserveAspectRatio="xMidYMid slice" data-testid="annotation-industrial-image" />
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
                  {box.shape === 'ellipse' ? <ellipse cx={box.x + box.w / 2} cy={box.y + box.h / 2} rx={box.w / 2} ry={box.h / 2} fill={`${annotationClassColors[box.cls]}26`} stroke={annotationClassColors[box.cls]} strokeWidth={selectedShapeId === box.id ? 3 : 1.8} strokeDasharray={selectedShapeId === box.id ? undefined : '4 2'} />
                    : box.shape === 'polygon' ? <polygon points={polygonPoints(box)} fill={`${annotationClassColors[box.cls]}26`} stroke={annotationClassColors[box.cls]} strokeWidth={selectedShapeId === box.id ? 3 : 1.8} strokeDasharray={selectedShapeId === box.id ? undefined : '4 2'} />
                      : <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={`${annotationClassColors[box.cls]}26`} stroke={box.source === 'ai' ? '#a78bfa' : annotationClassColors[box.cls]} strokeWidth={selectedShapeId === box.id ? 3 : 1.8} strokeDasharray={box.source === 'ai' || selectedShapeId !== box.id ? '6 3' : undefined} rx="2" />}
                  <rect x={box.x} y={box.y - 20} width={box.label.length * 13 + (box.source === 'ai' ? 42 : 8)} height={box.source === 'ai' ? 20 : 18} fill={box.source === 'ai' ? 'rgba(139,92,246,.85)' : annotationClassColors[box.cls]} rx="3" />
                  <text x={box.x + 5} y={box.y - 6} fill="#fff" fontSize="12" fontFamily="system-ui">{box.label}{box.source === 'ai' ? ` ${Math.round((box.confidence ?? 0) * 100)}%` : ''}</text>
                  {selectedShapeId === box.id ? [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].map(([cx, cy]) => <rect key={`${cx}-${cy}`} x={cx - 4} y={cy - 4} width="8" height="8" fill="#fff" stroke={annotationClassColors[box.cls]} strokeWidth="1.5" rx="1" />) : null}
                </g>
              )) : polygons.map((polygon) => {
                const center = polygonCentroid(polygon.points);
                return (
                  <g key={polygon.id} onClick={() => { dispatchEditor({ type: 'select', selectedShapeId: polygon.id }); setActiveClass(polygon.cls); setActiveShape('polygon'); setSelectedPolygonEdgeIndex(null); setSelectedPolygonPointIndex(null); }} className={`annotation-shape-group ${polygon.source === 'ai' ? 'annotation-ai-box-group' : ''}`} data-testid={`annotation-polygon-${polygon.id}`}>
                    <polygon points={polygonPath(polygon.points)} fill={`${annotationClassColors[polygon.cls]}26`} stroke={polygon.source === 'ai' ? '#a78bfa' : annotationClassColors[polygon.cls]} strokeWidth={selectedShapeId === polygon.id ? 3 : 1.8} strokeDasharray={polygon.source === 'ai' || selectedShapeId !== polygon.id ? '6 3' : undefined} />
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
                          stroke={isEdgeSelected ? '#ffffff' : annotationClassColors[polygon.cls]}
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
                    <rect x={center.x - 4} y={center.y - 4} width="8" height="8" fill="#fff" stroke={annotationClassColors[polygon.cls]} strokeWidth="1.5" rx="1" />
                    <rect x={center.x - 4} y={center.y - 24} width={polygon.label.length * 13 + (polygon.source === 'ai' ? 42 : 8)} height={polygon.source === 'ai' ? 20 : 18} fill={polygon.source === 'ai' ? 'rgba(139,92,246,.85)' : annotationClassColors[polygon.cls]} rx="3" />
                    <text x={center.x + 1} y={center.y - 10} fill="#fff" fontSize="12" fontFamily="system-ui">{polygon.label}{polygon.source === 'ai' ? ` ${Math.round((polygon.confidence ?? 0) * 100)}%` : ''}</text>
                    {selectedShapeId === polygon.id ? polygon.points.map((point, index) => <circle key={`${polygon.id}-${index}`} cx={point.x} cy={point.y} r="5" fill="#fff" stroke={annotationClassColors[polygon.cls]} strokeWidth={selectedPolygonPointIndex === index ? '2.5' : '1.5'} onPointerDown={(event) => startDragPolygonVertex(event, polygon, index)} onClick={(event) => { event.stopPropagation(); dispatchEditor({ type: 'select', selectedShapeId: polygon.id }); setActiveClass(polygon.cls); setActiveShape('polygon'); setSelectedPolygonEdgeIndex(null); setSelectedPolygonPointIndex(index); }} data-testid={`annotation-polygon-vertex-${polygon.id}-${index}`} />) : null}
                  </g>
                );
              })}
              {!isSegmentation && draftBox ? (activeShape === 'ellipse'
                ? <ellipse cx={draftBox.x + draftBox.w / 2} cy={draftBox.y + draftBox.h / 2} rx={draftBox.w / 2} ry={draftBox.h / 2} fill={`${annotationClassColors[activeClass]}18`} stroke={annotationClassColors[activeClass]} strokeWidth="2" strokeDasharray="4 2" data-testid="annotation-draft-box" />
                : activeShape === 'polygon'
                  ? <polygon points={polygonPoints(draftBox)} fill={`${annotationClassColors[activeClass]}18`} stroke={annotationClassColors[activeClass]} strokeWidth="2" strokeDasharray="4 2" data-testid="annotation-draft-box" />
                  : <rect x={draftBox.x} y={draftBox.y} width={draftBox.w} height={draftBox.h} fill={`${annotationClassColors[activeClass]}18`} stroke={annotationClassColors[activeClass]} strokeWidth="2" strokeDasharray="4 2" rx="2" data-testid="annotation-draft-box" />) : null}
              {isSegmentation && polygonDraftPoints.length ? (
                <>
                  <polyline points={polygonPath(polygonDraftPoints)} fill="rgba(26,107,255,.18)" stroke={annotationClassColors[activeClass]} strokeWidth="2" strokeDasharray="4 2" data-testid="annotation-draft-polygon" />
                  {polygonDraftPoints.map((point, index) => <circle key={`draft-${index}`} cx={point.x} cy={point.y} r="4" fill={annotationClassColors[activeClass]} />)}
                </>
              ) : null}
            </svg>
            {selectedSampleImage ? <div className="annotation-sample-caption" data-testid="annotation-sample-caption">{selectedSampleImage.title} ? {selectedSampleImage.source}</div> : null}
            <div className="annotation-canvas-hint">{isSegmentation ? '逐点点击绘制分割区域 · 双击/Enter 完成闭合 · 单击线条可选中并拖动连接线 · 双击线条可新增顶点 · Space 下一张 · Ctrl+S 保存当前标注' : '拖拽绘制框 · 右键删除 · Space 下一张 · Ctrl+S 保存当前标注'}</div>
          </main>

          <aside className="annotation-right-panel">
            <h4 className="annotation-panel-title">标注类别</h4>
            {annotationClasses.map((name, idx) => (
              <button key={name} className={`annotation-class-row ${activeClass === idx ? 'active' : ''}`} style={{ borderColor: activeClass === idx ? annotationClassColors[idx] : 'transparent' }} onClick={() => selectClass(idx)} type="button">
                <span className="annotation-class-color" style={{ background: annotationClassColors[idx] }} />
                <span>{name}</span>
                <kbd>{idx + 1}</kbd>
              </button>
            ))}
            <div className="annotation-panel-divider" />
            <h4 className="annotation-panel-title">{isSegmentation ? '当前分割区域属性' : '当前框属性'}</h4>
            {currentPolygon ? <div className="annotation-box-meta">
              <div>类别：<span style={{ color: annotationClassColors[currentPolygon.cls] }}>{currentPolygon.label}</span></div>
              <div>顶点数：<span data-testid="annotation-polygon-point-count">{currentPolygon.points.length}</span></div>
              <div>选中顶点：<span data-testid="annotation-selected-polygon-point">{selectedPolygonPointIndex == null ? '未选择' : `#${selectedPolygonPointIndex + 1}`}</span></div>
              <div>选中线段：<span data-testid="annotation-selected-polygon-edge">{selectedPolygonEdgeIndex == null ? '未选择' : `#${selectedPolygonEdgeIndex + 1}`}</span></div>
              <div>顶点坐标：<span data-testid="annotation-selected-polygon-point-coords">{selectedPolygonPoint ? `(${selectedPolygonPoint.x}, ${selectedPolygonPoint.y})` : '-'}</span></div>
              <div>中心：({currentPolygonCenter?.x ?? 0}, {currentPolygonCenter?.y ?? 0})</div>
              <div>形状：<span data-testid="annotation-current-shape">多边形区域</span></div>
              <div>置信度：<span>{currentPolygon.source === 'ai' ? `${Math.round((currentPolygon.confidence ?? 0) * 100)}%` : '手动'}</span></div>
              <div>分割区域数：<span data-testid="annotation-polygon-count">{polygons.length}</span></div>
            </div> : currentBox ? <div className="annotation-box-meta">
              <div>类别：<span style={{ color: annotationClassColors[currentBox.cls] }}>{currentBox.label}</span></div>
              <div>坐标：({currentBox.x}, {currentBox.y})</div>
              <div>尺寸：{currentBox.w} × {currentBox.h}</div>
              <div>形状：<span data-testid="annotation-current-shape">{shapeText(currentBox.shape)}</span></div>
              <div>置信度：<span>{currentBox.source === 'ai' ? `${Math.round((currentBox.confidence ?? 0) * 100)}%` : '手动'}</span></div>
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
      <Alert type="info" showIcon title="数据集导入方式" description="当前仅支持导入与接口两种接入方式；导入生成图片数据集，API 生成图片或影音数据集版本、文件元数据与血缘。" style={{ marginBottom: 16 }} />
      <Tabs items={[
        { key: 'sources', label: '数据源列表', children: <div className="data-source-grid">{(sources.data ?? []).map((s) => <Card key={s.sourceId} title={<Space><Tag color="blue">{txt(s.sourceType)}</Tag>{s.name}</Space>} extra={<Tag color={color(s.status)}>{s.status}</Tag>}><Space direction="vertical" className="full-width"><Typography.Text className="mono">{s.endpoint}{s.port ? `:${s.port}` : ''}</Typography.Text><Typography.Text type="secondary">secretRef: {s.secretRefMasked}</Typography.Text><Typography.Text type="secondary">诊断：{s.diagnosticCode ?? 'NOT_TESTED'} · {s.diagnosticMessage}</Typography.Text><Space wrap><Button size="small" onClick={() => test.mutate(s.sourceId)}>测试连接</Button><Button size="small" onClick={() => setDetail(s)}>详情/编辑</Button><Button size="small" type="primary" onClick={() => activate.mutate(s.sourceId)}>激活</Button><Button size="small" danger onClick={() => disable.mutate(s.sourceId)}>禁用</Button></Space></Space></Card>)}</div> },
        { key: 'tasks', label: '同步任务', children: <Table<DataSourceSyncTask> rowKey="taskId" dataSource={tasks.data ?? []} pagination={false} columns={[{ title: '任务名称', dataIndex: 'name' }, { title: '数据源', dataIndex: 'sourceName' }, { title: '目标数据集', dataIndex: 'targetDatasetName', render: (v) => v ?? '待绑定' }, { title: '调度周期', dataIndex: 'scheduleMode' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: '诊断', dataIndex: 'diagnosticMessage' }, { title: '操作', render: (_, r) => <Button size="small" onClick={() => runTask.mutate(r.taskId)}>立即同步</Button> }]} /> },
      ]} />
      <Modal title="新建数据源" open={open} onCancel={() => setOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" onFinish={(v) => create.mutate({ tenantId: currentTenantId, ...v })} initialValues={{ sourceType: 'IMPORT', endpoint: 'TODO_CONFIRM_DATA_SOURCE_ENDPOINT', credentialMode: 'SECRET_REF', secretRef: 'secret://TODO_CONFIRM_DATA_SOURCE_SECRET', sharedScope: 'BU' }}>
          <Form.Item name="name" label="数据源名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sourceType" label="接入方式"><Select options={['IMPORT', 'API'].map((v) => ({ value: v, label: txt(v) }))} /></Form.Item>
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
          { title: '版本', dataIndex: 'currentVersionName' },
          { title: '样本', dataIndex: 'recordCount' },
          { title: '大小', render: (_, r) => fmtSize(r.sizeBytes) },
          { title: '权限', dataIndex: 'accessLevel', render: (v) => <Tag color={v === 'RESTRICTED' ? 'red' : 'blue'}>{v}</Tag> },
          { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> },
          { title: '操作', render: (_, r) => <Space><a onClick={() => nav('/dsdetail', { state: { datasetId: r.datasetId } })}>详情</a><a onClick={() => nav('/ann', { state: { openCreateTask: true, datasetId: r.datasetId } })}>创建标注任务</a><a onClick={() => setSelected(r)}>版本</a></Space> },
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

export { DatasetUploadPage } from './DatasetUploadPage';

export function DatasetDetailPage() {
  const loc = useLocation() as { state?: { datasetId?: string } };
  const nav = useNavigate();
  const [taskForm] = Form.useForm<{ name: string; scene: string; templateId?: string }>();
  const [previewFile, setPreviewFile] = useState<{ fileId: string; name: string } | null>(null);
  const datasetId = loc.state?.datasetId ?? 'DATASET-WELD-DEFECT';
  const detail = useQuery({ queryKey: ['dataset-detail', datasetId], queryFn: () => dataApi.datasetDetail(datasetId) });
  const candidate = useQuery({ queryKey: ['dataset-annotation-candidate', datasetId], queryFn: () => dataApi.datasetAnnotationCandidate(datasetId) });
  const annTasks = useQuery({ queryKey: ['dataset-annotation-tasks', datasetId], queryFn: () => dataApi.datasetAnnotationTasks(datasetId) });
  const qc = useQueryClient();
  const ref = useMutation({ mutationFn: () => dataApi.reference(datasetId), onError: () => undefined });
  const [msg, holder] = message.useMessage();
  const [taskOpen, setTaskOpen] = useState(false);
  const [exportTask, setExportTask] = useState<DatasetAnnotationTask | null>(null);
  const download = useMutation({
    mutationFn: platformApi.fileDownloadUrl,
    onSuccess: (result) => {
      if (result.downloadUrl) { window.open(result.downloadUrl, '_blank', 'noopener,noreferrer'); msg.success('已打开文件下载链接'); return; }
      msg.warning(`文件下载未配置：${result.diagnostic}`);
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const exportDownload = useMutation({
    mutationFn: dataApi.annotationExportDownloadUrl,
    onSuccess: (result) => {
      if (result.downloadUrl) { window.open(result.downloadUrl, '_blank', 'noopener,noreferrer'); msg.success('已打开训练包下载链接'); return; }
      msg.warning(`训练包下载未配置：${result.diagnosticCode} · ${result.diagnosticMessage}`);
    },
    onError: (e: Error) => msg.error(e.message),
  });
  const createTask = useMutation({
    mutationFn: (values: { name: string; templateId: string; scene: string }) => dataApi.createDatasetAnnotationTask(datasetId, { ...values, sourceDatasetId: datasetId, sourceVersionId: candidate.data?.currentVersionId, reviewEnabled: true, labelStudioEnabled: true, assigneeIds: ['USR-ANNOTATOR'], reviewerIds: ['USR-BU-CABIN'] }),
    onSuccess: async () => { setTaskOpen(false); await qc.invalidateQueries({ queryKey: ['dataset-annotation-tasks', datasetId] }); msg.success('已从数据集创建标注任务'); },
    onError: (e: Error) => msg.error(e.message),
  });
  const createExport = useMutation({
    mutationFn: ({ taskId, format }: { taskId: string; format: string }) => dataApi.createAnnotationExport(taskId, { format }),
    onSuccess: async (r) => { setExportTask(null); await qc.invalidateQueries({ queryKey: ['dataset-annotation-tasks', datasetId] }); msg.success(`导出请求已创建：${r.status}`); },
    onError: (e: Error) => msg.error(e.message),
  });
  const openWorkbench = useCallback((taskId: string) => {
    nav(`/annwork?taskId=${encodeURIComponent(taskId)}`, { state: { taskId } });
  }, [nav]);
  const d = detail.data;
  const taskScene = Form.useWatch('scene', taskForm) ?? 'IMAGE_TAGGING';
  const sceneTemplates = useMemo(
    () => (candidate.data?.templates ?? []).filter((template) => template.scene === taskScene),
    [candidate.data?.templates, taskScene],
  );
  useEffect(() => {
    if (!taskOpen) return;
    const currentTemplateId = taskForm.getFieldValue('templateId');
    if (sceneTemplates.some((template) => template.templateId === currentTemplateId)) return;
    taskForm.setFieldsValue({ templateId: sceneTemplates[0]?.templateId });
  }, [sceneTemplates, taskForm, taskOpen]);
  useEffect(() => {
    if (!taskOpen) return;
    taskForm.setFieldsValue({
      name: `${d?.dataset.name ?? '数据集'} 标注任务`,
      scene: 'IMAGE_TAGGING',
      templateId: (candidate.data?.templates ?? []).find((template) => template.scene === 'IMAGE_TAGGING')?.templateId,
    });
  }, [candidate.data?.templates, d?.dataset.name, taskForm, taskOpen]);
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
  const exportColumns = [
    { title: '格式', dataIndex: 'format' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={color(v)}>{v}</Tag> },
    { title: '图片副本', dataIndex: 'packageIncludesImages', render: (v: boolean) => v ? '包含' : '不包含' },
    { title: '异步', dataIndex: 'asyncRequired', render: (v: boolean) => v ? '是' : '否' },
    { title: '大小', render: (_: unknown, r: AnnotationTrainingExport) => fmtSize(r.sizeBytes) },
    { title: '保留到', dataIndex: 'expiresAt', render: (v: string | null) => v ? v.slice(0, 10) : '-' },
    { title: '诊断', render: (_: unknown, r: AnnotationTrainingExport) => `${r.diagnosticCode} · ${r.diagnosticMessage}` },
    { title: '下载', render: (_: unknown, r: AnnotationTrainingExport) => <Button size="small" disabled={!r.exportId || r.status !== 'AVAILABLE'} loading={exportDownload.isPending} onClick={() => exportDownload.mutate(r.exportId)}>获取下载链接</Button> },
  ];
  const previewableFiles = (d?.files ?? []).filter((file) => file.contentType?.startsWith('image/'));
  const annotationChildren = <Space direction="vertical" className="full-width">
    <Alert type={candidate.data?.eligible ? 'success' : 'warning'} showIcon title="标注候选状态" description={`${candidate.data?.diagnosticCode ?? 'LOADING'} · ${candidate.data?.diagnosticMessage ?? '正在加载候选状态'}；训练环境默认采用自包含导出包，COCO/YOLO/VOC/Mask 均包含图片副本，超过 200MB 异步，保留 3 个月。`} />
    <Space wrap><Button type="primary" disabled={!candidate.data?.eligible} onClick={() => setTaskOpen(true)}>从数据集创建标注任务</Button><Typography.Text type="secondary">当前版本：{candidate.data?.currentVersionId ?? '-'}</Typography.Text></Space>
    <Table<DatasetAnnotationTask> rowKey={(r) => r.task.taskId} dataSource={annTasks.data ?? []} loading={annTasks.isLoading} expandable={{ expandedRowRender: (r) => <Table<AnnotationTrainingExport> rowKey="exportId" dataSource={r.exports} columns={exportColumns} pagination={false} locale={{ emptyText: '暂无训练格式导出' }} /> }} columns={[{ title: '任务', render: (_, r) => <Space direction="vertical" size={0}><Typography.Text strong>{r.task.name}</Typography.Text><Typography.Text type="secondary" className="mono">{r.task.taskId}</Typography.Text></Space> }, { title: '场景', render: (_, r) => txt(r.task.scene) }, { title: '状态', render: (_, r) => <Tag color={color(r.task.status)}>{annStatusText(r.task.status)}</Tag> }, { title: '进度', render: (_, r) => `${r.task.reviewedCount}/${r.task.totalCount}` }, { title: '质量分', render: (_, r) => r.task.qualityScore ?? '-' }, { title: '操作', render: (_, r) => <Space wrap><Button size="small" type="primary" onClick={() => openWorkbench(r.task.taskId)}>进入标注</Button><Button size="small" onClick={() => setExportTask(r)}>生成训练包</Button></Space> }]} />
  </Space>;
  return <div className="content-page">{holder}<div className="page-hero"><div><Typography.Title level={3}>{d?.dataset.name ?? '数据集详情'}</Typography.Title><Typography.Text type="secondary">概览 · 版本 · 文件 · 权限 · 血缘 · 标注任务/训练导出</Typography.Text></div><Space><Button onClick={() => ref.mutate()}>请求引用检查</Button><Button type="primary" disabled={!candidate.data?.eligible} onClick={() => setTaskOpen(true)}>创建标注任务</Button></Space></div>{ref.data ? <Alert type="success" showIcon title={`DatasetReference 可用：${ref.data.versionId}`} style={{ marginBottom: 16 }} /> : null}<Card loading={detail.isLoading}><Descriptions bordered column={2}><Descriptions.Item label="数据类型">{txt(d?.dataset.dataType)}</Descriptions.Item><Descriptions.Item label="状态"><Tag color={color(d?.dataset.status)}>{d?.dataset.status}</Tag></Descriptions.Item><Descriptions.Item label="权限"><Tag color={d?.dataset.accessLevel === 'RESTRICTED' ? 'red' : 'blue'}>{d?.dataset.accessLevel}</Tag></Descriptions.Item><Descriptions.Item label="样本数">{d?.dataset.recordCount.toLocaleString('zh-CN')}</Descriptions.Item><Descriptions.Item label="标签">{d?.dataset.tags.map((t) => <Tag key={t}>{t}</Tag>)}</Descriptions.Item><Descriptions.Item label="预览状态">{d?.previewStatus} · {d?.previewDiagnostic}</Descriptions.Item></Descriptions></Card>{previewableFiles.length > 0 ? <Card title={`图片预览（${previewableFiles.length}）`} style={{ marginTop: 16 }} loading={detail.isLoading}><Space wrap>{previewableFiles.map((file) => <Button key={file.id} onClick={() => setPreviewFile({ fileId: file.fileId, name: file.objectKey.split('/').slice(-1)[0] ?? file.fileId })}>预览 {file.objectKey.split('/').slice(-1)[0] ?? file.fileId}</Button>)}</Space><Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>当前仅对 `image/*` 文件展示预览入口；点击后使用 MinIO 预签名 URL 在弹窗中加载原图。</Typography.Paragraph></Card> : null}<Card title={`文件信息（${d?.files.length ?? 0}）`} style={{ marginTop: 16 }} loading={detail.isLoading}><Table rowKey="id" dataSource={d?.files ?? []} pagination={false} columns={fileColumns} locale={{ emptyText: '暂无已绑定文件；请通过上传向导完成文件登记并绑定版本。' }} /></Card><Tabs items={[{ key: 'annotation', label: '标注任务/训练导出', children: annotationChildren }, { key: 'versions', label: '版本历史', children: <Table rowKey="versionId" dataSource={d?.versions ?? []} pagination={false} columns={[{ title: '版本', dataIndex: 'versionName' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={color(v)}>{v}</Tag> }, { title: '内容安全', dataIndex: 'contentSafetyStatus' }, { title: '诊断', dataIndex: 'diagnosticMessage' }]} /> }, { key: 'files', label: `文件元数据（${d?.files.length ?? 0}）`, children: <Table rowKey="id" dataSource={d?.files ?? []} pagination={false} columns={fileColumns} locale={{ emptyText: '暂无文件元数据' }} /> }, { key: 'lineage', label: '血缘', children: <Table rowKey="lineageId" dataSource={d?.lineage ?? []} pagination={false} columns={[{ title: '来源', dataIndex: 'sourceType' }, { title: 'Source ID', dataIndex: 'sourceId' }, { title: '目标', dataIndex: 'targetId' }, { title: '转换', dataIndex: 'transformType' }]} /> }, { key: 'access', label: '权限授权', children: <Table rowKey="grantId" dataSource={d?.grants ?? []} pagination={false} columns={[{ title: '用户', dataIndex: 'userName' }, { title: '状态', dataIndex: 'status' }, { title: '有效期', dataIndex: 'expiresAt' }]} /> }]} /><Modal title="从数据集创建标注任务" open={taskOpen} onCancel={() => setTaskOpen(false)} footer={null} destroyOnHidden><Form form={taskForm} layout="vertical" onFinish={(v) => { if (!v.templateId) return; createTask.mutate({ ...v, templateId: v.templateId }); }}><Form.Item name="name" label="任务名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="scene" label="标注场景"><Select options={[{ value: 'IMAGE_TAGGING', label: '图片打标' }, { value: 'IMAGE_SEGMENTATION', label: '图片分割' }]} /></Form.Item><Form.Item name="templateId" label="标签模板" rules={[{ required: true, message: '当前场景暂无已发布模板' }]} extra={sceneTemplates.length === 0 ? '当前场景暂无已发布模板，请先创建并发布对应模板。' : undefined}><Select options={sceneTemplates.map((t) => ({ value: t.templateId, label: t.name }))} placeholder={sceneTemplates.length === 0 ? '当前场景暂无已发布模板' : '请选择标签模板'} /></Form.Item><Button type="primary" htmlType="submit" loading={createTask.isPending} disabled={sceneTemplates.length === 0}>创建任务</Button></Form></Modal><Modal title={`生成训练格式导出：${exportTask?.task.name ?? ''}`} open={!!exportTask} onCancel={() => setExportTask(null)} footer={null} destroyOnHidden><Form layout="vertical" initialValues={{ format: candidate.data?.supportedFormats?.[0] ?? 'SMP_JSONL' }} onFinish={(v) => exportTask && createExport.mutate({ taskId: exportTask.task.taskId, format: v.format })}><Alert type="info" showIcon title="导出策略" description="COCO/YOLO/VOC/Mask 包含 images/ 图片副本和 metadata；超过 200MB 进入异步生成；导出文件保留 3 个月。" style={{ marginBottom: 16 }} /><Form.Item name="format" label="训练格式"><Select options={(candidate.data?.supportedFormats ?? []).map((f) => ({ value: f, label: f }))} /></Form.Item><Button type="primary" htmlType="submit" loading={createExport.isPending}>生成训练包</Button></Form></Modal><Modal title={`图片预览：${previewFile?.name ?? ''}`} open={!!previewFile} footer={null} width={960} onCancel={() => setPreviewFile(null)} destroyOnHidden><ImagePreviewPanel fileId={previewFile?.fileId} /></Modal></div>;
}

function ImagePreviewPanel({ fileId }: { fileId?: string }) {
  const previewUrl = fileId ? platformApi.fileContentUrl(fileId) : '';

  if (!fileId) return null;

  return (
    <Space orientation="vertical" className="full-width" size={12}>
      <Alert type="info" showIcon message="预览通过后端鉴权接口读取图片内容，避免浏览器直接访问 MinIO 遇到 403。" />
      <img src={previewUrl} alt="dataset preview" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8, background: '#f5f5f5' }} />
      <Space>
        <Button onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}>新窗口打开原图</Button>
        <Typography.Text type="secondary" className="mono">{previewUrl}</Typography.Text>
      </Space>
    </Space>
  );
}
