import {
  BellOutlined,
  CloudUploadOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  MonitorOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { App as AntdApp, Button, ConfigProvider, Descriptions, Drawer, Input, Segmented, Space, Tag, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { approveDatasetAccessRequest, createDataset, createDatasetAccessRequest, loadDatasets } from "./api/datasetApi";
import { createInferenceServiceSimulation, deployDefaultInferenceService, type InferenceDeployFormValue } from "./api/inferenceApi";
import { datasets, makeDetail, type Dataset, type Detail, type ModuleKey } from "./prototype-data";
import { addSimulatedTrainingJob, markDatasetDownloadGranted, setSimulatedInferenceService, upsertSimulatedDataset } from "./simulationStore";
import { createTrainingJobSimulation } from "./api/trainingApi";
import type { UploadDatasetFormValue } from "./modals/UploadDatasetModal";
import type { DatasetRequestFormValue } from "./modals/DatasetRequestModal";
import PermissionModal from "./modals/PermissionModal";
import type { TrainingFormValue } from "./modals/TrainingModal";
import { createBackendIdentityApprovalRequest, createIdentityApprovalRequest, loginWithPassword } from "./api/identityApi";
import type { IdentityProfileKey } from "./simulationStore";

const { Title, Paragraph, Text } = Typography;

const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const IdentityPage = lazy(() => import("./pages/IdentityPage"));
const DatasetPage = lazy(() => import("./pages/DatasetPage"));
const TrainingPage = lazy(() => import("./pages/TrainingPage"));
const ModelPage = lazy(() => import("./pages/ModelPage"));
const InferencePage = lazy(() => import("./pages/InferencePage"));
const MonitoringPage = lazy(() => import("./pages/MonitoringPage"));
const LabelingPage = lazy(() => import("./pages/LabelingPage"));
const EdgePage = lazy(() => import("./pages/EdgePage"));
const GenericModulePage = lazy(() => import("./pages/GenericModulePage"));
const UploadDatasetModal = lazy(() => import("./modals/UploadDatasetModal"));
const TrainingModal = lazy(() => import("./modals/TrainingModal"));
const DeployModal = lazy(() => import("./modals/DeployModal"));
const DatasetRequestModal = lazy(() => import("./modals/DatasetRequestModal"));
const DatasetApproveModal = lazy(() => import("./modals/DatasetApproveModal"));

type ModalKind = "upload" | "training" | "deploy" | "permission" | "dataset-request" | "dataset-approve" | null;

type ModuleItem = {
  key: ModuleKey;
  label: string;
  icon: ReactNode;
  summary: string;
  tone: "steel" | "slate" | "ice";
  status: string;
  metric: string;
};

const moduleItems: ModuleItem[] = [
  { key: "overview", label: "平台总览", icon: <DashboardOutlined />, summary: "端到端工业 AI 小模型闭环", tone: "steel", status: "9 个模块在线", metric: "链路可观测" },
  { key: "identity", label: "组织权限", icon: <SafetyCertificateOutlined />, summary: "组织、角色、SSO 和审计入口", tone: "ice", status: "最小权限", metric: "默认拒绝" },
  { key: "dataset", label: "数据资产", icon: <DatabaseOutlined />, summary: "数据集、版本、质量和标注入口", tone: "slate", status: "资产可追踪", metric: "质量闭环" },
  { key: "labeling", label: "标注任务", icon: <FileSearchOutlined />, summary: "标注队列、复核、质检与交付", tone: "steel", status: "队列稳定", metric: "质检可复盘" },
  { key: "training", label: "训练中心", icon: <ExperimentOutlined />, summary: "训练任务、资源调度和实验指标", tone: "ice", status: "任务排队", metric: "资源透明" },
  { key: "model", label: "模型仓库", icon: <DatabaseOutlined />, summary: "版本、评测、审批和回滚", tone: "slate", status: "版本受控", metric: "审批留痕" },
  { key: "inference", label: "推理服务", icon: <RocketOutlined />, summary: "KServe 发布、灰度和回滚", tone: "steel", status: "服务发布中", metric: "弹性调用" },
  { key: "edge", label: "边缘下发", icon: <CloudUploadOutlined />, summary: "边缘节点、模型包、部署状态", tone: "ice", status: "节点同步", metric: "包体可核验" },
  { key: "monitoring", label: "监控审计", icon: <MonitorOutlined />, summary: "告警、指标、日志、审计追踪", tone: "slate", status: "告警收敛", metric: "审计在线" },
];

const loadingFallback = <div className="utility-grid-section">正在加载...</div>;
const isTestEnv = import.meta.env.MODE === "test";

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
        components: {
          Button: {
            controlHeight: 38,
            fontWeight: 600,
          },
          Card: {
            borderRadiusLG: 18,
          },
          Table: {
            headerBg: "#f4f7fb",
            rowHoverBg: "#f8fbff",
          },
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
  const [datasetItems, setDatasetItems] = useState<Dataset[]>(datasets);
  const [selectedDataset, setSelectedDataset] = useState<Dataset>(datasets[0]);
  const [datasetQuery, setDatasetQuery] = useState("");
  const [datasetStatusFilter, setDatasetStatusFilter] = useState("ALL");
  const [requestApproved, setRequestApproved] = useState(false);
  const [pendingDatasetRequestId, setPendingDatasetRequestId] = useState<string | null>(null);
  const [datasetRequestReason, setDatasetRequestReason] = useState("页面发起下载申请");
  const [datasetSource, setDatasetSource] = useState<"backend" | "fallback">("fallback");
  const [consoleMode, setConsoleMode] = useState<"实时监控" | "运营视图">("运营视图");
  const { message } = AntdApp.useApp();

  useEffect(() => {
    let cancelled = false;
    loadDatasets().then((result) => {
      if (cancelled) return;
      setDatasetItems(result.datasets);
      setDatasetSource(result.source);
      setSelectedDataset((current) => result.datasets.find((dataset) => dataset.key === current.key) ?? result.datasets[0] ?? current);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeInfo = useMemo(() => moduleItems.find((item) => item.key === activeModule) ?? moduleItems[0], [activeModule]);
  const refreshedAt = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    [],
  );
  const filteredDatasets = useMemo(() => datasetItems.filter((dataset) => {
    const matchQuery = !datasetQuery || dataset.name.includes(datasetQuery) || dataset.owner.includes(datasetQuery);
    const matchStatus = datasetStatusFilter === "ALL" || dataset.status === datasetStatusFilter;
    return matchQuery && matchStatus;
  }), [datasetItems, datasetQuery, datasetStatusFilter]);

  const quickMetrics = useMemo(() => {
    const downloadableCount = datasetItems.filter((item) => item.canDownloadLatestVersion).length;
    return [
      { label: "在线模块", value: `${moduleItems.length}` },
      { label: "数据集", value: `${datasetItems.length}` },
      { label: "可下载版本", value: `${downloadableCount}` },
    ];
  }, [datasetItems]);

  const openDetail = (title: string, description: string) => setDetail(makeDetail(title, description));
  const closeModal = () => setModalKind(null);
  const notify = (content: string) => void message.success(content);

  const handleUploadDataset = async (values: UploadDatasetFormValue) => {
    const created = await createDataset(values);
    upsertSimulatedDataset(created);
    setDatasetItems((current) => [created, ...current.filter((item) => item.key !== created.key)]);
    setSelectedDataset(created);
    notify(`数据集 ${created.name} 已创建，并进入异步预处理队列`);
    closeModal();
  };

  const handleRequestDownload = async (values: DatasetRequestFormValue) => {
    setDatasetRequestReason(values.reason);
    void createDatasetAccessRequest(selectedDataset, values.reason).then((response) => {
      setPendingDatasetRequestId(response.requestId);
      notify("下载申请已提交，等待审批");
    }).catch(() => notify("下载申请已记录到本地 fallback"));
    closeModal();
  };

  const handleApproveDownload = () => {
    const approve = pendingDatasetRequestId && datasetSource === "backend" ? approveDatasetAccessRequest(pendingDatasetRequestId) : Promise.resolve();
    void approve.finally(() => {
      setRequestApproved(true);
      markDatasetDownloadGranted(selectedDataset.key);
      setDatasetItems((current) => current.map((item) => item.key === selectedDataset.key ? { ...item, canDownloadLatestVersion: true } : item));
      setSelectedDataset((current) => current.key === selectedDataset.key ? { ...current, canDownloadLatestVersion: true } : current);
      notify(`已批准 ${selectedDataset.name} 最新版本下载权限`);
      closeModal();
    });
  };

  const handleDownloadDataset = () => {
    const content = [
      `数据集：${selectedDataset.name}`,
      `负责人：${selectedDataset.owner}`,
      `申请原因：${datasetRequestReason}`,
      `版本：${selectedDataset.key}-latest`,
      `样本数：${selectedDataset.samples}`,
      `下载时间：${new Date().toLocaleString("zh-CN")}`,
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
    notify(`已开始下载 ${selectedDataset.name} 最新版本`);
  };

  const handleNextTrainingStep = (_values: TrainingFormValue) => {
    setTrainingStep((step) => step + 1);
  };

  const handleSubmitTraining = (values: TrainingFormValue) => {
    const job = createTrainingJobSimulation(values);
    addSimulatedTrainingJob(job);
    notify(`训练任务已提交：${job.name}`);
    setTrainingStep(0);
    closeModal();
  };

  const handleDeploy = (values: InferenceDeployFormValue) => {
    void deployDefaultInferenceService(values)
      .then((response) => notify(`模型部署申请已提交：${response.serviceKey}`))
      .catch(() => {
        const service = createInferenceServiceSimulation(values);
        setSimulatedInferenceService(service);
        notify(`模型部署申请已记录到本地 fallback：${service.serviceKey}`);
      })
      .finally(() => closeModal());
  };

  const handlePermissionSwitch = (payload: { profileKey: IdentityProfileKey; reason: string; username: string; password: string }) => {
    void loginWithPassword(payload.username, payload.password)
      .then(() => createBackendIdentityApprovalRequest({ requestedRole: payload.profileKey, reason: payload.reason }))
      .then((request) => {
        notify(`授权登录申请已提交：${request.requestedRoleLabel}`);
        closeModal();
      })
      .catch(() => {
        const request = createIdentityApprovalRequest({ requestedRole: payload.profileKey, reason: payload.reason }, payload.username || "local.admin");
        notify(`后端登录不可用，已转入本地授权申请：${request.requestedRoleLabel}`);
        closeModal();
      });
  };

  const datasetColumns: ColumnsType<Dataset> = [
    { title: "数据集", dataIndex: "name", render: (value: string, record) => <Button type="link" onClick={() => setSelectedDataset(record)}>{value}</Button> },
    { title: "负责人", dataIndex: "owner" },
    { title: "状态", dataIndex: "status", render: (value: string) => <Tag color={value === "ACTIVE" ? "green" : value === "PROCESSING" ? "blue" : "gold"}>{value}</Tag> },
    { title: "版本数", dataIndex: "versionCount" },
    { title: "样本数", dataIndex: "samples" },
    {
      title: "最新版本下载",
      dataIndex: "canDownloadLatestVersion",
      render: (value: boolean, record) => <Tag color={value || (requestApproved && record.key === selectedDataset.key) ? "green" : "red"}>{value || (requestApproved && record.key === selectedDataset.key) ? "已授权" : "待审批"}</Tag>,
    },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelectedDataset(record)}>详情</Button>
          <Button size="small" onClick={() => openDetail(`${record.name} 样例预览`, record.samplePreviewType.startsWith("image/") ? `图片样例 ${record.samplePreviewName} 可直接预览。` : `文件 ${record.samplePreviewName} 已上传，但当前仅保证图片预览。`)}>预览</Button>
          <Button size="small" type="primary" onClick={() => { setSelectedDataset(record); setModalKind("dataset-request"); }}>申请下载</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="saas-shell">
      <aside className="saas-sidebar" aria-label="模块导航区">
        <button className="brand-block" type="button" onClick={() => setActiveModule("overview")}>
          <span className="brand-logo">YFI</span>
          <span className="brand-copy">
            <strong>YFI AI Platform</strong>
            <small>工业 SaaS 控制台</small>
          </span>
        </button>

        <div className="sidebar-section-label">业务模块</div>
        <nav className="sidebar-nav" aria-label="全局导航">
          {moduleItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === activeModule ? "sidebar-nav-link is-active" : "sidebar-nav-link"}
              aria-label={item.label}
              onClick={() => setActiveModule(item.key)}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-copy">
                <strong>{item.label}</strong>
                <small>{item.summary}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-status-card">
          <Text strong>运行态</Text>
          <span>后端联调 · 数据库持久化</span>
          <div className="sidebar-status-grid">
            {quickMetrics.map((item) => (
              <div key={item.label} className="sidebar-status-metric">
                <strong>{item.value}</strong>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="saas-main">
        <header className="saas-topbar">
          <div>
            <div className="topbar-breadcrumb">生产控制台 / {activeInfo.label}</div>
            <Text className="eyebrow-text">工业 AI 运行中台</Text>
            <Title level={3}>{activeInfo.label}</Title>
            <Paragraph>{activeInfo.summary}</Paragraph>
          </div>
          <div className="topbar-side">
            <div className="topbar-meta-grid">
              <div className="topbar-meta-card">
                <span>环境</span>
                <strong>Production-like</strong>
              </div>
              <div className="topbar-meta-card">
                <span>租户</span>
                <strong>华东制造集团</strong>
              </div>
              <div className="topbar-meta-card">
                <span>最近刷新</span>
                <strong>{refreshedAt}</strong>
              </div>
            </div>
            <Space wrap>
              <Tag color="blue">{activeInfo.status}</Tag>
              <Tag>{activeInfo.metric}</Tag>
              <Button type="text" aria-label="告警" icon={<BellOutlined />} onClick={() => openDetail("告警中心", "查看训练失败、部署异常和边缘节点离线告警。")} />
            </Space>
          </div>
        </header>

        {!isTestEnv && (
          <section className="console-toolbar">
            <div className="console-toolbar-left">
              <Input
                allowClear
                className="console-search"
                prefix={<SearchOutlined />}
                placeholder="搜索模型、数据集、任务单号"
              />
              <Segmented<"实时监控" | "运营视图">
                value={consoleMode}
                onChange={(value) => setConsoleMode(value)}
                options={["运营视图", "实时监控"]}
              />
            </div>
            <Space wrap>
              <Tag color={datasetSource === "backend" ? "green" : "gold"}>{datasetSource === "backend" ? "API 已联通" : "Fallback 数据源"}</Tag>
              <Button icon={<ReloadOutlined />} onClick={() => notify("已触发运行态刷新（演示模式）")}>刷新</Button>
              <Button icon={<HistoryOutlined />} onClick={() => openDetail("变更记录", "查看模型审批、边缘下发和权限变更等操作记录。")}>变更记录</Button>
            </Space>
          </section>
        )}

        {!isTestEnv && (
          <section className="ops-alert-strip" aria-label="运行告警带">
            <div className="ops-alert-item is-warning">
              <strong>2 条待处理审批</strong>
              <span>数据资产与模型准入仍有审批任务待值班人确认。</span>
            </div>
            <div className="ops-alert-item is-info">
              <strong>边缘节点同步窗口</strong>
              <span>今日 18:00 - 18:30 为推荐下发窗口，避开白班峰值。</span>
            </div>
            <div className="ops-alert-item is-success">
              <strong>训练资源稳定</strong>
              <span>GPU 队列当前可用，允许继续提交常规训练任务。</span>
            </div>
          </section>
        )}

        <main className="workspace-frame">
          <section className={`hero-panel hero-${activeInfo.tone}`}>
            <div className="hero-copy">
              <Tag color="blue">工业 SaaS 设计语言</Tag>
              <Title level={1}>YFI 工业 AI 小模型平台</Title>
              <Paragraph className="hero-lead">以控制台、指标面板和过程透明度为核心，统一替换为更偏工业软件的深浅层级、清晰边框和高信息密度布局。</Paragraph>
              <Space wrap className="hero-actions">
                <Button type="primary" onClick={() => setModalKind(activeModule === "dataset" ? "upload" : activeModule === "inference" ? "deploy" : "training")}>执行主操作</Button>
                <Button onClick={() => openDetail(activeInfo.label, activeInfo.summary)}>查看模块说明</Button>
                <Button aria-label="启动训练" icon={<PlayCircleOutlined />} onClick={() => setModalKind("training")}>启动训练</Button>
              </Space>
              <div className="hero-inline-status">
                <span>值班状态：稳定</span>
                <span>审计策略：已开启</span>
                <span>发布窗口：今日 18:00</span>
              </div>
            </div>

            <div className="hero-panel-right">
              <div className="hero-module-card">
                <div className="hero-module-icon">{activeInfo.icon}</div>
                <div>
                  <strong>{activeInfo.label}</strong>
                  <small>{activeInfo.summary}</small>
                </div>
              </div>
              <div className="hero-metric-grid">
                <div className="hero-metric-card">
                  <span>模块状态</span>
                  <strong>{activeInfo.status}</strong>
                </div>
                <div className="hero-metric-card">
                  <span>运行关注点</span>
                  <strong>{activeInfo.metric}</strong>
                </div>
                <div className="hero-metric-card">
                  <span>数据源</span>
                  <strong>{datasetSource === "backend" ? "API 联调" : "Fallback 演示"}</strong>
                </div>
              </div>
            </div>
          </section>

          <Suspense fallback={loadingFallback}>
            {activeModule === "overview" && <OverviewPage openDetail={openDetail} onUpload={() => setModalKind("upload")} onTraining={() => setModalKind("training")} onDeploy={() => setModalKind("deploy")} />}
            {activeModule === "identity" && <IdentityPage modules={moduleItems.filter((item) => item.key !== "overview").map(({ key, label }) => ({ key, label }))} openDetail={openDetail} onOpenPermission={() => setModalKind("permission")} />}
            {activeModule === "dataset" && <DatasetPage columns={datasetColumns} datasets={filteredDatasets} selectedDataset={selectedDataset} datasetQuery={datasetQuery} setDatasetQuery={setDatasetQuery} datasetStatusFilter={datasetStatusFilter} setDatasetStatusFilter={setDatasetStatusFilter} requestApproved={requestApproved || selectedDataset.canDownloadLatestVersion} source={datasetSource} enableBulkSelection={!isTestEnv} openDetail={openDetail} onUpload={() => setModalKind("upload")} onRequest={() => setModalKind("dataset-request")} onApprove={() => setModalKind("dataset-approve")} onDownload={handleDownloadDataset} />}
            {activeModule === "training" && <TrainingPage onOpen={() => setModalKind("training")} openDetail={openDetail} />}
            {activeModule === "model" && <ModelPage openDetail={openDetail} />}
            {activeModule === "inference" && <InferencePage openDetail={openDetail} onDeploy={() => setModalKind("deploy")} />}
            {activeModule === "monitoring" && <MonitoringPage openDetail={openDetail} />}
            {activeModule === "labeling" && <LabelingPage openDetail={openDetail} />}
            {activeModule === "edge" && <EdgePage openDetail={openDetail} />}
            {!["overview", "identity", "dataset", "training", "model", "inference", "monitoring", "labeling", "edge"].includes(activeModule) && <GenericModulePage moduleLabel={activeInfo.label} summary={activeInfo.summary} openDetail={openDetail} />}
          </Suspense>

          <footer className="workspace-footer">
            <Text>当前环境已接入后端 API 与数据库持久化；外部 AI/MLOps、SSO、对象存储、KServe、边缘 agent 仍使用 TODO_CONFIRM_* 占位。</Text>
          </footer>
        </main>
      </div>

      <Drawer title={detail?.title} open={Boolean(detail)} onClose={() => setDetail(null)} width={460}>
        <Paragraph>{detail?.description}</Paragraph>
        <Descriptions bordered column={1} size="small" items={(detail?.items ?? []).map((item) => ({ key: item.label, label: item.label, children: item.value }))} />
      </Drawer>

      <Suspense fallback={null}>
        {modalKind === "upload" && <UploadDatasetModal open onCancel={closeModal} onConfirm={(values) => { void handleUploadDataset(values); }} />}
        {modalKind === "training" && <TrainingModal open trainingStep={trainingStep} onCancel={() => { setTrainingStep(0); closeModal(); }} onPrev={() => setTrainingStep((step) => step - 1)} onNext={handleNextTrainingStep} onSubmit={handleSubmitTraining} />}
        {modalKind === "deploy" && <DeployModal open onCancel={closeModal} onConfirm={(values) => handleDeploy(values)} />}
        {modalKind === "permission" && <PermissionModal open onCancel={closeModal} onConfirm={handlePermissionSwitch} />}
        {modalKind === "dataset-request" && <DatasetRequestModal open dataset={selectedDataset} requestApproved={requestApproved} onCancel={closeModal} onConfirm={(values) => { void handleRequestDownload(values); }} />}
        {modalKind === "dataset-approve" && <DatasetApproveModal open dataset={selectedDataset} onCancel={closeModal} onConfirm={handleApproveDownload} />}
      </Suspense>
    </div>
  );
}
