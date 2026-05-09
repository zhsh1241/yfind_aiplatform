import { Alert, Button, Card, Col, Descriptions, Form, Input, Progress, Row, Select, Space, Statistic, Steps, Table, Tag, Timeline, Typography } from "antd";
import { useMemo, useState } from "react";
import type { PreparationJob, PreparationStage } from "../api/datasetApi";

const { Paragraph, Title, Text } = Typography;

type Props = { source: "backend" | "fallback"; preparationJobs: PreparationJob[]; openDetail: (title: string, description: string) => void; onRerunPreparationJob: (jobId: string) => void; };
type StageInfo = { name: string; objective: string; input: string; actions: string; gate: string; output: string; primaryAction: string; secondaryAction: string; functions: { title: string; description: string }[] };

const stageInfos: Record<string, StageInfo> = {
  COLLECTION: { name: "数据收集", objective: "登记多来源原始样本并形成可审计清单", input: "来源链接、样本清单、许可说明", actions: "来源登记、字段映射、样本抽检", gate: "来源合规、样本数不为 0", output: "原始样本清单", primaryAction: "登记数据来源", secondaryAction: "校验许可与字段映射", functions: [{ title: "来源登记", description: "维护对象存储、公开数据集和内部系统的来源清单。" }, { title: "字段映射", description: "把来源字段映射到训练平台标准 schema。" }, { title: "采集抽检", description: "抽查样本可读性、许可说明和采集责任人。" }] },
  CLEANING: { name: "数据清洗", objective: "去除重复、噪声、缺失和格式异常", input: "原始样本清单、清洗规则", actions: "去重、缺失值处理、格式统一", gate: "重复率和缺失率低于阈值", output: "清洗后样本集", primaryAction: "运行清洗规则", secondaryAction: "查看异常样本队列", functions: [{ title: "重复样本检测", description: "按哈希、近似相似度和业务键识别重复数据。" }, { title: "缺失值处理", description: "对空字段、损坏文件和非法编码生成修复建议。" }, { title: "格式标准化", description: "把图像、文本或表格样本统一到平台约定格式。" }] },
  LABELING: { name: "数据标注", objective: "维护标签结构并接入标注结果", input: "清洗样本、标签体系、标注结果", actions: "标签校验、一致性检查、人工修正", gate: "标注一致性达标", output: "已标注样本集", primaryAction: "启动标注一致性复核", secondaryAction: "打开人工修正队列", functions: [{ title: "标签体系校验", description: "检查标签层级、枚举值和任务类型是否匹配。" }, { title: "一致性复核", description: "计算多标注人一致性，定位冲突样本。" }, { title: "人工修正", description: "对阻断样本发起修正并保留操作者与原因。" }] },
  SPLIT: { name: "数据划分", objective: "生成训练、验证和测试集快照", input: "已标注样本、划分比例", actions: "分层抽样、泄漏检查、分布对比", gate: "测试集不参与训练或调参", output: "训练/验证/测试快照", primaryAction: "生成划分快照", secondaryAction: "检查数据泄漏", functions: [{ title: "分层抽样", description: "按标签、设备或时间维度保持样本分布稳定。" }, { title: "泄漏检查", description: "防止同源样本同时进入训练集和测试集。" }, { title: "分布对比", description: "对比 train/validation/test 的标签和来源分布。" }] },
  PREPROCESSING: { name: "数据预处理", objective: "将样本转为训练可消费的基础形态", input: "划分快照、预处理规则", actions: "图像归一化、文本编码、尺寸标准化", gate: "输出张量或序列格式合法", output: "预处理样本快照", primaryAction: "应用预处理模板", secondaryAction: "预览样本转换结果", functions: [{ title: "图像归一化", description: "统一尺寸、通道、均值方差和像素范围。" }, { title: "文本编码", description: "执行分词、截断、padding 和字段拼接。" }, { title: "结构化转换", description: "对表格字段进行缺失填充、归一化和类别编码。" }] },
  AUGMENTATION: { name: "数据增强", objective: "按任务需要扩展训练样本多样性", input: "预处理样本、增强策略", actions: "裁剪、翻转、旋转、文本扩增", gate: "不污染测试集且增强比例可追溯", output: "增强后训练集", primaryAction: "配置增强策略", secondaryAction: "预览增强样本", functions: [{ title: "图像增强", description: "配置裁剪、翻转、旋转、颜色扰动等策略。" }, { title: "文本增强", description: "配置同义改写、模板扩展和回译策略。" }, { title: "增强边界", description: "确保只增强训练集，不污染验证集和测试集。" }] },
  FORMAT_LOADING: { name: "格式转换与加载", objective: "生成训练框架可直接加载的数据产物", input: "处理后快照、加载器类型", actions: "格式转换、DataLoader 元数据生成、样本计数核对", gate: "加载配置完整且样本计数一致", output: "可训练数据集快照", primaryAction: "生成 DataLoader 配置", secondaryAction: "校验样本计数", functions: [{ title: "格式转换", description: "输出 PyTorch、TFRecord、HuggingFace 或 JSONL 等格式。" }, { title: "加载器元数据", description: "生成 batch、schema、字段映射和路径清单。" }, { title: "快照交付", description: "冻结 snapshot id，供训练任务引用。" }] }
};

