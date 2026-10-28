import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  prn: z.string().regex(/^\d{9}$/, 'Enter your 9-digit PRN'),
  password: z.string().min(1, 'Password is required').max(64),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const { login, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = window.setInterval(() => setRemainingSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [remainingSeconds > 0]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setHasError(false);
      setErrorMessage('');
      const result = await login(data);
      navigate(result.mustChangePassword ? '/change-password' : from, { replace: true });
    } catch (error: any) {
      setHasError(true);
      setErrorMessage(error.response?.data?.error?.message || 'Invalid PRN or password');
      const seconds = Number(error.response?.data?.error?.retryAfterSeconds || 0);
      setRemainingSeconds(seconds);
    }
  };

  const lockoutText = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-[calc(100dvh-56px)] grid grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 max-w-xl mx-auto w-full">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-accent rounded-sm flex items-center justify-center text-white text-12 font-bold">C</div>
            <span className="font-semibold text-15 text-ink">Camp-Exchange</span>
          </div>
          <h1 className="text-24 sm:text-28 font-semibold text-ink">Sign in</h1>
          <p className="text-13 text-mute mt-1">Log in with your student PRN.</p>
        </div>

        <motion.form
          onSubmit={handleSubmit(onSubmit)}
          animate={hasError && !shouldReduceMotion ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.16 }}
          className="space-y-4"
        >
          <Input
            label="PRN"
            type="text"
            inputMode="numeric"
            autoComplete="username"
            maxLength={9}
            placeholder="9-digit PRN"
            error={errors.prn?.message}
            {...register('prn')}
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            error={errors.password?.message}
            rightAddon={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="p-1 text-mute hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            {...register('password')}
          />

          {errorMessage && (
            <p className="text-13 text-danger" role="alert" aria-live="polite">
              {errorMessage}{remainingSeconds > 0 ? ` Try again in ${lockoutText}.` : ''}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" isLoading={isLoggingIn} className="w-full mt-2">
            Sign in
          </Button>

          <p className="text-13 text-mute text-center pt-2">
            New student or no PRN?{' '}
            <Link to="/register" className="text-accent hover:underline font-medium">
              Register with college email
            </Link>
          </p>
        </motion.form>
      </div>

      <div className="hidden lg:flex flex-col justify-between p-12 bg-surface border-l border-line">
        <div className="flex items-center gap-2 text-mute text-13">
          <ShieldCheck className="w-4 h-4 text-ok" />
          <span>Student accounts managed by your department</span>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-28 font-semibold text-ink leading-tight">Buy and sell on campus.</h2>
          <p className="text-14 text-mute leading-relaxed">
            Find cycles, electronics, books, hostel essentials, and sports gear from fellow students.
          </p>
        </div>
        <div className="text-12 text-faint">Camp-Exchange</div>
      </div>
    </div>
  );
};

export default LoginPage;
