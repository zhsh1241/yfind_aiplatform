import { Alert, Button, Card, Form, Input, Select, Space, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { languageOptions, t } from './i18n';
import { useLocaleStore } from './localeStore';
import { useSessionStore } from './sessionStore';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useSessionStore((state) => state.login);
  const language = useLocaleStore((state) => state.language);
  const setLanguage = useLocaleStore((state) => state.setLanguage);
  const copy = t(language);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleFinish(values: { username: string; password: string; tenantCode?: string }) {
    setError('');
    setLoading(true);
    try {
      await login({ username: values.username, password: values.password, tenantCode: values.tenantCode || 'YF' });
      navigate('/dash');
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loginFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-logo">
        <div className="login-logo-main">⚙ SMP</div>
        <div className="login-logo-sub">{copy.platformSubtitle}</div>
      </div>
      <Card className="login-card">
        <Typography.Title level={4} className="login-title">
          {copy.loginTitle}
        </Typography.Title>
        {error ? <Alert className="login-error" type="error" showIcon message={error} /> : null}
        <Form layout="vertical" initialValues={{ username: 'admin', tenantCode: 'YF' }} onFinish={handleFinish}>
          <Form.Item label={copy.tenantLabel} name="tenantCode" rules={[{ required: true, message: copy.tenantRequired }]}>
            <Input placeholder={copy.tenantPlaceholder} />
          </Form.Item>
          <Form.Item label={copy.usernameLabel} name="username" rules={[{ required: true, message: copy.usernameRequired }]}>
            <Input placeholder={copy.usernamePlaceholder} />
          </Form.Item>
          <Form.Item label={copy.passwordLabel} name="password" rules={[{ required: true, message: copy.passwordRequired }]}>
            <Input.Password placeholder={copy.passwordPlaceholder} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {copy.loginButton}
          </Button>
        </Form>
        <Space className="login-links" separator={<span>·</span>}>
          <span>{copy.ssoLogin}</span>
          <Select
            aria-label={copy.language}
            className="login-language-select"
            variant="borderless"
            value={language}
            onChange={setLanguage}
            options={languageOptions}
          />
        </Space>
      </Card>
      <div className="login-version">YFI SMP · v0.1.0 · TODO_CONFIRM_YF_LDAP_URL</div>
    </div>
  );
}
