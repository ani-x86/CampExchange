import 'dotenv/config';
import { prisma } from '../src/prisma/client.js';
import { importStudents } from '../src/scripts/import-students.js';

const run = async (): Promise<void> => {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--reset-passwords')) {
    console.error('Unsupported import option.');
    process.exitCode = 2;
    return;
  }

  try {
    const summary = await importStudents({ resetPasswords: args.includes('--reset-passwords') });
    if (summary.errors > 0) process.exitCode = 1;
  } catch {
    console.error('Student import failed.');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

void run();
