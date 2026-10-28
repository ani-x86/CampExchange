import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid college email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64)
    .refine((v) => /[A-Za-z]/.test(v), 'Password must contain a letter')
    .refine((v) => /\d/.test(v), 'Password must contain a number'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const shouldReduceMotion = useReducedMotion();
  const { register: registerAccount, isRegistering } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setHasError(false);
      setErrorMessage('');
      const res = await registerAccount(data);
      navigate(`/verify?email=${encodeURIComponent(res.email)}`);
    } catch (error: any) {
      setHasError(true);
      setErrorMessage(error.response?.data?.error?.message || 'Registration failed. Please check your details.');
    }
  };

  return (
    <div className="min-h-[calc(100dvh-56px)] grid grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 max-w-xl mx-auto w-full">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-accent rounded-sm flex items-center justify-center text-white text-12 font-bold">C</div>
            <span className="font-semibold text-15 text-ink">Camp-Exchange</span>
          </div>
          <h1 className="text-24 sm:text-28 font-semibold text-ink">Create account</h1>
          <p className="text-13 text-mute mt-1">Register using your verified college email.</p>
        </div>

        <motion.form
          onSubmit={handleSubmit(onSubmit)}
          animate={hasError && !shouldReduceMotion ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.16 }}
          className="space-y-4"
        >
          <Input
            label="Full Name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="College Email"
            type="email"
            autoComplete="email"
            placeholder="student@college.edu.in"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Min 8 chars, 1 letter, 1 number"
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
              {errorMessage}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" isLoading={isRegistering} className="w-full mt-2">
            Continue to verification
          </Button>

          <p className="text-13 text-mute text-center pt-2">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </motion.form>
      </div>

      <div className="hidden lg:flex flex-col justify-between p-12 bg-surface border-l border-line">
        <div className="flex items-center gap-2 text-mute text-13">
          <ShieldCheck className="w-4 h-4 text-ok" />
          <span>Exclusive to verified students</span>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-28 font-semibold text-ink leading-tight">Your campus, your community.</h2>
          <p className="text-14 text-mute leading-relaxed">
            Camp-Exchange connects you with verified students at your college to trade books, electronics, lab supplies, and hostel gear safely.
          </p>
        </div>
        <div className="text-12 text-faint">Camp-Exchange</div>
      </div>
    </div>
  );
};

export default RegisterPage;
