import axios from 'axios';

export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
  traceId: string;
  timestamp: string;
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});

apiClient.interceptors.request.use((config) => {
  config.headers.set('X-Trace-Id', crypto.randomUUID());
  return config;
});
