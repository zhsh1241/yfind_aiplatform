import { Button, Card, Space, Statistic, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { loadPlatformStatus, type PlatformStatus } from "../api/platformStatusApi";

const { Paragraph } = Typography;

type Props = {
  moduleLabel: string;
  summary: string;
  openDetail: (title: string, description: string) => void;
};

export default function GenericModulePage({ moduleLabel, summary, openDetail }: Props) {
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus>({ status: "DEMO", service: "local-fallback", feature: "TASK-platform-integrated-runtime", source: "fallback" });

  useEffect(() => {
    let mounted = true;
    loadPlatformStatus().then((status) => {
      if (mounted) setPlatformStatus(status);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <section className="utility-grid-section">
      <div className="stats-grid compact">
        <Card><Statistic title="平台状态" value={platformStatus.status} /></Card>
        <Card><Statistic title="联通服务" value={platformStatus.service} /></Card>
        <Card><Statistic title="追踪任务" value={platformStatus.feature} /></Card>
      </div>
      <Card title={`${moduleLabel} 模块说明`}>
        <Space direction="vertical" className="full-width">
          <Tag color={platformStatus.source === "backend" ? "green" : "orange"}>{platformStatus.source === "backend" ? "后端 API 已连接" : "本地 fallback"}</Tag>
          <Paragraph>{summary}</Paragraph>
          <Button onClick={() => openDetail(moduleLabel, `${summary}。当前模块暂无独立工作台，已保留生产化壳层与详情说明入口。`)}>查看模块详情</Button>
        </Space>
      </Card>
    </section>
  );
}
