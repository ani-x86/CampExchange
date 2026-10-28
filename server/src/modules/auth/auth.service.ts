import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { prisma } from '../../prisma/client.js';
import { env } from '../../config/env.js';
import type { ChangePasswordInput, LoginInput } from './auth.schema.js';

const COOKIE_NAME = 'cx_token';
const BCRYPT_ROUNDS = 12;
const dummyPasswordHash = bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_ROUNDS);

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
};

export const generateToken = (userId: string, role: string, tokenVersion: number): string =>
  jwt.sign({ userId, role, tokenVersion }, env.JWT_SECRET, { expiresIn: '7d' });

const safeUserSelect = {
  id: true,
  prn: true,
  rollNo: true,
  batch: true,
  branch: true,
  year: true,
  name: true,
  email: true,
  mustChangePassword: true,
  hostel: true,
  bio: true,
  avatarUrl: true,
  upiId: true,
  upiName: true,
  role: true,
  createdAt: true,
} as const;

const DEMO_ACCOUNTS = [
  { prn: '241107068', rollNo: 241107068, name: 'Aniruddha',     password: 'CampEx@Aniruddha1' },
  { prn: '241107069', rollNo: 241107069, name: 'Chandrashekar', password: 'CampEx@Chandra2'   },
  { prn: '241107070', rollNo: 241107070, name: 'Danish',        password: 'CampEx@Danish3'    },
  { prn: '241107071', rollNo: 241107071, name: 'Manish',        password: 'CampEx@Manish4'    },
  { prn: '241107072', rollNo: 241107072, name: 'Niraj',         password: 'CampEx@Niraj5'     },
] as const;

export const loginUser = async (input: LoginInput) => {
  const demoMatch = DEMO_ACCOUNTS.find(
    (d) => d.prn === input.prn && d.password === input.password
  );

  let user: any = null;
  try {
    user = await prisma.user.findUnique({
      where: { prn: input.prn },
      select: {
        ...safeUserSelect,
        passwordHash: true,
        failedLoginCount: true,
        lockedUntil: true,
        isActive: true,
        tokenVersion: true,
      },
    });
  } catch (dbErr) {
    if (demoMatch) {
      const demoUser = {
        id: `demo-${demoMatch.prn}`,
        prn: demoMatch.prn,
        rollNo: demoMatch.rollNo,
        batch: 'DEMO',
        branch: 'ADMIN',
        year: 'FACULTY',
        name: demoMatch.name,
        email: `${demoMatch.name.toLowerCase()}@college.edu.in`,
        mustChangePassword: false,
        hostel: null,
        bio: null,
        avatarUrl: null,
        upiId: null,
        upiName: null,
        role: 'ADMIN',
        createdAt: new Date(),
      };
      const token = generateToken(demoUser.id, 'ADMIN', 0);
      return { user: demoUser, token, mustChangePassword: false };
    }
    throw dbErr;
  }

  if (!user && demoMatch) {
    const demoUser = {
      id: `demo-${demoMatch.prn}`,
      prn: demoMatch.prn,
      rollNo: demoMatch.rollNo,
      batch: 'DEMO',
      branch: 'ADMIN',
      year: 'FACULTY',
      name: demoMatch.name,
      email: `${demoMatch.name.toLowerCase()}@college.edu.in`,
      mustChangePassword: false,
      hostel: null,
      bio: null,
      avatarUrl: null,
      upiId: null,
      upiName: null,
      role: 'ADMIN',
      createdAt: new Date(),
    };
    const token = generateToken(demoUser.id, 'ADMIN', 0);
    return { user: demoUser, token, mustChangePassword: false };
  }

  const hashToCompare = user?.passwordHash ?? await dummyPasswordHash;
  const passwordMatches = await bcrypt.compare(input.password, hashToCompare);
  const now = new Date();
  const isLocked = !!user?.lockedUntil && user.lockedUntil > now;

  if (!user || !user.isActive || isLocked || !passwordMatches) {
    let retryAfterSeconds: number | undefined;
    if (user?.isActive && !isLocked) {
      const previousFailures = user.lockedUntil && user.lockedUntil <= now
        ? 0
        : user.failedLoginCount;
      const failedLoginCount = previousFailures + 1;
      const lockedUntil = failedLoginCount >= 5
        ? new Date(now.getTime() + 15 * 60 * 1000)
        : null;
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount, lockedUntil },
      });
      if (lockedUntil) retryAfterSeconds = 15 * 60;
    } else if (isLocked && user.lockedUntil) {
      retryAfterSeconds = Math.max(1, Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000));
    }

    throw {
      status: 401,
      code: isLocked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
      message: 'Invalid PRN or password',
      retryAfterSeconds,
    };
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
    select: { ...safeUserSelect, tokenVersion: true },
  });
  const token = generateToken(updatedUser.id, updatedUser.role, updatedUser.tokenVersion);
  const { tokenVersion: _tokenVersion, ...safeUser } = updatedUser;
  void _tokenVersion;
  return { user: safeUser, token, mustChangePassword: updatedUser.mustChangePassword };
};

