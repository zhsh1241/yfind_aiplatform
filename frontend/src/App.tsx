import {
  AuditOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { App as AntdApp, Button, ConfigProvider, Descriptions, Drawer, Input, Space, Tag, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { approveDatasetAccessRequest, createDataset, createDatasetAccessRequest, loadDatasets, loadPreparationJobs, rerunPreparationJob, type PreparationJob } from "./api/datasetApi";
import { createBackendIdentityApprovalRequest, createIdentityApprovalRequest, loginWithPassword } from "./api/identityApi";
import { createTrainingJobSimulation } from "./api/trainingApi";
import type { Dataset } from "./prototype-data";
import { addSimulatedTrainingJob, markDatasetDownloadGranted, upsertSimulatedDataset, type IdentityProfileKey } from "./simulationStore";
import type { DatasetRequestFormValue } from "./modals/DatasetRequestModal";
import type { UploadDatasetFormValue } from "./modals/UploadDatasetModal";
import type { TrainingFormValue } from "./modals/TrainingModal";

const { Title, Paragraph, Text } = Typography;

const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const IdentityPage = lazy(() => import("./pages/IdentityPage"));
const DatasetPage = lazy(() => import("./pages/DatasetPage"));
const TrainingPage = lazy(() => import("./pages/TrainingPage"));
const ModelPage = lazy(() => import("./pages/ModelPage"));
const GovernancePage = lazy(() => import("./pages/GovernancePage"));
const UploadDatasetModal = lazy(() => import("./modals/UploadDatasetModal"));
const TrainingModal = lazy(() => import("./modals/TrainingModal"));
const PermissionModal = lazy(() => import("./modals/PermissionModal"));
const DatasetRequestModal = lazy(() => import("./modals/DatasetRequestModal"));
const DatasetApproveModal = lazy(() => import("./modals/DatasetApproveModal"));

type ModuleKey = "overview" | "identity" | "data-prep" | "training" | "model" | "governance";
type ModalKind = "upload" | "training" | "permission" | "dataset-request" | "dataset-approve" | null;
type Detail = { title: string; description: string; items: Array<{ label: string; value: string }> };

type ModuleItem = {
  key: ModuleKey;
  label: string;
  icon: ReactNode;
  summary: string;
  status: string;
};

const moduleItems: ModuleItem[] = [
  { key: "overview", label: "平台总览", icon: <DashboardOutlined />, summary: "查看训练平台整体运行、资产规模与关键待办。", status: "持续监控" },
  { key: "identity", label: "权限与会话", icon: <SafetyCertificateOutlined />, summary: "集中管理登录状态、授权审批与模块门禁。", status: "最小权限" },
  { key: "data-prep", label: "数据准备", icon: <DatabaseOutlined />, summary: "管理数据收集、清洗、标注、划分与预处理流程。", status: "训练前置" },
  { key: "training", label: "训练任务", icon: <ExperimentOutlined />, summary: "按真实训练流程提交任务并对接阿里云 PAI。", status: "PAI 适配" },
  { key: "model", label: "模型中心", icon: <DatabaseOutlined />, summary: "沉淀训练产物、版本状态与部署准入。", status: "注册治理" },
  { key: "governance", label: "治理中心", icon: <AuditOutlined />, summary: "处理审计事件、配额风险与处置动作。", status: "审计联动" },
];

const loadingFallback = <div className="utility-grid-section">正在加载页面...</div>;

function buildDetail(title: string, description: string): Detail {
  return {
    title,
    description,
    items: [
      { label: "平台假设", value: "当前控制台以训练控制层为中心，优先对接阿里云 PAI / DLC。" },
      { label: "落地范围", value: "先打通数据集、训练、模型注册、审计四条主链路，再逐步补齐运营细节。" },
      { label: "待确认项", value: "外部账号、真实资源规格、产物 URI 等仍使用 TODO_CONFIRM_* 占位。" },
    ],
  };
}

export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#2563eb",
          colorInfo: "#2563eb",
          borderRadius: 14,
          wireframe: false,
          fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif",
        },
      }}
    >
      <AntdApp>
        <PlatformApp />
      </AntdApp>
    </ConfigProvider>
  );
}

