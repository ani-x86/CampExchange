import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { env, turnstileEnabled } from '../config/env.js';

interface TurnstileSiteVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Middleware to verify Cloudflare Turnstile CAPTCHA tokens.
 *
 * Behavior:
 * - If TURNSTILE_SECRET_KEY is present: calls Cloudflare siteverify endpoint.
 * - In production: fails closed (returns 400 BOT_VERIFICATION_FAILED if token is missing or invalid).
 * - In development/test: skips gracefully if TURNSTILE_SECRET_KEY is absent or in test mode.
 */
export const verifyTurnstile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Always skip in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // If Turnstile is not enabled, skip in dev; fail closed in production
  if (!turnstileEnabled) {
    if (env.NODE_ENV === 'production') {
      res.status(503).json({
        error: {
          code: 'BOT_PROTECTION_UNAVAILABLE',
          message: 'Bot protection service is currently unavailable.',
        },
      });
      return;
    }
    return next();
  }

  const token = req.body.turnstileToken || req.headers['cf-turnstile-token'];

  if (!token) {
    // Fail closed in production, or if turnstile is enabled
    res.status(400).json({
      error: {
        code: 'MISSING_CAPTCHA_TOKEN',
        message: 'Security verification required. Please complete the captcha.',
      },
    });
    return;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', env.TURNSTILE_SECRET_KEY!);
    formData.append('response', String(token));
    if (req.ip) {
      formData.append('remoteip', req.ip);
    }

    const response = await axios.post<TurnstileSiteVerifyResponse>(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      formData.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000,
      }
    );

    if (!response.data.success) {
      res.status(400).json({
        error: {
          code: 'CAPTCHA_VERIFICATION_FAILED',
          message: 'Security check failed. Please try again.',
        },
      });
      return;
    }

    next();
  } catch (err) {
    console.error('[turnstile] Verification error:', (err as Error).message);
    // In production fail closed; in dev pass through with warning
    if (env.NODE_ENV === 'production') {
      res.status(400).json({
        error: {
          code: 'CAPTCHA_VERIFICATION_FAILED',
          message: 'Unable to verify captcha. Please try again.',
        },
      });
      return;
    }
    next();
  }
};
