import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ── Core schema (always required) ────────────────────────────────────────────
const coreSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().url().refine(
    (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
    'DATABASE_URL must use PostgreSQL'
  ),
  JWT_SECRET: z.string().min(16).default('camp_exchange_secret_key_change_in_prod'),
  COLLEGE_EMAIL_DOMAIN: z.string().default('college.edu.in'),
  NLP_URL: z.string().default('http://localhost:8001'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_IMAGE_MB: z.coerce.number().default(5),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// ── Integration schema (all optional; absence = graceful fallback) ────────────
const integrationSchema = z.object({
  // Cloudinary – falls back to local /uploads if any key is missing
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Resend email – email features disabled if missing
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  // Cloudflare Turnstile – skipped in dev, fail-closed in prod if missing
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // Gemini NLP enhancer – falls back to rule-based pipeline if missing
  GEMINI_API_KEY: z.string().optional(),
});

const fullSchema = coreSchema.merge(integrationSchema);

const parsed = fullSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

// ── Warn once at startup for missing optional integrations ────────────────────
function warnMissing(label: string, vars: string[]): void {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.warn(
      `⚠️  [${label}] integration disabled – missing env vars: ${missing.join(', ')}`
    );
  }
}

if (env.NODE_ENV !== 'test') {
  warnMissing('Cloudinary', ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']);
  warnMissing('Resend', ['RESEND_API_KEY']);
  warnMissing('Turnstile', ['TURNSTILE_SECRET_KEY']);
  warnMissing('Gemini', ['GEMINI_API_KEY']);
}

// ── Convenience flags ─────────────────────────────────────────────────────────
export const cloudinaryEnabled =
  !!env.CLOUDINARY_CLOUD_NAME && !!env.CLOUDINARY_API_KEY && !!env.CLOUDINARY_API_SECRET;

export const resendEnabled = !!env.RESEND_API_KEY;

export const turnstileEnabled = !!env.TURNSTILE_SECRET_KEY;

export const geminiEnabled = !!env.GEMINI_API_KEY;
