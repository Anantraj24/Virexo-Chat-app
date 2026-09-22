import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { loginRequest } from '../api/authApi';
import { useAuthStore } from '../store/useAuthStore';
import { validateEmail, validatePassword } from '../lib/validation';

export function LoginPage() {
  const [email, setEmail] = useState('');
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

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    if (emailErr || passwordErr) {
      setErrors({
        email: emailErr,
        password: passwordErr,
      });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const response = await loginRequest({ email, password, rememberMe });
      const { user, accessToken } = response.data;

      setAuth(user, accessToken);
      addToast({ message: `Welcome back, ${user.username}!`, type: 'success' });
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[calc(100vh-4rem)] bg-matte-editorial">
      <div className="w-full max-w-md bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-serif tracking-tight text-gradient-sunset font-medium">Welcome Back</h2>
          <p className="text-xs text-zinc-400 font-light">Sign in to your Virexo real-time account</p>
        </div>

        {serverError && (
          <div className="p-3.5 rounded-xl border border-rose-800/60 bg-rose-950/80 text-rose-200 text-xs font-medium">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="alex@example.com"
            leftIcon={<Mail className="w-4 h-4 text-amber-200/70" />}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
            }}
            error={errors.email}
            required
          />

          <div>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4 text-amber-200/70" />}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
              }}
              error={errors.password}
              required
            />
            <div className="flex items-center justify-between mt-2.5">
              <label className="flex items-center space-x-2 text-xs text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 focus:ring-offset-zinc-950"
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-xs text-amber-200/90 hover:text-amber-100 font-medium">
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
              className="gold-wireframe-btn uppercase tracking-[0.2em] font-semibold text-xs py-3.5 rounded-none"
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="text-center text-xs text-zinc-500 font-light pt-2">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-amber-200 hover:text-amber-100 font-medium underline underline-offset-4">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
