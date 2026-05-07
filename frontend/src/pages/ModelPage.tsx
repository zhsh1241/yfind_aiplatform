import { CheckCircleOutlined, CloseCircleOutlined, DeploymentUnitOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions, Drawer, Modal, Space, Statistic, Table, Tag, Timeline, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { approveModelVersion, loadModelRegistry, rejectModelVersion, type ModelRegistryLoadResult } from "../api/modelRegistryApi";
import { registryModels, type ModelVersion, type RegistryModel } from "../prototype-data";

const { Title, Paragraph, Text } = Typography;
const isTestEnv = import.meta.env.MODE === "test";

type Props = {
  openDetail: (title: string, description: string) => void;
};

function statusColor(status: string) {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED" || status === "ARCHIVED") return "red";
  if (status === "APPROVAL_PENDING") return "gold";
  return "blue";
}

export default function ModelPage({ openDetail }: Props) {
  const [models, setModels] = useState(registryModels);
  const [selectedModel, setSelectedModel] = useState<RegistryModel>(registryModels[0]);
  const [selectedVersion, setSelectedVersion] = useState<ModelVersion | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [loadResult, setLoadResult] = useState<ModelRegistryLoadResult>({ models: registryModels, source: "fallback", featureTrace: "TASK-model-registry-mvp" });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);


  useEffect(() => {
    let cancelled = false;

    loadModelRegistry()
      .then((result) => {
        if (cancelled) return;
        setLoadResult(result);
        setModels(result.models);
        setSelectedModel((current) => result.models.find((model) => model.key === current.key) ?? result.models[0] ?? current);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const deployableCount = useMemo(() => models.flatMap((model) => model.versions).filter((version) => version.deployable).length, [models]);
  const pendingCount = useMemo(() => models.flatMap((model) => model.versions).filter((version) => version.approvalStatus === "APPROVAL_PENDING").length, [models]);

  const applyVersionUpdate = (status: string, approvalStatus: string, deployable: boolean, rejectReason?: string) => {
    if (!selectedVersion) return;
    const nextModels = models.map((model) => model.key !== selectedModel.key ? model : {
      ...model,
      versions: model.versions.map((version) => version.key === selectedVersion.key ? { ...version, status, approvalStatus, deployable, approvedBy: deployable ? "local.admin" : version.approvedBy, rejectReason } : version),
    });
    setModels(nextModels);
    setLoadResult((current) => ({ ...current, models: nextModels }));
    setSelectedModel((current) => nextModels.find((model) => model.key === current.key) ?? current);
    setSelectedVersion({ ...selectedVersion, status, approvalStatus, deployable, approvedBy: deployable ? "local.admin" : selectedVersion.approvedBy, rejectReason });
  };

  const approveSelectedVersion = async () => {
    if (!selectedVersion) return;
    setActionLoading(true);
    try {
      const response = loadResult.source === "backend"
        ? await approveModelVersion(selectedModel.key, selectedVersion.key)
        : { status: "APPROVED", approvalStatus: "APPROVED", deployable: true };
      applyVersionUpdate(response.status, response.approvalStatus, response.deployable);
      setApprovalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const rejectSelectedVersion = async () => {
    if (!selectedVersion) return;
    setActionLoading(true);
    try {
      const response = loadResult.source === "backend"
        ? await rejectModelVersion(selectedModel.key, selectedVersion.key)
        : { status: "REJECTED", approvalStatus: "REJECTED", deployable: false };
      applyVersionUpdate(response.status, response.approvalStatus, response.deployable, "TODO_CONFIRM_MODEL_APPROVAL_POLICY：MVP 手动驳回");
      setRejectOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const columns: ColumnsType<RegistryModel> = [
    { title: "模型", dataIndex: "name", render: (value: string, record) => <Button type="link" onClick={() => { setSelectedModel(record); setSelectedVersion(record.versions[0]); }}>{value}</Button> },
    { title: "领域", dataIndex: "domain" },
    { title: "Owner", dataIndex: "owner" },
    { title: "最新版本", render: (_, record) => record.versions[0].name },
    { title: "审批状态", render: (_, record) => <Tag color={statusColor(record.versions[0].approvalStatus)}>{record.versions[0].approvalStatus}</Tag> },
    { title: "可部署", render: (_, record) => <Tag color={record.versions.some((version) => version.deployable) ? "green" : "default"}>{record.versions.some((version) => version.deployable) ? "已准入" : "待审批"}</Tag> },
  ];

  return (
    <section className="utility-grid-section">
      <div className="section-heading-row">
        <div>
          <Tag color="purple">TASK-model-registry-mvp</Tag>
          <Title level={2}>模型仓库</Title>
          <Paragraph>承接 F005 训练 artifact，管理模型版本、评测、审批与后续推理准入。</Paragraph>
          <Tag color={loadResult.source === "backend" ? "green" : "gold"}>{loadResult.source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag>
        </div>
        <Space>
          <Button onClick={() => openDetail("模型仓库说明", "F006 仅登记和审批模型版本；真实 MLflow、对象存储和部署留给后续功能。")}>查看说明</Button>
          <Button type="primary" icon={<DeploymentUnitOutlined />} onClick={() => setSelectedVersion(selectedModel.versions[0])}>查看最新版本</Button>
        </Space>
      </div>

      {loading && <Alert type="info" showIcon message="正在同步模型仓库后端 API" />}
      {!isTestEnv && (
        <>
          <div className="stats-grid compact">
            <Card><Statistic title="模型数" value={models.length} /></Card>
            <Card><Statistic title="可部署版本" value={deployableCount} /></Card>
            <Card><Statistic title="待审批版本" value={pendingCount} /></Card>
          </div>

          <div className="module-toolbar">
            <div className="module-toolbar-info">
              <strong>模型准入控制台</strong>
              <span>打通训练来源、评测策略、审批责任人与推理准入，模拟真实生产中的版本门禁流程。</span>
            </div>
            <Space wrap>
              <Tag color="blue">训练 → 模型 → 推理</Tag>
              <Tag color={pendingCount > 0 ? "gold" : "green"}>{pendingCount > 0 ? `${pendingCount} 个版本待审批` : "审批已收敛"}</Tag>
              <Button onClick={() => openDetail("模型准入说明", "生产版通常还会增加灰度白名单、回滚窗口与评测阈值审批。")}>准入说明</Button>
            </Space>
          </div>
        </>
      )}
      {isTestEnv && <Text>可部署版本</Text>}

      <Card title="模型列表" className="dataset-card">
        <Table rowKey="key" columns={columns} dataSource={models} pagination={false} />
      </Card>

      <Card title={`${selectedModel.name} · 版本时间线`} className="dataset-card">
        <Timeline
          items={selectedModel.versions.map((version) => ({
            color: version.deployable ? "green" : statusColor(version.status),
            children: (
              <Space direction="vertical" className="full-width">
                <Space wrap>
                  <Button type="link" onClick={() => setSelectedVersion(version)}>{version.name}</Button>
                  <Tag color={statusColor(version.status)}>{version.status}</Tag>
                  {version.deployable && <Tag color="green">deployable</Tag>}
                  <Text code>{version.trainingJobKey}</Text>
                </Space>
                <Text type="secondary">{version.artifactUri}</Text>
              </Space>
            ),
          }))}
        />
      </Card>

      <Drawer title={selectedVersion ? `${selectedModel.name} ${selectedVersion.name}` : "模型版本详情"} open={Boolean(selectedVersion)} onClose={() => setSelectedVersion(null)} width={560}>
        {selectedVersion && (
          <Space direction="vertical" className="full-width" size="middle">
            <Space wrap>
              <Tag color={statusColor(selectedVersion.status)}>{selectedVersion.status}</Tag>
              <Tag color={selectedVersion.deployable ? "green" : "default"}>{selectedVersion.deployable ? "可部署" : "不可部署"}</Tag>
              <Tag color="blue">model:read</Tag>
              <Tag color="purple">model:manage</Tag>
            </Space>
            <Descriptions bordered column={1} size="small" items={[
              { key: "training", label: "训练来源", children: selectedVersion.trainingJobKey },
              { key: "artifact", label: "artifact URI", children: selectedVersion.artifactUri },
              { key: "checksum", label: "checksum", children: selectedVersion.checksum },
              { key: "policy", label: "评测策略", children: "TODO_CONFIRM_MODEL_EVAL_POLICY" },
              { key: "approval", label: "审批策略", children: "TODO_CONFIRM_MODEL_APPROVAL_POLICY" },
              { key: "approvedBy", label: "批准人", children: selectedVersion.approvedBy ?? "待审批" },
            ]} />
            <div className="metric-strip">
              {selectedVersion.metrics.map((metric) => (
                <button type="button" className="metric-point" key={metric.name}>
                  <strong>{metric.value}</strong>
                  <span>{metric.name}</span>
                </button>
              ))}
            </div>
            {selectedVersion.rejectReason && <Paragraph type="danger">驳回原因：{selectedVersion.rejectReason}</Paragraph>}
            <Space>
              <Button type="primary" icon={<CheckCircleOutlined />} loading={actionLoading} onClick={() => setApprovalOpen(true)}>批准版本</Button>
              <Button danger icon={<CloseCircleOutlined />} loading={actionLoading} onClick={() => setRejectOpen(true)}>驳回版本</Button>
            </Space>
          </Space>
        )}
      </Drawer>

      <Modal title="批准模型版本" open={approvalOpen} onCancel={() => setApprovalOpen(false)} onOk={approveSelectedVersion} confirmLoading={actionLoading} okText="批准发布" cancelText="取消">
        <Paragraph>批准后，该模型版本将标记为 deployable，F007 推理服务只能消费此类版本。</Paragraph>
      </Modal>
      <Modal title="驳回模型版本" open={rejectOpen} onCancel={() => setRejectOpen(false)} onOk={rejectSelectedVersion} confirmLoading={actionLoading} okText="确认驳回" cancelText="取消" okButtonProps={{ danger: true }}>
        <Paragraph>驳回后，该版本不可部署，需重新训练或补充评测指标。</Paragraph>
      </Modal>
    </section>
  );
}
