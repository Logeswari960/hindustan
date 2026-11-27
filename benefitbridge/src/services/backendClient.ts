const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';
const TOKEN_KEY = 'benefitbridge:access-token';
const DEMO_SESSION_KEY = 'benefitbridge:demo-session';

export const backendConfigured = Boolean(API_BASE_URL);

export function hasBackendSession(): boolean {
  return Boolean(sessionStorage.getItem(TOKEN_KEY));
}

export function hasDemoSession(): boolean {
  return sessionStorage.getItem(DEMO_SESSION_KEY) === 'active';
}

export function startDemoSession(): void {
  clearBackendSession();
  sessionStorage.setItem(DEMO_SESSION_KEY, 'active');
}

export function clearDemoSession(): void {
  sessionStorage.removeItem(DEMO_SESSION_KEY);
}

export function clearBackendSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function backendRequest<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  if (!API_BASE_URL) throw new Error('Backend is not configured. Set VITE_API_BASE_URL and restart the frontend.');
  const headers = new Headers(init.headers);
  if (authenticated) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  let response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (
    (response.status === 401 || response.status === 503) &&
    (init.method ?? 'GET').toUpperCase() === 'GET' &&
    /^\/benefits(?:\/|\?|$)/.test(path) &&
    headers.has('Authorization')
  ) {
    if (response.status === 401) clearBackendSession();
    const publicHeaders = new Headers(headers);
    publicHeaders.delete('Authorization');
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: publicHeaders });
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    if (response.status === 401) clearBackendSession();
    throw new Error(body?.detail ?? `Backend request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export async function backendDownload(path: string): Promise<Blob> {
  if (!API_BASE_URL) throw new Error('Backend is not configured.');
  const headers = new Headers();
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    if (response.status === 401) clearBackendSession();
    throw new Error(body?.detail ?? `Backend request failed (${response.status}).`);
  }
  return response.blob();
}

export async function saveBackendSession<T extends { access_token: string }>(result: T): Promise<T> {
  sessionStorage.setItem(TOKEN_KEY, result.access_token);
  return result;
}
