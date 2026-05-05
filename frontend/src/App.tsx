import {
  BellOutlined,
  CloudUploadOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  MonitorOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { App as AntdApp, Button, ConfigProvider, Descriptions, Drawer, Space, Tag, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { Suspense, lazy, useMemo, useState } from "react";
import { datasets, makeDetail, type Dataset, type Detail, type ModuleKey } from "./prototype-data";

const { Title, Paragraph, Text } = Typography;

const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const IdentityPage = lazy(() => import("./pages/IdentityPage"));
const DatasetPage = lazy(() => import("./pages/DatasetPage"));
const TrainingPage = lazy(() => import("./pages/TrainingPage"));
const InferencePage = lazy(() => import("./pages/InferencePage"));
const MonitoringPage = lazy(() => import("./pages/MonitoringPage"));
const GenericModulePage = lazy(() => import("./pages/GenericModulePage"));
const UploadDatasetModal = lazy(() => import("./modals/UploadDatasetModal"));
const TrainingModal = lazy(() => import("./modals/TrainingModal"));
const DeployModal = lazy(() => import("./modals/DeployModal"));
const PermissionModal = lazy(() => import("./modals/PermissionModal"));
const DatasetRequestModal = lazy(() => import("./modals/DatasetRequestModal"));
const DatasetApproveModal = lazy(() => import("./modals/DatasetApproveModal"));

type ModalKind = "upload" | "training" | "deploy" | "permission" | "dataset-request" | "dataset-approve" | null;

type ModuleItem = {
  key: ModuleKey;
  label: string;
  icon: ReactNode;
  summary: string;
  tone: "light" | "dark" | "parchment";
};

const moduleItems: ModuleItem[] = [
  { key: "overview", label: "平台总览", icon: <DashboardOutlined />, summary: "端到端工业 AI 小模型闭环", tone: "light" },
  { key: "identity", label: "组织权限", icon: <SafetyCertificateOutlined />, summary: "组织、角色、SSO 和审计入口", tone: "parchment" },
  { key: "dataset", label: "数据资产", icon: <DatabaseOutlined />, summary: "数据集、版本、质量和标注入口", tone: "dark" },
  { key: "labeling", label: "标注任务", icon: <FileSearchOutlined />, summary: "标注队列、复核、质检与交付", tone: "light" },
  { key: "training", label: "训练中心", icon: <ExperimentOutlined />, summary: "训练任务、资源调度和实验指标", tone: "parchment" },
  { key: "model", label: "模型仓库", icon: <DatabaseOutlined />, summary: "版本、评测、审批和回滚", tone: "dark" },
  { key: "inference", label: "推理服务", icon: <RocketOutlined />, summary: "KServe 发布、灰度和回滚", tone: "light" },
  { key: "edge", label: "边缘下发", icon: <CloudUploadOutlined />, summary: "边缘节点、模型包、部署状态", tone: "parchment" },
  { key: "monitoring", label: "监控审计", icon: <MonitorOutlined />, summary: "告警、指标、日志、审计追踪", tone: "dark" },
];

const loadingFallback = <div className="utility-grid-section">正在加载...</div>;

export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#0066cc",
          borderRadius: 18,
          fontFamily: "SF Pro Text, system-ui, -apple-system, BlinkMacSystemFont, 'Microsoft YaHei', sans-serif",
        },
      }}
    >
      <AntdApp>
        <PrototypeApp />
      </AntdApp>
    </ConfigProvider>
  );
}

