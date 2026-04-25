import { api } from '@/api/client';
import type { Application, ApplicationStatus } from '@/types/api';

export type ApplicantListItem = {
  phone: string;
  full_name: string;
  age: number | null;
  address: string;
  telegram_username: string;
  last_applied_at: string;
  last_status: ApplicationStatus;
  last_vacancy_title: string;
  last_vacancy_id: string | null;
  applications_count: number;
};

export type ApplicantDetail = {
  phone: string;
  full_name: string;
  age: number | null;
  address: string;
  telegram_username: string;
  applications_count: number;
  first_applied_at: string;
  last_applied_at: string;
  applications: Application[];
};

export const applicantsApi = {
  list: (params?: { search?: string; lang?: string }) =>
    api
      .get<{ success: boolean; data: ApplicantListItem[]; count: number }>(
        '/applicants/',
        { params },
      )
      .then((r) => r.data),

  byPhone: (phone: string) =>
    api
      .get<{ success: boolean; data: ApplicantDetail }>(
        `/applicants/by_phone/${encodeURIComponent(phone)}/`,
      )
      .then((r) => r.data),
};
