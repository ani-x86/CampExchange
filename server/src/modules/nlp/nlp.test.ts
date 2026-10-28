import axios, { type AxiosResponse } from 'axios';
import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../middleware/error.js';
import { validateRequest } from '../../middleware/validate.js';
import { describeHandler } from './nlp.controller.js';
import { describeSchema } from './nlp.schema.js';

const mockEnv = vi.hoisted(() => ({ NLP_URL: 'https://nlp.internal/' }));

vi.mock('../../config/env.js', () => ({
  env: mockEnv,
}));

const app = express();
app.use(express.json());
app.post('/describe', validateRequest(describeSchema), describeHandler);
app.get('/internal-error', (_req, _res, next) => {
  next(new Error('database connection details must not be exposed'));
});
app.use(errorHandler);

afterEach(() => {
  mockEnv.NLP_URL = 'https://nlp.internal/';
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

  it('adds HTTP when the service binding provides a host and port without a scheme', async () => {
    mockEnv.NLP_URL = 'nlp.internal:10000';
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { title: 'Used bicycle' },
    } as AxiosResponse);

    const response = await request(app)
      .post('/describe')
      .send({ text: 'Bicycle, gears work well.' });

    expect(response.status).toBe(200);
    expect(post).toHaveBeenCalledWith(
      'http://nlp.internal:10000/describe',
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

  it('hides internal server error details from API responses', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(app).get('/internal-error');

    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
    expect(JSON.stringify(response.body)).not.toContain('database connection details');
    expect(logError).toHaveBeenCalledWith('[api] GET /internal-error failed (Error, unknown)');
  });
});
