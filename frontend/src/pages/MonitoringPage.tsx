import { Card, Col, Row, Statistic } from "antd";

type Props = {
  openDetail: (title: string, description: string) => void;
};

export default function MonitoringPage({ openDetail }: Props) {
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
