import { Alert, Button, Card, Col, Descriptions, Progress, Row, Space, Statistic, Steps, Tag, Timeline, Typography } from "antd";
import type { PreparationJob } from "../api/datasetApi";

const { Paragraph, Title, Text } = Typography;

type Props = { source: "backend" | "fallback"; preparationJobs: PreparationJob[]; openDetail: (title: string, description: string) => void; onRerunPreparationJob: (jobId: string) => void; };

const sourceTypes = [
  { title: "公开数据集", description: "登记来源、许可证、版本与样本清单，作为收集阶段输入。" },
  { title: "企业内部系统", description: "仅保留系统占位、字段映射和凭据 TODO_CONFIRM，不猜测真实连接器。" },
  { title: "受控网络采集", description: "记录白名单、采集合规说明与审计责任人，不开放通用爬取。" },
];

const gateRules = [
  { label: "失败阻断", value: "任一阶段质量门禁不达标即停止后续阶段" },
  { label: "人工修正", value: "记录操作者、原因、覆盖阈值与重跑次数" },
  { label: "训练边界", value: "仅输出训练数据集快照与 DataLoader 元数据" },
  { label: "权限复用", value: "读取复用 dataset:read，重跑复用 dataset:manage" },
];

function statusColor(status: string) { if (status === "SUCCEEDED") return "green"; if (status === "FAILED") return "red"; if (status === "RUNNING") return "blue"; return "default"; }
function buildStepStatus(stage: { status: string }) { if (stage.status === "SUCCEEDED") return "finish" as const; if (stage.status === "FAILED") return "error" as const; if (stage.status === "RUNNING") return "process" as const; return "wait" as const; }

function PreparationJobPanel({ job, openDetail, onRerunPreparationJob }: { job: PreparationJob; openDetail: Props["openDetail"]; onRerunPreparationJob: Props["onRerunPreparationJob"] }) {
  return <Card className="dataset-main-card" title={<Space wrap><span>{job.datasetName}</span><Tag color="blue">TASK-dataset-preparation-pipeline</Tag></Space>}><Space direction="vertical" size="large" className="full-width">
    <Alert type={job.blocked ? "error" : "success"} showIcon message={job.blocked ? `阻断原因：${job.blockedReason}` : "流水线可继续推进"} description="平台内置覆盖数据收集、清洗、标注、划分、预处理、增强、格式转换与加载 7 个训练前步骤；失败即阻断，人工修正后重跑。" />
    <Progress percent={job.progressPercent} status={job.blocked ? "exception" : "active"} />
    <Steps responsive current={Math.max(0, job.stages.findIndex((stage) => stage.stageKey === job.currentStage))} items={job.stages.map((stage) => ({ title: stage.stageName, status: buildStepStatus(stage), description: `${stage.status} ? 质量分 ${stage.qualityScore}` }))} />
    <Row gutter={[16, 16]}><Col xs={24} lg={14}><Card size="small" title="阶段质量门禁"><Timeline items={job.stages.map((stage) => ({ color: statusColor(stage.status), children: <Space direction="vertical" size={2}><Text strong>{stage.stageName} ? {stage.status}</Text><Text type="secondary">{stage.message}</Text></Space> }))} /></Card></Col>
    <Col xs={24} lg={10}><Card size="small" title="训练数据集产物"><Descriptions column={1} size="small" items={[{ key: "snapshot", label: "快照", children: job.outputSnapshot.snapshotKey }, { key: "loader", label: "加载器", children: job.outputSnapshot.loaderType }, { key: "split", label: "训练/验证/测试", children: `${job.outputSnapshot.trainSplitCount}/${job.outputSnapshot.validationSplitCount}/${job.outputSnapshot.testSplitCount}` }, { key: "rerun", label: "重跑次数", children: job.rerunCount }]} />
    <Space wrap className="dataset-side-actions"><Button type="primary" danger={job.blocked} onClick={() => onRerunPreparationJob(job.jobId)}>人工修正后重跑</Button><Button onClick={() => openDetail("训练加载配置", `产物 ${job.outputSnapshot.snapshotKey} 使用 ${job.outputSnapshot.loaderType}?训练/验证/测试样本数为 ${job.outputSnapshot.trainSplitCount}/${job.outputSnapshot.validationSplitCount}/${job.outputSnapshot.testSplitCount}?`)}>查看边界</Button></Space></Card></Col></Row>
  </Space></Card>;
}

export default function DatasetPage({ source, preparationJobs, openDetail, onRerunPreparationJob }: Props) {
  const blockedCount = preparationJobs.filter((job) => job.blocked).length;
  const totalStages = preparationJobs.reduce((sum, job) => sum + job.stages.length, 0);
  const passedStages = preparationJobs.flatMap((job) => job.stages).filter((stage) => stage.gatePassed).length;
  const firstJob = preparationJobs[0];
  return <section className="utility-grid-section dataset-page-shell"><section className="dataset-hero-card"><div className="dataset-hero-copy"><Space wrap><Tag color={source === "backend" ? "green" : "gold"}>{source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag><Tag color="blue">独立工作台</Tag></Space><div className="section-kicker">F008 / 训练前数据工程</div><Title level={2}>数据准备流水线工作台</Title><Paragraph className="tight-paragraph">这是重做后的独立数据准备页面，不再沿用原数据资产列表页；页面聚焦多来源接入、阶段门禁、失败阻断、人工修正重跑与训练数据集快照交付。</Paragraph></div><div className="dataset-hero-actions">{firstJob && <Button type="primary" danger={firstJob.blocked} onClick={() => onRerunPreparationJob(firstJob.jobId)}>处理当前阻断</Button>}<Button onClick={() => openDetail("F008 页面边界", "数据准备页面只产出可训练数据集快照和加载配置，不发起训练任务，也不承载原数据资产目录操作。")}>查看边界</Button></div></section>
  <div className="stats-grid compact dataset-kpi-grid"><Card className="dataset-kpi-card"><Statistic title="准备任务" value={preparationJobs.length} /></Card><Card className="dataset-kpi-card"><Statistic title="阻断任务" value={blockedCount} /></Card><Card className="dataset-kpi-card"><Statistic title="已过门禁阶段" value={passedStages} suffix={`/ ${totalStages}`} /></Card><Card className="dataset-kpi-card"><Statistic title="输出边界" value="Snapshot" /></Card></div>
  <Row gutter={[20, 20]}><Col xs={24} xl={9}><Card title="多来源接入编排" className="dataset-side-card"><Space direction="vertical" size="middle" className="full-width">{sourceTypes.map((item) => <div key={item.title} className="monitoring-alert-card"><div className="monitoring-alert-header"><strong>{item.title}</strong><Tag>来源登记</Tag></div><span>{item.description}</span></div>)}</Space></Card></Col><Col xs={24} xl={15}><Card title="质量门禁与交付规则" className="dataset-main-card"><Descriptions column={1} bordered size="small" items={gateRules.map((rule) => ({ key: rule.label, label: rule.label, children: rule.value }))} /></Card></Col></Row>
  <Space direction="vertical" size="large" className="full-width">{preparationJobs.map((job) => <PreparationJobPanel key={job.jobId} job={job} openDetail={openDetail} onRerunPreparationJob={onRerunPreparationJob} />)}</Space></section>;
}
