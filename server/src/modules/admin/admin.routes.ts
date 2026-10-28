import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  addStudentSchema,
  resetStudentPasswordSchema,
  studentPrnSchema,
} from './admin.schema.js';
import { addStudentHandler, resetStudentPasswordHandler } from './admin.controller.js';

export const adminRouter = Router();

const validatePrn = (req: Request, res: Response, next: NextFunction): void => {
  const prn = Array.isArray(req.params.prn) ? req.params.prn[0] : req.params.prn;
  const result = studentPrnSchema.safeParse(prn);
  if (!result.success) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid PRN' } });
    return;
  }
  next();
};

adminRouter.post('/students', requireAuth, requireAdmin, validateRequest(addStudentSchema), addStudentHandler);
adminRouter.post(
  '/students/:prn/reset-password',
  requireAuth,
  requireAdmin,
  validatePrn,
  validateRequest(resetStudentPasswordSchema),
  resetStudentPasswordHandler
);