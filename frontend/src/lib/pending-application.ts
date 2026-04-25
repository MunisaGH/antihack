/**
 * Muvaqqat ariza holatini saqlash — brauzer yopilib qaytib kelganda
 * foydalanuvchi credentials va natijani qaytadan ko'rishi uchun.
 */

const STORAGE_KEY = 'pendingApplication';

export type PendingApplication = {
  vacancyId: string;
  applicationId: number;
  pollToken: string;
  savedAt: number;
};

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 soat

export function savePendingApplication(data: Omit<PendingApplication, 'savedAt'>): void {
  try {
    const payload: PendingApplication = { ...data, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage to'la yoki private rejim — fail silently
  }
}

export function getPendingApplication(vacancyId?: string): PendingApplication | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingApplication;
    if (!data || typeof data.applicationId !== 'number') return null;
    if (Date.now() - (data.savedAt || 0) > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (vacancyId && data.vacancyId !== vacancyId) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearPendingApplication(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
