import {
  ApiOutlined,
  AuditOutlined,
  BellOutlined,
  CloudUploadOutlined,
  ClusterOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  EyeOutlined,
  FileSearchOutlined,
  HddOutlined,
  LoginOutlined,
  MonitorOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
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
  Flex,
  Form,
  Input,
  List,
  Modal,
  Progress,
  Result,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  Timeline,
  Typography,
  theme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

const { Title, Text, Paragraph } = Typography;

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

type Detail = {
  title: string;
  description: string;
  items: Array<{ label: string; value: string }>;
};

type ModalKind = "upload" | "training" | "deploy" | "permission" | "labeling" | "edge" | null;

type Dataset = {
  key: string;
  name: string;
  owner: string;
  status: string;
  samples: number;
  quality: number;
};

const moduleItems: Array<{ key: ModuleKey; label: string; icon: ReactNode; summary: string; tone: "light" | "dark" | "parchment" }> = [
  { key: "overview", label: "平台总览", icon: <DashboardOutlined />, summary: "端到端工业 AI 小模型闭环", tone: "light" },
  { key: "identity", label: "组织权限", icon: <SafetyCertificateOutlined />, summary: "组织、角色、SSO 和审计入口", tone: "parchment" },
  { key: "dataset", label: "数据资产", icon: <DatabaseOutlined />, summary: "数据集、版本、质量和标注入口", tone: "dark" },
  { key: "labeling", label: "标注任务", icon: <FileSearchOutlined />, summary: "标注队列、复核、质检与交付", tone: "light" },
  { key: "training", label: "训练中心", icon: <ExperimentOutlined />, summary: "训练任务、资源调度和实验指标", tone: "parchment" },
  { key: "model", label: "模型仓库", icon: <DeploymentUnitOutlined />, summary: "版本、评测、审批和回滚", tone: "dark" },
  { key: "inference", label: "推理服务", icon: <RocketOutlined />, summary: "KServe 发布、灰度和回滚", tone: "light" },
  { key: "edge", label: "边缘下发", icon: <ClusterOutlined />, summary: "边缘节点、模型包、部署状态", tone: "parchment" },
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
  { key: "motor-thermal", name: "电机温升异常图像集", owner: "算法组", status: "质检通过", samples: 12840, quality: 96 },
  { key: "bearing-audio", name: "轴承异响音频集", owner: "设备组", status: "训练中", samples: 6200, quality: 91 },
  { key: "welding-vision", name: "焊点外观缺陷集", owner: "质检组", status: "待复核", samples: 8920, quality: 88 },
];

const frontendUser = {
  username: "local.admin",
  displayName: "本地平台管理员",
  organization: "YFI 智造中心（本地占位）",
  authMethod: "LOCAL_DEV_PRINCIPAL",
  iamProvider: "TODO_CONFIRM_IAM_PROVIDER",
  roles: ["平台管理员", "算法工程师"],
  permissions: [
    "identity:user:read",
    "identity:role:manage",
    "dataset:manage",
    "labeling:manage",
    "training:execute",
    "model:manage",
    "inference:deploy",
    "edge:deploy",
    "audit:read",
  ],
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

function detailFor(title: string, description: string): Detail {
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
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(datasets[0]);
  const [deploymentApproved, setDeploymentApproved] = useState(false);
  const { message } = AntdApp.useApp();

  const activeInfo = useMemo(
    () => moduleItems.find((item) => item.key === activeModule) ?? moduleItems[0],
    [activeModule],
  );

  const openDetail = (title: string, description: string) => {
    setDetail(detailFor(title, description));
  };

  const openModal = (kind: ModalKind) => {
    setModalKind(kind);
    if (kind === "training") {
      setTrainingStep(0);
    }
  };

  const closeModal = () => setModalKind(null);

  const notify = (content: string) => {
    void message.success(content);
  };

  const datasetColumns: ColumnsType<Dataset> = [
    {
      title: "数据集",
      dataIndex: "name",
      render: (value: string, record) => (
        <Button type="link" onClick={() => setSelectedDataset(record)}>
          {value}
        </Button>
      ),
    },
    { title: "负责人", dataIndex: "owner" },
    {
      title: "状态",
      dataIndex: "status",
      render: (value: string) => <Tag color={value === "质检通过" ? "green" : value === "训练中" ? "blue" : "gold"}>{value}</Tag>,
    },
    { title: "样本数", dataIndex: "samples" },
    {
      title: "质量分",
      dataIndex: "quality",
      render: (value: number) => <Progress className="task-progress" percent={value} size="small" />,
    },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openDetail(record.name, "查看数据版本、质量报告和标注进度。")}>详情</Button>
          <Button size="small" type="primary" onClick={() => openModal("labeling")}>发起标注</Button>
        </Space>
      ),
    },
  ];

  const runPrimaryAction = () => {
    openModal(activeModule === "dataset" ? "upload" : activeModule === "inference" ? "deploy" : activeModule === "edge" ? "edge" : "training");
  };

  return (
    <div className="apple-page">
      <nav className="global-nav" aria-label="全局导航">
        <button className="apple-mark" type="button" onClick={() => setActiveModule("overview")}>YFI</button>
        <div className="global-nav-links">
          {moduleItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === activeModule ? "apple-nav-link is-active" : "apple-nav-link"}
              onClick={() => {
                setActiveModule(item.key);
                notify(`已切换到：${item.label}`);
              }}
            >
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
          <Button aria-label="启动训练" type="primary" icon={<PlayCircleOutlined />} onClick={() => openModal("training")}>启动训练</Button>
        </Space>
      </div>

      <main>
        <section className={`product-tile product-tile-${activeInfo.tone}`}>
          <div className="tile-copy">
            <Tag color={activeInfo.tone === "dark" ? "blue" : "default"}>F003-interactive-prototype</Tag>
            <Title level={1}>YFI 工业 AI 小模型平台原型</Title>
            <Paragraph className="tile-lead">{activeInfo.label} · {activeInfo.summary}</Paragraph>
            <Space wrap className="tile-actions">
              <Button type="primary" onClick={runPrimaryAction}>执行主操作</Button>
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

        <section className="module-strip" aria-label="模块快捷入口">
          {moduleItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === activeModule ? "module-chip is-selected" : "module-chip"}
              onClick={() => setActiveModule(item.key)}
            >
              <span>{item.icon}</span>
              {item.label}
              <small>{frontendUser.permissions.includes(moduleRequiredPermissions[item.key]) ? "已放行" : "默认拒绝"}</small>
            </button>
          ))}
        </section>

        {activeModule === "overview" ? (
          <OverviewPage openDetail={openDetail} openModal={openModal} />
        ) : activeModule === "identity" ? (
          <IdentityPage openModal={openModal} openDetail={openDetail} />
        ) : activeModule === "dataset" ? (
          <DatasetPage columns={datasetColumns} selectedDataset={selectedDataset} openModal={openModal} openDetail={openDetail} />
        ) : activeModule === "training" ? (
          <TrainingPage openModal={openModal} openDetail={openDetail} />
        ) : activeModule === "inference" ? (
          <InferencePage deploymentApproved={deploymentApproved} openModal={openModal} openDetail={openDetail} />
        ) : activeModule === "monitoring" ? (
          <MonitoringPage openDetail={openDetail} />
        ) : (
          <GenericModulePage moduleKey={activeModule} openDetail={openDetail} openModal={openModal} />
        )}
      </main>

      <footer className="apple-footer">
        <Text>所有业务数据均为原型占位。真实接口、权限、模型训练和部署将在后续 feature 中接入。</Text>
      </footer>

      <Drawer
        title={detail?.title}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        width={460}
        extra={<Button onClick={() => notify("已记录到原型评审清单")}>加入评审清单</Button>}
      >
        <Paragraph>{detail?.description}</Paragraph>
        <Descriptions
          bordered
          column={1}
          size="small"
          items={detail?.items.map((item) => ({
            key: item.label,
            label: item.label,
            children: item.value,
          }))}
        />
      </Drawer>

      <Modal title="上传数据集" open={modalKind === "upload"} onCancel={closeModal} onOk={() => { notify("数据集上传任务已创建"); closeModal(); }} okText="创建上传任务" cancelText="取消">
        <Form layout="vertical">
          <Form.Item label="数据集名称" required><Input placeholder="例如：电机温升异常图像集" /></Form.Item>
          <Form.Item label="数据类型" required><Select defaultValue="image" options={[{ value: "image", label: "图片" }, { value: "audio", label: "音频" }, { value: "text", label: "文本" }]} /></Form.Item>
          <Form.Item label="说明"><Input.TextArea placeholder="填写采集来源、质检规则和保密等级" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="启动训练任务" open={modalKind === "training"} onCancel={closeModal} footer={null} width={720}>
        <Steps current={trainingStep} items={[{ title: "选择数据" }, { title: "选择算法" }, { title: "配置资源" }, { title: "提交训练" }]} />
        <Card className="step-card">
          <Title level={4}>{["选择训练数据集", "选择小模型算法模板", "配置 GPU/NPU 资源", "确认提交训练任务"][trainingStep]}</Title>
          <Paragraph>当前为原型步骤，点击下一步可模拟训练任务配置流程。</Paragraph>
          <Progress percent={[25, 50, 75, 100][trainingStep]} />
        </Card>
        <Flex justify="space-between">
          <Button disabled={trainingStep === 0} onClick={() => setTrainingStep((step) => step - 1)}>上一步</Button>
          {trainingStep < 3 ? (
            <Button type="primary" onClick={() => setTrainingStep((step) => step + 1)}>下一步</Button>
          ) : (
            <Button type="primary" onClick={() => { notify("训练任务已提交，等待调度"); closeModal(); }}>提交训练</Button>
          )}
        </Flex>
      </Modal>

      <Modal title="部署模型到推理服务" open={modalKind === "deploy"} onCancel={closeModal} onOk={() => { setDeploymentApproved(true); notify("模型部署申请已提交"); closeModal(); }} okText="确认部署" cancelText="取消">
        <Result status="info" title="确认发布模型版本 v1.3.0" subTitle="该操作会创建 KServe 推理服务草案，真实集群地址仍需 TODO_CONFIRM。" />
      </Modal>

      <Modal title="权限与登录原型" open={modalKind === "permission"} onCancel={closeModal} onOk={() => { notify("已模拟登录：平台管理员"); closeModal(); }} okText="模拟登录" cancelText="取消">
        <Descriptions bordered column={1} size="small" items={[
          { key: "user", label: "用户", children: "平台管理员" },
          { key: "org", label: "组织", children: "YFI 智造中心" },
          { key: "role", label: "角色", children: "系统管理员 / 算法工程师" },
          { key: "sso", label: "SSO", children: "TODO_CONFIRM_SSO_PROVIDER" },
        ]} />
      </Modal>

      <Modal title="发起标注任务" open={modalKind === "labeling"} onCancel={closeModal} onOk={() => { notify("标注任务已发送到 Label Studio 占位队列"); closeModal(); }} okText="创建标注任务" cancelText="取消">
        <Paragraph>选择标注模板、复核比例和负责人。真实 Label Studio 地址将在后续环境确认后接入。</Paragraph>
      </Modal>

      <Modal title="边缘下发确认" open={modalKind === "edge"} onCancel={closeModal} onOk={() => { notify("边缘下发任务已进入等待队列"); closeModal(); }} okText="确认下发" cancelText="取消">
        <Paragraph>将模型包下发到边缘节点，支持断点续传和状态回传。当前为原型模拟。</Paragraph>
      </Modal>
    </div>
  );
}

