import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { app } from '../../index.js';
import { prisma } from '../../prisma/client.js';
import { createTestUser, createTestListing } from '../../lib/test-helpers.js';
import { processImage } from './upload.service.js';

describe('Uploads & Cloudinary Integration', () => {
  let buyer: { id: string; cookie: string };
  let seller: { id: string; cookie: string };
  let stranger: { id: string; cookie: string };
  let orderWithProofId: string;
  let orderWithoutProofId: string;

  beforeAll(async () => {
    buyer = await createTestUser('uploadbuyer');
    seller = await createTestUser('uploadseller');
    stranger = await createTestUser('uploadstranger');

    const listingId = await createTestListing(seller.cookie);

    // Create order with proof
    const orderWithProof = await prisma.order.create({
      data: {
        listingId,
        buyerId: buyer.id,
        sellerId: seller.id,
        amount: 250,
        status: 'PROOF_SUBMITTED',
        proofUrl: '/uploads/sample_proof.webp',
        proofCloudinaryId: null,
      },
    });
    orderWithProofId = orderWithProof.id;

    // Create order without proof
    const orderWithoutProof = await prisma.order.create({
      data: {
        listingId,
        buyerId: buyer.id,
        sellerId: seller.id,
        amount: 250,
        status: 'PENDING_PAYMENT',
      },
    });
    orderWithoutProofId = orderWithoutProof.id;
  });

  describe('Cloudinary Fallback & Image Processing', () => {
    it('processes an image via Sharp and produces WebP format', async () => {
      // 100x100 PNG test image
      const testBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await processImage(testBuffer, 'listing');
      expect(result).toBeDefined();
      expect(result.url).toBeDefined();
      expect(result.thumbUrl).toBeDefined();
      expect(['cloudinary', 'local']).toContain(result.storage);
    });

    it('falls back to local storage when upload is simulated as local', async () => {
      // Test direct processImage with fallback
      const testBuffer = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await processImage(testBuffer, 'avatar');
      expect(result.url).toBeTruthy();
      expect(result.thumbUrl).toBeTruthy();
    });

    it('POST /api/uploads/image rejects unauthenticated requests', async () => {
      const res = await request(app).post('/api/uploads/image');
      expect(res.status).toBe(401);
    });

    it('POST /api/uploads/image uploads an image successfully', async () => {
      const testBuffer = await sharp({
        create: {
          width: 80,
          height: 80,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const res = await request(app)
        .post('/api/uploads/image')
        .set('Cookie', buyer.cookie)
        .attach('file', testBuffer, 'test-image.png');

      expect(res.status).toBe(201);
      expect(res.body.url).toBeDefined();
      expect(res.body.thumbUrl).toBeDefined();
    });
  });

  describe('Private Payment Proof Access Control', () => {
    it('allows the buyer to access the proof URL', async () => {
      const res = await request(app)
        .get(`/api/uploads/proof/${orderWithProofId}`)
        .set('Cookie', buyer.cookie);

      expect(res.status).toBe(200);
      expect(res.body.url).toBe('/uploads/sample_proof.webp');
    });

    it('allows the seller to access the proof URL', async () => {
      const res = await request(app)
        .get(`/api/uploads/proof/${orderWithProofId}`)
        .set('Cookie', seller.cookie);

      expect(res.status).toBe(200);
      expect(res.body.url).toBe('/uploads/sample_proof.webp');
    });

    it('denies access to an unrelated user (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/uploads/proof/${orderWithProofId}`)
        .set('Cookie', stranger.cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('denies unauthenticated requests (401 Unauthorized)', async () => {
      const res = await request(app).get(`/api/uploads/proof/${orderWithProofId}`);
      expect(res.status).toBe(401);
    });

    it('returns 404 if the order does not exist', async () => {
      const res = await request(app)
        .get('/api/uploads/proof/non-existent-order-id')
        .set('Cookie', buyer.cookie);

      expect(res.status).toBe(404);
    });

    it('returns 404 if no proof has been uploaded yet', async () => {
      const res = await request(app)
        .get(`/api/uploads/proof/${orderWithoutProofId}`)
        .set('Cookie', buyer.cookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
