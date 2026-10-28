import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Mail, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export const VerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();

  const { verifyOtp, isVerifyingOtp, resendOtp, isResendingOtp } = useAuth();

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => setCooldown((val) => Math.max(0, val - 1)), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setHasError(true);
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setHasError(false);
      setErrorMessage('');
      await verifyOtp({ email: email.trim(), code: code.trim() });
      navigate('/', { replace: true });
    } catch (err: any) {
      setHasError(true);
      setErrorMessage(err.response?.data?.error?.message || 'Verification failed. Please check your code.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      setHasError(false);
      setErrorMessage('');
      setSuccessMessage('');
      await resendOtp({ email: email.trim() });
      setSuccessMessage('A new verification code has been sent.');
      setCooldown(60);
    } catch (err: any) {
      setHasError(true);
      setErrorMessage(err.response?.data?.error?.message || 'Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="min-h-[calc(100dvh-56px)] flex items-center justify-center p-6 bg-canvas">
      <div className="w-full max-w-md bg-canvas border border-line p-8 space-y-6">
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="p-1 text-mute hover:text-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            aria-label="Back to login"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-accent rounded-sm flex items-center justify-center text-white text-11 font-bold">C</div>
            <span className="font-semibold text-14 text-ink">Camp-Exchange</span>
          </div>
        </div>

        <div>
          <div className="w-10 h-10 border border-line flex items-center justify-center text-accent mb-3">
            <Mail className="w-5 h-5" />
          </div>
          <h1 className="text-22 font-semibold text-ink">Verify your email</h1>
          <p className="text-13 text-mute mt-1">
            We sent a 6-digit verification code to{' '}
            <span className="font-medium text-ink">{email || 'your email'}</span>.
          </p>
        </div>

        <motion.form
          onSubmit={handleVerify}
          animate={hasError && !shouldReduceMotion ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.16 }}
          className="space-y-4"
        >
          {!initialEmail && (
            <Input
              label="College Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@college.edu.in"
              required
            />
          )}

          <div>
            <label htmlFor="otp-input" className="block text-12 font-medium text-mute uppercase tracking-wider mb-1.5">
              Verification Code
            </label>
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full text-center text-28 font-bold tracking-[12px] h-14 bg-canvas border border-line rounded-none px-4 focus:outline-none focus:border-accent font-mono text-ink"
              required
            />
            <p className="text-11 text-mute mt-1.5 text-center">Code expires in 10 minutes</p>
          </div>

          {errorMessage && (
            <p className="text-13 text-danger" role="alert" aria-live="polite">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 text-13 text-ok" role="status">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" isLoading={isVerifyingOtp} className="w-full">
            Verify and continue
          </Button>

          <div className="pt-2 text-center border-t border-line space-y-3">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isResendingOtp}
                className="text-13 text-accent hover:underline disabled:text-faint disabled:no-underline font-medium inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResendingOtp ? 'animate-spin' : ''}`} />
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend verification code'}
              </button>
            </div>

          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default VerifyPage;
