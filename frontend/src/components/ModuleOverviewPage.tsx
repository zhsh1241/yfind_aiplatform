import { Card, Col, Empty, Row, Space, Statistic, Tag, Typography } from 'antd';
import { pageLabel } from '../features/platform/i18n';
import type { AppLanguage } from '../features/platform/localeStore';
import type { ModuleOverviewPage as AppPageInfo } from './AppNavigation';

const pageFocus: Record<string, string[]> = {
  dash: ['关键指标总览', '待办与风险提醒', '近期任务追踪'],
  lineage: ['数据来源追踪', '版本影响分析', '加工链路审计'],
  portal: ['数据资产检索', '权限申请入口', '数据使用说明'],
  devenv: ['开发环境分配', '镜像与依赖配置', '资源使用监控'],
  train: ['训练任务监控', '指标曲线', '日志与告警'],
  exp: ['实验对比', '参数记录', '结果归档'],
  eval: ['评估集管理', '模型评分', '报告导出'],
  hub: ['模型版本目录', '发布审批', '复用与下架'],
  infer: ['在线服务管理', '实例伸缩', '调用指标'],
  batch: ['批量任务提交', '结果文件管理', '失败重试'],
  sched: ['任务编排', '周期调度', '运行日历'],
  edge: ['边端节点清单', '部署包分发', '在线状态'],
  report: ['运营报表', '资源成本', '质量趋势'],
  alert: ['告警规则', '通知记录', '处理闭环'],
};

const domainDescriptions: Record<AppPageInfo['domain'], string> = {
  工作台: '汇聚平台关键指标、任务进展与风险提醒。',
  数据管理: '覆盖数据接入、治理、标注、血缘与资产服务。',
  模型开发: '支撑模型开发、训练、评估、发布与推理服务。',
  运营中心: '面向调度、边端、报表和运行态运营管理。',
  平台管理: '负责资源、组织、权限、告警和系统级配置。',
};

function focusItems(page: AppPageInfo) {
  return pageFocus[page.key] ?? ['业务流程配置', '运行状态跟踪', '操作审计记录'];
}

export function ModuleOverviewPage({ page, language }: { page: AppPageInfo; language: AppLanguage }) {
  const title = pageLabel(page.key, language);
  const items = focusItems(page);

  return (
    <div className="content-page module-page">
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>{title}</Typography.Title>
          <Typography.Text type="secondary">{domainDescriptions[page.domain]}</Typography.Text>
        </div>
        <Tag color="blue">{page.domain}</Tag>
      </div>
      <Row gutter={[16, 16]}>
        {items.map((item, index) => (
          <Col xs={24} md={8} key={item}>
            <Card className="module-summary-card">
              <Statistic title={item} value={index === 0 ? '准备中' : '—'} styles={{ content: { fontSize: 22 } }} />
              <Typography.Text type="secondary">暂无数据时显示为空，接入后会自动刷新。</Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>
      <Card className="page-card" title="模块概览">
        <Space orientation="vertical" size={12} className="full-width">
          <Typography.Paragraph>
            当前模块用于集中呈现业务状态、操作入口与审计信息。
          </Typography.Paragraph>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无业务数据" />
        </Space>
      </Card>
    </div>
  );
}
