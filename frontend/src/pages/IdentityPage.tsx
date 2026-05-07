import { Alert, App as AntdApp, Button, Card, Col, Descriptions, List, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import {
  approveBackendIdentityRequest,
  approveIdentityRequest,
  loadIdentity,
  loginWithApprovedAuthorization,
  restoreIdentitySession,
  signOutIdentitySession,
  type loadIdentity as LoadIdentityType,
} from "../api/identityApi";
import { type ModuleKey } from "../prototype-data";
import { SIMULATION_EVENTS } from "../simulationStore";

type Props = {
  modules: Array<{ key: ModuleKey; label: string }>;
  openDetail: (title: string, description: string) => void;
  onOpenPermission: () => void;
};

type IdentityState = Awaited<ReturnType<typeof LoadIdentityType>>;

type ApprovalRow = IdentityState["approvalRequests"][number];

const { Text, Title, Paragraph } = Typography;

export default function IdentityPage({ modules, openDetail, onOpenPermission }: Props) {
  const [identity, setIdentity] = useState<IdentityState | null>(null);
  const { message } = AntdApp.useApp();

  useEffect(() => {
    let cancelled = false;
    const syncIdentity = () => {
      void loadIdentity().then((result) => {
        if (!cancelled) setIdentity(result);
      });
    };
    syncIdentity();
    window.addEventListener(SIMULATION_EVENTS.identity, syncIdentity);
    return () => {
      cancelled = true;
      window.removeEventListener(SIMULATION_EVENTS.identity, syncIdentity);
    };
  }, []);

  const grantedCount = useMemo(() => {
    if (!identity) return 0;
    return modules.filter((item) => identity.user.permissions.includes(identity.permissionMap[item.key])).length;
  }, [identity, modules]);

  const pendingApprovalCount = useMemo(() => identity?.approvalRequests.filter((item) => item.status === "PENDING").length ?? 0, [identity]);
  const sessionTone = useMemo(() => {
    if (!identity) return { type: "info" as const, label: "加载中" };
    if (identity.session.loginStatus === "ACTIVE") return { type: "success" as const, label: "登录状态正常" };
    if (identity.session.loginStatus === "PENDING") return { type: "warning" as const, label: "登录授权待审批" };
    return { type: "info" as const, label: "当前已退出登录" };
  }, [identity]);

  if (!identity) {
    return <section className="utility-grid-section">正在加载组织权限...</section>;
  }

  const refreshIdentity = async () => {
    const next = await loadIdentity();
    setIdentity(next);
  };

  const handleApprove = async (requestId: string) => {
    if (identity.source === "backend") {
      await approveBackendIdentityRequest(requestId);
      await loginWithApprovedAuthorization(requestId);
      await refreshIdentity();
      void message.success("已批准授权并切换到目标登录态");
      return;
    }
    const result = approveIdentityRequest(requestId, identity.user.username);
    if (!result) return;
    await refreshIdentity();
    void message.success(`已批准 ${result.request.requestedRoleLabel} 登录授权`);
  };

  const handleSignOut = async () => {
    signOutIdentitySession();
    await refreshIdentity();
    void message.success("已退出当前登录态");
  };

  const handleRestore = async () => {
    restoreIdentitySession();
    await refreshIdentity();
    void message.success("已恢复本地登录态");
  };

  const approvalColumns: ColumnsType<ApprovalRow> = [
    { title: "申请角色", dataIndex: "requestedRoleLabel" },
    { title: "申请人", dataIndex: "submittedBy" },
    { title: "申请原因", dataIndex: "reason" },
    { title: "状态", dataIndex: "status", render: (value: ApprovalRow["status"]) => <Tag color={value === "APPROVED" ? "green" : "gold"}>{value === "APPROVED" ? "已批准" : "待审批"}</Tag> },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openDetail("授权申请详情", `工单 ${record.requestId}：${record.requestedRoleLabel}，申请人 ${record.submittedBy}，原因 ${record.reason}。`)}>详情</Button>
          {record.status === "PENDING" ? <Button size="small" type="primary" onClick={() => void handleApprove(record.requestId)}>批准登录</Button> : null}
        </Space>
      ),
    },
  ];

  return (
    <section className="utility-grid-section identity-page-shell">
      <section className="identity-hero-card">
        <div className="identity-hero-copy">
          <Tag color={identity.source === "backend" ? "green" : "gold"}>{identity.source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag>
          <div className="section-kicker">身份与访问控制</div>
          <Title level={2}>组织权限</Title>
          <Paragraph className="tight-paragraph">把组织身份、登录状态、授权审批和权限门禁放在同一个页面里，便于值班、审计和排查。</Paragraph>
        </div>
        <div className="identity-session-chip-group">
          <div className="identity-session-chip">
            <span>当前会话</span>
            <strong>{sessionTone.label}</strong>
            <small>{identity.session.authTicket}</small>
          </div>
          <div className="identity-session-chip">
            <span>审批待办</span>
            <strong>{pendingApprovalCount}</strong>
            <small>待处理授权申请</small>
          </div>
        </div>
      </section>

      <div className="stats-grid compact identity-kpi-grid">
        <Card className="identity-kpi-card"><Statistic title="组织" value={identity.user.organization} /></Card>
        <Card className="identity-kpi-card"><Statistic title="已放行模块" value={grantedCount} /></Card>
        <Card className="identity-kpi-card"><Statistic title="认证方式" value={identity.user.authMethod} /></Card>
        <Card className="identity-kpi-card"><Statistic title="待审批授权" value={pendingApprovalCount} /></Card>
      </div>

      <Row gutter={[20, 20]} align="stretch">
        <Col xs={24} xl={10}>
          <Card title="当前用户上下文" className="identity-main-card" extra={<Button type="primary" onClick={onOpenPermission}>发起授权登录</Button>}>
            <Descriptions column={1} size="small" items={[
              { key: "displayName", label: "用户", children: identity.user.displayName },
              { key: "username", label: "账号", children: identity.user.username },
              { key: "organization", label: "组织", children: identity.user.organization },
              { key: "authMethod", label: "认证方式", children: identity.user.authMethod },
              { key: "iamProvider", label: "IAM Provider", children: identity.user.iamProvider },
            ]} />

            <Alert
              className="identity-status-alert"
              type={sessionTone.type}
              message={sessionTone.label}
              description={`票据 ${identity.session.authTicket} · 审批/处理人 ${identity.session.approver} · 最近登录 ${identity.session.lastLoginAt}`}
              showIcon
            />

            <Space wrap className="identity-session-actions">
              <Button onClick={() => void handleRestore()}>恢复登录</Button>
              <Button danger onClick={() => void handleSignOut()}>退出登录</Button>
            </Space>

            <List
              size="small"
              className="identity-permission-list"
              header="当前权限集合"
              dataSource={identity.user.permissions}
              renderItem={(permission) => <List.Item>{permission}</List.Item>}
            />
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card title="权限门禁矩阵" className="identity-main-card">
            <List
              dataSource={modules}
              renderItem={(item) => {
                const permission = identity.permissionMap[item.key];
                const granted = identity.user.permissions.includes(permission);
                return (
                  <List.Item actions={[<Button key="detail" onClick={() => openDetail(`${item.label} 权限`, `${permission}：${granted ? "已放行" : "默认拒绝"}。未知权限必须默认拒绝并进入审计。`)}>详情</Button>]}> 
                    <List.Item.Meta title={item.label} description={permission} />
                    <Tag color={granted ? "green" : "red"}>{granted ? "已放行" : "默认拒绝"}</Tag>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginTop: 4 }}>
        <Col span={24}>
          <Card title="审批工作台" className="identity-main-card" extra={<Text type="secondary">审批通过后自动切换到目标角色并恢复有效登录态</Text>}>
            <Table rowKey="requestId" columns={approvalColumns} dataSource={identity.approvalRequests} pagination={false} locale={{ emptyText: "暂无待处理授权申请" }} />
          </Card>
        </Col>
      </Row>
    </section>
  );
}
