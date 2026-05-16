import { create } from 'zustand';
import { clearAccessToken, platformApi, setAccessToken, type CurrentUser } from './platformApi';

type SessionState = {
  token: string | null;
  user: CurrentUser | null;
  initialized: boolean;
  login: (input: { username: string; password: string; tenantCode: string }) => Promise<void>;
  bootstrap: () => Promise<void>;
  logout: () => void;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  token: null,
  user: null,
  initialized: false,
  async login(input) {
    const response = await platformApi.login(input);
    setAccessToken(response.accessToken);
    set({ token: response.accessToken, user: response.user, initialized: true });
  },
  async bootstrap() {
    if (get().initialized) return;
    set({ initialized: true });
  },
  logout() {
    clearAccessToken();
    set({ token: null, user: null, initialized: true });
  },
}));
