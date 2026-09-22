import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePreferencesStore, applyThemeToDocument } from './store/usePreferencesStore';
import { useAuthStore } from './store/useAuthStore';
import { refreshRequest, getMeRequest } from './api/authApi';
import { lazy, Suspense } from 'react';

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const ChannelPage = lazy(() => import('./pages/ChannelPage').then(module => ({ default: module.ChannelPage })));
const DirectMessagePage = lazy(() => import('./pages/DirectMessagePage').then(module => ({ default: module.DirectMessagePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const ConversationListPage = lazy(() => import('./pages/ConversationListPage').then(module => ({ default: module.ConversationListPage })));

const EditorialHero = lazy(() => import('./components/landing/EditorialHero').then(module => ({ default: module.EditorialHero })));

const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(module => ({ default: module.RegisterPage })));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage').then(module => ({ default: module.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));

import { ProtectedRoute } from './components/ProtectedRoute';
import { GuestRoute } from './components/GuestRoute';

import { AppLayout } from './layouts/AppLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { Spinner } from './components/ui/Spinner';

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
              <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black"><Spinner size="lg" /></div>}>
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
                    <Route path="conversations" element={<ConversationListPage />} />
                    <Route path="channels/:id" element={<ChannelPage />} />
                    <Route path="dms/:id" element={<DirectMessagePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="admin" element={<AdminDashboard />} />
                  </Route>

                  {/* Public Authentication & Landing Layout */}
                  <Route element={<PublicLayout />}>
                    <Route path="landing" element={<EditorialHero />} />
                    <Route path="welcome" element={<EditorialHero />} />
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
              </Suspense>
            </BrowserRouter>
          </AuthInitializer>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
