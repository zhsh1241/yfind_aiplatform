import { Modal, Typography } from "antd";

const { Paragraph } = Typography;

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeployModal({ open, onCancel, onConfirm }: Props) {
  return (
    <Modal title="部署模型到推理服务" open={open} onCancel={onCancel} onOk={onConfirm} okText="确认部署" cancelText="取消">
      <Paragraph>确认发布模型版本 v1.3.0</Paragraph>
    </Modal>
  );
}
