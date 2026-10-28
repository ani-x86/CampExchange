import axios from 'axios';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';

const forwardToNlp =
  (endpoint: string) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const nlpUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(env.NLP_URL)
        ? env.NLP_URL
        : `http://${env.NLP_URL}`;
      const baseUrl = new URL(nlpUrl);
      baseUrl.pathname = `${baseUrl.pathname.replace(/\/+$/, '')}/${endpoint}`;
      const response = await axios.post(baseUrl.toString(), req.body, { timeout: 3000 });
      res.json(response.data);
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        next(error);
        return;
      }

      if (error.response) {
        res.status(error.response.status).json(error.response.data);
        return;
      }

      res.status(503).json({
        error: {
          code: 'NLP_UNAVAILABLE',
          message: 'NLP service unavailable',
        },
      });
    }
  };

export const describeHandler = forwardToNlp('describe');
export const suggestHandler = forwardToNlp('suggest');
