import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validateRequest =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.');
          fields[path] = issue.message;
        }
        res.status(400).json({
          error: {
            code: 'VALIDATION',
            message: 'Invalid request data',
            fields,
          },
        });
        return;
      }
      next(error);
    }
  };
