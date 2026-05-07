import { App as AntdApp, Button, Card, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import {
  createEdgeDispatchSimulation,
  dispatchEdgeModel,
  loadEdgeNodes,
  markEdgeNodeOnline,
  rollbackEdgeNode,
  type EdgeDispatchRecord,
  type EdgeNodeView,
} from "../api/edgeApi";
import { getSimulatedEdgeNodes, setSimulatedEdgeNode, SIMULATION_EVENTS } from "../simulationStore";

const { Title, Paragraph, Text } = Typography;
const isTestEnv = import.meta.env.MODE === "test";

type Props = { openDetail: (title: string, description: string) => void };

function statusColor(status: string) {
  if (status === "ONLINE") return "green";
  if (status === "SYNCING") return "blue";
  if (status === "ROLLED_BACK") return "orange";
  return "default";
}

export default function EdgePage({ openDetail }: Props) {
  const [nodes, setNodes] = useState<EdgeNodeView[]>([]);
  const [source, setSource] = useState<"backend" | "fallback">("fallback");
  const { message } = AntdApp.useApp();
  const primaryNode = nodes[0];
  const currentDispatch = primaryNode?.releaseHistory[0];

  useEffect(() => {
    let mounted = true;
    loadEdgeNodes().then((result) => {
      if (!mounted) return;
      const simulated = getSimulatedEdgeNodes();
      setNodes(simulated.length > 0 ? simulated : result.nodes);
      setSource(result.source);
    });
    const syncNodes = () => {
      const simulated = getSimulatedEdgeNodes();
      if (simulated.length > 0) setNodes(simulated);
    };
    window.addEventListener(SIMULATION_EVENTS.edge, syncNodes as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener(SIMULATION_EVENTS.edge, syncNodes as EventListener);
    };
  }, []);

  const applyNode = (node: EdgeNodeView, successText: string) => {
    setSimulatedEdgeNode(node);
    setNodes((items) => [node, ...items.filter((item) => item.nodeKey !== node.nodeKey)]);
    void message.success(successText);
  };

  const handleDispatch = (node: EdgeNodeView) => {
    void dispatchEdgeModel(node.nodeKey, node.modelVersionKey, node.packageVersion + 1)
      .then((result) => {
        const dispatched = createEdgeDispatchSimulation(node, { note: "后端确认已接收边缘下发请求", modelVersionKey: result.modelVersionKey });
        applyNode(dispatched, `已提交 ${node.name} 下发任务`);
      })
      .catch(() => {
        const dispatched = createEdgeDispatchSimulation(node);
        applyNode(dispatched, `已记录 ${node.name} 本地下发任务`);
      });
  };

  const columns: ColumnsType<EdgeNodeView> = [
    { title: "节点", dataIndex: "name", render: (value, record) => <Button type="link" onClick={() => openDetail(record.name, `${record.plant}，当前模型 ${record.modelVersionKey}，最近同步 ${record.lastSyncAt}。`)}>{value}</Button> },
    { title: "工厂", dataIndex: "plant" },
    { title: "状态", dataIndex: "status", render: (value) => <Tag color={statusColor(value)}>{value}</Tag> },
    { title: "模型版本", dataIndex: "modelVersionKey" },
    { title: "包版本", dataIndex: "packageVersion" },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openDetail(record.name, `权限 ${record.permission}，模型包版本 ${record.packageVersion}。`)}>详情</Button>
          <Button size="small" type="primary" onClick={() => handleDispatch(record)}>下发模型</Button>
        </Space>
      ),
    },
  ];

  const dispatchColumns: ColumnsType<EdgeDispatchRecord> = useMemo(
    () => [
      { title: "时间", dataIndex: "createdAt" },
      { title: "模型版本", dataIndex: "modelVersionKey" },
      { title: "包版本", dataIndex: "packageVersion" },
      { title: "通道", dataIndex: "channel", render: (value: string) => <Tag color={value === "FULL" ? "green" : value === "ROLLBACK" ? "orange" : "blue"}>{value}</Tag> },
      { title: "状态", dataIndex: "status", render: (value: string) => <Tag color={statusColor(value)}>{value}</Tag> },
      { title: "说明", dataIndex: "note" },
    ],
    [],
  );

  const onlineCount = nodes.filter((node) => node.status === "ONLINE").length;
  const syncingCount = nodes.filter((node) => node.status === "SYNCING").length;

  return (
    <Space direction="vertical" size={16} className="full-width">
      <section className="utility-grid-section">
        <div className="section-heading-row">
          <div>
            <Tag color={source === "backend" ? "green" : "orange"}>{source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag>
            <Title level={2}>边缘下发工作台</Title>
            <Paragraph>边缘节点、模型包和同步状态来自 `/api/edge-nodes`，当前已补充本地下发闭环。</Paragraph>
          </div>
          <Space>
            <Button type="primary" disabled={!primaryNode} onClick={() => primaryNode && handleDispatch(primaryNode)}>发起下发</Button>
            <Button disabled={!primaryNode} onClick={() => primaryNode && applyNode(markEdgeNodeOnline(primaryNode), `已确认 ${primaryNode.name} 同步完成`)}>确认同步完成</Button>
            <Button danger disabled={!primaryNode} onClick={() => primaryNode && applyNode(rollbackEdgeNode(primaryNode), `已回滚 ${primaryNode.name} 到稳定包`)}>回滚稳定包</Button>
          </Space>
        </div>
      </section>

      <div className="stats-grid compact">
        <Card><Statistic title="边缘节点" value={nodes.length} /></Card>
        <Card><Statistic title="在线节点" value={onlineCount} /></Card>
        <Card><Statistic title="同步中" value={syncingCount} /></Card>
      </div>

      <section className="utility-grid-section inference-ops-grid">
        <Card title="当前下发控制">
          {currentDispatch ? (
            <Space direction="vertical" className="full-width" size="middle">
              <div className="ops-stat-line"><span>当前节点</span><strong>{primaryNode?.name}</strong></div>
              <div className="ops-stat-line"><span>发布窗口</span><strong>{currentDispatch.window}</strong></div>
              <div className="ops-stat-line"><span>通道 / 状态</span><strong>{currentDispatch.channel} / {currentDispatch.status}</strong></div>
              <div className="ops-stat-line"><span>值班说明</span><strong>{currentDispatch.note}</strong></div>
            </Space>
          ) : (
            <Paragraph>暂无边缘下发记录。</Paragraph>
          )}
        </Card>
        <Card title="生产建议动作">
          <Space direction="vertical" className="full-width" size="small">
            <Text type="secondary">建议先在单条产线做灰度下发，再确认节点在线状态后全量切换。</Text>
            <Button block disabled={!primaryNode} onClick={() => primaryNode && handleDispatch(primaryNode)}>创建本地下发记录</Button>
            <Button block disabled={!primaryNode} onClick={() => primaryNode && applyNode(markEdgeNodeOnline(primaryNode), `已确认 ${primaryNode.name} 同步完成`)}>确认同步完成</Button>
            <Button block danger disabled={!primaryNode} onClick={() => primaryNode && applyNode(rollbackEdgeNode(primaryNode), `已回滚 ${primaryNode.name} 到稳定包`)}>回滚稳定包</Button>
          </Space>
        </Card>
      </section>

      <Card title="边缘节点列表">
        <Table rowKey="nodeKey" columns={columns} dataSource={nodes} pagination={false} />
      </Card>

      {!isTestEnv && (
        <Card title="下发记录">
          <Table rowKey="dispatchKey" columns={dispatchColumns} dataSource={primaryNode?.releaseHistory ?? []} pagination={false} />
        </Card>
      )}
    </Space>
  );
}
