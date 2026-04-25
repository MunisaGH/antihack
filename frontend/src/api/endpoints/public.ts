import { api } from '@/api/client';
import type { ApiResponse, Application, ApplicationStatus, Vacancy } from '@/types/api';

export type ContactInfo = {
  full_name: string;
  company_name: string;
  phone: string;
  email: string;
  telegram_username: string;
} | null;

export type ApplicationStatusPayload = {
  application_id: number;
  status: ApplicationStatus;
  compatibility_score: number;
  reason?: string;
  feedback?: string;
  credentials?: { username: string; password: string; phone: string; token: string };
};

export type ResumeFormEducation = {
  degree?: string;
  field?: string;
  institution?: string;
  year?: string;
};

export type ResumeFormExperience = {
  position?: string;
  company?: string;
  duration?: string;
  description?: string;
};

export type ResumeFormLanguage = {
  name: string;
  level?: string;
};

export type ResumeFormPayload = {
  full_name: string;
  phone: string;
  age?: number;
  address?: string;
  telegram_username?: string;
  email?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  user_language?: 'uz' | 'ru';
  summary?: string;
  education_data?: ResumeFormEducation[];
  experience_data?: ResumeFormExperience[];
  technical_skills?: string[];
  soft_skills?: string[];
  languages?: ResumeFormLanguage[];
  certifications?: string[];
  hobbies?: string;
};

export const publicApi = {
  vacancies: (params?: { location?: string; work_type?: string; page?: number }) =>
    api
      .get<{
        success: boolean;
        data: { vacancies: Vacancy[]; total_pages: number; current_page: number; total_count: number };
      }>('/public/vacancies/', { params })
      .then((r) => r.data),

  vacancyByLink: (uniqueLink: string) =>
    api.get<ApiResponse<Vacancy>>(`/public/vacancy/${uniqueLink}/`).then((r) => r.data),

  submitApplication: (formData: FormData) =>
    api
      .post<{
        success: boolean;
        application_id: number;
        status: ApplicationStatus;
        message?: string;
        poll_token?: string;
      }>('/public/submit_application/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  submitResumeForm: (payload: { vacancy_id: string; form_data: ResumeFormPayload }) =>
    api
      .post<{
        success: boolean;
        application_id: number;
        status: ApplicationStatus;
        message?: string;
        poll_token?: string;
      }>('/public/submit_resume_form/', payload)
      .then((r) => r.data),

  applicationStatus: (applicationId: number, pollToken?: string) =>
    api
      .get<{ success: boolean; data: ApplicationStatusPayload }>(
        `/public/application_status/${applicationId}/`,
        pollToken ? { headers: { 'X-Poll-Token': pollToken } } : undefined,
      )
      .then((r) => r.data),

  submitContact: (payload: { name: string; phone: string; message?: string }) =>
    api.post<ApiResponse<null>>('/public/submit_contact_message/', payload).then((r) => r.data),

  myApplications: () =>
    api
      .get<{ success: boolean; data: Application[]; count: number }>(
        '/public/my_applications/',
      )
      .then((r) => r.data),

  myApplication: (applicationId: number) =>
    api
      .get<{ success: boolean; data: Application }>(
        `/public/my_application/${applicationId}/`,
      )
      .then((r) => r.data),

  contactInfo: () =>
    api
      .get<{ success: boolean; data: ContactInfo }>('/public/contact_info/')
      .then((r) => r.data),
};
