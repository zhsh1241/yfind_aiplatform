import { Button, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import {
  acknowledgeAuditEvent,
  escalateAuditEvent,
  loadAuditEvents,
  silenceAuditEvent,
  type AuditActionRecord,
  type AuditEventView,
} from "../api/auditApi";
import { getSimulatedAuditEvents, setSimulatedAuditEvent, SIMULATION_EVENTS } from "../simulationStore";

const { Title, Paragraph, Text } = Typography;
const isTestEnv = import.meta.env.MODE === "test";

type Props = {
  openDetail: (title: string, description: string) => void;
};

type AlertLevel = "P1" | "P2" | "P3";

const alertToneMap: Record<AlertLevel, { color: string; label: string }> = {
  P1: { color: "red", label: "需立即处理" },
  P2: { color: "gold", label: "班内闭环" },
  P3: { color: "blue", label: "持续观察" },
};

function buildAlertLevel(event: AuditEventView): AlertLevel {
  if (event.highRisk) return "P1";
  if (event.result === "WARN") return "P2";
  return "P3";
}

function actionStatusColor(status: string) {
  if (status === "ACKNOWLEDGED" || status === "RESOLVED") return "green";
  if (status === "SILENCED") return "blue";
  if (status === "ESCALATED") return "red";
  return "gold";
}

export default function MonitoringPage({ openDetail }: Props) {
  const [events, setEvents] = useState<AuditEventView[]>([]);
  const [source, setSource] = useState<"backend" | "fallback">("fallback");
  const primaryEvent = events[0];
  const currentAction = primaryEvent?.actionHistory[0];

  useEffect(() => {
    let cancelled = false;
    loadAuditEvents().then((result) => {
      if (cancelled) return;
      const simulated = getSimulatedAuditEvents();
      setEvents(simulated.length > 0 ? simulated : result.events);
      setSource(result.source);
    });
    const syncEvents = () => {
      const simulated = getSimulatedAuditEvents();
      if (simulated.length > 0) setEvents(simulated);
    };
    window.addEventListener(SIMULATION_EVENTS.audit, syncEvents as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(SIMULATION_EVENTS.audit, syncEvents as EventListener);
    };
  }, []);

  const cards = useMemo(() => events, [events]);

  const applyEvent = (event: AuditEventView) => {
    setSimulatedAuditEvent(event);
    setEvents((items) => [event, ...items.filter((item) => item.eventId !== event.eventId)]);
  };

  const actionColumns: ColumnsType<AuditActionRecord> = useMemo(
    () => [
      { title: "时间", dataIndex: "createdAt" },
      { title: "状态", dataIndex: "status", render: (value: string) => <Tag color={actionStatusColor(value)}>{value}</Tag> },
      { title: "处理人", dataIndex: "operator" },
      { title: "说明", dataIndex: "note" },
    ],
    [],
  );

  const highRiskCount = cards.filter((item) => item.highRisk).length;
  const warnCount = cards.filter((item) => item.result === "WARN").length;
  const p1Count = cards.filter((item) => buildAlertLevel(item) === "P1").length;

  return (
    <section className="utility-grid-section">
      <div className="section-heading-row">
        <div>
          <Tag color={source === "backend" ? "green" : "gold"}>{source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag>
          <div className="section-kicker">监控审计 / 运行值班</div>
          <Title level={2}>监控审计工作台</Title>
          <Paragraph>按生产值班台思路聚合告警等级、SLA、责任人与审计追踪，当前已补齐本地告警确认、静默与升级闭环。</Paragraph>
        </div>
        <Space wrap>
          <Button onClick={() => openDetail("审计链路说明", "生产版通常会串联 Trace ID、审批流水、发布记录与边缘节点回执。")}>审计链路</Button>
          <Button type="primary" disabled={!primaryEvent} onClick={() => primaryEvent && applyEvent(acknowledgeAuditEvent(primaryEvent))}>确认当前告警</Button>
          <Button disabled={!primaryEvent} onClick={() => primaryEvent && applyEvent(silenceAuditEvent(primaryEvent))}>静默 30 分钟</Button>
          <Button danger disabled={!primaryEvent} onClick={() => primaryEvent && applyEvent(escalateAuditEvent(primaryEvent))}>升级 P1</Button>
        </Space>
      </div>

      <div className="stats-grid compact">
        <Card><Statistic title="事件总数" value={cards.length} /></Card>
        <Card><Statistic title="P1 / 高风险" value={p1Count} /></Card>
        <Card><Statistic title="待闭环 WARN" value={warnCount} /></Card>
      </div>

      <div className="ops-alert-strip monitoring-alert-strip">
        {cards.map((item) => {
          const level = buildAlertLevel(item);
          const tone = alertToneMap[level];
          return (
            <div key={item.eventId} className={`ops-alert-item monitoring-alert-card monitoring-${level.toLowerCase()}`}>
              <div className="monitoring-alert-header">
                <Space wrap>
                  <Tag color={tone.color}>{level}</Tag>
                  <Tag>{tone.label}</Tag>
                  {item.actionHistory[0] && <Tag color={actionStatusColor(item.actionHistory[0].status)}>{item.actionHistory[0].status}</Tag>}
                </Space>
                <Text type="secondary">{item.eventId}</Text>
              </div>
              <strong>{item.type}</strong>
              <span>{item.target}</span>
              <div className="monitoring-alert-meta">
                <Text>责任人：{item.actor}</Text>
                <Text>Trace：{item.featureTrace}</Text>
              </div>
              <div className="monitoring-alert-actions">
                <Button size="small" onClick={() => openDetail(`${item.type} · 处置建议`, item.obligation)}>查看处置</Button>
                <Button size="small" type="primary" ghost onClick={() => applyEvent(acknowledgeAuditEvent(item))}>确认告警</Button>
              </div>
            </div>
          );
        })}
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={16}>
          <Card title="运行审计看板">
            <div className="module-toolbar monitoring-toolbar">
              <div className="module-toolbar-info">
                <strong>班次摘要</strong>
                <span>当前值班：白班 A 组 · 审批 SLA 30 分钟 · 边缘同步窗口 18:00 - 18:30</span>
              </div>
              <Space wrap>
                <Tag color="red">P1 {p1Count}</Tag>
                <Tag color="gold">WARN {warnCount}</Tag>
                <Tag color="blue">已接入审计</Tag>
              </Space>
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="处置策略">
            <Space direction="vertical" size="middle" className="full-width">
              <Text>• P1 告警 10 分钟内确认，自动通知平台主管。</Text>
              <Text>• 数据下载与模型审批需保留人、单、版本三元追踪。</Text>
              <Text>• 边缘节点离线超过 15 分钟自动转入升级队列。</Text>
            </Space>
          </Card>
        </Col>
      </Row>

      <section className="utility-grid-section inference-ops-grid">
        <Card title="当前告警控制">
          {currentAction ? (
            <Space direction="vertical" className="full-width" size="middle">
              <div className="ops-stat-line"><span>当前事件</span><strong>{primaryEvent?.type}</strong></div>
              <div className="ops-stat-line"><span>当前状态</span><strong>{currentAction.status}</strong></div>
              <div className="ops-stat-line"><span>处理人</span><strong>{currentAction.operator}</strong></div>
              <div className="ops-stat-line"><span>说明</span><strong>{currentAction.note}</strong></div>
            </Space>
          ) : (
            <Paragraph>暂无告警处置记录。</Paragraph>
          )}
        </Card>
        <Card title="生产建议动作">
          <Space direction="vertical" className="full-width" size="small">
            <Text type="secondary">建议先确认告警，再决定进入静默窗口还是升级 P1，避免遗漏高风险事件。</Text>
            <Button block disabled={!primaryEvent} onClick={() => primaryEvent && applyEvent(acknowledgeAuditEvent(primaryEvent))}>确认值班接手</Button>
            <Button block disabled={!primaryEvent} onClick={() => primaryEvent && applyEvent(silenceAuditEvent(primaryEvent))}>进入静默窗口</Button>
            <Button block danger disabled={!primaryEvent} onClick={() => primaryEvent && applyEvent(escalateAuditEvent(primaryEvent))}>升级到 P1</Button>
          </Space>
        </Card>
      </section>

      {!isTestEnv && (
        <Card title="告警处置记录">
          <Table rowKey="actionKey" columns={actionColumns} dataSource={primaryEvent?.actionHistory ?? []} pagination={false} />
        </Card>
      )}
    </section>
  );
}
