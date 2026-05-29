import type { AppLanguage } from './localeStore';

export const languageOptions: Array<{ value: AppLanguage; label: string }> = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
];

export const messages = {
  'zh-CN': {
    appTitle: 'SMP 工业 AI 小模型平台',
    loginTitle: '账号登录',
    loginButton: '登录',
    tenantLabel: '租户 / BU',
    tenantRequired: '请输入租户代码',
    tenantPlaceholder: 'YF',
    usernameLabel: '账号',
    usernameRequired: '请输入账号',
    usernamePlaceholder: '请输入账号',
    passwordLabel: '密码',
    passwordRequired: '请输入密码',
    passwordPlaceholder: '请输入密码',
    loginFailed: '登录失败',
    ssoLogin: 'SSO 登录',
    language: '语言 / Language',
    platformSubtitle: '工业 AI 平台',
    loadingSession: '加载会话',
    noPermissionTitle: '暂无权限',
    noPermissionSubtitle: '您的账号暂无该页面权限，请联系管理员为您分配角色。',
    userMenuLanguage: '切换语言',
    userMenuLogout: '退出登录',
    userMenuCurrent: '当前语言',
  },
  'en-US': {
    appTitle: 'SMP Industrial AI Platform',
    loginTitle: 'Sign in',
    loginButton: 'Sign in',
    tenantLabel: 'Tenant / BU',
    tenantRequired: 'Please enter tenant code',
    tenantPlaceholder: 'YF',
    usernameLabel: 'Username',
    usernameRequired: 'Please enter username',
    usernamePlaceholder: 'Enter username',
    passwordLabel: 'Password',
    passwordRequired: 'Please enter password',
    passwordPlaceholder: 'Enter password',
    loginFailed: 'Sign in failed',
    ssoLogin: 'SSO Sign-in',
    language: 'Language / 语言',
    platformSubtitle: 'Industrial AI Platform',
    loadingSession: 'Loading session',
    noPermissionTitle: 'Access denied',
    noPermissionSubtitle: 'Your account does not have permission for this page. Please contact an administrator.',
    userMenuLanguage: 'Switch language',
    userMenuLogout: 'Sign out',
    userMenuCurrent: 'Current language',
  },
} as const;

const pageLabels = {
  dash: { 'zh-CN': '工作台', 'en-US': 'Dashboard' },
  ds: { 'zh-CN': '数据集管理', 'en-US': 'Datasets' },
  tagmgmt: { 'zh-CN': '标签管理', 'en-US': 'Tag Management' },
  ann: { 'zh-CN': '标注任务', 'en-US': 'Annotation Tasks' },
  annwork: { 'zh-CN': '标注工作台', 'en-US': 'Annotation Workbench' },
  datasrc: { 'zh-CN': '数据源管理', 'en-US': 'Data Sources' },
  annreview: { 'zh-CN': '标注审核', 'en-US': 'Annotation Review' },
  lineage: { 'zh-CN': '数据血缘', 'en-US': 'Data Lineage' },
  pipeline: { 'zh-CN': 'Pipeline编辑器', 'en-US': 'Pipeline Editor' },
  opmarket: { 'zh-CN': '算子广场', 'en-US': 'Operator Marketplace' },
  portal: { 'zh-CN': '数据资产门户', 'en-US': 'Data Portal' },
  devenv: { 'zh-CN': '开发环境', 'en-US': 'Dev Environment' },
  train: { 'zh-CN': '训练监控', 'en-US': 'Training Monitor' },
  exp: { 'zh-CN': '实验管理', 'en-US': 'Experiments' },
  eval: { 'zh-CN': '模型评估', 'en-US': 'Model Evaluation' },
  hub: { 'zh-CN': '模型市场', 'en-US': 'Model Hub' },
  infer: { 'zh-CN': '推理服务', 'en-US': 'Inference Services' },
  batch: { 'zh-CN': '批量推理', 'en-US': 'Batch Inference' },
  sched: { 'zh-CN': '调度中心', 'en-US': 'Scheduler' },
  edge: { 'zh-CN': '边端管理', 'en-US': 'Edge Management' },
  report: { 'zh-CN': '报表中心', 'en-US': 'Reports' },
  resource: { 'zh-CN': '资源管理', 'en-US': 'Resources' },
  usermgmt: { 'zh-CN': '用户管理', 'en-US': 'Users' },
  org: { 'zh-CN': '组织管理', 'en-US': 'Organizations' },
  perm: { 'zh-CN': '权限管理', 'en-US': 'Permissions' },
  alert: { 'zh-CN': '告警中心', 'en-US': 'Alerts' },
  sys: { 'zh-CN': '系统配置', 'en-US': 'System Config' },
} as const;

const domainLabels = {
  工作台: { 'zh-CN': '工作台', 'en-US': 'Workspace' },
  数据管理: { 'zh-CN': '数据管理', 'en-US': 'Data' },
  模型开发: { 'zh-CN': '模型开发', 'en-US': 'Modeling' },
  运营中心: { 'zh-CN': '运营中心', 'en-US': 'Operations' },
  平台管理: { 'zh-CN': '平台管理', 'en-US': 'Platform' },
} as const;

export function t(language: AppLanguage) {
  return messages[language];
}

export function pageLabel(key: string, language: AppLanguage) {
  return pageLabels[key as keyof typeof pageLabels]?.[language] ?? key;
}

export function domainLabel(domain: keyof typeof domainLabels, language: AppLanguage) {
  return domainLabels[domain][language];
}
