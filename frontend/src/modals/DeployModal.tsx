import { Form, Input, InputNumber, Modal, Space, Typography } from "antd";
import type { InferenceDeployFormValue } from "../api/inferenceApi";

const { Paragraph, Text } = Typography;

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (values: InferenceDeployFormValue) => void;
};

const initialValues: InferenceDeployFormValue = {
  replicas: 2,
  trafficPercent: 10,
  window: "今日 18:00 灰度窗口",
  note: "先投放一条产线做灰度验证",
};

export default function DeployModal({ open, onCancel, onConfirm }: Props) {
  const [form] = Form.useForm<InferenceDeployFormValue>();

  return (
    <Modal
      title="部署模型到推理服务"
      open={open}
      onCancel={onCancel}
      onOk={() => void form.submit()}
      okText="确认部署"
      cancelText="取消"
    >
      <Space direction="vertical" className="full-width" size="middle">
        <Paragraph>确认发布已审批模型版本 bearing-defect-detector-v1，并填写本次灰度发布参数。</Paragraph>
        <div className="deployment-summary-card">
          <Text strong>发布目标</Text>
          <Paragraph className="tight-paragraph">生产推理服务 / bearing-defect-detector-v1 / 默认接入网关</Paragraph>
        </div>
        <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onConfirm}>
          <Form.Item label="副本数" name="replicas" rules={[{ required: true, message: "请填写副本数" }]}>
            <InputNumber min={1} max={20} className="full-width" aria-label="副本数" />
          </Form.Item>
          <Form.Item label="灰度流量占比" name="trafficPercent" rules={[{ required: true, message: "请填写灰度流量占比" }]}>
            <Space.Compact className="full-width">
              <InputNumber min={1} max={100} className="full-width" aria-label="灰度流量占比" />
              <Input value="%" aria-label="灰度流量单位" readOnly />
            </Space.Compact>
          </Form.Item>
          <Form.Item label="发布窗口" name="window" rules={[{ required: true, message: "请填写发布窗口" }]}>
            <Input aria-label="发布窗口" placeholder="例如：今日 18:00 灰度窗口" />
          </Form.Item>
          <Form.Item label="发布说明" name="note" rules={[{ required: true, message: "请填写发布说明" }]}>
            <Input.TextArea aria-label="发布说明" rows={3} placeholder="说明灰度范围、回滚预案或值班安排" />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
}
