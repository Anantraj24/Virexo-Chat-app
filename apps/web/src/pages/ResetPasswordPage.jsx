import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Lock, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { resetPasswordRequest } from '../api/authApi';
import { validatePassword, validatePasswordMatch } from '../lib/validation';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Invalid Link</h2>
          <p className="text-xs text-zinc-400">Password reset token is missing from the link.</p>
          <div className="pt-2">
            <Link to="/forgot-password">
              <Button variant="secondary" fullWidth size="md">
                Request New Link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const passwordErr = validatePassword(password);
    const matchErr = validatePasswordMatch(password, confirmPassword);

    if (passwordErr || matchErr) {
      setErrors({
        password: passwordErr,
        confirmPassword: matchErr,
      });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await resetPasswordRequest({ token, password });
      setSuccess(true);
    } catch (err) {
      setServerError(err.message || 'Reset password failed or token has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white tracking-tight">Reset Password</h2>
          <p className="text-xs text-zinc-400 mt-1">Enter your new password below</p>
        </div>

        {serverError && (
          <div className="p-3.5 rounded-xl border border-red-800/60 bg-red-950/80 text-red-200 text-xs font-medium">
            {serverError}
          </div>
        )}

        {success ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Password Reset Complete</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your password has been successfully updated. All active sessions have been signed out for security.
            </p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="primary" fullWidth size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Sign In with New Password
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
              }}
              error={errors.password}
              helperText="At least 8 characters and 1 number"
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
              }}
              error={errors.confirmPassword}
              required
            />

            <Button type="submit" variant="primary" fullWidth size="lg" isLoading={loading}>
              Reset Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
