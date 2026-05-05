import { Button, Card, Modal, Progress, Space, Steps, Typography } from "antd";

const { Title, Paragraph } = Typography;

type Props = {
  open: boolean;
  trainingStep: number;
  onCancel: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
};

export default function TrainingModal({ open, trainingStep, onCancel, onPrev, onNext, onSubmit }: Props) {
  return (
    <Modal title="启动训练任务" open={open} onCancel={onCancel} footer={null} width={720}>
      <Steps current={trainingStep} items={[{ title: "选择数据" }, { title: "选择算法" }, { title: "配置资源" }, { title: "提交训练" }]} />
      <Card className="step-card">
        <Title level={4}>{["选择训练数据集", "选择小模型算法模板", "配置 GPU/NPU 资源", "确认提交训练任务"][trainingStep]}</Title>
        <Paragraph>当前为原型步骤，点击下一步可模拟训练任务配置流程。</Paragraph>
        <Progress percent={[25, 50, 75, 100][trainingStep]} />
      </Card>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Button disabled={trainingStep === 0} onClick={onPrev}>上一步</Button>
        {trainingStep < 3 ? <Button type="primary" onClick={onNext}>下一步</Button> : <Button type="primary" onClick={onSubmit}>提交训练</Button>}
      </Space>
    </Modal>
  );
}
