import { api, consumeSse, type SseEventHandlers } from '@/api/client';
import { env } from '@/lib/env';
import type {
  FinalizeInterviewResponse,
  StartInterviewResponse,
  SubmitAnswerResponse,
} from '@/types/api';

export const interviewApi = {
  getStatus: (applicationId: number) =>
    api.get<{ success: boolean; data: any }>(`/public/application_status/${applicationId}/`).then((r) => r.data),

  start: (applicationId: number) =>
    api
      .post<StartInterviewResponse>('/public/interview/start/', { application_id: applicationId })
      .then((r) => r.data),

  submitAnswer: (
    applicationId: number,
    answer: string,
    typingMetrics?: {
      paste_count: number;
      total_time_ms: number;
      chars_per_sec: number;
    },
  ) =>
    api
      .post<SubmitAnswerResponse>('/public/interview/answer/', {
        application_id: applicationId,
        answer,
        typing_metrics: typingMetrics,
      })
      .then((r) => r.data),

  finalize: (applicationId: number) =>
    api
      .post<FinalizeInterviewResponse>('/public/interview/finalize/', {
        application_id: applicationId,
      })
      .then((r) => r.data),

  abandon: (applicationId: number) =>
    api
      .post<{ success: boolean; message: string }>('/public/interview/abandon/', {
        application_id: applicationId,
      })
      .then((r) => r.data),

  // Tab yopilganda fire-and-forget chaqiriladi — fetch/axios ishonchsiz (bekor qilinadi),
  // sendBeacon browser tomonidan kafolatlanib yuboriladi.
  abandonBeacon: (applicationId: number) => {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;
    const url = `${env.API_BASE_URL}/public/interview/abandon/`;
    const data = new Blob([JSON.stringify({ application_id: applicationId })], {
      type: 'application/json',
    });
    navigator.sendBeacon(url, data);
  },

  streamNextQuestion: (applicationId: number, handlers: SseEventHandlers = {}) =>
    consumeSse(`${env.API_BASE_URL}/public/interview/stream/${applicationId}/`, handlers),

  getPsychologicalQuestions: () =>
    api.get<{ success: boolean; data: any[] }>('/public/interview/psychological-test/').then((r) => r.data),

  submitPsychologicalTest: (applicationId: number, answers: Record<string, number>) =>
    api
      .post<{ success: boolean; data: any }>('/public/interview/psychological-test/submit/', {
        application_id: applicationId,
        answers,
      })
      .then((r) => r.data),
};