const sourceTypes = [
  { title: "公开数据集", description: "登记来源、许可证、版本与样本清单，作为收集阶段输入。" },
  { title: "企业内部系统", description: "仅保留系统占位、字段映射和凭据 TODO_CONFIRM，不猜测真实连接器。" },
  { title: "受控网络采集", description: "记录白名单、采集合规说明与审计责任人，不开放通用爬取。" },
];


const datasetRows = [
  { key: "motor-thermal-v3", name: "电机温升异常图像集", cnName: "电机温升异常图像集", type: "Image", status: "处理中", version: "v3", driver: "PAI_DLC_DATA_LOADER", shareStatus: "私有", count: "12,840" },
  { key: "line-audio-v1", name: "产线声纹异常集", cnName: "产线声纹异常集", type: "Audio", status: "待清洗", version: "v1", driver: "WAVEFORM_LOADER", shareStatus: "项目内", count: "8,216" },
  { key: "qc-text-v2", name: "质检文本缺陷集", cnName: "质检文本缺陷集", type: "Text", status: "可训练", version: "v2", driver: "HF_DATASET", shareStatus: "团队共享", count: "45,102" },
];

const gateRules = [
  { label: "失败阻断", value: "任一阶段质量门禁不达标即停止后续阶段" },
  { label: "人工修正", value: "记录操作者、原因、覆盖阈值与重跑次数" },
  { label: "训练边界", value: "仅输出训练数据集快照与 DataLoader 元数据" },
  { label: "权限复用", value: "读取复用 dataset:read，重跑复用 dataset:manage" },
];


const dataModules = [
  { group: "数据源管理", key: "source-access", label: "数据源接入", title: "数据源管理", action: "+ 新建数据源", description: "登记训练数据来源、驱动包、共享状态和元数据版本。" },
  { group: "数据集管理", key: "dataset-management", label: "数据集管理", title: "数据集管理", action: "+ 新建数据集", description: "管理可训练数据集快照、样本规模、版本与共享范围。" },
  { group: "标签管理", key: "label-management", label: "标签管理", title: "标签管理", action: "+ 新建标签体系", description: "维护分类、检测、文本等任务的标签体系和标注一致性规则。" },
  { group: "数据加工", key: "preprocess", label: "预处理数据集", title: "预处理数据集", action: "新建预处理任务", description: "配置清洗、归一化、编码和格式标准化任务。" },
  { group: "数据加工", key: "labeling", label: "标注数据集", title: "标注数据集", action: "新建标注任务", description: "分配标注队列、复核冲突样本并跟踪人工修正。" },
  { group: "数据加工", key: "validation", label: "验证数据集", title: "验证数据集", action: "新建验证任务", description: "执行数据泄漏检查、分布校验和训练可用性验证。" },
];

