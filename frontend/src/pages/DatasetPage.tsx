import { Button, Card, Col, Descriptions, Input, Progress, Row, Select, Space, Statistic, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dataset } from "../prototype-data";

const { Paragraph } = Typography;

type Props = {
  columns: ColumnsType<Dataset>;
  datasets: Dataset[];
  selectedDataset: Dataset;
  datasetQuery: string;
  setDatasetQuery: (value: string) => void;
  datasetStatusFilter: string;
  setDatasetStatusFilter: (value: string) => void;
  requestApproved: boolean;
  openDetail: (title: string, description: string) => void;
  onUpload: () => void;
  onRequest: () => void;
  onApprove: () => void;
};

export default function DatasetPage({ columns, datasets, selectedDataset, datasetQuery, setDatasetQuery, datasetStatusFilter, setDatasetStatusFilter, requestApproved, openDetail, onUpload, onRequest, onApprove }: Props) {
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
