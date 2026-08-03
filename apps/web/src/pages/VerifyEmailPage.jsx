import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { CheckCircle2, AlertTriangle, Mail } from 'lucide-react';
import { verifyEmailRequest, resendVerificationRequest } from '../api/authApi';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../components/ui/Toast';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState(token ? 'verifying' : 'missing_token'); // verifying | success | error | missing_token
  const [errorMessage, setErrorMessage] = useState('');
  const [resending, setResending] = useState(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { addToast } = useToast();

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    verifyEmailRequest({ token })
      .then(() => {
        if (isMounted) setStatus('success');
      })
      .catch((err) => {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err.message || 'Email verification failed or token has expired.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationRequest();
      addToast({ message: 'A new verification email has been sent!', type: 'success' });
    } catch (err) {
      addToast({ message: err.message || 'Failed to resend verification email.', type: 'error' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl text-center space-y-6">
        {status === 'verifying' && (
          <div className="space-y-4 py-6">
            <Spinner size="lg" className="mx-auto" />
            <h2 className="text-lg font-bold text-white tracking-tight">Verifying Email...</h2>
            <p className="text-xs text-zinc-400">Please wait while we confirm your verification link.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Email Verified!</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your email address has been successfully verified. You can now access all Virexo features.
            </p>
            <div className="pt-2">
              <Link to="/">
                <Button variant="primary" fullWidth size="md">
                  Continue to App
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Verification Failed</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">{errorMessage}</p>

            {isAuthenticated ? (
              <div className="pt-2 space-y-2">
                <Button
                  variant="primary"
                  fullWidth
                  size="md"
                  isLoading={resending}
                  onClick={handleResend}
                  leftIcon={<Mail className="w-4 h-4" />}
                >
                  Resend Verification Email
                </Button>
              </div>
            ) : (
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="secondary" fullWidth size="md">
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {status === 'missing_token' && (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Check Your Inbox</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Please click the verification link in the email sent to your address to complete setup.
            </p>
            {isAuthenticated && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  fullWidth
                  size="md"
                  isLoading={resending}
                  onClick={handleResend}
                  leftIcon={<Mail className="w-4 h-4" />}
                >
                  Resend Email
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
