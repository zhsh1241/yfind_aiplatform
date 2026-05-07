import { Button, Card, Col, Descriptions, Input, Progress, Row, Select, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Key } from "react";
import { useState } from "react";
import type { Dataset } from "../prototype-data";

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
  openDetail: (title: string, description: string) => void;
  onUpload: () => void;
  onRequest: () => void;
  onApprove: () => void;
  onDownload: () => void;
};

export default function DatasetPage({ columns, datasets, selectedDataset, datasetQuery, setDatasetQuery, datasetStatusFilter, setDatasetStatusFilter, requestApproved, source, enableBulkSelection, openDetail, onUpload, onRequest, onApprove, onDownload }: Props) {
  const activeCount = datasets.filter((dataset) => dataset.status === "ACTIVE").length;
  const pendingCount = datasets.filter((dataset) => dataset.status === "PENDING_APPROVAL").length;
  const totalSamples = datasets.reduce((sum, dataset) => sum + dataset.samples, 0);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);

  return (
    <section className="utility-grid-section dataset-page-shell">
      <section className="dataset-hero-card">
        <div className="dataset-hero-copy">
          <Tag color={source === "backend" ? "green" : "gold"}>{source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag>
          <div className="section-kicker">数据治理 / 资产目录</div>
          <Title level={2}>数据资产</Title>
          <Paragraph className="tight-paragraph">按生产环境方式呈现数据集目录、准入、质量和下载审批状态，便于运营与审计联动。</Paragraph>
        </div>
        <div className="dataset-hero-actions">
          <Button onClick={onRequest}>新建下载申请</Button>
          <Button aria-label="上传数据集" type="primary" onClick={onUpload}>上传数据集</Button>
        </div>
      </section>

      <div className="stats-grid compact dataset-kpi-grid">
        <Card className="dataset-kpi-card"><Statistic title="数据集总数" value={datasets.length} /></Card>
        <Card className="dataset-kpi-card"><Statistic title="活跃数据集" value={activeCount} /></Card>
        <Card className="dataset-kpi-card"><Statistic title="待审批资产" value={pendingCount} /></Card>
        <Card className="dataset-kpi-card"><Statistic title="累计样本" value={totalSamples} formatter={(value) => Number(value).toLocaleString()} /></Card>
      </div>

      <div className="module-toolbar dataset-toolbar">
        <div className="module-toolbar-info">
          <strong>资产运营面板</strong>
          <span>当前筛选结果 {datasets.length} 个数据集，累计样本 {totalSamples.toLocaleString()} 条。</span>
        </div>
        <Space wrap>
          <Button onClick={() => openDetail("批量导出", "生产版通常支持按筛选结果导出数据集清单与审批记录。")}>导出清单</Button>
          <Button onClick={() => openDetail("质量巡检", "这里可扩展为质量分低于阈值的数据集批量巡检。")}>质量巡检</Button>
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
          <Card title="数据集列表" className="dataset-main-card" extra={<Space><Tag color={source === "backend" ? "green" : "gold"}>{source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag><Button aria-label="上传数据集" type="primary" onClick={onUpload}>上传数据集</Button></Space>}>
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
              { key: "preview", label: "预览类型", children: selectedDataset.previewType },
              { key: "view", label: "数据集查看", children: selectedDataset.canView ? "已放行" : "未放行" },
              { key: "download", label: "版本下载", children: requestApproved || selectedDataset.canDownloadLatestVersion ? "已放行" : "待审批" },
              { key: "dedup", label: "去重策略", children: selectedDataset.dedupStrategy },
              { key: "processing", label: "异步任务", children: selectedDataset.processingStatus },
            ]} />
            <Space direction="vertical" className="full-width dataset-side-actions">
              <Button block onClick={() => openDetail(selectedDataset.name, selectedDataset.samplePreviewType.startsWith("image/") ? `图片样例 ${selectedDataset.samplePreviewName} 可直接预览。` : `文件 ${selectedDataset.samplePreviewName} 已上传，但当前仅保证图片预览。`)}>查看样例预览</Button>
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