function statusColor(status: string) { if (status === "SUCCEEDED") return "green"; if (status === "FAILED") return "red"; if (status === "RUNNING") return "blue"; return "default"; }
function buildStepStatus(stage: PreparationStage) { if (stage.status === "SUCCEEDED") return "finish" as const; if (stage.status === "FAILED") return "error" as const; if (stage.status === "RUNNING") return "process" as const; return "wait" as const; }

function StageProcessingPage({ stage, job, info, onBack, onRerunPreparationJob, openDetail }: { stage: PreparationStage; job: PreparationJob; info: StageInfo; onBack: () => void; onRerunPreparationJob: (jobId: string) => void; openDetail: Props["openDetail"] }) {
  return <Card className="dataset-main-card" title={<Space wrap><Button onClick={onBack}>返回流水线总览</Button><Tag color={statusColor(stage.status)}>{stage.status}</Tag><span>{info.name}处理页</span></Space>}>
    <Space direction="vertical" size="large" className="full-width">
      <Alert type={stage.status === "FAILED" ? "error" : "info"} showIcon message={stage.status === "FAILED" ? `阻断原因：${job.blockedReason}` : `${info.name}处理页`} description={stage.message} />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}><Descriptions bordered column={1} size="small" items={[
          { key: "objective", label: "阶段目标", children: info.objective },
          { key: "input", label: "输入材料", children: info.input },
          { key: "actions", label: "功能处理", children: info.actions },
        ]} /></Col>
        <Col xs={24} lg={12}><Descriptions bordered column={1} size="small" items={[
          { key: "gate", label: "质量门禁", children: info.gate },
          { key: "output", label: "阶段产出", children: info.output },
          { key: "quality", label: "质量分", children: `${stage.qualityScore} / 100` },
          { key: "status", label: "当前状态", children: stage.status },
        ]} /></Col>
      </Row>
      <Card size="small" title={`${info.name}本页功能`}><Row gutter={[16, 16]}>{info.functions.map((item) => <Col xs={24} md={8} key={item.title}><Card size="small" title={item.title}><Paragraph className="tight-paragraph">{item.description}</Paragraph></Card></Col>)}</Row></Card><Space wrap><Button type="primary" onClick={() => openDetail(`${info.name}功能处理`, `${info.primaryAction}：${info.actions}`)}>{info.primaryAction}</Button><Button onClick={() => openDetail(`${info.name}辅助处理`, `${info.secondaryAction}：${info.gate}`)}>{info.secondaryAction}</Button>{stage.status === "FAILED" && <Button type="primary" danger onClick={() => onRerunPreparationJob(job.jobId)}>人工修正后重跑</Button>}<Button onClick={onBack}>返回流水线总览</Button></Space>
    </Space>
  </Card>;
}

