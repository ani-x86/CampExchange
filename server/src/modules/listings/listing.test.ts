import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index.js';
import { createTestUser, setUpi } from '../../lib/test-helpers.js';

describe('Listings API', () => {
  let sellerCookie: string;
  let createdListingId: string;

  beforeAll(async () => {
    const seller = await createTestUser('lst-seller');
    sellerCookie = seller.cookie;
    await setUpi(sellerCookie);
  });

  it('GET /api/listings returns items array', async () => {
    const res = await request(app).get('/api/listings?limit=8');
    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /api/listings filters by category', async () => {
    const res = await request(app).get('/api/listings?category=Vehicles');
    expect(res.status).toBe(200);
    expect(res.body.items.every((i: any) => i.category === 'Vehicles')).toBe(true);
  });

  it('POST /api/listings creates a new listing', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('Cookie', sellerCookie)
      .send({
        title: 'Drafting Board Mini Drafter',
        description: 'Complete engineering drawing mini drafter with clamp and scale. Good condition.',
        category: 'Lab & Stationery',
        condition: 'GOOD',
        price: 400,
        negotiable: true,
        images: ['https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=800&q=80'],
      });
    expect(res.status).toBe(201);
    expect(res.body.listing.title).toBe('Drafting Board Mini Drafter');
    expect(Array.isArray(res.body.listing.images)).toBe(true);
    createdListingId = res.body.listing.id;
  });

  it('GET /api/listings/:id returns the listing', async () => {
    const res = await request(app).get(`/api/listings/${createdListingId}`);
    expect(res.status).toBe(200);
    expect(res.body.listing.id).toBe(createdListingId);
    expect(Array.isArray(res.body.listing.images)).toBe(true);
  });

  it('POST /api/listings/:id/save toggles save status', async () => {
    const saveRes = await request(app)
      .post(`/api/listings/${createdListingId}/save`)
      .set('Cookie', sellerCookie);
    expect(saveRes.status).toBe(200);
    expect(typeof saveRes.body.isSaved).toBe('boolean');
  });

  it('GET /api/me/listings returns my listings', async () => {
    const res = await request(app)
      .get('/api/me/listings')
      .set('Cookie', sellerCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.listings)).toBe(true);
    expect(res.body.listings.length).toBeGreaterThan(0);
  });
});
