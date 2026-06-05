import { describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: { request: { use: vi.fn() } },
}));

vi.mock('../foundation/apiClient', () => ({
  apiClient: apiMock,
}));

import { platformApi } from './platformApi';

describe('platformApi unwrap', () => {
  it('TASK-edge-management-delivery AC-06 展示后端业务错误码与 traceId', async () => {
    apiMock.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          code: 42263,
          message: '完整性校验失败',
          data: null,
          traceId: 'trace-f021-error',
          timestamp: '2026-06-05T00:00:00Z',
        },
      },
    });

    await expect(platformApi.edgeDeploymentDetail('EDGEDEP-ERR')).rejects.toThrow('完整性校验失败（code=42263, traceId=trace-f021-error）');
  });
});
