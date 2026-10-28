import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../prisma/client.js';
import { sendOtpEmail } from '../email/email.service.js';
import { generateToken } from './auth.service.js';

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/** Generate a secure 6-digit numeric OTP */
export const generateOtpCode = (): string => {
  return String(crypto.randomInt(100000, 1000000));
};

/**
 * Creates and sends a new OTP for a user.
 * Enforces a 60-second cooldown between resends.
 */
export const createAndSendOtp = async (userId: string, email: string, name: string): Promise<void> => {
  const now = new Date();

  // Check cooldown on the latest OTP
  const latestOtp = await prisma.otpCode.findFirst({
    where: { userId },
    orderBy: { lastSentAt: 'desc' },
  });

  if (latestOtp) {
    const elapsedSeconds = Math.floor((now.getTime() - latestOtp.lastSentAt.getTime()) / 1000);
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const waitSeconds = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      throw {
        status: 429,
        code: 'OTP_COOLDOWN',
        message: `Please wait ${waitSeconds} seconds before requesting a new verification code.`,
        retryAfterSeconds: waitSeconds,
      };
    }
  }

  const plainCode = generateOtpCode();
  const codeHash = await bcrypt.hash(plainCode, 10);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Clear existing OTPs for this user and store new one
  await prisma.otpCode.deleteMany({ where: { userId } });
  await prisma.otpCode.create({
    data: {
      userId,
      codeHash,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
    },
  });

  // Send email (Resend)
  await sendOtpEmail(email, name, plainCode);
};

/**
 * Verifies the 6-digit OTP code for a user.
 * Checks expiry, maximum 5 attempts, and hashes.
 */
export const verifyOtpCode = async (email: string, code: string) => {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tokenVersion: true,
      emailVerified: true,
      mustChangePassword: true,
    },
  });

  if (!user) {
    throw {
      status: 404,
      code: 'USER_NOT_FOUND',
      message: 'No account found with this email address.',
    };
  }

  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id },
    orderBy: { lastSentAt: 'desc' },
  });

  if (!otp) {
    throw {
      status: 400,
      code: 'OTP_EXPIRED',
      message: 'No verification code found. Please request a new one.',
    };
  }

  const now = new Date();
  if (otp.expiresAt < now) {
    await prisma.otpCode.delete({ where: { id: otp.id } });
    throw {
      status: 400,
      code: 'OTP_EXPIRED',
      message: 'Verification code has expired. Please request a new one.',
    };
  }

  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.otpCode.delete({ where: { id: otp.id } });
    throw {
      status: 429,
      code: 'MAX_ATTEMPTS_EXCEEDED',
      message: 'Too many incorrect attempts. Please request a new verification code.',
    };
  }

  const matches = await bcrypt.compare(code, otp.codeHash);
  if (!matches) {
    const attempts = otp.attempts + 1;
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts },
    });
    const remaining = MAX_OTP_ATTEMPTS - attempts;
    throw {
      status: 400,
      code: 'INVALID_OTP',
      message: remaining > 0
        ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
        : 'Too many incorrect attempts. Please request a new verification code.',
    };
  }

  // Verification successful: mark user verified and delete OTP
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    }),
    prisma.otpCode.deleteMany({ where: { userId: user.id } }),
  ]);

  const token = generateToken(user.id, user.role, user.tokenVersion);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: true,
      mustChangePassword: user.mustChangePassword,
    },
    token,
  };
};
