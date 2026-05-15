import { Card, Descriptions, Tag, Typography } from 'antd';
import type { PrototypePage as PrototypePageInfo } from './AppNavigation';

export function PrototypePage({ page }: { page: PrototypePageInfo }) {
  return (
    <Card className="page-card" title={page.label} extra={<Tag color="blue">{page.key}</Tag>}>
      <Typography.Paragraph>
        当前 F004 工程底座已保留该原型页面的路由占位；后续业务功能需参考{' '}
        <code>docs/prototype/SMP工业AI平台-原型v2.html</code> 的信息架构、交互和截图，并在对应 feature 中接入真实 API。
      </Typography.Paragraph>
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="业务分组">{page.domain}</Descriptions.Item>
        <Descriptions.Item label="页面 key">{page.key}</Descriptions.Item>
        <Descriptions.Item label="功能拆解">docs/features/FEATURE_BREAKDOWN.md</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}