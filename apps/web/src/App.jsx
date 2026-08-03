import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePreferencesStore, applyThemeToDocument } from './store/usePreferencesStore';

import { AppLayout } from './layouts/AppLayout';
import { PublicLayout } from './layouts/PublicLayout';

import { HomePage } from './pages/HomePage';
import { ChannelPage } from './pages/ChannelPage';
import { DirectMessagePage } from './pages/DirectMessagePage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  const { theme } = usePreferencesStore();

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Main Application Workspace Layout */}
              <Route path="/" element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="channels/:id" element={<ChannelPage />} />
                <Route path="dms/:id" element={<DirectMessagePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Public Authentication Layout */}
              <Route element={<PublicLayout />}>
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
