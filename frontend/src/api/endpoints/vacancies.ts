import { api } from '@/api/client';
import type { ApiResponse, Vacancy, VacancyCreateInput } from '@/types/api';

export type TranslatedContent = {
  title: string;
  description: string;
  requirements: string;
  responsibilities: string;
};

export type GeneratedVacancy = TranslatedContent & {
  work_type: 'remote' | 'office' | 'hybrid';
  work_schedule: 'full-time' | 'part-time' | 'contract';
  experience_years: number;
  experience_months: number;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  min_match_score?: number;
};

export const vacanciesApi = {
  list: (params?: { status?: string; lang?: string }) =>
    api.get<Vacancy[]>('/vacancies/', { params }).then((r) => r.data),

  get: (id: string, params?: { lang?: string }) =>
    api.get<Vacancy>(`/vacancies/${id}/`, { params }).then((r) => r.data),

  create: (data: VacancyCreateInput) =>
    api.post<ApiResponse<Vacancy>>('/vacancies/', data).then((r) => r.data),

  update: (id: string, data: Partial<VacancyCreateInput>) =>
    api.patch<Vacancy>(`/vacancies/${id}/`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/vacancies/${id}/`).then((r) => r.data),

  translate: (content: TranslatedContent) =>
    api
      .post<ApiResponse<TranslatedContent>>('/vacancies/ai_translate/', content)
      .then((r) => r.data),

  generateFromBrief: (brief: string) =>
    api
      .post<ApiResponse<GeneratedVacancy>>('/vacancies/ai_generate/', { brief })
      .then((r) => r.data),
};
