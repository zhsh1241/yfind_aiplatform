import { CloudUploadOutlined, ExperimentOutlined, RocketOutlined } from "@ant-design/icons";
import { Badge, Button, Card, Col, Progress, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { loadOverview, type OverviewNodeView } from "../api/overviewApi";
import { loadPlatformStatus, type PlatformStatus } from "../api/platformStatusApi";
import { flowNodes } from "../prototype-data";

const { Title, Paragraph } = Typography;

type Props = {
  openDetail: (title: string, description: string) => void;
  onUpload: () => void;
  onTraining: () => void;
  onDeploy: () => void;
};

type DashboardRow = {
  key: string;
  domain: string;
  status: string;
  apiPath: string;
  featureTrace: string;
  progress: number;
  owner: string;
};

function normalizeStatus(status: string) {
  if (["CONNECTED", "RUNNING", "UP", "ONLINE"].includes(status)) return { color: "green", label: "正常" };
  if (["WARN", "SYNCING", "REVIEWING"].includes(status)) return { color: "gold", label: "关注" };
  if (["DEMO", "FALLBACK"].includes(status)) return { color: "orange", label: "本地模拟" };
  return { color: "blue", label: status };
}

export default function OverviewPage({ openDetail, onUpload, onTraining, onDeploy }: Props) {
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus>({ status: "DEMO", service: "local-fallback", feature: "TASK-platform-integrated-runtime", source: "fallback" });
  const [overview, setOverview] = useState<{ nodes: OverviewNodeView[]; source: "backend" | "fallback"; featureTrace: string }>({
    nodes: flowNodes.map((label, index) => ({ key: `fallback-${index}`, label, status: "DEMO", apiPath: "local://overview", featureTrace: "TASK-platform-integrated-runtime" })),
    source: "fallback",
    featureTrace: "TASK-platform-integrated-runtime",
  });

  useEffect(() => {
    let mounted = true;
    loadPlatformStatus().then((status) => {
      if (mounted) setPlatformStatus(status);
    });
    loadOverview().then((result) => {
      if (mounted) setOverview(result);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const healthyCount = useMemo(() => overview.nodes.filter((node) => normalizeStatus(node.status).color === "green").length, [overview.nodes]);
  const fallbackCount = useMemo(() => overview.nodes.filter((node) => normalizeStatus(node.status).color === "orange").length, [overview.nodes]);
  const runtimeScore = useMemo(() => Math.max(72, Math.min(98, 72 + healthyCount * 3 - fallbackCount * 2)), [healthyCount, fallbackCount]);

  const dashboardRows = useMemo<DashboardRow[]>(() => overview.nodes.map((node, index) => ({
    key: node.key,
    domain: node.label,
    status: normalizeStatus(node.status).label,
    apiPath: node.apiPath,
    featureTrace: node.featureTrace,
    progress: Math.max(55, Math.min(96, 58 + index * 5 + (normalizeStatus(node.status).color === "green" ? 12 : normalizeStatus(node.status).color === "gold" ? 4 : 0))),
    owner: index < 3 ? "数据与训练组" : index < 6 ? "模型与推理组" : "平台值班组",
  })), [overview.nodes]);

  const columns: ColumnsType<DashboardRow> = [
    {
      title: "业务域",
      dataIndex: "domain",
      render: (value: string, record) => (
        <Button type="link" className="overview-link-button" onClick={() => openDetail(record.domain, `${record.domain} 当前状态 ${record.status}，接口 ${record.apiPath}，追踪 ${record.featureTrace}。`)}>
          {value}
        </Button>
      ),
    },
    { title: "健康度", render: (_, record) => <Progress percent={record.progress} size="small" status={record.progress >= 85 ? "success" : "active"} /> },
    { title: "状态", dataIndex: "status" },
    { title: "责任域", dataIndex: "owner" },
  ];

  return (
    <Space direction="vertical" size={20} className="full-width overview-page">
      <section className="product-tile product-tile-dark compact-tile overview-hero-tile">
        <div className="tile-copy wide-copy overview-hero-copy">
          <div className="overview-hero-meta">
            <span className="overview-kicker">Platform overview</span>
            <Tag color={platformStatus.source === "backend" ? "green" : "orange"}>{platformStatus.source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag>
          </div>
          <div className="overview-section-head">
            <Title level={2}>生产运行总览</Title>
            <Paragraph className="tile-lead">首页只保留运行态、核心指标和模块链路，让排版更稳定，也更接近真实生产控制台。</Paragraph>
          </div>
          <Space wrap className="tile-actions overview-hero-actions">
            <Button size="large" aria-label="上传数据集" type="primary" icon={<CloudUploadOutlined />} onClick={onUpload}>上传数据集</Button>
            <Button size="large" aria-label="启动训练" icon={<ExperimentOutlined />} onClick={onTraining}>启动训练</Button>
            <Button size="large" aria-label="部署模型" icon={<RocketOutlined />} onClick={onDeploy}>部署模型</Button>
          </Space>
        </div>
        <div className="overview-score-card">
          <span>运行评分</span>
          <strong>{runtimeScore}</strong>
          <small>平台状态：{platformStatus.status} / {platformStatus.service}</small>
        </div>
      </section>

      <div className="stats-grid compact overview-kpi-grid">
        <Card className="overview-kpi-card"><Statistic title="在线链路" value={healthyCount} suffix={`/ ${overview.nodes.length}`} /></Card>
        <Card className="overview-kpi-card"><Statistic title="本地模拟" value={fallbackCount} /></Card>
        <Card className="overview-kpi-card"><Statistic title="值班关注" value={healthyCount === overview.nodes.length ? "稳定" : "需跟进"} /></Card>
      </div>

      <Row gutter={[20, 20]} align="stretch">
        <Col xs={24} xl={17}>
          <Card title="模块运行看板" className="overview-main-card">
            <Table rowKey="key" columns={columns} dataSource={dashboardRows} pagination={false} />
          </Card>
        </Col>
        <Col xs={24} xl={7}>
          <Card title="当前值班摘要" className="overview-side-card">
            <Space direction="vertical" size="middle" className="full-width">
              <div className="ops-stat-line"><span>白班值守</span><strong>平台运维 A 组</strong></div>
              <div className="ops-stat-line"><span>同步窗口</span><strong>18:00 - 18:30</strong></div>
              <div className="ops-stat-line"><span>审批 SLA</span><strong>30 分钟</strong></div>
              <div className="ops-stat-line"><span>今日重点</span><strong>训练、推理、边缘联动</strong></div>
            </Space>
          </Card>
        </Col>
      </Row>

      <section className="product-tile product-tile-parchment compact-tile overview-flow-tile">
        <div className="overview-flow-header">
          <span className="overview-kicker overview-kicker-light">Flow map</span>
          <Title level={2}>链路总览</Title>
          <Paragraph className="section-description">点击任一链路节点，可查看当前状态、接口接入路径与追踪标识。</Paragraph>
        </div>
        <div className="flow-grid overview-flow-grid">
          {overview.nodes.map((node, index) => {
            const tone = normalizeStatus(node.status);
            return (
              <button key={node.key} type="button" className="flow-node" onClick={() => openDetail(node.label, `第 ${index + 1} 步：${node.label} 已接入 ${node.apiPath}，状态 ${node.status}，追踪 ${node.featureTrace}。`)}>
                <Badge count={index + 1} color="#0066cc" />
                <span>{node.label}</span>
                <Tag color={tone.color}>{tone.label}</Tag>
              </button>
            );
          })}
        </div>
      </section>
    </Space>
  );
}
