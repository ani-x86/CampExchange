import { Router } from 'express';
import { validateRequest } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from './auth.schema.js';
import {
  loginHandler,
  registerHandler,
  verifyOtpHandler,
  resendOtpHandler,
  changePasswordHandler,
  logoutHandler,
  meHandler,
} from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', authRateLimiter, validateRequest(loginSchema), loginHandler);
authRouter.post('/register', authRateLimiter, validateRequest(registerSchema), registerHandler);
authRouter.post('/verify-otp', authRateLimiter, validateRequest(verifyOtpSchema), verifyOtpHandler);
authRouter.post('/resend-otp', authRateLimiter, validateRequest(resendOtpSchema), resendOtpHandler);
authRouter.post('/change-password', requireAuth, validateRequest(changePasswordSchema), changePasswordHandler);
authRouter.post('/logout', logoutHandler);
authRouter.get('/me', requireAuth, meHandler);
