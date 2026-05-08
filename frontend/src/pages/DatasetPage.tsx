import { Button, Card, Col, Descriptions, Input, Progress, Row, Select, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Key } from "react";
import { useMemo, useState } from "react";
import type { Dataset } from "../prototype-data";
import type { PreparationJob } from "../api/datasetApi";

const { Paragraph, Title, Text } = Typography;

type Props = {
  columns: ColumnsType<Dataset>;
  datasets: Dataset[];
  selectedDataset: Dataset;
  datasetQuery: string;
  setDatasetQuery: (value: string) => void;
  datasetStatusFilter: string;
  setDatasetStatusFilter: (value: string) => void;
  requestApproved: boolean;
  source: "backend" | "fallback";
  enableBulkSelection: boolean;
  preparationJobs: PreparationJob[];
  openDetail: (title: string, description: string) => void;
  onUpload: () => void;
  onRequest: () => void;
  onApprove: () => void;
  onDownload: () => void;
  onRerunPreparationJob: (jobId: string) => void;
};

const pipelineSteps = [
  { key: "collect", title: "数据收集", description: "从公开数据、企业系统或采集流程获取原始样本。" },
  { key: "clean", title: "数据清洗", description: "去重、去噪、处理缺失值并统一格式。" },
  { key: "label", title: "数据标注", description: "为监督学习任务补充分类、边界框或其他标签。" },
  { key: "split", title: "数据划分", description: "划分训练集、验证集和测试集，避免测试集泄漏。" },
  { key: "preprocess", title: "数据预处理", description: "归一化、标准化、分词、编码和基础变换。" },
  { key: "augment", title: "数据增强", description: "按任务需要做裁剪、翻转、旋转或文本扩增。" },
  { key: "format", title: "格式转换与加载", description: "转换为框架支持格式并进入高效加载链路。" },
];

function PreparationJobCard({ job, openDetail, onRerunPreparationJob }: { job: PreparationJob; openDetail: (title: string, description: string) => void; onRerunPreparationJob: (jobId: string) => void }) {
  return (
    <div className="selection-toolbar" aria-label="数据准备流水线任务">
      <div className="module-toolbar-info">
        <Space wrap>
          <Tag color="blue">TASK-dataset-preparation-pipeline</Tag>
          <Tag color={job.blocked ? "red" : "green"}>{job.status}</Tag>
          <Tag>{job.currentStage}</Tag>
        </Space>
        <strong>{job.datasetName}</strong>
        <span>平台内置覆盖数据收集、清洗、标注、划分、预处理、增强、格式转换与加载 7 个训练前步骤；失败即阻断，人工修正后重跑。</span>
        {job.blocked && <Text type="danger">阻断原因：{job.blockedReason}</Text>}
        <Text type="secondary">训练数据集产物：{job.outputSnapshot.snapshotKey} / {job.outputSnapshot.loaderType}</Text>
      </div>
      <Space direction="vertical" size="small" className="full-width">
        <Progress percent={job.progressPercent} status={job.blocked ? "exception" : "active"} />
        <Space wrap>
          <Button type="primary" danger={job.blocked} onClick={() => onRerunPreparationJob(job.jobId)}>人工修正后重跑</Button>
          <Button onClick={() => openDetail("训练加载配置", `产物 ${job.outputSnapshot.snapshotKey} 使用 ${job.outputSnapshot.loaderType}，训练/验证/测试样本数为 ${job.outputSnapshot.trainSplitCount}/${job.outputSnapshot.validationSplitCount}/${job.outputSnapshot.testSplitCount}。`)}>查看加载配置</Button>
        </Space>
        <Space wrap aria-label="七阶段进度">
          {job.stages.map((stage) => (
            <Tag key={stage.stageKey} color={stage.gatePassed ? "green" : stage.status === "FAILED" ? "red" : "default"}>{stage.stageName} · {stage.status}</Tag>
          ))}
        </Space>
      </Space>
    </div>
  );
}