function PreparationJobPanel({ job, openDetail, onRerunPreparationJob, onOpenStage }: { job: PreparationJob; openDetail: Props["openDetail"]; onRerunPreparationJob: Props["onRerunPreparationJob"]; onOpenStage: (stageKey: string) => void }) {
  return <Card className="dataset-main-card" title={<Space wrap><span>{job.datasetName}</span><Tag color="blue">TASK-dataset-preparation-pipeline</Tag></Space>}><Space direction="vertical" size="large" className="full-width">
    <Alert type={job.blocked ? "error" : "success"} showIcon message={job.blocked ? `阻断原因：${job.blockedReason}` : "流水线可继续推进"} description="平台内置覆盖数据收集、清洗、标注、划分、预处理、增强、格式转换与加载 7 个训练前步骤；失败即阻断，人工修正后重跑。" />
    <Progress percent={job.progressPercent} status={job.blocked ? "exception" : "active"} />
    <Steps responsive current={Math.max(0, job.stages.findIndex((stage) => stage.stageKey === job.currentStage))} items={job.stages.map((stage) => ({ title: stage.stageName, status: buildStepStatus(stage), description: `${stage.status} · 质量分 ${stage.qualityScore}` }))} />
    <Card size="small" title="七阶段独立处理页"><Space wrap>{job.stages.map((stage) => <Button key={stage.stageKey} onClick={() => onOpenStage(stage.stageKey)}>进入{stage.stageName}处理页</Button>)}</Space></Card>
    <Row gutter={[16, 16]}><Col xs={24} lg={14}><Card size="small" title="质量门禁"><Timeline items={job.stages.map((stage) => ({ color: statusColor(stage.status), children: <Space direction="vertical" size={2}><Text strong>{stage.stageName} · {stage.status}</Text><Text type="secondary">{stage.message}</Text></Space> }))} /></Card></Col>
    <Col xs={24} lg={10}><Card size="small" title="训练数据集产物"><Descriptions column={1} size="small" items={[{ key: "snapshot", label: "快照", children: job.outputSnapshot.snapshotKey }, { key: "loader", label: "加载器", children: job.outputSnapshot.loaderType }, { key: "split", label: "训练/验证/测试", children: `${job.outputSnapshot.trainSplitCount}/${job.outputSnapshot.validationSplitCount}/${job.outputSnapshot.testSplitCount}` }, { key: "rerun", label: "重跑次数", children: job.rerunCount }]} />
    <Space wrap className="dataset-side-actions"><Button type="primary" danger={job.blocked} onClick={() => onRerunPreparationJob(job.jobId)}>人工修正后重跑</Button><Button onClick={() => openDetail("训练加载配置", `产物 ${job.outputSnapshot.snapshotKey} 使用 ${job.outputSnapshot.loaderType}，训练/验证/测试样本数为 ${job.outputSnapshot.trainSplitCount}/${job.outputSnapshot.validationSplitCount}/${job.outputSnapshot.testSplitCount}。`)}>查看加载配置</Button></Space></Card></Col></Row>
  </Space></Card>;
}

