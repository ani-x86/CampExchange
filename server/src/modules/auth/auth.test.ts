import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../index.js';
import { prisma } from '../../prisma/client.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';

const testPassword = 'StartPass123';
const makePrn = (offset: number): string => String(100000000 + ((Date.now() + offset) % 800000000));
const getCookie = (response: request.Response): string[] => response.headers['set-cookie'];

const createStudent = async (prn: string, rollNo: number, mustChangePassword = false) => {
  const passwordHash = await bcrypt.hash(testPassword, 12);
  return prisma.user.create({
    data: {
      prn,
      rollNo,
      batch: `AUTH-${prn}`,
      name: 'Auth Test Student',
      passwordHash,
      mustChangePassword,
    },
  });
};

describe('PRN auth API', () => {
  const validPrn = makePrn(1);
  const lockPrn = makePrn(2);
  const changePrn = makePrn(3);

  beforeAll(async () => {
    await createStudent(validPrn, 99001);
    await createStudent(lockPrn, 99002);
    await createStudent(changePrn, 99003, true);
  });

  beforeEach(() => {
    authRateLimiter.resetKey('::ffff:127.0.0.1');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { prn: { in: [validPrn, lockPrn, changePrn] } } });
  });

  it('logs in by PRN and never returns a password or hash', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ prn: validPrn, password: testPassword });
    expect(response.status).toBe(200);
    expect(response.body.user.prn).toBe(validPrn);
    expect(response.body.mustChangePassword).toBe(false);
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain(testPassword);
    expect(getCookie(response).some((value) => value.includes('cx_token='))).toBe(true);
    expect(getCookie(response).some((value) => value.includes('SameSite=Lax'))).toBe(true);
  });

  it('uses the same generic message and similar work for wrong and unknown PRNs', async () => {
    const wrongStarted = performance.now();
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ prn: validPrn, password: 'InvalidPass987' });
    const wrongDuration = performance.now() - wrongStarted;

    const unknownStarted = performance.now();
    const unknownPrn = await request(app)
      .post('/api/auth/login')
      .send({ prn: makePrn(50), password: 'InvalidPass987' });
    const unknownDuration = performance.now() - unknownStarted;

    expect(wrongPassword.status).toBe(401);
    expect(unknownPrn.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe('Invalid PRN or password');
    expect(unknownPrn.body.error.message).toBe(wrongPassword.body.error.message);
    expect(Math.abs(wrongDuration - unknownDuration)).toBeLessThan(1000);
  });

  it('locks for 15 minutes after five failed attempts and unlocks after expiry', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app).post('/api/auth/login').send({ prn: lockPrn, password: 'InvalidPass987' });
    }

    const lockedResponse = await request(app)
      .post('/api/auth/login')
      .send({ prn: lockPrn, password: testPassword });
    expect(lockedResponse.status).toBe(401);
    expect(lockedResponse.body.error.code).toBe('ACCOUNT_LOCKED');
    expect(lockedResponse.body.error.message).toBe('Invalid PRN or password');
    expect(lockedResponse.body.error.retryAfterSeconds).toBeGreaterThan(0);

    await prisma.user.update({
      where: { prn: lockPrn },
      data: { lockedUntil: new Date(Date.now() - 1000) },
    });
    const unlockedResponse = await request(app)
      .post('/api/auth/login')
      .send({ prn: lockPrn, password: testPassword });
    expect(unlockedResponse.status).toBe(200);
  });

  it('blocks protected routes until password change and invalidates the old JWT', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ prn: changePrn, password: testPassword });
    const oldCookie = getCookie(login);
    expect(login.body.mustChangePassword).toBe(true);

    const blocked = await request(app).get('/api/me/listings').set('Cookie', oldCookie);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

    const me = await request(app).get('/api/auth/me').set('Cookie', oldCookie);
    expect(me.status).toBe(200);
    expect(me.body.user.passwordHash).toBeUndefined();

    const changed = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', oldCookie)
      .send({ currentPassword: testPassword, newPassword: 'ChangedPass456' });
    expect(changed.status).toBe(200);
    expect(changed.body.user.mustChangePassword).toBe(false);
    expect(JSON.stringify(changed.body)).not.toContain('ChangedPass456');
    expect(changed.body.user.passwordHash).toBeUndefined();

    const oldSession = await request(app).get('/api/me/listings').set('Cookie', oldCookie);
    expect(oldSession.status).toBe(401);
    const newSession = await request(app).get('/api/me/listings').set('Cookie', getCookie(changed));
    expect(newSession.status).toBe(200);
  });

  it('does not log login passwords or password hashes', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ prn: validPrn, password: 'SecretForLogCheck987' });
      expect(response.status).toBe(401);
      const logs = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().join(' ');
      expect(logs).not.toContain('SecretForLogCheck987');
      expect(logs).not.toContain('passwordHash');
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
