import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index.js';
import { createTestUser, createTestListing, setUpi } from '../../lib/test-helpers.js';

describe('Chat and Inbox API', () => {
  let sellerCookie: string;
  let buyerCookie: string;
  let listingId: string;
  let conversationId: string;

  beforeAll(async () => {
    const seller = await createTestUser('chat-seller');
    const buyer = await createTestUser('chat-buyer');
    sellerCookie = seller.cookie;
    buyerCookie = buyer.cookie;
    await setUpi(sellerCookie);
    listingId = await createTestListing(sellerCookie);
  });

  it('buyer starts conversation with seller on active listing', async () => {
    const res = await request(app)
      .post('/api/conversations')
      .set('Cookie', buyerCookie)
      .send({ listingId });
    expect(res.status).toBe(201);
    expect(res.body.conversation).toBeDefined();
    conversationId = res.body.conversation.id;
  });

  it('sends a text message in the conversation', async () => {
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', buyerCookie)
      .send({ body: 'Is this item still available?' });
    expect(res.status).toBe(201);
    expect(res.body.message.body).toBe('Is this item still available?');
  });

  it('seller sees conversation in inbox', async () => {
    const res = await request(app)
      .get('/api/conversations?filter=all')
      .set('Cookie', sellerCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.conversations)).toBe(true);
    const conv = res.body.conversations.find((c: any) => c.id === conversationId);
    expect(conv).toBeDefined();
    expect(conv.unreadCount).toBeGreaterThanOrEqual(1);
  });

  it('seller reads messages and clears unread count', async () => {
    await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', sellerCookie);
    await request(app)
      .post(`/api/conversations/${conversationId}/read`)
      .set('Cookie', sellerCookie);
    const inboxRes = await request(app)
      .get('/api/conversations?filter=all')
      .set('Cookie', sellerCookie);
    const conv = inboxRes.body.conversations.find((c: any) => c.id === conversationId);
    expect(conv.unreadCount).toBe(0);
  });
});
