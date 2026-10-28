import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const run = (): void => {
  if (process.env.NODE_ENV !== 'development') {
    console.error('Database reset is allowed only when NODE_ENV=development.');
    process.exitCode = 1;
    return;
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(process.env.DATABASE_URL ?? '');
  } catch {
    console.error('Database reset refused: DATABASE_URL is invalid.');
    process.exitCode = 1;
    return;
  }

  if (
    !['postgresql:', 'postgres:'].includes(databaseUrl.protocol) ||
    !['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname) ||
    databaseUrl.pathname !== '/camp_exchange'
  ) {
    console.error('Database reset refused: target must be the local camp_exchange database.');
    process.exitCode = 1;
    return;
  }

  const npmExecPath = process.env.npm_execpath;
  if (!npmExecPath) {
    console.error('Database reset must be run through an npm script.');
    process.exitCode = 1;
    return;
  }

  const result = spawnSync(
    process.execPath,
    [npmExecPath, 'exec', '--', 'prisma', 'migrate', 'reset', '--force'],
    { stdio: 'inherit', env: process.env }
  );
  if (result.error || result.status !== 0) {
    console.error('Database reset failed.');
    process.exitCode = 1;
  }
};

run();
