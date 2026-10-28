import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client.js';
import { importStudents } from './import-students.js';

const runId = Date.now() % 100000000;
let sequence = 0;
const trackedPrns = new Set<string>();
const temporaryDirectories: string[] = [];

const makePrn = (): string => {
  sequence += 1;
  const prn = String(200000000 + ((runId + sequence) % 700000000));
  trackedPrns.add(prn);
  return prn;
};

const makeCsv = async (rows: Array<{ roll_no: string | number; prn: string; name: string; password: string }>) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'camp-exchange-import-'));
  temporaryDirectories.push(directory);
  const csvPath = path.join(directory, 'student.csv');
  const content = [
    'roll_no,prn,name,password',
    ...rows.map((row) => `${row.roll_no},${row.prn},${row.name},${row.password}`),
  ].join('\n');
  await writeFile(csvPath, content, 'utf8');
  return csvPath;
};

afterEach(async () => {
  if (trackedPrns.size > 0) {
    await prisma.user.deleteMany({ where: { prn: { in: [...trackedPrns] } } });
    trackedPrns.clear();
  }
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

describe('student CSV import', () => {
  it('creates 38 valid users and is idempotent on a second run', async () => {
    const rows = Array.from({ length: 38 }, (_, index) => ({
      roll_no: index + 1,
      prn: makePrn(),
      name: `student ${index + 1}`,
      password: `TempPass${index + 1}`,
    }));
    const csvPath = await makeCsv(rows);

    const first = await importStudents({ csvPath, printSummary: false });
    const second = await importStudents({ csvPath, printSummary: false });

    expect(first).toMatchObject({ created: 38, updated: 0, skipped: 0, errors: 0 });
    expect(second).toMatchObject({ created: 0, updated: 0, skipped: 38, errors: 0 });
    expect(await prisma.user.count({ where: { prn: { in: rows.map((row) => row.prn) } } })).toBe(38);
    expect(first.students[0].name).toBe('Student 1');
  });

  it('aborts all writes when any row is invalid', async () => {
    const validPrn = makePrn();
    const invalidPrn = makePrn();
    const csvPath = await makeCsv([
      { roll_no: 1, prn: validPrn, name: 'Valid Student', password: 'TempPass123' },
      { roll_no: 2, prn: invalidPrn.slice(1), name: 'Invalid Student', password: 'TempPass456' },
    ]);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const summary = await importStudents({ csvPath, printSummary: false });

    expect(summary.errors).toBeGreaterThan(0);
    expect(await prisma.user.count({ where: { prn: { in: [validPrn, invalidPrn] } } })).toBe(0);
    expect(errorSpy.mock.calls.flat().join(' ')).not.toContain('TempPass');
  });

  it('aborts duplicate PRNs before writing any user', async () => {
    const duplicatePrn = makePrn();
    const csvPath = await makeCsv([
      { roll_no: 3, prn: duplicatePrn, name: 'First Student', password: 'TempPass123' },
      { roll_no: 4, prn: duplicatePrn, name: 'Second Student', password: 'TempPass456' },
    ]);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const summary = await importStudents({ csvPath, printSummary: false });

    expect(summary.errors).toBe(1);
    expect(await prisma.user.count({ where: { prn: duplicatePrn } })).toBe(0);
    expect(errorSpy.mock.calls.flat().join(' ')).toContain(duplicatePrn);
    expect(errorSpy.mock.calls.flat().join(' ')).not.toContain('TempPass');
  });

  it('does not overwrite an existing changed password hash', async () => {
    const prn = makePrn();
    const changedPassword = 'ChangedPass789';
    const changedHash = await bcrypt.hash(changedPassword, 12);
    await prisma.user.create({
      data: {
        prn,
        rollNo: 8,
        name: 'Student Existing',
        passwordHash: changedHash,
        mustChangePassword: false,
      },
    });
    const csvPath = await makeCsv([
      { roll_no: 8, prn, name: 'student existing', password: 'OriginalPass123' },
    ]);

    const summary = await importStudents({ csvPath, printSummary: false });
    const updatedUser = await prisma.user.findUnique({ where: { prn } });

    expect(summary.updated).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(await bcrypt.compare(changedPassword, updatedUser!.passwordHash)).toBe(true);
    expect(updatedUser?.mustChangePassword).toBe(false);
  });
});
