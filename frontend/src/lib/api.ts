import {
  getAccessToken,
  setAccessToken,
  setUser,
  clearAuth,
} from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken: string; user?: unknown };
      setAccessToken(data.accessToken);
      if (data.user) setUser(data.user);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, options, true);
    }
    clearAuth();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError(401, 'Session expirée');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as {
      error?: string;
      details?: Record<string, string[] | undefined>;
    };
    const detailMsg = body.details
      ? Object.values(body.details).flat().find(Boolean)
      : undefined;
    throw new ApiError(res.status, detailMsg || body.error || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    register: (data: { fullname: string; email: string; password: string }) =>
      request<{ user: unknown; accessToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ user: unknown; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    refresh: () =>
      request<{ accessToken: string; user: unknown }>('/auth/refresh', {
        method: 'POST',
      }),
    me: () => request<{ user: unknown }>('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  guests: {
    list: (params?: { stageId?: number; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.stageId) q.set('stageId', String(params.stageId));
      if (params?.search) q.set('search', params.search);
      const qs = q.toString();
      return request<import('@/types').Guest[]>(`/guests${qs ? `?${qs}` : ''}`);
    },
    get: (id: number) => request<import('@/types').Guest>(`/guests/${id}`),
    create: (data: Partial<import('@/types').Guest>) =>
      request<import('@/types').Guest>('/guests', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<import('@/types').Guest>) =>
      request<import('@/types').Guest>(`/guests/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) => request(`/guests/${id}`, { method: 'DELETE' }),
    addInteraction: (id: number, note: string) =>
      request(`/guests/${id}/interactions`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      }),
    stages: () => request<import('@/types').PipelineStage[]>('/guests/stages'),
  },
  episodes: {
    list: () => request<import('@/types').Episode[]>('/episodes'),
    update: (id: number, data: Partial<import('@/types').Episode>) =>
      request<import('@/types').Episode>(`/episodes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  shorts: {
    list: (episodeId?: number) =>
      request<import('@/types').Short[]>(
        `/shorts${episodeId ? `?episodeId=${episodeId}` : ''}`,
      ),
    create: (data: Partial<import('@/types').Short> & { episodeId: number; platform: string }) =>
      request('/shorts', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/shorts/${id}`, { method: 'DELETE' }),
  },
  sponsors: {
    list: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      const qs = q.toString();
      return request<import('@/types').PaginatedSponsors>(`/sponsors${qs ? `?${qs}` : ''}`);
    },
    get: (id: number) => request<import('@/types').Sponsor>(`/sponsors/${id}`),
    stats: () => request<import('@/types').SponsorStats>('/sponsors/stats'),
    create: (data: Record<string, unknown>) =>
      request<import('@/types').Sponsor>('/sponsors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      request<import('@/types').Sponsor>(`/sponsors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request(`/sponsors/${id}`, { method: 'DELETE' }),
  },
  dashboard: {
    stats: () => request<import('@/types').PremiumDashboard>('/dashboard/stats'),
  },
  youtube: {
    test: () => request<{ ok: boolean; connected?: boolean; message: string }>('/youtube/test'),
    syncAll: () => request<{ synced: number; failed: number; total: number }>('/youtube/sync-all', { method: 'POST' }),
    syncEpisode: (id: number) =>
      request<{
        success: boolean;
        episode?: import('@/types').Episode;
        stats?: import('@/types').Episode;
      }>(`/youtube/sync/${id}`, { method: 'POST' }),
    syncOnSave: (data: { youtubeUrl: string; episodeId: number }) =>
      request<{ success: boolean; stats: unknown }>('/youtube/sync-on-save', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    stats: (id: number) => request<Record<string, unknown>>(`/youtube/stats/${id}`),
  },
  settings: {
    get: () => request<Record<string, string>>('/settings'),
    update: (data: Record<string, string | null>) =>
      request<Record<string, string>>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
    users: () => request<import('@/types').User[]>('/settings/users'),
  },
  users: {
    updateRole: (id: number, role: string) =>
      request<import('@/types').User>(`/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
  },
  analytics: {
    platforms: () =>
      request<import('@/types').PlatformAnalyticsResponse>('/analytics/platforms'),
    connections: () =>
      request<import('@/types').PlatformConnectionsResponse>('/analytics/connections'),
    connect: (platform: string) =>
      request<{ authorizationUrl: string }>(`/analytics/oauth/${platform}/connect`),
    disconnect: (platform: string) =>
      request(`/analytics/connections/${platform}`, { method: 'DELETE' }),
    syncNow: () =>
      request<import('@/types').PlatformAnalyticsResponse>('/analytics/sync', { method: 'POST' }),
  },
};

/** Restore session from httpOnly refresh cookie on app load. */
export async function initAuth(): Promise<boolean> {
  try {
    const res = await api.auth.refresh();
    setAccessToken(res.accessToken);
    if (res.user) setUser(res.user);
    return true;
  } catch {
    return false;
  }
}
