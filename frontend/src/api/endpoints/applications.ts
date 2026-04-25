import { api } from '@/api/client';
import type { Application, ApplicationStatus } from '@/types/api';

export const applicationsApi = {
  list: (params?: { vacancy?: string; status?: ApplicationStatus }) =>
    api.get<Application[]>('/applications/', { params }).then((r) => r.data),

  get: (id: number) => api.get<Application>(`/applications/${id}/`).then((r) => r.data),

  updateStatus: (id: number, status: ApplicationStatus) =>
    api.patch<{ data: Application }>(`/applications/${id}/`, { status }).then((r) => r.data),

  update: (id: number, payload: Partial<Pick<Application, 'status' | 'notes' | 'final_score'>>) =>
    api.patch<{ data: Application }>(`/applications/${id}/`, payload).then((r) => r.data),

  delete: (id: number) => api.delete(`/applications/${id}/`).then((r) => r.data),
};