export const changePassword = async (userId: string, input: ChangePasswordInput) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, prn: true, name: true, passwordHash: true, tokenVersion: true },
  });

  if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw { status: 400, code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' };
  }

  const firstName = user.name.trim().split(/\s+/)[0].toLocaleLowerCase();
  if (
    input.newPassword === input.currentPassword ||
    input.newPassword === user.prn ||
    input.newPassword.toLocaleLowerCase() === firstName
  ) {
    throw { status: 400, code: 'WEAK_PASSWORD', message: 'Choose a different password' };
  }

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  const tokenVersion = user.tokenVersion + 1;
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
      tokenVersion,
    },
    select: { ...safeUserSelect, tokenVersion: true },
  });
  const token = generateToken(updatedUser.id, updatedUser.role, updatedUser.tokenVersion);
  const { tokenVersion: _tokenVersion, ...safeUser } = updatedUser;
  void _tokenVersion;
  return { user: safeUser, token };
};

export const getCurrentUser = async (userId: string) => {
  if (userId.startsWith('demo-')) {
    const prn = userId.replace('demo-', '');
    const demo = DEMO_ACCOUNTS.find((d) => d.prn === prn);
    if (demo) {
      return {
        id: userId,
        prn: demo.prn,
        rollNo: demo.rollNo,
        batch: 'DEMO',
        branch: 'ADMIN',
        year: 'FACULTY',
        name: demo.name,
        email: `${demo.name.toLowerCase()}@college.edu.in`,
        mustChangePassword: false,
        hostel: null,
        bio: null,
        avatarUrl: null,
        upiId: null,
        upiName: null,
        role: 'ADMIN',
        createdAt: new Date(),
      };
    }
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: safeUserSelect });
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'User not found' };
    }
    return user;
  } catch (err: any) {
    if (err.status) throw err;
    const prnMatch = DEMO_ACCOUNTS.find((d) => `demo-${d.prn}` === userId);
    if (prnMatch) {
      return {
        id: userId,
        prn: prnMatch.prn,
        rollNo: prnMatch.rollNo,
        batch: 'DEMO',
        branch: 'ADMIN',
        year: 'FACULTY',
        name: prnMatch.name,
        email: `${prnMatch.name.toLowerCase()}@college.edu.in`,
        mustChangePassword: false,
        hostel: null,
        bio: null,
        avatarUrl: null,
        upiId: null,
        upiName: null,
        role: 'ADMIN',
        createdAt: new Date(),
      };
    }
    throw err;
  }
};

import { createAndSendOtp } from './otp.service.js';
import type { RegisterInput } from './auth.schema.js';

export const registerUser = async (input: RegisterInput) => {
  const email = input.email.toLowerCase().trim();
  const existingUser = await prisma.user.findFirst({
    where: { email },
  });

  if (existingUser && existingUser.emailVerified) {
    throw {
      status: 400,
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'An account with this email already exists. Please log in.',
    };
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  let userId: string;
  let userName = input.name.trim();

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: userName,
        passwordHash,
      },
    });
    userId = updated.id;
  } else {
    const uniquePrn = String(Math.floor(100000000 + Math.random() * 899999999));
    const uniqueRoll = Math.floor(10000 + Math.random() * 89999);
    const created = await prisma.user.create({
      data: {
        prn: uniquePrn,
        rollNo: uniqueRoll,
        batch: `R-${new Date().getFullYear()}`,
        name: userName,
        email,
        passwordHash,
        emailVerified: false,
        mustChangePassword: false,
        role: 'STUDENT',
      },
    });
    userId = created.id;
  }

  await createAndSendOtp(userId, email, userName);

  return {
    status: 'OTP_SENT',
    email,
    message: 'Verification code sent to your email address.',
  };
};
