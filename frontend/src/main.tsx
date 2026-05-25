import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import App from './App';
import { useLocaleStore } from './features/platform/localeStore';
import './styles/global.css';

const queryClient = new QueryClient();

function Root() {
  const language = useLocaleStore((state) => state.language);
  return (
    <ConfigProvider locale={language === 'en-US' ? enUS : zhCN} theme={{ token: { colorPrimary: '#1677ff', borderRadius: 8 } }}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
