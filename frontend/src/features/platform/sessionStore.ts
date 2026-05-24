import { create } from 'zustand';
import { clearAccessToken, platformApi, setAccessToken, type CurrentUser } from './platformApi';

const STORAGE_KEY = 'smp.session.v1';

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

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
    saveSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: Date.now() + response.expiresInSeconds * 1000,
    });
    set({ token: response.accessToken, user: response.user, initialized: true });
  },
  async bootstrap() {
    if (get().initialized) return;
    const stored = readSession();
    if (!stored) {
      set({ initialized: true });
      return;
    }
    setAccessToken(stored.accessToken);
    try {
      if (stored.expiresAt <= Date.now() + 60_000) {
        const refreshed = await platformApi.refresh();
        setAccessToken(refreshed.accessToken);
        saveSession({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: Date.now() + refreshed.expiresInSeconds * 1000,
        });
        set({ token: refreshed.accessToken, user: refreshed.user, initialized: true });
        return;
      }
      const user = await platformApi.me();
      set({ token: stored.accessToken, user, initialized: true });
    } catch {
      clearAccessToken();
      clearSession();
      set({ token: null, user: null, initialized: true });
    }
  },
  logout() {
    clearAccessToken();
    clearSession();
    set({ token: null, user: null, initialized: true });
  },
}));

function saveSession(session: StoredSession) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // 浏览器隐私模式或存储禁用时，保持内存会话，不阻断登录。
  }
}

function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.accessToken || !parsed.refreshToken || typeof parsed.expiresAt !== 'number') {
      clearSession();
      return null;
    }
    return parsed as StoredSession;
  } catch {
    clearSession();
    return null;
  }
}

function clearSession() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
