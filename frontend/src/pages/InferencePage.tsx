import { App as AntdApp, Button, Card, Descriptions, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import {
  createInferenceServiceSimulation,
  loadInferenceServices,
  markInferenceServiceHealthy,
  rollbackInferenceService,
  shiftInferenceTraffic,
  type InferenceReleaseRecord,
  type InferenceServiceView,
} from "../api/inferenceApi";
import { loadPlatformStatus, type PlatformStatus } from "../api/platformStatusApi";
import { getSimulatedInferenceServices, setSimulatedInferenceService, SIMULATION_EVENTS } from "../simulationStore";
import { inferenceMetrics } from "../prototype-data";

const { Title, Paragraph, Text } = Typography;

type Props = {
  openDetail: (title: string, description: string) => void;
  onDeploy: () => void;
};

const isTestEnv = import.meta.env.MODE === "test";

function statusColor(status: string) {
  if (status === "RUNNING" || status === "HEALTHY") return "green";
  if (status === "DEPLOYING") return "blue";
  if (status === "ROLLED_BACK") return "orange";
  return "default";
}

export default function InferencePage({ openDetail, onDeploy }: Props) {
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus>({ status: "DEMO", service: "local-fallback", feature: "TASK-platform-integrated-runtime", source: "fallback" });
  const [services, setServices] = useState<InferenceServiceView[]>([]);
  const [source, setSource] = useState<"backend" | "fallback">("fallback");
  const { message } = AntdApp.useApp();
  const primaryService = services[0];
  const metrics = primaryService?.metrics ?? inferenceMetrics;
  const maxQps = Math.max(...metrics.map((item) => item.qps));
  const currentRelease = primaryService?.releaseHistory[0];

  useEffect(() => {
    let mounted = true;
    loadPlatformStatus().then((status) => {
      if (mounted) setPlatformStatus(status);
    });
    loadInferenceServices().then((result) => {
      if (!mounted) return;
      const simulated = getSimulatedInferenceServices();
      setServices(simulated.length > 0 ? simulated : result.services);
      setSource(result.source);
    });
    const syncServices = () => {
      const simulated = getSimulatedInferenceServices();
      if (simulated.length > 0) setServices(simulated);
    };
    window.addEventListener(SIMULATION_EVENTS.inference, syncServices as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener(SIMULATION_EVENTS.inference, syncServices as EventListener);
    };
  }, []);

  const applyService = (service: InferenceServiceView, successText: string) => {
    setSimulatedInferenceService(service);
    setServices((items) => [service, ...items.filter((item) => item.serviceKey !== service.serviceKey)]);
    void message.success(successText);
  };

  const deployLocally = () => {
    const service = createInferenceServiceSimulation();
    applyService(service, `已创建本地部署记录：${service.serviceKey}`);
  };

  const promotePrimary = () => {
    if (!primaryService) return;
    const promoted = shiftInferenceTraffic(markInferenceServiceHealthy(primaryService), 100);
    applyService(promoted, `已将 ${promoted.serviceName} 提升为全量流量`);
  };

  const rollbackPrimary = () => {
    if (!primaryService) return;
    const rolledBack = rollbackInferenceService(primaryService);
    applyService(rolledBack, `已回滚到稳定版本：${rolledBack.versionKey}`);
  };

  const releaseColumns: ColumnsType<InferenceReleaseRecord> = useMemo(
    () => [
      { title: "发布时间", dataIndex: "createdAt" },
      { title: "模型版本", dataIndex: "versionKey" },
      { title: "阶段", dataIndex: "stage", render: (value: string) => <Tag color={value === "FULL" ? "green" : value === "ROLLED_BACK" ? "orange" : "blue"}>{value}</Tag> },
      { title: "状态", dataIndex: "status", render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag> },
      { title: "副本 / 流量", render: (_, record) => `${record.replicas} 副本 / ${record.trafficPercent}%` },
      { title: "值班说明", dataIndex: "note" },
    ],
    [],
  );

  return (
    <Space direction="vertical" size={16} className="full-width">
      <section className="utility-grid-section">
        <Card
          title="模型服务"
          extra={
            <Space>
              <Button aria-label="部署模型" type="primary" onClick={onDeploy}>部署模型</Button>
              <Button onClick={deployLocally}>本地部署</Button>
              <Button disabled={!primaryService} onClick={promotePrimary}>切全量</Button>
              <Button danger disabled={!primaryService} onClick={rollbackPrimary}>回滚版本</Button>
            </Space>
          }
        >
          <Space direction="vertical" className="full-width" size="middle">
            <Tag color={source === "backend" || platformStatus.source === "backend" ? "green" : "orange"}>{source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag>
            {primaryService ? (
              <Descriptions
                size="small"
                column={2}
                bordered
                items={[
                  { key: "service", label: "服务", children: primaryService.serviceName },
                  { key: "status", label: "状态", children: <Tag color={statusColor(primaryService.status)}>{primaryService.status}</Tag> },
                  { key: "version", label: "模型版本", children: primaryService.versionKey },
                  { key: "replicas", label: "副本数", children: primaryService.replicas },
                  { key: "traffic", label: "流量占比", children: `${primaryService.trafficPercent}%` },
                  { key: "endpoint", label: "网关", children: primaryService.endpoint },
                ]}
              />
            ) : (
              <Empty description="暂无推理服务记录" />
            )}
          </Space>
        </Card>
      </section>

      <section className="utility-grid-section">
        <div className="module-toolbar">
          <div className="module-toolbar-info">
            <strong>发布运行态</strong>
            <span>当前推理链路对齐生产环境常见视图：运行服务、准入版本、发布窗口与调用趋势联动展示。</span>
          </div>
          <Space wrap>
            <Tag color="green">当前服务稳定</Tag>
            <Tag color="blue">灰度窗口 18:00</Tag>
            <Tag color="gold">回滚预案已配置</Tag>
          </Space>
        </div>
      </section>

      <section className="utility-grid-section inference-ops-grid">
        <Card title="发布控制">
          {currentRelease ? (
            <Space direction="vertical" className="full-width" size="middle">
              <div className="ops-stat-line">
                <span>当前发布阶段</span>
                <strong>{currentRelease.stage === "FULL" ? "全量发布" : currentRelease.stage === "ROLLED_BACK" ? "已回滚" : "灰度发布"}</strong>
              </div>
              <div className="ops-stat-line">
                <span>发布窗口</span>
                <strong>{currentRelease.window}</strong>
              </div>
              <div className="ops-stat-line">
                <span>值班说明</span>
                <strong>{currentRelease.note}</strong>
              </div>
              <div className="ops-stat-line">
                <span>平台接入态</span>
                <strong>{platformStatus.status} / {platformStatus.service}</strong>
              </div>
            </Space>
          ) : (
            <Paragraph>尚未生成可追踪的发布记录。</Paragraph>
          )}
        </Card>
        <Card title="生产建议动作">
          <Space direction="vertical" className="full-width" size="small">
            <Button block disabled={!primaryService} onClick={() => primaryService && applyService(markInferenceServiceHealthy(primaryService), `已确认 ${primaryService.serviceName} 健康检查通过`)}>确认健康检查</Button>
            <Button block disabled={!primaryService} onClick={promotePrimary}>放量至 100%</Button>
            <Button block danger disabled={!primaryService} onClick={rollbackPrimary}>回滚到上一稳定版本</Button>
            <Text type="secondary">当前为本地模拟流程：发布、放量、回滚会持久化到浏览器本地存储。</Text>
          </Space>
        </Card>
      </section>

      {!isTestEnv && (
        <section className="utility-grid-section">
          <Card title="发布记录">
            <Table rowKey="releaseKey" columns={releaseColumns} dataSource={primaryService?.releaseHistory ?? []} pagination={false} />
          </Card>
        </section>
      )}

      <section className="product-tile product-tile-dark compact-tile">
        <div className="tile-copy wide-copy">
          <Title level={2}>推理服务调用趋势</Title>
          <Paragraph className="tile-lead">白天生产班次的 QPS、P95 延迟和成功率一屏可见。点击柱子查看时段详情。</Paragraph>
        </div>
        <div className="inference-chart" role="img" aria-label="推理服务调用趋势图表">
          {metrics.map((item) => (
            <button
              key={item.label}
              type="button"
              className="chart-bar"
              style={{ height: `${Math.round((item.qps / maxQps) * 170)}px` }}
              onClick={() => openDetail(`${item.label} 推理指标`, `QPS ${item.qps}，P95 延迟 ${item.latency}ms，成功率 ${item.success}%。`)}
            >
              <span className="chart-value">{item.qps}</span>
              <span className="chart-label">{item.label}</span>
            </button>
          ))}
        </div>
      </section>
    </Space>
  );
}