function PlatformApp() {
  const [activeModule, setActiveModule] = useState<ModuleKey>("overview");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [trainingStep, setTrainingStep] = useState(0);
  const [datasetItems, setDatasetItems] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [datasetQuery, setDatasetQuery] = useState("");
  const [datasetStatusFilter, setDatasetStatusFilter] = useState("ALL");
  const [requestApproved, setRequestApproved] = useState(false);
  const [pendingDatasetRequestId, setPendingDatasetRequestId] = useState<string | null>(null);
  const [datasetRequestReason, setDatasetRequestReason] = useState("用于训练复现、问题排查和产物回溯");
  const [datasetSource, setDatasetSource] = useState<"backend" | "fallback">("fallback");
  const [preparationJobs, setPreparationJobs] = useState<PreparationJob[]>([]);
  const { message } = AntdApp.useApp();

  useEffect(() => {
    let cancelled = false;
    loadDatasets().then((result) => {
      if (cancelled) return;
      setDatasetItems(result.datasets);
      setDatasetSource(result.source);
      setSelectedDataset(result.datasets[0] ?? null);
    });
    loadPreparationJobs().then((jobs) => {
      if (cancelled) return;
      setPreparationJobs(jobs);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeInfo = useMemo(() => moduleItems.find((item) => item.key === activeModule) ?? moduleItems[0], [activeModule]);
  const refreshedAt = useMemo(
    () => new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date()),
    [],
  );

  const filteredDatasets = useMemo(
    () => datasetItems.filter((dataset) => (!datasetQuery || dataset.name.includes(datasetQuery) || dataset.owner.includes(datasetQuery)) && (datasetStatusFilter === "ALL" || dataset.status === datasetStatusFilter)),
    [datasetItems, datasetQuery, datasetStatusFilter],
  );

  const quickMetrics = useMemo(() => {
    const downloadableCount = datasetItems.filter((item) => item.canDownloadLatestVersion).length;
    return [
      { label: "业务模块", value: `${moduleItems.length}` },
      { label: "数据集", value: `${datasetItems.length}` },
      { label: "可下载版本", value: `${downloadableCount}` },
    ];
  }, [datasetItems]);

  const closeModal = () => setModalKind(null);
  const openDetail = (title: string, description: string) => setDetail(buildDetail(title, description));
  const notify = (content: string) => void message.success(content);

  const handleUploadDataset = async (values: UploadDatasetFormValue) => {
    const created = await createDataset(values);
    upsertSimulatedDataset(created);
    setDatasetItems((current) => [created, ...current.filter((item) => item.key !== created.key)]);
    setSelectedDataset(created);
    notify(`已创建数据集：${created.name}`);
    closeModal();
  };

  const handleRequestDownload = async (values: DatasetRequestFormValue) => {
    if (!selectedDataset) return;
    setDatasetRequestReason(values.reason);
    void createDatasetAccessRequest(selectedDataset, values.reason)
      .then((response) => {
        setPendingDatasetRequestId(response.requestId);
        notify("已提交数据下载申请，等待审批。");
      })
      .catch(() => notify("后端未就绪，已按本地流程记录下载申请。"));
    closeModal();
  };

  const handleApproveDownload = () => {
    if (!selectedDataset) return;
    const approve = pendingDatasetRequestId && datasetSource === "backend" ? approveDatasetAccessRequest(pendingDatasetRequestId) : Promise.resolve();
    void approve.finally(() => {
      setRequestApproved(true);
      markDatasetDownloadGranted(selectedDataset.key);
      setDatasetItems((current) => current.map((item) => (item.key === selectedDataset.key ? { ...item, canDownloadLatestVersion: true } : item)));
      setSelectedDataset((current) => (current ? { ...current, canDownloadLatestVersion: true } : current));
      notify(`已批准 ${selectedDataset.name} 的下载权限`);
      closeModal();
    });
  };

  const handleDownloadDataset = () => {
    if (!selectedDataset) return;
    const content = [
      `数据集：${selectedDataset.name}`,
      `负责人：${selectedDataset.owner}`,
      `申请原因：${datasetRequestReason}`,
      `下载版本：${selectedDataset.key}-latest`,
      `样本数：${selectedDataset.samples}`,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedDataset.key}-latest.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    notify(`已导出 ${selectedDataset.name} 的下载凭证`);
  };


  const handleRerunPreparationJob = (jobId: string) => {
    const markRerunPassed = (current: PreparationJob[], rerunCount?: number, status = "RUNNING") => current.map((job) => (job.jobId === jobId ? {
      ...job,
      status,
      currentStage: "SPLIT",
      blocked: false,
      blockedReason: "",
      rerunCount: rerunCount ?? job.rerunCount + 1,
      progressPercent: Math.max(job.progressPercent, 48),
      stages: job.stages.map((stage) => (stage.stageKey === "LABELING" ? { ...stage, status: "SUCCEEDED", qualityScore: 91, gatePassed: true, message: "人工修正后重跑通过" } : stage)),
    } : job));

    void rerunPreparationJob(jobId)
      .then((response) => {
        setPreparationJobs((current) => markRerunPassed(current, response.rerunCount, response.status));
        notify("数据准备阶段已人工修正并重跑通过");
      })
      .catch(() => {
        setPreparationJobs((current) => markRerunPassed(current));
        notify("数据准备阶段已记录为本地重跑通过");
      });
  };

  const handleNextTrainingStep = (_values: TrainingFormValue) => setTrainingStep((step) => step + 1);
  const handleSubmitTraining = (values: TrainingFormValue) => {
    const job = createTrainingJobSimulation(values);
    addSimulatedTrainingJob(job);
    notify(`已提交训练任务：${job.name}`);
    setTrainingStep(0);
    closeModal();
  };

  const handlePermissionSwitch = (payload: { profileKey: IdentityProfileKey; reason: string; username: string; password: string }) => {
    void loginWithPassword(payload.username, payload.password)
      .then(() => createBackendIdentityApprovalRequest({ requestedRole: payload.profileKey, reason: payload.reason }))
      .then((request) => {
        notify(`已发起 ${request.requestedRoleLabel} 授权申请`);
        closeModal();
      })
      .catch(() => {
        const request = createIdentityApprovalRequest({ requestedRole: payload.profileKey, reason: payload.reason }, payload.username || "local.admin");
        notify(`后端未连通，已记录本地授权申请：${request.requestedRoleLabel}`);
        closeModal();
      });
  };

  const datasetColumns: ColumnsType<Dataset> = [
    { title: "数据集", dataIndex: "name", render: (value: string, record) => <Button type="link" onClick={() => setSelectedDataset(record)}>{value}</Button> },
    { title: "负责人", dataIndex: "owner" },
    { title: "状态", dataIndex: "status", render: (value: string) => <Tag color={value === "ACTIVE" ? "green" : value === "PROCESSING" ? "blue" : "gold"}>{value}</Tag> },
    { title: "版本数", dataIndex: "versionCount" },
    { title: "样本量", dataIndex: "samples" },
    { title: "下载权限", dataIndex: "canDownloadLatestVersion", render: (value: boolean, record) => <Tag color={value || (requestApproved && selectedDataset?.key === record.key) ? "green" : "red"}>{value || (requestApproved && selectedDataset?.key === record.key) ? "已放行" : "未放行"}</Tag> },
    { title: "操作", render: (_, record) => <Space><Button size="small" onClick={() => setSelectedDataset(record)}>查看</Button><Button size="small" onClick={() => openDetail(`${record.name} 预览`, record.samplePreviewType.startsWith("image/") ? `当前样例文件 ${record.samplePreviewName} 可用于视觉质检。` : `当前样例文件 ${record.samplePreviewName} 仅展示资产登记信息。`)}>预览</Button><Button size="small" type="primary" onClick={() => { setSelectedDataset(record); setModalKind("dataset-request"); }}>申请下载</Button></Space> },
  ];

  return (
    <div className="saas-shell">
      <aside className="saas-sidebar" aria-label="平台导航">
        <button className="brand-block" type="button" onClick={() => setActiveModule("overview")}>
          <span className="brand-logo">YF</span>
          <span className="brand-copy"><strong>YFind 训练平台</strong><small>PAI 控制台</small></span>
        </button>
        <div className="sidebar-section-label">业务模块</div>
        <nav className="sidebar-nav" aria-label="主导航">
          {moduleItems.map((item) => (
            <button key={item.key} type="button" className={item.key === activeModule ? "sidebar-nav-link is-active" : "sidebar-nav-link"} aria-label={item.label} onClick={() => setActiveModule(item.key)}>
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-copy"><strong>{item.label}</strong><small>{item.summary}</small></span>
            </button>
          ))}
        </nav>
        <div className="sidebar-status-card">
          <Text strong>运行摘要</Text>
          <span>覆盖数据、训练、模型、治理四条真实业务链路</span>
          <div className="sidebar-status-grid">{quickMetrics.map((item) => <div key={item.label} className="sidebar-status-metric"><strong>{item.value}</strong><small>{item.label}</small></div>)}</div>
        </div>
      </aside>
      <div className="saas-main">
        <header className="saas-topbar">
          <div>
            <div className="topbar-breadcrumb">训练平台 / {activeInfo.label}</div>
            <Text className="eyebrow-text">真实业务控制台</Text>
            <Title level={3}>{activeInfo.label}</Title>
            <Paragraph>{activeInfo.summary}</Paragraph>
          </div>
          <div className="topbar-side">
            <div className="topbar-meta-grid">
              <div className="topbar-meta-card"><span>环境</span><strong>Production-like</strong></div>
              <div className="topbar-meta-card"><span>训练底座</span><strong>Aliyun PAI DLC</strong></div>
              <div className="topbar-meta-card"><span>刷新时间</span><strong>{refreshedAt}</strong></div>
            </div>
            <Space wrap><Tag color={datasetSource === "backend" ? "green" : "gold"}>{datasetSource === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag><Tag>{activeInfo.status}</Tag></Space>
          </div>
        </header>
        <section className="console-toolbar">
          <div className="console-toolbar-left"><Input allowClear className="console-search" placeholder="搜索数据集、训练任务或模型版本（演示入口）" /></div>
          <Space wrap><Button onClick={() => notify("已刷新当前业务视图")}>刷新视图</Button><Button onClick={() => openDetail("平台说明", "当前控制台优先呈现真实业务动作，不再展示原型演示模块。")}>查看说明</Button></Space>
        </section>
        <main className="workspace-frame">
          <Suspense fallback={loadingFallback}>
            {activeModule === "overview" && <OverviewPage openDetail={openDetail} onUpload={() => setModalKind("upload")} onTraining={() => setModalKind("training")} />}
            {activeModule === "identity" && <IdentityPage modules={moduleItems.filter((item) => item.key !== "overview").map(({ key, label }) => ({ key, label }))} openDetail={openDetail} onOpenPermission={() => setModalKind("permission")} />}
            {activeModule === "data-prep" && selectedDataset && <DatasetPage columns={datasetColumns} datasets={filteredDatasets} selectedDataset={selectedDataset} datasetQuery={datasetQuery} setDatasetQuery={setDatasetQuery} datasetStatusFilter={datasetStatusFilter} setDatasetStatusFilter={setDatasetStatusFilter} requestApproved={requestApproved || selectedDataset.canDownloadLatestVersion} source={datasetSource} enableBulkSelection={true} preparationJobs={preparationJobs} openDetail={openDetail} onUpload={() => setModalKind("upload")} onRequest={() => setModalKind("dataset-request")} onApprove={() => setModalKind("dataset-approve")} onDownload={handleDownloadDataset} onRerunPreparationJob={handleRerunPreparationJob} />}
            {activeModule === "training" && <TrainingPage onOpen={() => setModalKind("training")} openDetail={openDetail} />}
            {activeModule === "model" && <ModelPage openDetail={openDetail} />}
            {activeModule === "governance" && <GovernancePage openDetail={openDetail} />}
          </Suspense>
          <footer className="workspace-footer"><Text>当前页面文案已切换为真实业务语义；云账号、资源规格、产物存储等外部事实仍保留 TODO_CONFIRM_* 待确认项。</Text></footer>
        </main>
      </div>
      <Drawer title={detail?.title} open={Boolean(detail)} onClose={() => setDetail(null)} width={460}>
        <Paragraph>{detail?.description}</Paragraph>
        <Descriptions bordered column={1} size="small" items={(detail?.items ?? []).map((item) => ({ key: item.label, label: item.label, children: item.value }))} />
      </Drawer>
      <Suspense fallback={null}>
        {modalKind === "upload" && <UploadDatasetModal open onCancel={closeModal} onConfirm={(values) => { void handleUploadDataset(values); }} />}
        {modalKind === "training" && <TrainingModal open trainingStep={trainingStep} onCancel={() => { setTrainingStep(0); closeModal(); }} onPrev={() => setTrainingStep((step) => step - 1)} onNext={handleNextTrainingStep} onSubmit={handleSubmitTraining} />}
        {modalKind === "permission" && <PermissionModal open onCancel={closeModal} onConfirm={handlePermissionSwitch} />}
        {modalKind === "dataset-request" && selectedDataset && <DatasetRequestModal open dataset={selectedDataset} requestApproved={requestApproved} onCancel={closeModal} onConfirm={(values) => { void handleRequestDownload(values); }} />}
        {modalKind === "dataset-approve" && selectedDataset && <DatasetApproveModal open dataset={selectedDataset} onCancel={closeModal} onConfirm={handleApproveDownload} />}
      </Suspense>
    </div>
  );
}
