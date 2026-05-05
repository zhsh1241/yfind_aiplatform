import { CloudUploadOutlined, ExperimentOutlined, RocketOutlined } from "@ant-design/icons";
import { Badge, Button, Space, Typography } from "antd";
import { flowNodes } from "../prototype-data";

const { Title, Paragraph } = Typography;

type Props = {
  openDetail: (title: string, description: string) => void;
  onUpload: () => void;
  onTraining: () => void;
  onDeploy: () => void;
};

export default function OverviewPage({ openDetail, onUpload, onTraining, onDeploy }: Props) {
  return (
    <Space direction="vertical" size={0} className="full-width">
      <section className="product-tile product-tile-dark compact-tile">
        <div className="tile-copy">
          <Title level={2}>一条工业 AI 闭环。</Title>
          <Paragraph className="tile-lead">从数据进入平台，到模型发布、边缘下发和监控审计，所有原型节点均可点击。</Paragraph>
          <Space wrap className="tile-actions">
            <Button type="primary" icon={<CloudUploadOutlined />} onClick={onUpload}>上传数据集</Button>
            <Button icon={<ExperimentOutlined />} onClick={onTraining}>启动训练</Button>
            <Button icon={<RocketOutlined />} onClick={onDeploy}>部署模型</Button>
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
    </Space>
  );
}
