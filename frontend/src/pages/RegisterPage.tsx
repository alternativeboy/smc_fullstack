import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ApiError } from '@/services/api';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

const INPUT =
  'w-full rounded-xl border border-white/[0.08] bg-[#0f1419]/60 py-3 pl-11 text-[15px] text-[#f0f4f8] outline-none backdrop-blur transition placeholder:text-[#5c6d7e] focus:border-[#2fd07f]/50 focus:shadow-[0_0_0_3px_rgba(47,208,127,0.08)]';
const LABEL = 'mb-2 block text-[13px] font-medium text-[#8899a6]';
const ICON = 'pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#5c6d7e]';

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (displayName.length < 1 || displayName.length > 100) return 'Display name must be 1–100 characters.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Enter a valid email.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    return null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authService.register(email, password, displayName);
      setAuth(res.accessToken, res.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? 'That email is already registered.' : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <h1 className="mb-2 text-[28px] font-bold tracking-[-0.5px]">Create your account</h1>
        <p className="text-[15px] text-[#8899a6]">Start exploring the financial data</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="displayName" className={LABEL}>
            Display name
          </label>
          <div className="relative">
            <User className={ICON} />
            <input
              id="displayName"
              autoComplete="name"
              required
              placeholder="Jane Analyst"
              className={`${INPUT} pr-4`}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={LABEL}>
            Email address
          </label>
          <div className="relative">
            <Mail className={ICON} />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@company.com"
              className={`${INPUT} pr-4`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className={LABEL}>
            Password
          </label>
          <div className="relative">
            <Lock className={ICON} />
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              required
              placeholder="At least 8 characters"
              className={`${INPUT} pr-11`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label="Toggle password visibility"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5c6d7e] transition hover:text-[#8899a6]"
            >
              {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-[#ff6b6b]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2fd07f,#26b86e)] py-3.5 text-[15px] font-semibold text-white transition hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(47,208,127,0.3)] active:translate-y-0 disabled:opacity-70"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[#8899a6]">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-[#2fd07f] transition hover:text-[#26b86e]">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
