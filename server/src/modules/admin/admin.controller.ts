import type { Request, Response, NextFunction } from 'express';
import { io } from '../../index.js';
import { addStudent, resetStudentPassword } from './admin.service.js';

export const addStudentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await addStudent(req.body);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

export const resetStudentPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const prn = Array.isArray(req.params.prn) ? req.params.prn[0] : req.params.prn;
    const user = await resetStudentPassword(prn, req.body.temporaryPassword);
    io.in(`user:${user.id}`).disconnectSockets(true);
    res.json({ user, message: 'Temporary password set. Share it with the student out of band.' });
  } catch (error) {
    next(error);
  }
};