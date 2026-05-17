import { Layout, Result, Spin, Typography } from 'antd';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { useEffect } from 'react';
import { AppNavigation, prototypePages } from './components/AppNavigation';
import { PrototypePage } from './components/PrototypePage';
import { FoundationStatusCard } from './features/foundation/FoundationStatusCard';
import { LoginPage } from './features/platform/LoginPage';
import { PermissionManagementPage } from './features/platform/PermissionManagementPage';
import { OrganizationManagementPage } from './features/platform/OrganizationManagementPage';
import { SystemConfigPage } from './features/platform/SystemConfigPage';
import { UserManagementPage } from './features/platform/UserManagementPage';
import { useSessionStore } from './features/platform/sessionStore';

const { Header, Sider, Content } = Layout;

export default function App() {
  const location = useLocation();
  const { token, user, initialized, bootstrap } = useSessionStore();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (!initialized) {
    return <Spin fullscreen description="加载会话" />;
  }

  if (!token || !user) {
    if (location.pathname === '/login') return <LoginPage />;
    return <Navigate to="/login" replace />;
  }

  if (location.pathname === '/login') {
    return <LoginPage />;
  }

  const canAccess = (key: string) => key === 'dash' || user.menuPermissions.includes(key);

  return (
    <Layout className="app-shell">
      <Sider width={264} className="app-sider">
        <div className="brand">YFI SMP</div>
        <AppNavigation allowedKeys={new Set(['dash', ...user.menuPermissions])} />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Typography.Title level={4} className="app-title">
            SMP 工业 AI 小模型平台
          </Typography.Title>
          <div className="session-chip">{user.displayName} · {user.tenantName}</div>
        </Header>
        <Content className="app-content">
          <FoundationStatusCard />
          <Routes>
            <Route path="/" element={<Navigate to="/dash" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/usermgmt" element={canAccess('usermgmt') ? <UserManagementPage /> : <NoPermission />} />
            <Route path="/perm" element={canAccess('perm') ? <PermissionManagementPage /> : <NoPermission />} />
            <Route path="/org" element={canAccess('org') ? <OrganizationManagementPage /> : <NoPermission />} />
            <Route path="/sys" element={canAccess('sys') ? <SystemConfigPage /> : <NoPermission />} />
            {prototypePages.map((page) => (
              <Route key={page.key} path={`/${page.key}`} element={canAccess(page.key) ? <PrototypePage page={page} /> : <NoPermission />} />
            ))}
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

function NoPermission() {
  return <Result status="403" title="暂无权限" subTitle="您的账号暂无该页面权限，请联系管理员为您分配角色。" />;
}
