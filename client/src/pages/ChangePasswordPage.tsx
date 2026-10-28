import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'Use at least 8 characters').max(64),
  confirmPassword: z.string().min(1, 'Confirm your new password'),
}).superRefine((values, context) => {
  if (!/[A-Za-z]/.test(values.newPassword)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['newPassword'], message: 'Add at least one letter' });
  }
  if (!/\d/.test(values.newPassword)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['newPassword'], message: 'Add at least one number' });
  }
  if (values.newPassword !== values.confirmPassword) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match' });
  }
  if (values.newPassword === values.currentPassword) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['newPassword'], message: 'Choose a different password' });
  }
});

type FormValues = z.infer<typeof passwordSchema>;

export const ChangePasswordPage: React.FC = () => {
  const { user, changePassword, isChangingPassword } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(passwordSchema) });
  const newPassword = watch('newPassword') || '';
  const hasLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);

  const onSubmit = async ({ currentPassword, newPassword: nextPassword }: FormValues) => {
    try {
      await changePassword({ currentPassword, newPassword: nextPassword });
      navigate('/', { replace: true });
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Password could not be changed.';
      setError('currentPassword', { message });
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <p className="text-12 uppercase text-mute mb-2">Account security</p>
      <h1 className="text-24 font-semibold text-ink">Change your password</h1>
      <p className="text-14 text-mute mt-2 mb-8">
        {user?.mustChangePassword ? 'Set a new password before continuing.' : 'Update your account password.'}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <ul className="text-12 text-mute space-y-1" aria-live="polite">
          <li className={hasLength ? 'text-ok' : ''}>{hasLength ? '[x]' : '[ ]'} At least 8 characters</li>
          <li className={hasLetter ? 'text-ok' : ''}>{hasLetter ? '[x]' : '[ ]'} At least one letter</li>
          <li className={hasNumber ? 'text-ok' : ''}>{hasNumber ? '[x]' : '[ ]'} At least one number</li>
        </ul>
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" variant="primary" isLoading={isChangingPassword} className="w-full">
          Save new password
        </Button>
      </form>
    </div>
  );
};

export default ChangePasswordPage;
