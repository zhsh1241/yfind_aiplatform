import { Button, Card, Col, List, Row } from "antd";

type Props = {
  onOpen: () => void;
  openDetail: (title: string, description: string) => void;
};

export default function TrainingPage({ onOpen, openDetail }: Props) {
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
