import { create } from 'zustand';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('virexo-theme');
  return saved || 'dark';
};

const getInitialMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const usePreferencesStore = create((set) => ({
  theme: getInitialTheme(),
  sidebarOpen: true,
  reducedMotion: getInitialMotion(),

  setTheme: (theme) => {
    localStorage.setItem('virexo-theme', theme);
    set({ theme });
    applyThemeToDocument(theme);
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}));

export function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  if (isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}
