import { App as AntdApp, Button, Card, Col, List, Progress, Row, Space, Statistic, Tag, Timeline, Typography } from "antd";
import { useEffect, useState } from "react";
import { createTrainingJobSimulation, loadTraining, type TrainingJobView } from "../api/trainingApi";
import { addSimulatedTrainingJob, getSimulatedTrainingJobs, SIMULATION_EVENTS } from "../simulationStore";

const { Paragraph } = Typography;

const fallbackTrainingJobs: TrainingJobView[] = [
  {
    key: "train-bearing-v1",
    name: "轴承缺陷检测 v1",
    dataset: "电机温升异常图像集 / motor-thermal-v3",
    template: "小样本视觉缺陷检测",
    status: "RUNNING",
    queueStatus: "SUBMITTED_TO_ADAPTER",
    accelerator: "GPU x1",
    progress: 72,
    artifact: "TODO_CONFIRM_MODEL_ARTIFACT_URI/train-bearing-v1",
  },
  {
    key: "train-audio-poc",
    name: "声音异常检测 PoC",
    dataset: "轴承异响音频集 / bearing-audio-v1",
    template: "轻量音频异常检测",
    status: "QUEUED",
    queueStatus: "WAITING_RESOURCE",
    accelerator: "CPU x8",
    progress: 18,
    artifact: "TODO_CONFIRM_MODEL_ARTIFACT_URI/train-audio-poc",
  },
];

const fallbackTemplateOptions = ["小样本视觉缺陷检测", "轻量音频异常检测", "表格质量基线"];
const fallbackMetricPoints = [
  { epoch: 1, loss: 0.82, accuracy: 61 },
  { epoch: 5, loss: 0.41, accuracy: 82 },
  { epoch: 10, loss: 0.27, accuracy: 90 },
];

type Props = {
  onOpen: () => void;
  openDetail: (title: string, description: string) => void;
};

export default function TrainingPage({ onOpen, openDetail }: Props) {
  const [trainingJobs, setTrainingJobs] = useState(fallbackTrainingJobs);
  const [templateOptions, setTemplateOptions] = useState(fallbackTemplateOptions);
  const [metricPoints, setMetricPoints] = useState(fallbackMetricPoints);
  const [source, setSource] = useState<"backend" | "fallback">("fallback");
  const { message } = AntdApp.useApp();

  useEffect(() => {
    let cancelled = false;
    loadTraining().then((result) => {
      if (cancelled) return;
      const simulated = getSimulatedTrainingJobs();
      const merged = [...simulated, ...(result.jobs.length > 0 ? result.jobs : fallbackTrainingJobs).filter((item) => simulated.every((simItem) => simItem.key !== item.key))];
      setTrainingJobs(merged);
      setTemplateOptions(result.templates.length > 0 ? result.templates : fallbackTemplateOptions);
      setMetricPoints(result.metricPoints.length > 0 ? result.metricPoints : fallbackMetricPoints);
      setSource(result.source);
    }).catch(() => setSource("fallback"));

    const syncJobs = () => {
      const simulated = getSimulatedTrainingJobs();
      setTrainingJobs((current) => [...simulated, ...current.filter((item) => simulated.every((simItem) => simItem.key !== item.key))]);
    };

    window.addEventListener(SIMULATION_EVENTS.training, syncJobs as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(SIMULATION_EVENTS.training, syncJobs as EventListener);
    };
  }, []);

  const createLocalTrainingJob = () => {
    const job = createTrainingJobSimulation({
      datasetVersion: "电机温升异常图像集 / motor-thermal-v3",
      templateKey: "small-cnn-vision",
      cpuCores: 4,
      gpuCards: 1,
      npuCards: 0,
    });
    addSimulatedTrainingJob(job);
    setTrainingJobs((current) => [job, ...current.filter((item) => item.key !== job.key)]);
    void message.success(`已创建训练任务：${job.name}`);
  };

  return (
    <section className="utility-grid-section">
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={15}>
          <Card title="训练任务看板" extra={<Space><Tag color={source === "backend" ? "green" : "gold"}>{source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag><Button aria-label="启动训练" type="primary" onClick={onOpen}>启动训练</Button><Button onClick={createLocalTrainingJob}>快速创建</Button></Space>}>
            <List
              dataSource={trainingJobs}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button key="detail" onClick={() => openDetail(item.name, `数据集：${item.dataset}；模板：${item.template}；artifact：${item.artifact}`)}>查看</Button>,
                    <Button key="cancel" danger onClick={() => openDetail(`${item.name} 取消确认`, "取消会向 ai-adapter 发送占位取消请求，并将队列状态改为 CANCEL_REQUESTED。")}>取消</Button>,
                  ]}
                >
                  <List.Item.Meta title={item.name} description={`${item.dataset} · ${item.template} · ${item.accelerator}`} />
                  <Space direction="vertical" size={4} className="training-list-status">
                    <Tag color={item.status === "RUNNING" ? "blue" : item.status === "QUEUED" ? "gold" : "green"}>{item.status}</Tag>
                    <Progress percent={item.progress} size="small" />
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card title="资源与调度">
            <Row gutter={[12, 12]}>
              <Col span={8}><Statistic title="运行中" value={trainingJobs.filter((item) => item.status === "RUNNING").length} /></Col>
              <Col span={8}><Statistic title="排队" value={trainingJobs.filter((item) => item.status === "QUEUED").length} /></Col>
              <Col span={8}><Statistic title="GPU" value={1} suffix="卡" /></Col>
            </Row>
            <Timeline
              className="training-timeline"
              items={[
                { children: "训练任务提交到 ai-adapter 占位调度接口" },
                { children: "资源校验：CPU/GPU/NPU 请求已记录" },
                { children: "artifact 输出路径保持 TODO_CONFIRM_MODEL_ARTIFACT_URI" },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} className="training-extra-row">
        <Col xs={24} xl={12}>
          <Card title="算法模板">
            <Space wrap>
              {templateOptions.map((template) => <Tag key={template} color="blue">{template}</Tag>)}
            </Space>
            <Paragraph className="training-note">模板由后端 `/api/training-jobs/templates` 和 ai-adapter `/internal/training/templates` 共同对齐。</Paragraph>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="指标快照">
            <div className="metric-strip" role="img" aria-label="训练指标趋势图">
              {metricPoints.map((point) => (
                <button
                  key={point.epoch}
                  type="button"
                  className="metric-point"
                  onClick={() => openDetail(`Epoch ${point.epoch} 指标`, `loss ${point.loss}，accuracy ${point.accuracy}%，用于训练过程评估。`)}
                >
                  <strong>{point.accuracy}%</strong>
                  <span>Epoch {point.epoch}</span>
                </button>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </section>
  );
}