export default function DatasetPage({ columns, datasets, selectedDataset, datasetQuery, setDatasetQuery, datasetStatusFilter, setDatasetStatusFilter, requestApproved, source, enableBulkSelection, preparationJobs, openDetail, onUpload, onRequest, onApprove, onDownload, onRerunPreparationJob }: Props) {
  const activeCount = datasets.filter((dataset) => dataset.status === "ACTIVE").length;
  const pendingCount = datasets.filter((dataset) => dataset.status === "PENDING_APPROVAL").length;
  const totalSamples = datasets.reduce((sum, dataset) => sum + dataset.samples, 0);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);

  const pipelineProgress = useMemo(() => {
    const complete = ["数据收集", "数据清洗", "数据标注", "数据划分", "数据预处理", "数据增强", "格式转换与加载"].filter(Boolean).length;
    return Math.round((complete / pipelineSteps.length) * 100);
  }, []);

  return (
    <section className="utility-grid-section dataset-page-shell">
      <section className="dataset-hero-card">
        <div className="dataset-hero-copy">
          <Tag color={source === "backend" ? "green" : "gold"}>{source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag>
          <div className="section-kicker">数据准备 / 训练基础链路</div>
          <Title level={2}>数据集准备</Title>
          <Paragraph className="tight-paragraph">围绕数据收集、清洗、标注、划分、预处理、增强与格式转换，统一管理训练前的数据准备流程。</Paragraph>
        </div>
        <div className="dataset-hero-actions">
          <Button onClick={onRequest}>发起下载申请</Button>
          <Button aria-label="上传数据集" type="primary" onClick={onUpload}>上传原始数据</Button>
        </div>
      </section>

      <div className="stats-grid compact dataset-kpi-grid">
        <Card className="dataset-kpi-card"><Statistic title="数据集总数" value={datasets.length} /></Card>
        <Card className="dataset-kpi-card"><Statistic title="活跃数据集" value={activeCount} /></Card>
        <Card className="dataset-kpi-card"><Statistic title="待审批数据" value={pendingCount} /></Card>
        <Card className="dataset-kpi-card"><Statistic title="累计样本" value={totalSamples} formatter={(value) => Number(value).toLocaleString()} /></Card>
      </div>

      <Row gutter={[20, 20]} align="stretch">
        <Col xs={24} xl={14}>
          <Card title="数据准备流水线" className="dataset-main-card">
            <Space direction="vertical" className="full-width" size="middle">
              {pipelineSteps.map((step, index) => (
                <div key={step.key} className="monitoring-alert-card">
                  <div className="monitoring-alert-header">
                    <Space>
                      <Tag color={index < 2 ? "green" : index === 2 ? "gold" : "blue"}>{index + 1}</Tag>
                      <strong>{step.title}</strong>
                    </Space>
                    <Text type="secondary">训练前必经环节</Text>
                  </div>
                  <span>{step.description}</span>
                </div>
              ))}

              {preparationJobs.map((job) => (
                <PreparationJobCard key={job.jobId} job={job} openDetail={openDetail} onRerunPreparationJob={onRerunPreparationJob} />
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="关键规则" className="dataset-side-card">
            <Space direction="vertical" size="middle" className="full-width">
              <Descriptions column={1} size="small" items={[
                { key: "split", label: "测试集约束", children: "测试集仅用于最终评估，不参与训练、验证或调参。" },
                { key: "ratio", label: "常见划分", children: "训练集 : 验证集 : 测试集 常见为 70%–80% : 10%–15% : 5%–10%。" },
                { key: "augment", label: "增强建议", children: "图像、文本、音频可按任务需要做增强，但不得污染测试集。" },
                { key: "format", label: "加载方式", children: "建议统一转换为训练框架支持的可加载格式并接入 DataLoader。" },
              ]} />
              <Progress percent={pipelineProgress} />
              <Button onClick={() => openDetail("数据集处理规范", "该页面聚焦模型训练前的数据准备链路，不再以纯资产目录为中心。")}>查看规范</Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <div className="module-toolbar dataset-toolbar">
        <div className="module-toolbar-info">
          <strong>资产运营面板</strong>
          <span>当前筛选结果 {datasets.length} 个数据集，累计样本 {totalSamples.toLocaleString()} 条。</span>
        </div>
        <Space wrap>
          <Button onClick={() => openDetail("数据清洗", "去除噪声、异常值、重复样本，处理缺失值并统一格式。")}>清洗说明</Button>
          <Button onClick={() => openDetail("数据划分", "训练集、验证集和测试集必须分离，测试集不得参与训练和调参。")}>划分说明</Button>
          <Button type="primary" onClick={onApprove}>处理审批</Button>
        </Space>
      </div>

      {enableBulkSelection && selectedKeys.length > 0 && (
        <div className="selection-toolbar" aria-label="批量操作区">
          <div className="module-toolbar-info">
            <strong>已选择 {selectedKeys.length} 个数据集</strong>
            <span>可进行批量导出、批量发起申请或质量巡检。</span>
          </div>
          <Space wrap>
            <Button onClick={() => openDetail("批量导出", `已选择 ${selectedKeys.length} 个数据集，生产版可导出审批与质量摘要。`)}>批量导出</Button>
            <Button onClick={() => openDetail("批量申请", `已选择 ${selectedKeys.length} 个数据集，生产版可批量提交下载申请。`)}>批量申请</Button>
            <Button onClick={() => setSelectedKeys([])}>清空选择</Button>
          </Space>
        </div>
      )}

      <Row gutter={[20, 20]} align="stretch">
        <Col xs={24} xl={16}>
          <Card title="数据集列表" className="dataset-main-card" extra={<Space><Tag color={source === "backend" ? "green" : "gold"}>{source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag><Button aria-label="上传数据集" type="primary" onClick={onUpload}>上传原始数据</Button></Space>}>
            <div className="dataset-filter-bar">
              <Input aria-label="数据集搜索" placeholder="搜索数据集或负责人" value={datasetQuery} onChange={(event) => setDatasetQuery(event.target.value)} className="dataset-filter-input" />
              <Select aria-label="数据集状态筛选" value={datasetStatusFilter} onChange={setDatasetStatusFilter} className="dataset-filter-select" options={[{ value: "ALL", label: "全部状态" }, { value: "ACTIVE", label: "ACTIVE" }, { value: "PROCESSING", label: "PROCESSING" }, { value: "PENDING_APPROVAL", label: "PENDING_APPROVAL" }]} />
              <Button onClick={() => { setDatasetQuery(""); setDatasetStatusFilter("ALL"); }}>重置筛选</Button>
            </div>
            <Table
              rowSelection={enableBulkSelection ? {
                selectedRowKeys: selectedKeys,
                onChange: (keys) => setSelectedKeys(keys),
              } : undefined}
              columns={columns}
              dataSource={datasets}
              pagination={false}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="当前选择" className="dataset-side-card">
            <div className="dataset-side-summary">
              <div>
                <Text type="secondary">当前数据集</Text>
                <Title level={4}>{selectedDataset.name}</Title>
              </div>
              <Tag color={requestApproved || selectedDataset.canDownloadLatestVersion ? "green" : "gold"}>{requestApproved || selectedDataset.canDownloadLatestVersion ? "下载已放行" : "下载待审批"}</Tag>
            </div>
            <div className="dataset-side-metric-row">
              <Statistic title="样本数" value={selectedDataset.samples} formatter={(value) => Number(value).toLocaleString()} />
              <div className="dataset-quality-block">
                <span>质量分</span>
                <Progress percent={selectedDataset.quality} size="small" />
              </div>
            </div>
            <Descriptions column={1} size="small" items={[
              { key: "preview", label: "数据类型", children: selectedDataset.previewType },
              { key: "view", label: "查看权限", children: selectedDataset.canView ? "已放行" : "未放行" },
              { key: "download", label: "版本下载", children: requestApproved || selectedDataset.canDownloadLatestVersion ? "已放行" : "待审批" },
              { key: "dedup", label: "去重策略", children: selectedDataset.dedupStrategy },
              { key: "processing", label: "异步任务", children: selectedDataset.processingStatus },
            ]} />
            <Space direction="vertical" className="full-width dataset-side-actions">
              <Button block onClick={() => openDetail(selectedDataset.name, selectedDataset.samplePreviewType.startsWith("image/") ? `图片样例 ${selectedDataset.samplePreviewName} 可直接预览。` : `文件 ${selectedDataset.samplePreviewName} 可用于训练流水线。`)}>查看样例预览</Button>
              <Button block onClick={onRequest}>发起下载申请</Button>
              <Button block type="primary" onClick={onApprove}>审批下载申请</Button>
              <Button block disabled={!requestApproved} onClick={onDownload}>下载最新版本</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </section>
  );
}
