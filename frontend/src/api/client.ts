import axios, { AxiosError, type AxiosInstance } from 'axios';
import { authStorage } from '@/lib/auth-storage';
import { env } from '@/lib/env';

export const api: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

function getStoredLang(): 'uz' | 'ru' {
  try {
    const stored = localStorage.getItem('career_ai.lang');
    if (stored === 'uz' || stored === 'ru') return stored;
  } catch {
    // noop
  }
  return 'uz';
}

api.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const lang = getStoredLang();
  config.headers['Accept-Language'] = lang;

  if (config.method?.toLowerCase() === 'get') {
    const params = (config.params ?? {}) as Record<string, unknown>;
    if (!('lang' in params)) {
      config.params = { ...params, lang };
    }
  }

  return config;
});

let refreshingPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = authStorage.getRefresh();
  if (!refresh) throw new Error('No refresh token');
  const response = await axios.post<{ access: string; refresh: string }>(
    `${env.API_BASE_URL}/auth/refresh/`,
    { refresh },
  );
  authStorage.setToken(response.data.access);
  if (response.data.refresh) authStorage.setRefresh(response.data.refresh);
  return response.data.access;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        refreshingPromise ??= refreshAccessToken();
        const newToken = await refreshingPromise;
        refreshingPromise = null;
        if (original.headers) {
          original.headers.Authorization = `Bearer ${newToken}`;
        }
        return api.request(original);
      } catch {
        refreshingPromise = null;
        authStorage.clear();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export type SseEventHandlers = {
  onChunk?: (text: string) => void;
  onDone?: (payload: { questions_asked: number; status: string }) => void;
  onError?: (payload: { message?: string } | Error) => void;
  signal?: AbortSignal;
};

export async function consumeSse(url: string, handlers: SseEventHandlers = {}): Promise<void> {
  const { onChunk, onDone, onError, signal } = handlers;
  try {
    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    const token = authStorage.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const event of events) {
        const line = event.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        try {
          const payload = JSON.parse(line.slice(6)) as {
            type: 'chunk' | 'done' | 'error';
            text?: string;
            message?: string;
            questions_asked?: number;
            status?: string;
          };
          if (payload.type === 'chunk' && payload.text && onChunk) {
            onChunk(payload.text);
          } else if (payload.type === 'done' && onDone) {
            onDone({
              questions_asked: payload.questions_asked ?? 0,
              status: payload.status ?? 'active',
            });
          } else if (payload.type === 'error' && onError) {
            onError({ message: payload.message });
          }
        } catch {
          // Ignore malformed SSE frames
        }
      }
    }
  } catch (err) {
    if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    else throw err;
  }
}
