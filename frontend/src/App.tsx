import { Layout, Typography } from 'antd';
import { Navigate, Route, Routes } from 'react-router';
import { AppNavigation, prototypePages } from './components/AppNavigation';
import { PrototypePage } from './components/PrototypePage';
import { FoundationStatusCard } from './features/foundation/FoundationStatusCard';

const { Header, Sider, Content } = Layout;

export default function App() {
  return (
    <Layout className="app-shell">
      <Sider width={264} className="app-sider">
        <div className="brand">YFI SMP</div>
        <AppNavigation />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Typography.Title level={4} className="app-title">
            SMP 工业 AI 小模型平台
          </Typography.Title>
        </Header>
        <Content className="app-content">
          <FoundationStatusCard />
          <Routes>
            <Route path="/" element={<Navigate to="/dash" replace />} />
            {prototypePages.map((page) => (
              <Route key={page.key} path={`/${page.key}`} element={<PrototypePage page={page} />} />
            ))}
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}