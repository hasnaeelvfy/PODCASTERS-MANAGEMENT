import { getToken, clearAuth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    register: (data: { fullname: string; email: string; password: string }) =>
      request<{ user: unknown; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ user: unknown; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logout: () => request('/auth/logout', { method: 'POST' }),
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
  },
  sponsors: {
    create: (data: {
      episodeId: number;
      name: string;
      sponsorType?: string;
      amount?: number;
      status?: string;
    }) => request('/sponsors', { method: 'POST', body: JSON.stringify(data) }),
  },
  dashboard: {
    stats: () => request<import('@/types').DashboardStats>('/dashboard/stats'),
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
