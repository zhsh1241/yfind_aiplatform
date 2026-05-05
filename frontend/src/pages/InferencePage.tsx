import { Button, Card, Space, Typography } from "antd";
import { inferenceMetrics } from "../prototype-data";

const { Title, Paragraph } = Typography;

type Props = {
  openDetail: (title: string, description: string) => void;
  onDeploy: () => void;
};

export default function InferencePage({ openDetail, onDeploy }: Props) {
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
