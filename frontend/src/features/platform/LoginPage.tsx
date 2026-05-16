import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSessionStore } from './sessionStore';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useSessionStore((state) => state.login);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleFinish(values: { username: string; password: string; tenantCode?: string }) {
    setError('');
    setLoading(true);
    try {
      await login({ username: values.username, password: values.password, tenantCode: values.tenantCode || 'YF' });
      navigate('/dash');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-logo">
        <div className="login-logo-main">⚙ SMP</div>
        <div className="login-logo-sub">工业 AI 平台</div>
      </div>
      <Card className="login-card">
        <Typography.Title level={4} className="login-title">
          账号登录
        </Typography.Title>
        {error ? <Alert className="login-error" type="error" showIcon message={error} /> : null}
        <Form layout="vertical" initialValues={{ username: 'admin', tenantCode: 'YF' }} onFinish={handleFinish}>
          <Form.Item label="租户 / BU" name="tenantCode" rules={[{ required: true, message: '请输入租户代码' }]}>
            <Input placeholder="YF" />
          </Form.Item>
          <Form.Item label="账号" name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input placeholder="请输入账号" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录
          </Button>
        </Form>
        <Space className="login-links" separator={<span>·</span>}>
          <span>SSO 登录（TODO_CONFIRM_SSO_PROTOCOL）</span>
          <span>语言 / Language</span>
        </Space>
      </Card>
      <div className="login-version">YFI SMP · v0.1.0 · TODO_CONFIRM_YF_LDAP_URL</div>
    </div>
  );
}
