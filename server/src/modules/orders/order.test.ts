import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index.js';
import { createTestUser, createTestListing, setUpi } from '../../lib/test-helpers.js';

describe('Orders and Payment API', () => {
  let sellerCookie: string;
  let buyerCookie: string;
  let listingId: string;
  let orderId: string;

  beforeAll(async () => {
    const seller = await createTestUser('ord-seller');
    const buyer = await createTestUser('ord-buyer');
    sellerCookie = seller.cookie;
    buyerCookie = buyer.cookie;
    await setUpi(sellerCookie, 'testseller@okhdfcbank');
    listingId = await createTestListing(sellerCookie);
  });

  it('creates an order (buyer reserves active listing)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', buyerCookie)
      .send({ listingId });
    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('PENDING_PAYMENT');
    expect(res.body.payee.upiId).toBe('testseller@okhdfcbank');
    expect(res.body.upiUri).toContain('upi://pay?');
    orderId = res.body.order.id;
    const checkListing = await request(app).get(`/api/listings/${listingId}`);
    expect(checkListing.body.listing.status).toBe('RESERVED');
  });

  it('prevents another order on the reserved listing', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', buyerCookie)
      .send({ listingId });
    expect(res.status).toBe(400);
    expect(['LISTING_UNAVAILABLE', 'ORDER_EXISTS']).toContain(res.body.error.code);
  });

  it('buyer submits payment proof', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/proof`)
      .set('Cookie', buyerCookie)
      .send({ proofUrl: '/uploads/mock_proof.webp', utr: '123456789012' });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('PROOF_SUBMITTED');
    expect(res.body.order.utr).toBe('123456789012');
  });

  it('seller confirms payment - order CONFIRMED and listing SOLD', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/confirm`)
      .set('Cookie', sellerCookie);
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('CONFIRMED');
    const checkListing = await request(app).get(`/api/listings/${listingId}`);
    expect(checkListing.body.listing.status).toBe('SOLD');
  });

  it('tests rejection flow on a fresh order', async () => {
    const newListingId = await createTestListing(sellerCookie, { title: 'Exam Clipboard' });
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Cookie', buyerCookie)
      .send({ listingId: newListingId });
    const testOrderId = orderRes.body.order.id;
    await request(app)
      .post(`/api/orders/${testOrderId}/proof`)
      .set('Cookie', buyerCookie)
      .send({ proofUrl: '/uploads/mock_proof2.webp' });
    const rejectRes = await request(app)
      .post(`/api/orders/${testOrderId}/reject`)
      .set('Cookie', sellerCookie)
      .send({ reason: 'Amount not credited in bank account' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.order.status).toBe('REJECTED');
    const checkListing = await request(app).get(`/api/listings/${newListingId}`);
    expect(checkListing.body.listing.status).toBe('ACTIVE');
  });

  it('GET /api/uploads/proof/:orderId requires auth', async () => {
    const res = await request(app).get(`/api/uploads/proof/${orderId}`);
    expect(res.status).toBe(401);
  });

  it('GET /api/uploads/proof/:orderId accessible to buyer', async () => {
    const res = await request(app)
      .get(`/api/uploads/proof/${orderId}`)
      .set('Cookie', buyerCookie);
    expect([200, 404]).toContain(res.status);
  });
});
