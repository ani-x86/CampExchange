import bcrypt from 'bcryptjs';
import { prisma } from '../../prisma/client.js';
import type { AddStudentInput } from './admin.schema.js';

const safeStudentSelect = {
  id: true,
  prn: true,
  rollNo: true,
  batch: true,
  branch: true,
  year: true,
  name: true,
  email: true,
  mustChangePassword: true,
  role: true,
  createdAt: true,
} as const;

const titleCase = (name: string): string =>
  name.toLocaleLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_match, separator: string, letter: string) =>
    `${separator}${letter.toLocaleUpperCase()}`
  );

export const addStudent = async (input: AddStudentInput) => {
  const passwordHash = await bcrypt.hash(input.temporaryPassword, 12);
  const user = await prisma.user.create({
    data: {
      prn: input.prn,
      rollNo: input.rollNo,
      batch: input.batch ?? null,
      branch: input.branch,
      year: input.year ?? null,
      name: titleCase(input.name),
      passwordHash,
      mustChangePassword: true,
    },
    select: safeStudentSelect,
  });
  return user;
};

export const resetStudentPassword = async (prn: string, temporaryPassword: string) => {
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const user = await prisma.user.update({
    where: { prn },
    data: {
      passwordHash,
      mustChangePassword: true,
      passwordChangedAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      tokenVersion: { increment: 1 },
    },
    select: safeStudentSelect,
  });
  return user;
};