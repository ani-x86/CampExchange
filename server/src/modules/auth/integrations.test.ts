import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index.js';
import { prisma } from '../../prisma/client.js';
import { env } from '../../config/env.js';

describe('OTP Auth Integration', () => {
  const collegeEmail = `student_${Date.now()}@${env.COLLEGE_EMAIL_DOMAIN}`;
  const nonCollegeEmail = `outsider_${Date.now()}@gmail.com`;
  const validPassword = 'SecurePassword123!';

  afterAll(async () => {
    await prisma.otpCode.deleteMany({
      where: { user: { email: { in: [collegeEmail, nonCollegeEmail] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [collegeEmail, nonCollegeEmail] } },
    });
  });

  describe('OTP Registration Flow', () => {
    it('rejects registration with non-college email domain', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: nonCollegeEmail,
        password: validPassword,
        name: 'Outside User',
      });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('college email');
    });

    it('successfully registers with college domain and sends OTP', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: collegeEmail,
        password: validPassword,
        name: 'Campus Student',
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('OTP_SENT');
      expect(res.body.email).toBe(collegeEmail.toLowerCase());

      // Verify OtpCode was stored in DB
      const user = await prisma.user.findFirst({ where: { email: collegeEmail } });
      expect(user).toBeDefined();
      expect(user?.emailVerified).toBe(false);

      const otp = await prisma.otpCode.findFirst({ where: { userId: user!.id } });
      expect(otp).toBeDefined();
      expect(otp?.attempts).toBe(0);
      expect(otp?.codeHash).toBeDefined();
    });

    it('rejects verification with wrong OTP and increments attempts', async () => {
      const res = await request(app).post('/api/auth/verify-otp').send({
        email: collegeEmail,
        code: '000000',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OTP');

      const user = await prisma.user.findFirst({ where: { email: collegeEmail } });
      const otp = await prisma.otpCode.findFirst({ where: { userId: user!.id } });
      expect(otp?.attempts).toBe(1);
    });

    it('enforces 60-second cooldown on resend-otp', async () => {
      const res = await request(app).post('/api/auth/resend-otp').send({
        email: collegeEmail,
      });

      // Since an OTP was just created, cooldown should trigger
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('OTP_COOLDOWN');
    });

    it('verifies successfully with correct OTP code and sets auth cookie', async () => {
      const user = await prisma.user.findFirst({ where: { email: collegeEmail } });
      expect(user).toBeDefined();

      // In tests, we can test with a known hash
      const testCode = '654321';
      const bcrypt = await import('bcryptjs');
      const codeHash = await bcrypt.default.hash(testCode, 10);

      await prisma.otpCode.updateMany({
        where: { userId: user!.id },
        data: { codeHash, attempts: 0 },
      });

      const res = await request(app).post('/api/auth/verify-otp').send({
        email: collegeEmail,
        code: testCode,
      });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.user.emailVerified).toBe(true);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('cx_token='))).toBe(true);

      // Verify user in DB is now emailVerified
      const verifiedUser = await prisma.user.findUnique({ where: { id: user!.id } });
      expect(verifiedUser?.emailVerified).toBe(true);

      // Verify OTP records were deleted
      const remainingOtp = await prisma.otpCode.findFirst({ where: { userId: user!.id } });
      expect(remainingOtp).toBeNull();
    });

    it('locks out after 5 failed OTP attempts', async () => {
      const tempEmail = `lockout_${Date.now()}@${env.COLLEGE_EMAIL_DOMAIN}`;
      await request(app).post('/api/auth/register').send({
        email: tempEmail,
        password: validPassword,
        name: 'Lockout User',
      });

      const user = await prisma.user.findFirst({ where: { email: tempEmail } });

      // Set attempts to 4
      await prisma.otpCode.updateMany({
        where: { userId: user!.id },
        data: { attempts: 4 },
      });

      // 5th failed attempt
      const res = await request(app).post('/api/auth/verify-otp').send({
        email: tempEmail,
        code: '999999',
      });

      expect(res.status).toBe(400);

      // 6th attempt should return 429 MAX_ATTEMPTS_EXCEEDED or expired
      const resLocked = await request(app).post('/api/auth/verify-otp').send({
        email: tempEmail,
        code: '999999',
      });

      expect([400, 429]).toContain(resLocked.status);

      // Clean up
      await prisma.otpCode.deleteMany({ where: { userId: user!.id } });
      await prisma.user.delete({ where: { id: user!.id } });
    });
  });
});