function PrototypeApp() {
  const [activeModule, setActiveModule] = useState<ModuleKey>("overview");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [trainingStep, setTrainingStep] = useState(0);
  const [selectedDataset, setSelectedDataset] = useState<Dataset>(datasets[0]);
  const [datasetQuery, setDatasetQuery] = useState("");
  const [datasetStatusFilter, setDatasetStatusFilter] = useState("ALL");
  const [requestApproved, setRequestApproved] = useState(false);
  const { message } = AntdApp.useApp();

  const activeInfo = useMemo(() => moduleItems.find((item) => item.key === activeModule) ?? moduleItems[0], [activeModule]);
  const filteredDatasets = useMemo(() => datasets.filter((dataset) => {
    const matchQuery = !datasetQuery || dataset.name.includes(datasetQuery) || dataset.owner.includes(datasetQuery);
    const matchStatus = datasetStatusFilter === "ALL" || dataset.status === datasetStatusFilter;
    return matchQuery && matchStatus;
  }), [datasetQuery, datasetStatusFilter]);

  const openDetail = (title: string, description: string) => setDetail(makeDetail(title, description));
  const closeModal = () => setModalKind(null);
  const notify = (content: string) => void message.success(content);

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
    <div className="apple-page">
      <nav className="global-nav" aria-label="全局导航">
        <button className="apple-mark" type="button" onClick={() => setActiveModule("overview")}>YFI</button>
        <div className="global-nav-links">
          {moduleItems.map((item) => (
            <button key={item.key} type="button" className={item.key === activeModule ? "apple-nav-link is-active" : "apple-nav-link"} onClick={() => setActiveModule(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
        <button className="apple-nav-icon" type="button" aria-label="告警" onClick={() => openDetail("告警中心", "查看训练失败、部署异常和边缘节点离线告警。")}>
          <BellOutlined />
        </button>
      </nav>

      <div className="sub-nav-frosted">
        <div>
          <Text strong>YFI AI Platform</Text>
          <span className="sub-nav-caption">可点击原型 · Apple 设计语言</span>
        </div>
        <Space wrap>
          <Button type="link" onClick={() => openDetail(activeInfo.label, activeInfo.summary)}>查看模块说明</Button>
          <Button aria-label="启动训练" type="primary" icon={<PlayCircleOutlined />} onClick={() => setModalKind("training")}>启动训练</Button>
        </Space>
      </div>

      <main>
        <section className={`product-tile product-tile-${activeInfo.tone}`}>
          <div className="tile-copy">
            <Tag color={activeInfo.tone === "dark" ? "blue" : "default"}>F003-interactive-prototype</Tag>
            <Title level={1}>YFI 工业 AI 小模型平台原型</Title>
            <Paragraph className="tile-lead">{activeInfo.label} · {activeInfo.summary}</Paragraph>
            <Space wrap className="tile-actions">
              <Button type="primary" onClick={() => setModalKind(activeModule === "dataset" ? "upload" : activeModule === "inference" ? "deploy" : "training")}>执行主操作</Button>
              <Button onClick={() => openDetail(activeInfo.label, activeInfo.summary)}>了解更多</Button>
            </Space>
          </div>
          <div className="product-stage" aria-hidden="true">
            <div className="product-device">
              <span>{activeInfo.icon}</span>
              <strong>{activeInfo.label}</strong>
              <small>{activeInfo.summary}</small>
            </div>
          </div>
        </section>

        <Suspense fallback={loadingFallback}>
          {activeModule === "overview" && <OverviewPage openDetail={openDetail} onUpload={() => setModalKind("upload")} onTraining={() => setModalKind("training")} onDeploy={() => setModalKind("deploy")} />}
          {activeModule === "identity" && <IdentityPage modules={moduleItems.filter((item) => item.key !== "overview").map(({ key, label }) => ({ key, label }))} openDetail={openDetail} onOpenPermission={() => setModalKind("permission")} />}
          {activeModule === "dataset" && <DatasetPage columns={datasetColumns} datasets={filteredDatasets} selectedDataset={selectedDataset} datasetQuery={datasetQuery} setDatasetQuery={setDatasetQuery} datasetStatusFilter={datasetStatusFilter} setDatasetStatusFilter={setDatasetStatusFilter} requestApproved={requestApproved || selectedDataset.canDownloadLatestVersion} openDetail={openDetail} onUpload={() => setModalKind("upload")} onRequest={() => setModalKind("dataset-request")} onApprove={() => setModalKind("dataset-approve")} />}
          {activeModule === "training" && <TrainingPage onOpen={() => setModalKind("training")} openDetail={openDetail} />}
          {activeModule === "inference" && <InferencePage openDetail={openDetail} onDeploy={() => setModalKind("deploy")} />}
          {activeModule === "monitoring" && <MonitoringPage openDetail={openDetail} />}
          {["labeling", "model", "edge"].includes(activeModule) && <GenericModulePage moduleLabel={activeInfo.label} summary={activeInfo.summary} openDetail={openDetail} />}
        </Suspense>
      </main>

      <footer className="apple-footer">
        <Text>所有业务数据均为原型占位。真实接口、权限、模型训练和部署将在后续 feature 中接入。</Text>
      </footer>

      <Drawer title={detail?.title} open={Boolean(detail)} onClose={() => setDetail(null)} width={460}>
        <Paragraph>{detail?.description}</Paragraph>
        <Descriptions bordered column={1} size="small" items={(detail?.items ?? []).map((item) => ({ key: item.label, label: item.label, children: item.value }))} />
      </Drawer>

      <Suspense fallback={null}>
        {modalKind === "upload" && <UploadDatasetModal open onCancel={closeModal} onConfirm={() => { notify("数据集上传任务已创建，并进入异步预处理队列"); closeModal(); }} />}
        {modalKind === "training" && <TrainingModal open trainingStep={trainingStep} onCancel={closeModal} onPrev={() => setTrainingStep((step) => step - 1)} onNext={() => setTrainingStep((step) => step + 1)} onSubmit={() => { notify("训练任务已提交，等待调度"); closeModal(); }} />}
        {modalKind === "deploy" && <DeployModal open onCancel={closeModal} onConfirm={() => { notify("模型部署申请已提交"); closeModal(); }} />}
        {modalKind === "permission" && <PermissionModal open onCancel={closeModal} onConfirm={() => { notify("已模拟登录：平台管理员"); closeModal(); }} />}
        {modalKind === "dataset-request" && <DatasetRequestModal open dataset={selectedDataset} requestApproved={requestApproved} onCancel={closeModal} onConfirm={() => { notify("下载申请已提交，等待审批"); closeModal(); }} />}
        {modalKind === "dataset-approve" && <DatasetApproveModal open dataset={selectedDataset} onCancel={closeModal} onConfirm={() => { setRequestApproved(true); notify(`已批准 ${selectedDataset.name} 最新版本下载权限`); closeModal(); }} />}
      </Suspense>
    </div>
  );
}
