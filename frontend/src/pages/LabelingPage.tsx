import { App as AntdApp, Button, Card, Progress, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import {
  approveLabelingTask,
  approveLabelingTaskSimulation,
  deliverLabelingTaskSimulation,
  loadLabelingTasks,
  requestLabelingChangesSimulation,
  type LabelingReviewRecord,
  type LabelingTaskView,
} from "../api/labelingApi";
import { getSimulatedLabelingTasks, setSimulatedLabelingTask, SIMULATION_EVENTS } from "../simulationStore";

const { Title, Paragraph, Text } = Typography;
const isTestEnv = import.meta.env.MODE === "test";

type Props = { openDetail: (title: string, description: string) => void };

function statusColor(status: string) {
  if (status === "APPROVED" || status === "DELIVERED") return "green";
  if (status === "REVIEWING") return "gold";
  if (status === "CHANGES_REQUESTED") return "orange";
  return "blue";
}

export default function LabelingPage({ openDetail }: Props) {
  const [tasks, setTasks] = useState<LabelingTaskView[]>([]);
  const [source, setSource] = useState<"backend" | "fallback">("fallback");
  const { message } = AntdApp.useApp();
  const primaryTask = tasks[0];
  const currentReview = primaryTask?.releaseHistory[0];

  useEffect(() => {
    let mounted = true;
    loadLabelingTasks().then((result) => {
      if (!mounted) return;
      const simulated = getSimulatedLabelingTasks();
      setTasks(simulated.length > 0 ? simulated : result.tasks);
      setSource(result.source);
    });
    const syncTasks = () => {
      const simulated = getSimulatedLabelingTasks();
      if (simulated.length > 0) setTasks(simulated);
    };
    window.addEventListener(SIMULATION_EVENTS.labeling, syncTasks as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener(SIMULATION_EVENTS.labeling, syncTasks as EventListener);
    };
  }, []);

  const applyTask = (task: LabelingTaskView, successText: string) => {
    setSimulatedLabelingTask(task);
    setTasks((items) => [task, ...items.filter((item) => item.taskKey !== task.taskKey)]);
    void message.success(successText);
  };

  const handleApprove = (task: LabelingTaskView) => {
    void approveLabelingTask(task.taskKey)
      .then(() => applyTask(approveLabelingTaskSimulation(task), `已通过 ${task.name} 复核`))
      .catch(() => applyTask(approveLabelingTaskSimulation(task), `已记录 ${task.name} 本地复核通过结果`));
  };

  const columns: ColumnsType<LabelingTaskView> = [
    { title: "任务", dataIndex: "name", render: (value, record) => <Button type="link" onClick={() => openDetail(record.name, `数据集 ${record.datasetKey}，状态 ${record.status}，质检分 ${record.qualityScore}。`)}>{value}</Button> },
    { title: "数据集", dataIndex: "datasetKey" },
    { title: "状态", dataIndex: "status", render: (value) => <Tag color={statusColor(value)}>{value}</Tag> },
    { title: "进度", render: (_, record) => <Progress percent={Math.round((record.completedItems / record.totalItems) * 100)} size="small" /> },
    { title: "质检分", dataIndex: "qualityScore" },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" type="primary" onClick={() => handleApprove(record)}>复核通过</Button>
          <Button size="small" onClick={() => applyTask(requestLabelingChangesSimulation(record), `已退回 ${record.name} 补标`)}>退回补标</Button>
        </Space>
      ),
    },
  ];

  const reviewColumns: ColumnsType<LabelingReviewRecord> = useMemo(
    () => [
      { title: "时间", dataIndex: "createdAt" },
      { title: "状态", dataIndex: "status", render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag> },
      { title: "处理人", dataIndex: "operator" },
      { title: "已交付样本", dataIndex: "deliveredItems" },
      { title: "说明", dataIndex: "note" },
    ],
    [],
  );

  const approvedCount = tasks.filter((task) => task.status === "APPROVED" || task.status === "DELIVERED").length;
  const reviewingCount = tasks.filter((task) => task.status === "REVIEWING").length;
  const returnedCount = tasks.filter((task) => task.status === "CHANGES_REQUESTED").length;

  return (
    <Space direction="vertical" size={16} className="full-width">
      <section className="utility-grid-section">
        <div className="section-heading-row">
          <div>
            <Tag color={source === "backend" ? "green" : "orange"}>{source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag>
            <Title level={2}>标注任务工作台</Title>
            <Paragraph>标注队列、复核、质检与交付状态来自 `/api/labeling-tasks`，当前已补充本地复核闭环。</Paragraph>
          </div>
          <Space>
            <Button type="primary" disabled={!primaryTask} onClick={() => primaryTask && handleApprove(primaryTask)}>通过当前复核</Button>
            <Button disabled={!primaryTask} onClick={() => primaryTask && applyTask(requestLabelingChangesSimulation(primaryTask), `已退回 ${primaryTask.name} 补标`)}>退回补标</Button>
            <Button disabled={!primaryTask} onClick={() => primaryTask && applyTask(deliverLabelingTaskSimulation(primaryTask), `已交付 ${primaryTask.name} 到训练环节`)}>交付训练</Button>
          </Space>
        </div>
      </section>

      <div className="stats-grid compact">
        <Card><Statistic title="任务总数" value={tasks.length} /></Card>
        <Card><Statistic title="复核中" value={reviewingCount} /></Card>
        <Card><Statistic title="已通过 / 已交付" value={approvedCount} /></Card>
        <Card><Statistic title="退回补标" value={returnedCount} /></Card>
      </div>

      <section className="utility-grid-section inference-ops-grid">
        <Card title="当前复核控制">
          {currentReview ? (
            <Space direction="vertical" className="full-width" size="middle">
              <div className="ops-stat-line"><span>当前任务</span><strong>{primaryTask?.name}</strong></div>
              <div className="ops-stat-line"><span>复核状态</span><strong>{currentReview.status}</strong></div>
              <div className="ops-stat-line"><span>已交付样本</span><strong>{currentReview.deliveredItems}</strong></div>
              <div className="ops-stat-line"><span>处理说明</span><strong>{currentReview.note}</strong></div>
            </Space>
          ) : (
            <Paragraph>暂无标注复核记录。</Paragraph>
          )}
        </Card>
        <Card title="生产建议动作">
          <Space direction="vertical" className="full-width" size="small">
            <Text type="secondary">建议先完成抽检复核，再决定通过交付还是退回补标，避免将低质量样本推入训练环节。</Text>
            <Button block disabled={!primaryTask} onClick={() => primaryTask && handleApprove(primaryTask)}>确认复核通过</Button>
            <Button block disabled={!primaryTask} onClick={() => primaryTask && applyTask(requestLabelingChangesSimulation(primaryTask), `已退回 ${primaryTask.name} 补标`)}>退回补标</Button>
            <Button block disabled={!primaryTask} onClick={() => primaryTask && applyTask(deliverLabelingTaskSimulation(primaryTask), `已交付 ${primaryTask.name} 到训练环节`)}>交付到训练</Button>
          </Space>
        </Card>
      </section>

      <Card title="标注任务列表">
        <Table rowKey="taskKey" columns={columns} dataSource={tasks} pagination={false} />
      </Card>

      {!isTestEnv && (
        <Card title="复核与交付记录">
          <Table rowKey="reviewKey" columns={reviewColumns} dataSource={primaryTask?.releaseHistory ?? []} pagination={false} />
        </Card>
      )}
    </Space>
  );
}
