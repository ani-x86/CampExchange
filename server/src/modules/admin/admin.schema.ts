import { z } from 'zod';

const temporaryPassword = z.string().min(6).max(64);

export const addStudentSchema = z.object({
  prn: z.string().regex(/^\d{9}$/),
  rollNo: z.coerce.number().int().min(1).max(999),
  batch: z.string().max(20).optional().nullable(),
  branch: z.string().max(50).default('AIML'),
  year: z.string().max(20).optional().nullable(),
  name: z.string().trim().min(2).max(100),
  temporaryPassword,
}).strict();

export const resetStudentPasswordSchema = z.object({ temporaryPassword }).strict();

export const studentPrnSchema = z.string().regex(/^\d{9}$/);

export type AddStudentInput = z.infer<typeof addStudentSchema>;