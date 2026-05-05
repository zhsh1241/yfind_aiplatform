import { Button, Card, Col, Descriptions, List, Row, Tag } from "antd";
import { frontendUser, moduleRequiredPermissions, type ModuleKey } from "../prototype-data";

type Props = {
  modules: Array<{ key: ModuleKey; label: string }>;
  openDetail: (title: string, description: string) => void;
  onOpenPermission: () => void;
};

export default function IdentityPage({ modules, openDetail, onOpenPermission }: Props) {
  return (
    <section className="utility-grid-section">
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={10}>
          <Card title="当前用户上下文" extra={<Button onClick={onOpenPermission}>模拟登录</Button>}>
            <Descriptions column={1} size="small" items={[
              { key: "displayName", label: "用户", children: frontendUser.displayName },
              { key: "username", label: "账号", children: frontendUser.username },
              { key: "organization", label: "组织", children: frontendUser.organization },
              { key: "authMethod", label: "认证方式", children: frontendUser.authMethod },
              { key: "iamProvider", label: "IAM Provider", children: frontendUser.iamProvider },
            ]} />
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title="权限门禁矩阵">
            <List
              dataSource={modules}
              renderItem={(item) => {
                const permission = moduleRequiredPermissions[item.key];
                const granted = frontendUser.permissions.includes(permission);
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
    </section>
  );
}
