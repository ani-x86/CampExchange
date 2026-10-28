import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const envCandidates = ['.env.test', '.env'];
const envPath = envCandidates
  .map((name) => path.resolve(process.cwd(), name))
  .find((candidate) => fs.existsSync(candidate));

dotenv.config({ path: envPath });

let testUrl: URL;
try {
  testUrl = new URL(process.env.DATABASE_URL ?? '');
} catch {
  throw new Error('Tests require a valid PostgreSQL DATABASE_URL.');
}

if (!['postgresql:', 'postgres:'].includes(testUrl.protocol)) {
  throw new Error('Tests require PostgreSQL and will not run against another provider.');
}

const dbName = testUrl.pathname.replace(/^\/+/, '').split('/')[0]?.split('?')[0] ?? '';
if (!dbName.endsWith('_test')) {
  throw new Error('Tests refuse to run: DATABASE_URL database name must end in "_test".');
}

// Keep the resolved test database name; do not silently rewrite to another database.
process.env.DATABASE_URL = testUrl.toString();
process.env.NODE_ENV = 'test';
