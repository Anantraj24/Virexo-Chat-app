import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { User, Lock, LogIn } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { loginRequest } from '../api/authApi';
import { useAuthStore } from '../store/useAuthStore';
import { validateIdentifier } from '../lib/validation';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const setAuth = useAuthStore((state) => state.setAuth);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const identifierErr = validateIdentifier(identifier);
    const passwordErr = !password ? 'Password is required' : null;

    if (identifierErr || passwordErr) {
      setErrors({
        identifier: identifierErr,
        password: passwordErr,
      });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const response = await loginRequest({ identifier, password, rememberMe });
      const { user, accessToken } = response.data;

      setAuth(user, accessToken);
      addToast({ message: `Welcome back, ${user.displayName || user.username}!`, type: 'success' });
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[calc(100vh-4rem)]" style={{ backgroundColor: '#111b21' }}>
      <div className="w-full max-w-md rounded-2xl p-8 space-y-6 relative overflow-hidden" style={{ backgroundColor: '#1f2c34', border: '1px solid #2a3942' }}>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight" style={{ color: '#e9edef' }}>Virexo</h2>
          <p className="text-xs" style={{ color: '#8696a0' }}>Sign in with your username or email</p>
        </div>

        {serverError && (
          <div className="p-3.5 rounded-xl text-xs font-medium" style={{ border: '1px solid #4a2020', backgroundColor: '#2d1515', color: '#f5a5a5' }}>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username or Email"
            type="text"
            placeholder="anant"
            leftIcon={<User className="w-4 h-4" style={{ color: '#00a884' }} />}
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: null }));
            }}
            error={errors.identifier}
            required
          />

          <div>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" style={{ color: '#00a884' }} />}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
              }}
              error={errors.password}
              required
            />
            <div className="flex items-center justify-between mt-2.5">
              <label className="flex items-center space-x-2 text-xs cursor-pointer select-none" style={{ color: '#8696a0' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded"
                  style={{ accentColor: '#00a884' }}
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: '#00a884' }}>
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={loading}
              leftIcon={<LogIn className="w-4 h-4" />}
              className="font-semibold text-sm py-3 rounded-lg"
              style={{ backgroundColor: '#00a884', color: '#111b21', border: 'none' }}
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="text-center text-xs pt-2" style={{ color: '#8696a0' }}>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium underline underline-offset-4 hover:opacity-80" style={{ color: '#00a884' }}>
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
