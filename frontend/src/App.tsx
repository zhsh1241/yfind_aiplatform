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
import {
  App as AntdApp,
  Badge,
  Button,
  Card,
  Col,
  ConfigProvider,
  Descriptions,
  Drawer,
  Form,
  Input,
  List,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  Typography,
  theme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

const { Title, Paragraph, Text } = Typography;

type ModuleKey =
  | "overview"
  | "identity"
  | "dataset"
  | "labeling"
  | "training"
  | "model"
  | "inference"
  | "edge"
  | "monitoring";

type ModalKind =
  | "upload"
  | "training"
  | "deploy"
  | "permission"
  | "labeling"
  | "edge"
  | "dataset-request"
  | "dataset-approve"
  | null;

type Detail = {
  title: string;
  description: string;
  items: Array<{ label: string; value: string }>;
};

type Dataset = {
  key: string;
  name: string;
  owner: string;
  status: string;
  samples: number;
  quality: number;
  versionCount: number;
  previewType: string;
  canView: boolean;
  canDownloadLatestVersion: boolean;
  dedupStrategy: string;
  processingStatus: string;
  samplePreviewName: string;
  samplePreviewType: string;
};

const moduleItems: Array<{ key: ModuleKey; label: string; icon: ReactNode; summary: string; tone: "light" | "dark" | "parchment" }> = [
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

const flowNodes = ["组织登录", "数据上传", "标注复核", "启动训练", "模型注册", "推理发布", "边缘下发", "监控审计"];

const inferenceMetrics = [
  { label: "08:00", qps: 46, latency: 94, success: 99.96 },
  { label: "10:00", qps: 72, latency: 112, success: 99.94 },
  { label: "12:00", qps: 64, latency: 108, success: 99.95 },
  { label: "14:00", qps: 93, latency: 128, success: 99.9 },
  { label: "16:00", qps: 81, latency: 119, success: 99.92 },
  { label: "18:00", qps: 58, latency: 101, success: 99.97 },
];

const datasets: Dataset[] = [
  {
    key: "motor-thermal",
    name: "电机温升异常图像集",
    owner: "算法组",
    status: "ACTIVE",
    samples: 12840,
    quality: 96,
    versionCount: 3,
    previewType: "图片",
    canView: true,
    canDownloadLatestVersion: true,
    dedupStrategy: "SKIP_DUPLICATE",
    processingStatus: "SUCCEEDED",
    samplePreviewName: "sample-001.jpg",
    samplePreviewType: "image/jpeg",
  },
  {
    key: "bearing-audio",
    name: "轴承异响音频集",
    owner: "设备组",
    status: "PROCESSING",
    samples: 6200,
    quality: 91,
    versionCount: 1,
    previewType: "通用文件",
    canView: true,
    canDownloadLatestVersion: false,
    dedupStrategy: "WARN_DUPLICATE",
    processingStatus: "RUNNING",
    samplePreviewName: "bearing-001.wav",
    samplePreviewType: "audio/wav",
  },
  {
    key: "welding-vision",
    name: "焊点外观缺陷集",
    owner: "质检组",
    status: "PENDING_APPROVAL",
    samples: 8920,
    quality: 88,
    versionCount: 2,
    previewType: "图片",
    canView: true,
    canDownloadLatestVersion: false,
    dedupStrategy: "SKIP_DUPLICATE",
    processingStatus: "QUEUED",
    samplePreviewName: "weld-101.jpg",
    samplePreviewType: "image/jpeg",
  },
];

const frontendUser = {
  username: "local.admin",
  displayName: "本地平台管理员",
  organization: "YFI 智造中心（本地占位）",
  authMethod: "LOCAL_DEV_PRINCIPAL",
  iamProvider: "TODO_CONFIRM_IAM_PROVIDER",
  permissions: ["identity:role:manage", "dataset:manage", "inference:deploy", "audit:read"],
};

const moduleRequiredPermissions: Record<ModuleKey, string> = {
  overview: "identity:user:read",
  identity: "identity:role:manage",
  dataset: "dataset:manage",
  labeling: "labeling:manage",
  training: "training:execute",
  model: "model:manage",
  inference: "inference:deploy",
  edge: "edge:deploy",
  monitoring: "audit:read",
};

function makeDetail(title: string, description: string): Detail {
  return {
    title,
    description,
    items: [
      { label: "原型状态", value: "已接入点击反馈" },
      { label: "真实接口", value: "后续 feature 接入" },
      { label: "设计语言", value: "Apple 风格：低 chrome、单一蓝色交互、满屏产品 tile" },
    ],
  };
}

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

  const filteredDatasets = useMemo(() => {
    return datasets.filter((dataset) => {
      const matchQuery = !datasetQuery || dataset.name.includes(datasetQuery) || dataset.owner.includes(datasetQuery);
      const matchStatus = datasetStatusFilter === "ALL" || dataset.status === datasetStatusFilter;
      return matchQuery && matchStatus;
    });
  }, [datasetQuery, datasetStatusFilter]);

  const openDetail = (title: string, description: string) => setDetail(makeDetail(title, description));
  const closeModal = () => setModalKind(null);
  const notify = (content: string) => void message.success(content);

  const datasetColumns: ColumnsType<Dataset> = [
    {
      title: "数据集",
      dataIndex: "name",
      render: (value: string, record) => <Button type="link" onClick={() => setSelectedDataset(record)}>{value}</Button>,
    },
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

        {activeModule === "overview" && <OverviewPage openDetail={openDetail} onUpload={() => setModalKind("upload")} onTraining={() => setModalKind("training")} onDeploy={() => setModalKind("deploy")} />}
        {activeModule === "identity" && <IdentityPage openDetail={openDetail} onOpenPermission={() => setModalKind("permission")} />}
        {activeModule === "dataset" && (
          <DatasetPage
            columns={datasetColumns}
            datasets={filteredDatasets}
            selectedDataset={selectedDataset}
            datasetQuery={datasetQuery}
            setDatasetQuery={setDatasetQuery}
            datasetStatusFilter={datasetStatusFilter}
            setDatasetStatusFilter={setDatasetStatusFilter}
            requestApproved={requestApproved || selectedDataset.canDownloadLatestVersion}
            openDetail={openDetail}
            onUpload={() => setModalKind("upload")}
            onRequest={() => setModalKind("dataset-request")}
            onApprove={() => setModalKind("dataset-approve")}
          />
        )}
        {activeModule === "training" && <TrainingPage onOpen={() => setModalKind("training")} openDetail={openDetail} />}
        {activeModule === "inference" && <InferencePage openDetail={openDetail} onDeploy={() => setModalKind("deploy")} />}
        {activeModule === "monitoring" && <MonitoringPage openDetail={openDetail} />}
        {["labeling", "model", "edge"].includes(activeModule) && <GenericModulePage moduleKey={activeModule} openDetail={openDetail} />}
      </main>

      <footer className="apple-footer">
        <Text>所有业务数据均为原型占位。真实接口、权限、模型训练和部署将在后续 feature 中接入。</Text>
      </footer>

      <Drawer title={detail?.title} open={Boolean(detail)} onClose={() => setDetail(null)} width={460}>
        <Paragraph>{detail?.description}</Paragraph>
        <Descriptions bordered column={1} size="small" items={(detail?.items ?? []).map((item) => ({ key: item.label, label: item.label, children: item.value }))} />
      </Drawer>

      <Modal title="上传数据集" open={modalKind === "upload"} onCancel={closeModal} onOk={() => { notify("数据集上传任务已创建，并进入异步预处理队列"); closeModal(); }} okText="创建上传任务" cancelText="取消">
        <Form layout="vertical">
          <Form.Item label="数据集名称" required><Input placeholder="例如：电机温升异常图像集" /></Form.Item>
          <Form.Item label="上传类型" required><Select defaultValue="file" options={[{ value: "file", label: "通用文件上传" }, { value: "image", label: "图片样例保障" }]} /></Form.Item>
          <Form.Item label="去重策略" required><Select defaultValue="SKIP_DUPLICATE" options={[{ value: "SKIP_DUPLICATE", label: "跳过重复文件" }, { value: "WARN_DUPLICATE", label: "提示重复后继续" }]} /></Form.Item>
          <Form.Item label="说明"><Input.TextArea placeholder="填写采集来源、元数据规则、审批边界和保密等级" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="启动训练任务" open={modalKind === "training"} onCancel={closeModal} footer={null} width={720}>
        <Steps current={trainingStep} items={[{ title: "选择数据" }, { title: "选择算法" }, { title: "配置资源" }, { title: "提交训练" }]} />
        <Card className="step-card">
          <Title level={4}>{["选择训练数据集", "选择小模型算法模板", "配置 GPU/NPU 资源", "确认提交训练任务"][trainingStep]}</Title>
          <Paragraph>当前为原型步骤，点击下一步可模拟训练任务配置流程。</Paragraph>
          <Progress percent={[25, 50, 75, 100][trainingStep]} />
        </Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Button disabled={trainingStep === 0} onClick={() => setTrainingStep((step) => step - 1)}>上一步</Button>
          {trainingStep < 3 ? <Button type="primary" onClick={() => setTrainingStep((step) => step + 1)}>下一步</Button> : <Button type="primary" onClick={() => { notify("训练任务已提交，等待调度"); closeModal(); }}>提交训练</Button>}
        </Space>
      </Modal>

      <Modal title="部署模型到推理服务" open={modalKind === "deploy"} onCancel={closeModal} onOk={() => { notify("模型部署申请已提交"); closeModal(); }} okText="确认部署" cancelText="取消">
        <Paragraph>确认发布模型版本 v1.3.0</Paragraph>
      </Modal>

      <Modal title="权限与登录原型" open={modalKind === "permission"} onCancel={closeModal} onOk={() => { notify("已模拟登录：平台管理员"); closeModal(); }} okText="模拟登录" cancelText="取消">
        <Descriptions bordered column={1} size="small" items={[
          { key: "user", label: "用户", children: "平台管理员" },
          { key: "org", label: "组织", children: "YFI 智造中心" },
          { key: "role", label: "角色", children: "系统管理员 / 算法工程师" },
          { key: "sso", label: "SSO", children: "TODO_CONFIRM_SSO_PROVIDER" },
        ]} />
      </Modal>

      <Modal title="发起数据集下载申请" open={modalKind === "dataset-request"} onCancel={closeModal} onOk={() => { notify("下载申请已提交，等待审批"); closeModal(); }} okText="提交申请" cancelText="取消">
        <Descriptions bordered column={1} size="small" items={[
          { key: "dataset", label: "数据集", children: selectedDataset.name },
          { key: "view", label: "查看权限", children: selectedDataset.canView ? "已放行" : "未放行" },
          { key: "download", label: "版本下载权限", children: requestApproved || selectedDataset.canDownloadLatestVersion ? "已放行" : "待审批" },
          { key: "version", label: "申请版本", children: `${selectedDataset.key}-latest` },
        ]} />
      </Modal>

      <Modal title="审批下载申请" open={modalKind === "dataset-approve"} onCancel={closeModal} onOk={() => { setRequestApproved(true); notify(`已批准 ${selectedDataset.name} 最新版本下载权限`); closeModal(); }} okText="批准下载" cancelText="取消">
        <Paragraph>审批通过后，将为最新版本授予下载权限，但数据集级查看权限保持不变。</Paragraph>
        <Descriptions bordered column={1} size="small" items={[
          { key: "dataset", label: "数据集", children: selectedDataset.name },
          { key: "dedup", label: "去重策略", children: selectedDataset.dedupStrategy },
          { key: "job", label: "异步任务状态", children: selectedDataset.processingStatus },
        ]} />
      </Modal>
    </div>
  );
}

function OverviewPage({ openDetail, onUpload, onTraining, onDeploy }: { openDetail: (title: string, description: string) => void; onUpload: () => void; onTraining: () => void; onDeploy: () => void }) {
  return (
    <Space direction="vertical" size={0} className="full-width">
      <section className="product-tile product-tile-dark compact-tile">
        <div className="tile-copy">
          <Title level={2}>一条工业 AI 闭环。</Title>
          <Paragraph className="tile-lead">从数据进入平台，到模型发布、边缘下发和监控审计，所有原型节点均可点击。</Paragraph>
          <Space wrap className="tile-actions">
            <Button type="primary" icon={<CloudUploadOutlined />} onClick={onUpload}>上传数据集</Button>
            <Button icon={<ExperimentOutlined />} onClick={onTraining}>启动训练</Button>
            <Button icon={<RocketOutlined />} onClick={onDeploy}>部署模型</Button>
          </Space>
        </div>
      </section>
      <section className="product-tile product-tile-parchment compact-tile">
        <Title level={2}>MVP 流程</Title>
        <div className="flow-grid">
          {flowNodes.map((node, index) => (
            <button key={node} type="button" className="flow-node" onClick={() => openDetail(node, `第 ${index + 1} 步：${node} 的原型详情和后续接口占位。`)}>
              <Badge count={index + 1} color="#0066cc" />
              <span>{node}</span>
            </button>
          ))}
        </div>
      </section>
    </Space>
  );
}

function IdentityPage({ openDetail, onOpenPermission }: { openDetail: (title: string, description: string) => void; onOpenPermission: () => void }) {
  return (
    <section className="utility-grid-section">
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={10}>
          <Card title="当前用户上下文" extra={<Button onClick={onOpenPermission}>模拟登录</Button>}>
            <Descriptions column={1} size="small" items={[
              { key: "displayName", label: "用户", children: frontendUser.displayName },
              { key: "username", label: "账号", children: frontendUser.username },
              { key: "organization", label: "组织", children: frontendUser.organization },
              { key: "authMethod", label: "认证方式", children: frontendUser.authMethod },
              { key: "iamProvider", label: "IAM Provider", children: frontendUser.iamProvider },
            ]} />
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title="权限门禁矩阵">
            <List
              dataSource={moduleItems.filter((item) => item.key !== "overview")}
              renderItem={(item) => {
                const permission = moduleRequiredPermissions[item.key];
                const granted = frontendUser.permissions.includes(permission);
                return (
                  <List.Item actions={[<Button key="detail" onClick={() => openDetail(`${item.label} 权限`, `${permission}：${granted ? "已放行" : "默认拒绝"}。未知权限必须默认拒绝并进入审计。`)}>详情</Button>]}>
                    <List.Item.Meta title={item.label} description={permission} />
                    <Tag color={granted ? "green" : "red"}>{granted ? "已放行" : "默认拒绝"}</Tag>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>
      </Row>
    </section>
  );
}

function DatasetPage({ columns, datasets, selectedDataset, datasetQuery, setDatasetQuery, datasetStatusFilter, setDatasetStatusFilter, requestApproved, openDetail, onUpload, onRequest, onApprove }: { columns: ColumnsType<Dataset>; datasets: Dataset[]; selectedDataset: Dataset; datasetQuery: string; setDatasetQuery: (value: string) => void; datasetStatusFilter: string; setDatasetStatusFilter: (value: string) => void; requestApproved: boolean; openDetail: (title: string, description: string) => void; onUpload: () => void; onRequest: () => void; onApprove: () => void }) {
  return (
    <section className="utility-grid-section">
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={16}>
          <Card title="数据集列表" extra={<Button aria-label="上传数据集" type="primary" onClick={onUpload}>上传数据集</Button>}>
            <Space wrap style={{ marginBottom: 16 }}>
              <Input aria-label="数据集搜索" placeholder="搜索数据集或负责人" value={datasetQuery} onChange={(event) => setDatasetQuery(event.target.value)} style={{ width: 240 }} />
              <Select aria-label="数据集状态筛选" value={datasetStatusFilter} onChange={setDatasetStatusFilter} style={{ width: 220 }} options={[{ value: "ALL", label: "全部状态" }, { value: "ACTIVE", label: "ACTIVE" }, { value: "PROCESSING", label: "PROCESSING" }, { value: "PENDING_APPROVAL", label: "PENDING_APPROVAL" }]} />
              <Button onClick={() => { setDatasetQuery(""); setDatasetStatusFilter("ALL"); }}>重置筛选</Button>
            </Space>
            <Table columns={columns} dataSource={datasets} pagination={false} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="当前选择">
            <Statistic title="样本数" value={selectedDataset.samples} />
            <Progress percent={selectedDataset.quality} />
            <Paragraph>{selectedDataset.name}</Paragraph>
            <Descriptions column={1} size="small" items={[
              { key: "preview", label: "预览类型", children: selectedDataset.previewType },
              { key: "view", label: "数据集查看", children: selectedDataset.canView ? "已放行" : "未放行" },
              { key: "download", label: "版本下载", children: requestApproved || selectedDataset.canDownloadLatestVersion ? "已放行" : "待审批" },
              { key: "dedup", label: "去重策略", children: selectedDataset.dedupStrategy },
              { key: "processing", label: "异步任务", children: selectedDataset.processingStatus },
            ]} />
            <Space direction="vertical" className="full-width">
              <Button block onClick={() => openDetail(selectedDataset.name, selectedDataset.samplePreviewType.startsWith("image/") ? `图片样例 ${selectedDataset.samplePreviewName} 可直接预览。` : `文件 ${selectedDataset.samplePreviewName} 已上传，但当前仅保证图片预览。`)}>查看样例预览</Button>
              <Button block onClick={onRequest}>发起下载申请</Button>
              <Button block type="primary" onClick={onApprove}>审批下载申请</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </section>
  );
}

function TrainingPage({ onOpen, openDetail }: { onOpen: () => void; openDetail: (title: string, description: string) => void }) {
  return (
    <section className="utility-grid-section">
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={14}>
          <Card title="训练任务看板" extra={<Button aria-label="启动训练" type="primary" onClick={onOpen}>启动训练</Button>}>
            <List dataSource={["轴承缺陷检测 v1", "焊点外观识别 v2", "声音异常检测 PoC"]} renderItem={(item) => <List.Item actions={[<Button key="detail" onClick={() => openDetail(item, "查看训练日志、指标曲线和资源占用。")}>查看</Button>]}><List.Item.Meta title={item} description="GPU 队列占位" /></List.Item>} />
          </Card>
        </Col>
      </Row>
    </section>
  );
}

function InferencePage({ openDetail, onDeploy }: { openDetail: (title: string, description: string) => void; onDeploy: () => void }) {
  const maxQps = Math.max(...inferenceMetrics.map((item) => item.qps));
  return (
    <Space direction="vertical" size={0} className="full-width">
      <section className="utility-grid-section">
        <Card title="模型服务" extra={<Button aria-label="部署模型" type="primary" onClick={onDeploy}>部署模型</Button>} />
      </section>
      <section className="product-tile product-tile-dark compact-tile">
        <div className="tile-copy wide-copy">
          <Title level={2}>推理服务调用趋势</Title>
          <Paragraph className="tile-lead">白天生产班次的 QPS、P95 延迟和成功率一屏可见。点击柱子查看时段详情。</Paragraph>
        </div>
        <div className="inference-chart" role="img" aria-label="推理服务调用趋势图表">
          {inferenceMetrics.map((item) => (
            <button key={item.label} type="button" className="chart-bar" style={{ height: `${Math.round((item.qps / maxQps) * 170)}px` }} onClick={() => openDetail(`${item.label} 推理指标`, `QPS ${item.qps}，P95 延迟 ${item.latency}ms，成功率 ${item.success}%。`)}>
              <span className="chart-value">{item.qps}</span>
              <span className="chart-label">{item.label}</span>
            </button>
          ))}
        </div>
      </section>
    </Space>
  );
}

function MonitoringPage({ openDetail }: { openDetail: (title: string, description: string) => void }) {
  return (
    <section className="utility-grid-section">
      <Row gutter={[20, 20]}>
        {["训练失败告警", "推理延迟升高", "边缘节点离线", "权限变更审计"].map((item) => (
          <Col xs={24} md={12} key={item}><Card hoverable onClick={() => openDetail(item, "查看指标、日志、Trace ID 和审计上下文。")}><Statistic title={item} value={1} /></Card></Col>
        ))}
      </Row>
    </section>
  );
}

function GenericModulePage({ moduleKey, openDetail }: { moduleKey: ModuleKey; openDetail: (title: string, description: string) => void }) {
  const module = moduleItems.find((item) => item.key === moduleKey)!;
  return (
    <section className="utility-grid-section">
      <Card title={`${module.label}工作台`}>
        <Button onClick={() => openDetail(module.label, module.summary)}>查看原型说明</Button>
      </Card>
    </section>
  );
}
