import {
  AppstoreOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router';
import type { ReactNode } from 'react';

export type PrototypeDomain = '工作台' | '数据管理' | '模型开发' | '运营中心' | '平台管理';

export type PrototypePage = {
  key: string;
  label: string;
  domain: PrototypeDomain;
};

export const prototypePages: PrototypePage[] = [
  { key: 'dash', label: '工作台', domain: '工作台' },
  { key: 'ds', label: '数据集管理', domain: '数据管理' },
  { key: 'ann', label: '标注任务', domain: '数据管理' },
  { key: 'datasrc', label: '数据源管理', domain: '数据管理' },
  { key: 'annreview', label: '标注审核', domain: '数据管理' },
  { key: 'lineage', label: '数据血缘', domain: '数据管理' },
  { key: 'pipeline', label: 'Pipeline 设计器', domain: '数据管理' },
  { key: 'opmarket', label: '算子广场', domain: '数据管理' },
  { key: 'portal', label: '数据资产门户', domain: '数据管理' },
  { key: 'devenv', label: '开发环境', domain: '模型开发' },
  { key: 'train', label: '训练监控', domain: '模型开发' },
  { key: 'exp', label: '实验管理', domain: '模型开发' },
  { key: 'eval', label: '模型评估', domain: '模型开发' },
  { key: 'hub', label: '模型市场', domain: '模型开发' },
  { key: 'infer', label: '推理服务', domain: '模型开发' },
  { key: 'batch', label: '批量推理', domain: '模型开发' },
  { key: 'sched', label: '调度中心', domain: '运营中心' },
  { key: 'edge', label: '边端管理', domain: '运营中心' },
  { key: 'report', label: '报表中心', domain: '运营中心' },
  { key: 'resource', label: '资源管理', domain: '平台管理' },
  { key: 'usermgmt', label: '用户管理', domain: '平台管理' },
  { key: 'org', label: '组织管理', domain: '平台管理' },
  { key: 'perm', label: '权限管理', domain: '平台管理' },
  { key: 'alert', label: '告警中心', domain: '平台管理' },
  { key: 'sys', label: '系统配置', domain: '平台管理' },
];

const domainOrder: PrototypeDomain[] = ['工作台', '数据管理', '模型开发', '运营中心', '平台管理'];

const iconByDomain: Record<PrototypeDomain, ReactNode> = {
  工作台: <DashboardOutlined />,
  数据管理: <DatabaseOutlined />,
  模型开发: <ExperimentOutlined />,
  运营中心: <DeploymentUnitOutlined />,
  平台管理: <SettingOutlined />,
};

export function AppNavigation({ allowedKeys }: { allowedKeys?: Set<string> }) {
  const navigate = useNavigate();
  const location = useLocation();
  const pagesByDomain = Map.groupBy(
    allowedKeys ? prototypePages.filter((page) => allowedKeys.has(page.key)) : prototypePages,
    (page) => page.domain,
  );
  const items: MenuProps['items'] = domainOrder
    .map((domain) => ({
      key: domain,
      icon: iconByDomain[domain] ?? <AppstoreOutlined />,
      label: domain,
      children: pagesByDomain.get(domain)?.map((page) => ({ key: page.key, label: page.label })) ?? [],
    }))
    .filter((item) => item.children.length > 0);

  return (
    <Menu
      theme="dark"
      mode="inline"
      items={items}
      selectedKeys={[location.pathname.replace(/^\//, '') || 'dash']}
      defaultOpenKeys={domainOrder}
      onClick={({ key }) => navigate(`/${key}`)}
    />
  );
}
