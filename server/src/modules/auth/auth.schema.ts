import { z } from 'zod';
import { env } from '../../config/env.js';

export const loginSchema = z.object({
  prn: z.string().regex(/^\d{9}$/, 'PRN must contain exactly 9 digits'),
  password: z.string().min(1).max(64),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(64),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64)
    .refine((value) => /[A-Za-z]/.test(value), 'Password must contain a letter')
    .refine((value) => /\d/.test(value), 'Password must contain a number'),
});

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .refine(
      (val) => val.toLowerCase().endsWith(`@${env.COLLEGE_EMAIL_DOMAIN.toLowerCase()}`),
      `Only college email addresses (@${env.COLLEGE_EMAIL_DOMAIN}) are permitted`
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64)
    .refine((value) => /[A-Za-z]/.test(value), 'Password must contain a letter')
    .refine((value) => /\d/.test(value), 'Password must contain a number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Code must be numbers only'),
});

export const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
