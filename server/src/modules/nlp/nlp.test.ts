import axios, { type AxiosResponse } from 'axios';
import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../middleware/error.js';
import { validateRequest } from '../../middleware/validate.js';
import { describeHandler } from './nlp.controller.js';
import { describeSchema } from './nlp.schema.js';

vi.mock('../../config/env.js', () => ({
  env: { NLP_URL: 'https://nlp.internal/' },
}));

const app = express();
app.use(express.json());
app.post('/describe', validateRequest(describeSchema), describeHandler);
app.use(errorHandler);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NLP proxy API', () => {
  it('forwards validated description requests to the bound NLP service URL', async () => {
    const result = { title: 'Used bicycle', description: 'Gears work well.' };
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: result,
    } as AxiosResponse);

    const response = await request(app)
      .post('/describe')
      .send({ text: 'Bicycle, gears work well.' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(result);
    expect(post).toHaveBeenCalledWith(
      'https://nlp.internal/describe',
      { text: 'Bicycle, gears work well.' },
      { timeout: 3000 }
    );
  });

  it('rejects invalid input without calling the NLP service', async () => {
    const post = vi.spyOn(axios, 'post');

    const response = await request(app).post('/describe').send({ text: 'no' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION');
    expect(post).not.toHaveBeenCalled();
  });

  it('returns an explicit unavailable response when the binding cannot be reached', async () => {
    const connectionError = Object.assign(new Error('Unavailable'), { isAxiosError: true });
    vi.spyOn(axios, 'post').mockRejectedValue(connectionError);

    const response = await request(app)
      .post('/describe')
      .send({ text: 'Bicycle, gears work well.' });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('NLP_UNAVAILABLE');
  });
});
