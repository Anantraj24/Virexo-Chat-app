import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore.js';
import { Spinner } from './ui/Spinner.jsx';

/**
 * Wraps guest-only routes (login, register).
 * Redirects authenticated users to /.
 */
export function GuestRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuthStore();

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center space-y-4">
          <Spinner size="lg" />
          <p className="text-xs text-zinc-500 font-medium">Loading Virexo...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}