export default function DatasetPage({ source, preparationJobs, openDetail, onRerunPreparationJob }: Props) {
  const firstJob = preparationJobs[0];
  const [selectedStageKey, setSelectedStageKey] = useState<string | null>(null);
  const [activeDataModule, setActiveDataModule] = useState("source-access");
  const selectedStage = useMemo(() => firstJob?.stages.find((stage) => stage.stageKey === selectedStageKey) ?? null, [firstJob, selectedStageKey]);
  const blockedCount = preparationJobs.filter((job) => job.blocked).length;
  const totalStages = preparationJobs.reduce((sum, job) => sum + job.stages.length, 0);
  const passedStages = preparationJobs.flatMap((job) => job.stages).filter((stage) => stage.gatePassed).length;
  const activeModule = dataModules.find((item) => item.key === activeDataModule) ?? dataModules[0];
  const sideGroups = dataModules.reduce<Array<{ group: string; items: typeof dataModules }>>((groups, item) => {
    const current = groups.find((group) => group.group === item.group);
    if (current) current.items.push(item);
    else groups.push({ group: item.group, items: [item] });
    return groups;
  }, []);
  const openModuleAction = (action: string) => openDetail(action, `${activeModule.title}：${activeModule.description} 当前为 F008 前端功能页面，后续接入真实后端接口。`);

  if (firstJob && selectedStage) return <section className="utility-grid-section dataset-page-shell"><StageProcessingPage stage={selectedStage} job={firstJob} info={stageInfos[selectedStage.stageKey]} onBack={() => setSelectedStageKey(null)} onRerunPreparationJob={onRerunPreparationJob} openDetail={openDetail} /></section>;

  return <section className="dataset-console-shell"><aside className="dataset-console-side">{sideGroups.map((group) => <div key={group.group} className="dataset-side-group"><div className="dataset-side-title">{group.group}</div>{group.items.map((item) => <button key={item.key} className={`dataset-side-link${activeDataModule === item.key ? " is-active" : ""}`} type="button" onClick={() => setActiveDataModule(item.key)}>{item.label}</button>)}</div>)}</aside><main className="dataset-console-main"><Card className="dataset-main-card dataset-console-card" title={<Space wrap><span>{activeModule.title}</span><Tag color={source === "backend" ? "green" : "gold"}>{source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag><Tag color="blue">TASK-dataset-preparation-pipeline</Tag></Space>}>
    <Paragraph className="tight-paragraph">{activeModule.description}</Paragraph>
    <Form layout="inline" className="dataset-console-form"><Form.Item label="数据源类型"><Select className="dataset-console-select" defaultValue="全部类型" options={[{ value: "全部类型" }, { value: "Image" }, { value: "Text" }, { value: "Audio" }]} /></Form.Item><Form.Item label="数据源名称"><Input className="dataset-console-input" placeholder="请输入数据源名称" /></Form.Item><Form.Item label="共享状态"><Select className="dataset-console-select" defaultValue="请选择共享状态" options={[{ value: "请选择共享状态" }, { value: "私有" }, { value: "团队共享" }]} /></Form.Item><Form.Item><Button type="primary" onClick={() => openModuleAction("查询数据")}>查询</Button></Form.Item><Form.Item><Button onClick={() => openModuleAction("重置筛选")}>重置</Button></Form.Item></Form>
    <Space wrap className="dataset-console-actions"><Button type="primary" onClick={() => openModuleAction(activeModule.action)}>{activeModule.action}</Button>{firstJob && <Button danger={firstJob.blocked} onClick={() => onRerunPreparationJob(firstJob.jobId)}>人工修正后重跑</Button>}<Button onClick={() => openDetail("训练加载配置", "数据准备最终输出可训练数据集快照与 DataLoader 配置，不在本页提交训练任务。")}>查看加载配置</Button></Space>
    <Table className="dataset-console-table" size="small" pagination={{ pageSize: 5 }} dataSource={datasetRows} columns={[{ title: "数据源名称", dataIndex: "name", render: (value: string) => <Button type="link" className="dataset-row-link" onClick={() => openDetail("数据源详情", `${value}：展示来源、版本、驱动包、共享状态和样本统计。`)}>{value}</Button> }, { title: "中文名称", dataIndex: "cnName" }, { title: "数据源类型", dataIndex: "type" }, { title: "状态", dataIndex: "status", render: (value: string) => <Tag color={value === "可训练" ? "green" : value === "处理中" ? "blue" : "gold"}>{value}</Tag> }, { title: "数据源版本", dataIndex: "version" }, { title: "驱动包名称", dataIndex: "driver" }, { title: "共享状态", dataIndex: "shareStatus" }, { title: "样本数", dataIndex: "count" }, { title: "操作", key: "action", render: () => <Space><Button type="link" onClick={() => openModuleAction("公开数据源")}>公开</Button><Button type="link" onClick={() => openModuleAction("编辑数据源")}>编辑</Button><Button type="link" onClick={() => openDetail("更多操作", "删除、授权、发布、复制、上报元数据等动作按真实平台权限收敛。")}>更多</Button></Space> }]} />
  </Card><div className="stats-grid compact dataset-kpi-grid"><Card className="dataset-kpi-card"><Statistic title="准备任务" value={preparationJobs.length} /></Card><Card className="dataset-kpi-card"><Statistic title="阻断任务" value={blockedCount} /></Card><Card className="dataset-kpi-card"><Statistic title="独立阶段页" value={7} /></Card><Card className="dataset-kpi-card"><Statistic title="已过门禁" value={passedStages} suffix={`/ ${totalStages}`} /></Card></div>
  <Card className="dataset-main-card" title="七阶段功能处理页"><Paragraph className="tight-paragraph">这是按示例文档改造的数据部分页面：左侧为可点击数据模块导航，上方为筛选区，中间为数据源表格，下方保留训练前数据准备的多阶段处理入口。</Paragraph>{preparationJobs.map((job) => <PreparationJobPanel key={job.jobId} job={job} openDetail={openDetail} onRerunPreparationJob={onRerunPreparationJob} onOpenStage={setSelectedStageKey} />)}</Card></main></section>;
}
