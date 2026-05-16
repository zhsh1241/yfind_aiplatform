import { Button, Card, Col, Form, Input, Modal, Row, Space, Table, Tabs, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { platformApi, type AuditLogSummary } from './platformApi';
import { PermissionMatrixTable } from './UserManagementPage';

export function PermissionManagementPage() {
  const [grantOpen, setGrantOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const matrix = useQuery({ queryKey: ['platform-permission-matrix'], queryFn: platformApi.permissionMatrix });
  const audits = useQuery({ queryKey: ['platform-audit-logs'], queryFn: () => platformApi.auditLogs() });
  const auditOverview = useQuery({ queryKey: ['platform-audit-overview'], queryFn: platformApi.auditOverview });
  const approvals = auditOverview.data?.approvals ?? [];
  const grants = auditOverview.data?.grants ?? [];

  return (
    <div className="content-page">
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>权限管理</Typography.Title>
          <Typography.Text type="secondary">RBAC 角色权限矩阵 · 6 个预设角色</Typography.Text>
        </div>
        <Space>
          <Button>导出矩阵</Button>
          <Button type="primary" onClick={() => setRoleOpen(true)}>＋ 创建角色</Button>
        </Space>
      </div>

      <Tabs
        items={[
          {
            key: 'overview',
            label: '当前权限概览',
            children: (
              <Space orientation="vertical" size={16} className="full-width">
                <PermissionMatrixTable matrix={matrix.data} loading={matrix.isLoading} />
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={8}>
                    <Card title="待审批" extra={<Tag color="orange">{approvals.length}</Tag>}>
                      <Space orientation="vertical" className="full-width">
                        {approvals.map((item) => <Card key={item.title} size="small"><strong>{item.title}</strong><br /><span className="muted">{item.time} · 风险 {item.risk}</span></Card>)}
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} lg={16}>
                    <Card title="数据集访问授权" extra={<Button size="small" onClick={() => setGrantOpen(true)}>添加授权</Button>}>
                      <Table rowKey={(row) => `${row.user}-${row.scope}`} size="small" loading={auditOverview.isLoading} dataSource={grants} pagination={false} columns={[
                        { title: '授权对象', dataIndex: 'user' },
                        { title: '角色', dataIndex: 'role' },
                        { title: '范围', dataIndex: 'scope' },
                        { title: '有效期', dataIndex: 'expire' },
                      ]} />
                    </Card>
                  </Col>
                </Row>
              </Space>
            ),
          },
          {
            key: 'history',
            label: '申请历史',
            children: <AuditTable items={audits.data?.items ?? []} loading={audits.isLoading} />,
          },
        ]}
      />

      <Modal title="添加授权" open={grantOpen} onCancel={() => setGrantOpen(false)} onOk={() => setGrantOpen(false)}>
        <Form layout="vertical">
          <Form.Item label="授权对象"><Input defaultValue="张三" /></Form.Item>
          <Form.Item label="数据范围"><Input defaultValue="工厂视觉检测图像集 V3" /></Form.Item>
          <Form.Item label="角色"><Input defaultValue="数据标注工程师" /></Form.Item>
        </Form>
      </Modal>
      <Modal title="创建角色" open={roleOpen} onCancel={() => setRoleOpen(false)} onOk={() => setRoleOpen(false)}>
        <Form layout="vertical">
          <Form.Item label="角色名称"><Input placeholder="自定义角色名称" /></Form.Item>
          <Form.Item label="权限上限"><Input defaultValue="继承 BU子管理员 权限上限" /></Form.Item>
          <Typography.Text type="secondary">预设角色保持只读；自定义角色权限更新 seam 已在后端保留。</Typography.Text>
        </Form>
      </Modal>
    </div>
  );
}

function AuditTable({ items, loading }: { items: AuditLogSummary[]; loading?: boolean }) {
  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={items}
      pagination={false}
      columns={[
        { title: '事件', dataIndex: 'action' },
        { title: '操作人', dataIndex: 'operatorName' },
        { title: '结果', dataIndex: 'result', render: (value: string) => <Tag color={value === 'SUCCESS' ? 'green' : 'red'}>{value}</Tag> },
        { title: '风险', dataIndex: 'riskLevel', render: (value: string) => <Tag color={value === 'CRITICAL' ? 'red' : value === 'WARNING' ? 'orange' : 'blue'}>{value}</Tag> },
        { title: '签名', dataIndex: 'signature', render: (value: string) => <span className="mono">{value.slice(0, 12)}...</span> },
      ]}
    />
  );
}
