import { api } from '@/api/client';
import type { AnalyticsStats } from '@/types/api';

export const analyticsApi = {
  stats: () => api.get<{ data: AnalyticsStats }>('/analytics/stats/').then((r) => r.data.data),
};
