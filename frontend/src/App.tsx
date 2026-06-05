import { Avatar, Dropdown, Layout, Result, Space, Spin, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { GlobalOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { AppNavigation, appPages } from './components/AppNavigation';
import { ModuleOverviewPage } from './components/ModuleOverviewPage';
import { LoginPage } from './features/platform/LoginPage';
import { PermissionManagementPage } from './features/platform/PermissionManagementPage';
import { ResourceManagementPage } from './features/platform/ResourceManagementPage';
import { OrganizationManagementPage } from './features/platform/OrganizationManagementPage';
import { SystemConfigPage } from './features/platform/SystemConfigPage';
import { UserManagementPage } from './features/platform/UserManagementPage';
import { AnnotationReviewPage, AnnotationTasksPage, AnnotationWorkbenchPage, DataPipelineStandardPage, DataSourceManagementPage, DatasetDetailPage, DatasetManagementPage, DatasetUploadPage, OperatorMarketplacePage, TagManagementPage } from './features/data/DataPages';
import { ModelRegistryPage } from './features/model-registry/ModelRegistryPage';
import { ModelEvaluationPage } from './features/model-evaluation/ModelEvaluationPage';
import { EdgeManagementPage } from './features/edge/EdgeManagementPage';
import { AlertCenterPage, DashboardPage, ReportCenterPage, SchedulerCenterPage } from './features/operations/OperationsPages';
import { languageOptions, t } from './features/platform/i18n';
import { useLocaleStore } from './features/platform/localeStore';
import { useSessionStore } from './features/platform/sessionStore';

const { Header, Sider, Content } = Layout;

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user, initialized, bootstrap, logout } = useSessionStore();
  const language = useLocaleStore((state) => state.language);
  const setLanguage = useLocaleStore((state) => state.setLanguage);
  const copy = t(language);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  if (!initialized) {
    return <Spin fullscreen description={copy.loadingSession} />;
  }

  if (!token || !user) {
    if (location.pathname === '/login') return <LoginPage />;
    return <Navigate to="/login" replace />;
  }

  if (location.pathname === '/login') {
    return <LoginPage />;
  }

  const isSuperAdmin = user.roles.includes('SUPER_ADMIN');
  const allowedMenuKeys = new Set(isSuperAdmin ? appPages.map((page) => page.key) : ['dash', ...user.menuPermissions]);
  const canAccess = (key: string) => allowedMenuKeys.has(key);
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'language-label',
      type: 'group',
      label: copy.userMenuLanguage,
      children: languageOptions.map((item) => ({
        key: `language:${item.value}`,
        icon: item.value === language ? <GlobalOutlined /> : undefined,
        label: `${item.label}${item.value === language ? ` · ${copy.userMenuCurrent}` : ''}`,
      })),
    },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: copy.userMenuLogout },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = async ({ key }) => {
    if (key === 'logout') {
      await logout();
      navigate('/login', { replace: true });
      return;
    }
    if (key.startsWith('language:')) {
      setLanguage(key.replace('language:', '') as 'zh-CN' | 'en-US');
    }
  };

  return (
    <Layout className="app-shell">
      <Sider width={264} className="app-sider">
        <div className="brand">YFI SMP</div>
        <AppNavigation language={language} allowedKeys={allowedMenuKeys} />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Typography.Title level={4} className="app-title">
            {copy.appTitle}
          </Typography.Title>
          <Space size={16}>
            <div className="session-chip">{user.displayName} · {user.tenantName}</div>
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} trigger={['click']} placement="bottomRight">
              <button type="button" className="header-avatar-button" aria-label="user-menu">
                <Avatar size="large" icon={<UserOutlined />} className="header-avatar" />
              </button>
            </Dropdown>
          </Space>
        </Header>
        <Content className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dash" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/usermgmt" element={canAccess('usermgmt') ? <UserManagementPage /> : <NoPermission language={language} />} />
            <Route path="/perm" element={canAccess('perm') ? <PermissionManagementPage /> : <NoPermission language={language} />} />
            <Route path="/org" element={canAccess('org') ? <OrganizationManagementPage /> : <NoPermission language={language} />} />
            <Route path="/sys" element={canAccess('sys') ? <SystemConfigPage /> : <NoPermission language={language} />} />
            <Route path="/resource" element={canAccess('resource') ? <ResourceManagementPage /> : <NoPermission language={language} />} />
            <Route path="/datasrc" element={canAccess('datasrc') ? <DataSourceManagementPage /> : <NoPermission language={language} />} />
            <Route path="/ds" element={canAccess('ds') ? <DatasetManagementPage /> : <NoPermission language={language} />} />
            <Route path="/tagmgmt" element={canAccess('tagmgmt') ? <TagManagementPage /> : <NoPermission language={language} />} />
            <Route path="/up" element={canAccess('ds') ? <DatasetUploadPage /> : <NoPermission language={language} />} />
            <Route path="/dsdetail" element={canAccess('ds') ? <DatasetDetailPage /> : <NoPermission language={language} />} />
            <Route path="/ann" element={canAccess('ann') ? <AnnotationTasksPage /> : <NoPermission language={language} />} />
            <Route path="/annwork" element={canAccess('annwork') ? <AnnotationWorkbenchPage /> : <NoPermission language={language} />} />
            <Route path="/annreview" element={canAccess('annreview') ? <AnnotationReviewPage /> : <NoPermission language={language} />} />
            <Route path="/pipeline" element={canAccess('pipeline') ? <DataPipelineStandardPage /> : <NoPermission language={language} />} />
            <Route path="/opmarket" element={canAccess('opmarket') ? <OperatorMarketplacePage /> : <NoPermission language={language} />} />
            <Route path="/hub" element={canAccess('hub') ? <ModelRegistryPage /> : <NoPermission language={language} />} />
            <Route path="/eval" element={canAccess('eval') ? <ModelEvaluationPage /> : <NoPermission language={language} />} />
            <Route path="/edge" element={canAccess('edge') ? <EdgeManagementPage /> : <NoPermission language={language} />} />
            <Route path="/dash" element={canAccess('dash') ? <DashboardPage /> : <NoPermission language={language} />} />
            <Route path="/sched" element={canAccess('sched') ? <SchedulerCenterPage /> : <NoPermission language={language} />} />
            <Route path="/alert" element={canAccess('alert') ? <AlertCenterPage /> : <NoPermission language={language} />} />
            <Route path="/report" element={canAccess('report') ? <ReportCenterPage /> : <NoPermission language={language} />} />
            {appPages.map((page) => (
              ['hub', 'eval', 'edge', 'dash', 'sched', 'alert', 'report'].includes(page.key)
                ? null
                : <Route key={page.key} path={`/${page.key}`} element={canAccess(page.key) ? <ModuleOverviewPage page={page} language={language} /> : <NoPermission language={language} />} />
            ))}
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

function NoPermission({ language }: { language: 'zh-CN' | 'en-US' }) {
  const copy = t(language);
  return <Result status="403" title={copy.noPermissionTitle} subTitle={copy.noPermissionSubtitle} />;
}
