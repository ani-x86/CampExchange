/**
 * test-helpers.ts - shared utilities for integration tests.
 * Creates self-contained test users directly in the DB
 * (no register endpoint - users come from CSV seed in production).
 */
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../index.js';
import { prisma } from '../prisma/client.js';

let counter = 0;

export interface TestUser {
  prn: string;
  password: string;
  cookie: string;
  id: string;
}

import { generateToken } from '../modules/auth/auth.service.js';

/** Create a new test user directly in the DB and return their session cookie. */
export const createTestUser = async (suffix = ''): Promise<TestUser> => {
  counter++;
  const uniqueNum = Math.floor(100000000 + Math.random() * 800000000 + counter);
  const prn = String(uniqueNum).slice(0, 9);
  const rollNo = Math.floor(10000 + Math.random() * 80000 + counter);
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      prn,
      rollNo,
      batch: `2026-${Date.now()}-${counter}`,
      name: `Test User ${suffix || counter}`,
      email: `testuser${prn}@college.edu.in`,
      passwordHash,
      mustChangePassword: false,
      role: 'STUDENT',
      emailVerified: true,
    },
  });

  const token = generateToken(user.id, user.role, user.tokenVersion);
  const cookie = `cx_token=${token}`;

  return { prn, password, cookie, id: user.id };
};

/** Create a test listing for the given seller */
export const createTestListing = async (
  sellerCookie: string,
  overrides: Record<string, unknown> = {}
): Promise<string> => {
  const res = await request(app)
    .post('/api/listings')
    .set('Cookie', sellerCookie)
    .send({
      title: `Test Listing ${Date.now()}`,
      description: 'A test listing for automated testing purposes.',
      category: 'Lab & Stationery',
      condition: 'GOOD',
      price: 100,
      negotiable: false,
      images: ['https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=800&q=80'],
      ...overrides,
    });

  if (res.status !== 201) {
    throw new Error(`Failed to create test listing: ${JSON.stringify(res.body)}`);
  }
  return res.body.listing.id;
};

/** Set UPI on a user account */
export const setUpi = async (cookie: string, upiId = 'test@okhdfcbank'): Promise<void> => {
  const res = await request(app)
    .patch('/api/users/me')
    .set('Cookie', cookie)
    .send({ upiId, upiName: 'Test User' });

  if (res.status !== 200) {
    throw new Error(`Failed to set UPI: ${JSON.stringify(res.body)}`);
  }
};
