import { readFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { prisma } from '../prisma/client.js';
import { Prisma } from '@prisma/client';

const studentRowSchema = z.object({
  roll_no: z.string().trim().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(999)),
  prn: z.string().trim().regex(/^\d{9}$/),
  name: z.string().trim().min(2).max(100),
  password: z.string().min(6).max(64),
});

type StudentRow = z.infer<typeof studentRowSchema>;
type CsvRow = { record: Record<string, string>; info: { lines: number } };

export interface ImportOptions {
  csvPath?: string;
  resetPasswords?: boolean;
  printSummary?: boolean;
}

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  students: Array<{ id: string; prn: string; name: string }>;
}

const emptySummary = (errors = 0): ImportSummary => ({
  created: 0,
  updated: 0,
  skipped: 0,
  errors,
  students: [],
});

const titleCase = (name: string): string =>
  name.toLocaleLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_match, separator: string, letter: string) =>
    `${separator}${letter.toLocaleUpperCase()}`
  );

const findStudentCsv = async (): Promise<string | undefined> => {
  const candidates = [
    path.resolve(process.cwd(), '..', 'databse', 'student.csv'),
    path.resolve(process.cwd(), '..', 'Database', 'student.csv'),
    path.resolve(process.cwd(), 'databse', 'student.csv'),
    path.resolve(process.cwd(), 'Database', 'student.csv'),
  ];
  for (const candidate of candidates) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return undefined;
};

const printSummary = (summary: ImportSummary): void => {
  console.log(
    `Student import: created ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}, errors ${summary.errors}`
  );
};

export const importStudents = async (options: ImportOptions = {}): Promise<ImportSummary> => {
  const csvPath = options.csvPath ?? await findStudentCsv();
  if (!csvPath) {
    console.error('Student CSV not found.');
    const summary = emptySummary(1);
    if (options.printSummary !== false) printSummary(summary);
    return summary;
  }

  let csvText: string;
  try {
    csvText = await readFile(csvPath, 'utf8');
  } catch {
    console.error('Student CSV could not be read.');
    const summary = emptySummary(1);
    if (options.printSummary !== false) printSummary(summary);
    return summary;
  }

  let parsedRows: CsvRow[];
  try {
    parsedRows = parse(csvText, {
      bom: true,
      columns: true,
      info: true,
      skip_empty_lines: true,
      relax_column_count: false,
    }) as CsvRow[];
  } catch {
    csvText = '';
    console.error('Student CSV parse failed near row 1.');
    const summary = emptySummary(1);
    if (options.printSummary !== false) printSummary(summary);
    return summary;
  }
  csvText = '';

  const errors: string[] = [];
  const rows: Array<{ rowNumber: number; student: StudentRow }> = [];
  for (const parsed of parsedRows) {
    const result = studentRowSchema.safeParse(parsed.record);
    const rawPrn = typeof parsed.record.prn === 'string' ? parsed.record.prn.trim() : '';
    const prnValue = /^\d{9}$/.test(rawPrn) ? rawPrn : 'invalid';
    if (!result.success) {
      const fields = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'row')))];
      errors.push(`Row ${parsed.info.lines} PRN ${prnValue}: invalid ${fields.join(', ')}`);
      continue;
    }
    rows.push({ rowNumber: parsed.info.lines, student: result.data });
  }
  parsedRows = [];

  const firstPrnRow = new Map<string, number>();
  const firstRollRow = new Map<number, number>();
  for (const { rowNumber, student } of rows) {
    const firstPrn = firstPrnRow.get(student.prn);
    if (firstPrn !== undefined) {
      errors.push(`Row ${rowNumber} PRN ${student.prn}: duplicate PRN (row ${firstPrn})`);
    } else {
      firstPrnRow.set(student.prn, rowNumber);
    }

    const firstRollRowNumber = firstRollRow.get(student.roll_no);
    if (firstRollRowNumber !== undefined) {
      errors.push(`Row ${rowNumber} PRN ${student.prn}: duplicate roll_no (row ${firstRollRowNumber})`);
    } else {
      firstRollRow.set(student.roll_no, rowNumber);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    const summary = emptySummary(errors.length);
    if (options.printSummary !== false) printSummary(summary);
    return summary;
  }

  const students = await Promise.all(rows.map(async ({ student }) => ({
    rollNo: student.roll_no,
    prn: student.prn,
    name: titleCase(student.name),
    passwordHash: await bcrypt.hash(student.password, 12),
  })));
  rows.length = 0;

  const summary = emptySummary();
  try {
    await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      for (const student of students) {
        const existing = await transaction.user.findUnique({
          where: { prn: student.prn },
          select: { id: true, name: true, rollNo: true },
        });
        const changed = !existing || existing.name !== student.name || existing.rollNo !== student.rollNo;
        const reset = !!options.resetPasswords && !!existing;

        const user = await transaction.user.upsert({
          where: { prn: student.prn },
          create: {
            prn: student.prn,
            rollNo: student.rollNo,
            name: student.name,
            passwordHash: student.passwordHash,
            mustChangePassword: true,
          },
          update: {
            name: student.name,
            rollNo: student.rollNo,
            ...(options.resetPasswords
              ? {
                  passwordHash: student.passwordHash,
                  mustChangePassword: true,
                  passwordChangedAt: null,
                  failedLoginCount: 0,
                  lockedUntil: null,
                  tokenVersion: { increment: 1 },
                }
              : {}),
          },
          select: { id: true, prn: true, name: true },
        });

        if (!existing) summary.created += 1;
        else if (changed || reset) summary.updated += 1;
        else summary.skipped += 1;
        summary.students.push(user);
      }
    }, { maxWait: 10_000, timeout: 60_000 });
  } catch (error) {
    summary.created = 0;
    summary.updated = 0;
    summary.skipped = 0;
    summary.errors = 1;
    summary.students = [];
    const errorCode = typeof error === 'object' && error !== null && 'code' in error &&
      typeof error.code === 'string'
      ? error.code
      : error instanceof Error ? error.name : 'unknown';
    console.error(`Student database import failed (${errorCode}); the transaction was rolled back.`);
  } finally {
    students.length = 0;
  }

  if (options.printSummary !== false) printSummary(summary);
  return summary;
};
