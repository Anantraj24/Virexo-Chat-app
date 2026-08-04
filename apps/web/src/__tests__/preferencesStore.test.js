import { describe, it, expect, beforeEach } from 'vitest';
import { usePreferencesStore } from '../store/usePreferencesStore';

describe('usePreferencesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset store to defaults
    usePreferencesStore.setState({
      theme: 'dark',
      sidebarOpen: true,
      reducedMotion: false,
    });
  });

  it('should initialize with dark theme by default', () => {
    const state = usePreferencesStore.getState();
    expect(state.theme).toBe('dark');
  });

  it('should default sidebarOpen to true', () => {
    const state = usePreferencesStore.getState();
    expect(state.sidebarOpen).toBe(true);
  });

  it('setTheme should update theme state and persist to localStorage', () => {
    usePreferencesStore.getState().setTheme('light');

    const state = usePreferencesStore.getState();
    expect(state.theme).toBe('light');
    expect(localStorage.getItem('virexo-theme')).toBe('light');
  });

  it('toggleSidebar should flip sidebarOpen', () => {
    expect(usePreferencesStore.getState().sidebarOpen).toBe(true);

    usePreferencesStore.getState().toggleSidebar();
    expect(usePreferencesStore.getState().sidebarOpen).toBe(false);

    usePreferencesStore.getState().toggleSidebar();
    expect(usePreferencesStore.getState().sidebarOpen).toBe(true);
  });

  it('setSidebarOpen should set sidebarOpen directly', () => {
    usePreferencesStore.getState().setSidebarOpen(false);
    expect(usePreferencesStore.getState().sidebarOpen).toBe(false);
  });

  it('setReducedMotion should update the reducedMotion state', () => {
    usePreferencesStore.getState().setReducedMotion(true);
    expect(usePreferencesStore.getState().reducedMotion).toBe(true);
  });
});
