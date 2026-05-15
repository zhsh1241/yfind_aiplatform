import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

vi.mock('./features/foundation/apiClient', () => ({
  apiClient: {
    get: vi.fn(() => Promise.reject(new Error('backend not running in frontend unit test'))),
    interceptors: { request: { use: vi.fn() } },
  },
}));

describe('F004 frontend foundation', () => {
  it('renders prototype navigation and foundation fallback', async () => {
    // TASK-frontend-foundation AC-01 AC-02 AC-03
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('SMP 工业 AI 小模型平台')).toBeInTheDocument();
    expect(screen.getByText('数据集管理')).toBeInTheDocument();
    expect(screen.getByText('模型市场')).toBeInTheDocument();
    expect(await screen.findByText('smp-frontend')).toBeInTheDocument();
  });
});