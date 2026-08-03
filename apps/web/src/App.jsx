import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePreferencesStore, applyThemeToDocument } from './store/usePreferencesStore';
import { useAuthStore } from './store/useAuthStore';
import { refreshRequest, getMeRequest } from './api/authApi';

import { ProtectedRoute } from './components/ProtectedRoute';
import { GuestRoute } from './components/GuestRoute';

import { AppLayout } from './layouts/AppLayout';
import { PublicLayout } from './layouts/PublicLayout';

import { HomePage } from './pages/HomePage';
import { ChannelPage } from './pages/ChannelPage';
import { DirectMessagePage } from './pages/DirectMessagePage';
import { SettingsPage } from './pages/SettingsPage';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';

function AuthInitializer({ children }) {
  const { setAuth, clearAuth, setInitializing } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        // Attempt silent refresh using HttpOnly cookie
        const refreshRes = await refreshRequest();
        const accessToken = refreshRes.data.accessToken;

        // Fetch current user profile with the new access token
        const meRes = await getMeRequest();
        const user = meRes.data.user;

        if (isMounted) {
          setAuth(user, accessToken);
        }
      } catch {
        if (isMounted) {
          clearAuth();
        }
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [setAuth, clearAuth, setInitializing]);

  return children;
}

export default function App() {
  const { theme } = usePreferencesStore();

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthInitializer>
            <BrowserRouter>
              <Routes>
                {/* Main Application Workspace Layout (Protected) */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<HomePage />} />
                  <Route path="channels/:id" element={<ChannelPage />} />
                  <Route path="dms/:id" element={<DirectMessagePage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Public Authentication Layout (Guest Only for login/register) */}
                <Route element={<PublicLayout />}>
                  <Route
                    path="login"
                    element={
                      <GuestRoute>
                        <LoginPage />
                      </GuestRoute>
                    }
                  />
                  <Route
                    path="register"
                    element={
                      <GuestRoute>
                        <RegisterPage />
                      </GuestRoute>
                    }
                  />
                  <Route path="verify-email" element={<VerifyEmailPage />} />
                  <Route path="forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="reset-password" element={<ResetPasswordPage />} />
                </Route>

                {/* 404 Fallback */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </AuthInitializer>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
