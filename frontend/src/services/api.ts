import { useAuthStore } from '@/stores/auth.store';

// Empty in dev → relative /api paths go through the Vite proxy (same-origin),
// so the httpOnly refresh cookie is stored and sent. Set to the backend URL in prod.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

// The ONLY routes that send the refresh cookie (CLAUDE.md §2).
const cookieRoutes = ['/api/auth/refresh', '/api/auth/logout'];

let refreshInFlight: Promise<boolean> | null = null;

/** Silent refresh via the httpOnly cookie. Dedupes concurrent callers. */
export async function trySilentRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!res.ok) return false;
      const data = await res.json();
      useAuthStore.getState().setToken(data.accessToken);
      if (data.user) useAuthStore.getState().setUser(data.user);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function api<T = unknown>(path: string, options: RequestInit = {}, allowRetry = true): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const useCookie = cookieRoutes.some((r) => path.startsWith(r));
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: useCookie ? 'include' : 'same-origin',
  });

  // 401 → silent refresh once → retry the original request; else force login.
  if (res.status === 401 && allowRetry && !path.startsWith('/api/auth/refresh')) {
    const ok = await trySilentRefresh();
    if (ok) return api<T>(path, options, false);
    useAuthStore.getState().clear();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as { message?: string }).message || res.statusText, body);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export { BASE as API_BASE };
