import { Alert, Card, Skeleton, Space, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { apiClient, type ApiResponse } from './apiClient';

export type FoundationStatus = {
  service: string;
  status: string;
  domains: string[];
  enabledCapabilities: string[];
};

async function fetchFoundationStatus(): Promise<FoundationStatus> {
  const response = await apiClient.get<ApiResponse<FoundationStatus>>('/api/v1/foundation/status');
  return response.data.data;
}

const fallbackStatus: FoundationStatus = {
  service: 'smp-frontend',
  status: 'FRONTEND_READY_API_PENDING',
  domains: ['DATA', 'MODEL', 'INFERENCE', 'RESOURCE', 'PLATFORM'],
  enabledCapabilities: ['prototype-routes', 'api-client', 'query-cache', 'antd-theme'],
};

export function FoundationStatusCard() {
  const query = useQuery({
    queryKey: ['foundation-status'],
    queryFn: fetchFoundationStatus,
    retry: 0,
  });
  const status = query.data ?? fallbackStatus;

  return (
    <Card className="foundation-card" title="工程底座状态">
      {query.isLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : null}
      {query.isError ? (
        <Alert
          type="warning"
          showIcon
          title="后端状态接口暂不可用，前端使用本地底座状态继续渲染。"
          description="启动 F003 后端后将自动读取 /api/v1/foundation/status。"
        />
      ) : null}
      <Typography.Paragraph className="status-line">
        <strong>{status.service}</strong> · {status.status}
      </Typography.Paragraph>
      <Space wrap>
        {status.domains.map((domain) => <Tag key={domain}>{domain}</Tag>)}
      </Space>
      <Space wrap className="capability-list">
        {status.enabledCapabilities.map((capability) => <Tag color="green" key={capability}>{capability}</Tag>)}
      </Space>
    </Card>
  );
}