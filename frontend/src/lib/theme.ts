import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

type ThemeState = {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
};

const THEME_STORAGE_KEY = 'career_ai.theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolved: resolve('system'),
      setTheme: (theme) => {
        const resolved = resolve(theme);
        applyTheme(resolved);
        set({ theme, resolved });
      },
      toggle: () => {
        const { resolved } = get();
        const next: Theme = resolved === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = resolve(state.theme);
          applyTheme(resolved);
          state.resolved = resolved;
        }
      },
    },
  ),
);

// Sistemadagi afzallik o'zgarganida 'system' rejimini avtomatik sinxronlash.
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    const { theme, setTheme } = useTheme.getState();
    if (theme === 'system') setTheme('system');
  });
}
