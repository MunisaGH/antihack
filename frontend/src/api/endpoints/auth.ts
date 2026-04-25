import { api } from '@/api/client';
import type { LoginResponse } from '@/types/api';

export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    api.post<LoginResponse>('/auth/login/', credentials).then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post<{ success: boolean }>('/auth/logout/', { refresh_token: refreshToken }).then((r) => r.data),

  refresh: (refresh: string) =>
    api.post<{ success: boolean; access: string; refresh: string }>('/auth/refresh/', { refresh }).then((r) => r.data),
};
