const AUTH_TOKEN_KEY = "yfi.auth.accessToken";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

type AuthLoginResponse = {
  accessToken: string;
  user: {
    username: string;
    displayName: string;
    organization: { name: string };
    authMethod: string;
    iamProvider: string;
    permissions: string[];
    featureTrace: string;
  };
  expiresAt: string;
  featureTrace: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAuthToken() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function login(username: string, password: string): Promise<AuthLoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error(`登录失败：${response.status}`);
  const body = await response.json() as AuthLoginResponse;
  setAuthToken(body.accessToken);
  return body;
}

export async function ensureAuthToken() {
  const existing = getAuthToken();
  if (existing) return existing;
  if (import.meta.env.MODE === "test") return "TEST_AUTH_TOKEN";
  const bootstrap = await login("admin@yfind.local", "admin123!");
  return bootstrap.accessToken;
}

export async function authHeaders() {
  return { Authorization: `Bearer ${await ensureAuthToken()}` };
}

export async function authJsonHeaders() {
  return { "Content-Type": "application/json", ...(await authHeaders()) };
}