function OverviewPage({ openDetail, openModal }: { openDetail: (title: string, description: string) => void; openModal: (kind: ModalKind) => void }) {
  return (
    <Space direction="vertical" size={0} className="full-width">
      <section className="product-tile product-tile-dark compact-tile">
        <div className="tile-copy">
          <Title level={2}>一条工业 AI 闭环。</Title>
          <Paragraph className="tile-lead">从数据进入平台，到模型发布、边缘下发和监控审计，所有原型节点均可点击。</Paragraph>
          <Space wrap className="tile-actions">
            <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => openModal("upload")}>上传数据集</Button>
            <Button icon={<ExperimentOutlined />} onClick={() => openModal("training")}>启动训练</Button>
            <Button icon={<RocketOutlined />} onClick={() => openModal("deploy")}>部署模型</Button>
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

      <section className="utility-grid-section">
        <Row gutter={[20, 20]}>
          {moduleItems.slice(1).map((item) => (
            <Col xs={24} md={12} xl={6} key={item.key}>
              <Card hoverable className="utility-card" onClick={() => openDetail(item.label, item.summary)}>
                <div className="utility-card-icon">{item.icon}</div>
                <Title level={4}>{item.label}</Title>
                <Paragraph>{item.summary}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>
    </Space>
  );
}

function IdentityPage({ openModal, openDetail }: { openModal: (kind: ModalKind) => void; openDetail: (title: string, description: string) => void }) {
  return (
    <section className="utility-grid-section">
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={10}>
          <Card title="当前用户上下文" extra={<Button icon={<LoginOutlined />} onClick={() => openModal("permission")}>模拟登录</Button>}>
            <Descriptions
              column={1}
              size="small"
              items={[
                { key: "displayName", label: "用户", children: frontendUser.displayName },
                { key: "username", label: "账号", children: frontendUser.username },
                { key: "organization", label: "组织", children: frontendUser.organization },
                { key: "authMethod", label: "认证方式", children: frontendUser.authMethod },
                { key: "iamProvider", label: "IAM Provider", children: frontendUser.iamProvider },
              ]}
            />
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

function DatasetPage({ columns, selectedDataset, openModal, openDetail }: { columns: ColumnsType<Dataset>; selectedDataset: Dataset | null; openModal: (kind: ModalKind) => void; openDetail: (title: string, description: string) => void }) {
  return (
    <section className="utility-grid-section">
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={16}>
          <Card title="数据集列表" extra={<Button aria-label="上传数据集" type="primary" onClick={() => openModal("upload")}>上传数据集</Button>}>
            <Table columns={columns} dataSource={datasets} pagination={false} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="当前选择">
            <Statistic title="样本数" value={selectedDataset?.samples ?? 0} />
            <Progress percent={selectedDataset?.quality ?? 0} />
            <Paragraph>{selectedDataset?.name}</Paragraph>
            <Button block onClick={() => openDetail(selectedDataset?.name ?? "数据集", "查看数据血缘、质量规则和标签分布。")}>查看数据洞察</Button>
          </Card>
        </Col>
      </Row>
    </section>
  );
}

function TrainingPage({ openModal, openDetail }: { openModal: (kind: ModalKind) => void; openDetail: (title: string, description: string) => void }) {
  return (
    <section className="utility-grid-section">
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={14}>
          <Card title="训练任务看板" extra={<Button aria-label="启动训练" type="primary" onClick={() => openModal("training")}>启动训练</Button>}>
            <List
              dataSource={["轴承缺陷检测 v1", "焊点外观识别 v2", "声音异常检测 PoC"]}
              renderItem={(item, index) => (
                <List.Item actions={[<Button key="detail" onClick={() => openDetail(item, "查看训练日志、指标曲线和资源占用。")}>查看</Button>]}> 
                  <List.Item.Meta title={item} description={`GPU 队列 #${index + 1}`} />
                  <Progress className="task-progress" percent={[72, 45, 18][index]} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="训练流水线">
            <Timeline items={[{ children: "数据质检完成" }, { children: "算法模板已选择" }, { children: "等待 GPU 调度" }, { children: "评测报告生成" }]} />
          </Card>
        </Col>
      </Row>
    </section>
  );
}

function InferencePage({ deploymentApproved, openModal, openDetail }: { deploymentApproved: boolean; openModal: (kind: ModalKind) => void; openDetail: (title: string, description: string) => void }) {
  const maxQps = Math.max(...inferenceMetrics.map((item) => item.qps));

  return (
    <Space direction="vertical" size={0} className="full-width">
      <section className="utility-grid-section">
        <Row gutter={[20, 20]}>
          <Col xs={24} xl={12}>
            <Card title="模型服务" extra={<Button aria-label="部署模型" type="primary" onClick={() => openModal("deploy")}>部署模型</Button>}>
              <List
                dataSource={["bearing-detector", "weld-inspector", "audio-anomaly"]}
                renderItem={(item) => (
                  <List.Item actions={[<Button key="view" onClick={() => openDetail(item, "查看服务版本、流量、探活和回滚入口。")}>查看</Button>]}> 
                    <List.Item.Meta title={item} description={deploymentApproved ? "部署申请已提交" : "运行中 / KServe 占位"} />
                    <Tag color={deploymentApproved ? "processing" : "green"}>{deploymentApproved ? "审批中" : "健康"}</Tag>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="灰度策略">
              <Steps direction="vertical" current={1} items={[{ title: "模型注册" }, { title: "灰度 10%" }, { title: "全量发布" }, { title: "边缘同步" }]} />
            </Card>
          </Col>
        </Row>
      </section>

      <section className="product-tile product-tile-dark compact-tile">
        <div className="tile-copy wide-copy">
          <Title level={2}>推理服务调用趋势</Title>
          <Paragraph className="tile-lead">白天生产班次的 QPS、P95 延迟和成功率一屏可见。点击柱子查看时段详情。</Paragraph>
        </div>
        <div className="inference-chart" role="img" aria-label="推理服务调用趋势图表">
          {inferenceMetrics.map((item) => (
            <button
              type="button"
              key={item.label}
              className="chart-bar"
              style={{ height: `${Math.round((item.qps / maxQps) * 170)}px` }}
              onClick={() => openDetail(`${item.label} 推理指标`, `QPS ${item.qps}，P95 延迟 ${item.latency}ms，成功率 ${item.success}%。`)}
            >
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
        {["训练失败告警", "推理延迟升高", "边缘节点离线", "权限变更审计"].map((item, index) => (
          <Col xs={24} md={12} key={item}>
            <Card hoverable className="utility-card" onClick={() => openDetail(item, "查看指标、日志、Trace ID 和审计上下文。")}>
              <Statistic title={item} value={[2, 128, 1, 6][index]} suffix={index === 1 ? "ms" : "条"} />
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
}

function GenericModulePage({ moduleKey, openDetail, openModal }: { moduleKey: ModuleKey; openDetail: (title: string, description: string) => void; openModal: (kind: ModalKind) => void }) {
  const module = moduleItems.find((item) => item.key === moduleKey)!;
  const actions: Array<{ label: string; kind: ModalKind }> = [
    { label: "配置权限", kind: "permission" },
    { label: "创建任务", kind: moduleKey === "edge" ? "edge" : moduleKey === "labeling" ? "labeling" : "training" },
  ];

  return (
    <section className="utility-grid-section">
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={14}>
          <Card title={`${module.label}工作台`}>
            <List
              dataSource={["待处理", "进行中", "已完成"]}
              renderItem={(item, index) => (
                <List.Item actions={[<Button key="detail" onClick={() => openDetail(`${module.label} - ${item}`, "查看当前状态、负责人、时间线和下一步操作。")}>详情</Button>]}> 
                  <List.Item.Meta title={`${module.label}${item}事项`} description={`原型记录 ${index + 1}`} />
                  <Tag color={index === 0 ? "gold" : index === 1 ? "blue" : "green"}>{item}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="模块操作">
            <Space direction="vertical" className="full-width">
              {actions.map((action) => (
                <Button key={action.label} block onClick={() => openModal(action.kind)}>{action.label}</Button>
              ))}
              <Button block icon={<EyeOutlined />} onClick={() => openDetail(module.label, module.summary)}>查看原型说明</Button>
              <Button block icon={<SettingOutlined />} onClick={() => openDetail("待确认配置", "真实环境值仍保持 TODO_CONFIRM_*，避免误填。")}>环境配置</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </section>
  );
}
