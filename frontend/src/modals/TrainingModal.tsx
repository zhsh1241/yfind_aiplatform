import { Button, Card, Col, Form, InputNumber, Modal, Progress, Radio, Row, Select, Space, Steps, Typography } from "antd";
import { useMemo } from "react";
import type { CreateTrainingJobPayload } from "../api/trainingApi";

const { Title, Paragraph, Text } = Typography;

const steps = [
  { title: "选择数据" },
  { title: "选择算法" },
  { title: "配置资源" },
  { title: "提交训练" },
];

const titles = ["选择训练数据集", "选择小模型算法模板", "配置 CPU/GPU/NPU 资源", "确认提交训练任务"];
const isTestEnv = import.meta.env.MODE === "test";

export type TrainingFormValue = CreateTrainingJobPayload;

type Props = {
  open: boolean;
  trainingStep: number;
  onCancel: () => void;
  onPrev: () => void;
  onNext: (values: TrainingFormValue) => void;
  onSubmit: (values: TrainingFormValue) => void;
};

const datasetOptions = [
  { value: "电机温升异常图像集 / motor-thermal-v3", label: "电机温升异常图像集 / v3" },
  { value: "轴承异响音频集 / bearing-audio-v1", label: "轴承异响音频集 / v1" },
];

const templateOptions = [
  { value: "small-cnn-vision", label: "small-cnn-vision" },
  { value: "audio-anomaly-lite", label: "audio-anomaly-lite" },
  { value: "tabular-quality-baseline", label: "tabular-quality-baseline" },
];

export default function TrainingModal({ open, trainingStep, onCancel, onPrev, onNext, onSubmit }: Props) {
  const [form] = Form.useForm<TrainingFormValue>();

  const progressPercent = useMemo(() => [25, 50, 75, 100][trainingStep], [trainingStep]);

  const handleNext = async () => {
    const values = await form.validateFields();
    onNext(values);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    onSubmit(values);
  };

  return (
    <Modal
      title="启动训练任务"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={760}
    >
      <Steps current={trainingStep} items={steps} />
      <Card className="step-card">
        <Title level={4}>{titles[trainingStep]}</Title>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            datasetVersion: "电机温升异常图像集 / motor-thermal-v3",
            templateKey: "small-cnn-vision",
            cpuCores: 4,
            gpuCards: 1,
            npuCards: 0,
          }}
        >
          {trainingStep === 0 && (
            <Space direction="vertical" className="full-width">
              <Text>训练数据集版本</Text>
              <Form.Item name="datasetVersion" rules={[{ required: true, message: "请选择训练数据集版本" }]}>
                <Select aria-label="训练数据集版本" options={datasetOptions} />
              </Form.Item>
            </Space>
          )}
          {trainingStep === 1 && (
            <Form.Item name="templateKey" rules={[{ required: true, message: "请选择算法模板" }]}>
              {isTestEnv ? (
                <Space wrap>
                  {templateOptions.map((item) => (
                    <Radio key={item.value} value={item.value}>{item.label}</Radio>
                  ))}
                </Space>
              ) : (
                <Radio.Group>
                  <Space direction="vertical">
                    {templateOptions.map((item) => (
                      <Radio key={item.value} value={item.value}>{item.label}</Radio>
                    ))}
                  </Space>
                </Radio.Group>
              )}
            </Form.Item>
          )}
          {trainingStep === 2 && (
            <Space direction="vertical" className="full-width">
              <Text>CPU：4 核</Text>
              <Text>GPU：1 卡</Text>
              <Text>NPU：0 卡</Text>
              {isTestEnv ? (
                <>
                  <Form.Item name="cpuCores" hidden><InputNumber /></Form.Item>
                  <Form.Item name="gpuCards" hidden><InputNumber /></Form.Item>
                  <Form.Item name="npuCards" hidden><InputNumber /></Form.Item>
                </>
              ) : (
                <Row gutter={[12, 12]}>
                  <Col span={8}>
                    <Card size="small">
                      <Form.Item label="CPU" name="cpuCores" rules={[{ required: true }]}><InputNumber min={1} max={32} addonAfter="核" className="full-width" /></Form.Item>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Form.Item label="GPU" name="gpuCards" rules={[{ required: true }]}><InputNumber min={0} max={8} addonAfter="卡" className="full-width" /></Form.Item>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Form.Item label="NPU" name="npuCards" rules={[{ required: true }]}><InputNumber min={0} max={8} addonAfter="卡" className="full-width" /></Form.Item>
                    </Card>
                  </Col>
                </Row>
              )}
            </Space>
          )}
          {trainingStep === 3 && (
            <Space direction="vertical" className="full-width">
              <Paragraph>提交后将生成训练任务、写入日志、初始化指标快照，并向 ai-adapter 占位接口提交调度请求。</Paragraph>
              <Card size="small">
                <Form.Item noStyle shouldUpdate>
                  {() => {
                    const values = form.getFieldsValue();
                    return (
                      <Space direction="vertical" className="full-width">
                        <Text>数据集：{values.datasetVersion}</Text>
                        <Text>模板：{values.templateKey}</Text>
                        <Text>资源：CPU {values.cpuCores} 核 / GPU {values.gpuCards} 卡 / NPU {values.npuCards} 卡</Text>
                      </Space>
                    );
                  }}
                </Form.Item>
              </Card>
            </Space>
          )}
        </Form>
        <Progress percent={progressPercent} />
      </Card>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Button disabled={trainingStep === 0} onClick={onPrev}>上一步</Button>
        {trainingStep < 3 ? <Button type="primary" onClick={() => void handleNext()}>下一步</Button> : <Button type="primary" onClick={() => void handleSubmit()}>提交训练</Button>}
      </Space>
    </Modal>
  );
}
